"""
DTW-based online action recognition and counting with hysteresis thresholding
"""
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from collections import deque
import time
from .dtw import dtw_distance


def safe_float_for_json(value):
    """Convert float values to JSON-safe format"""
    if isinstance(value, float):
        if np.isinf(value) or np.isnan(value):
            return 999999.0
    return value


class DTWRecognizer:
    """
    Real-time DTW-based action recognition and counting
    Uses sliding window + hysteresis thresholding for robust detection
    """
    
    def __init__(
        self,
        templates: List[Dict],
        window_size: int = 60,  # buffer size (use largest window)
        thr_in: float = 0.5,
        thr_out: float = 1.0,
        min_frames_in: int = 1,
        min_frames_out: int = 1,
        band_ratio: float = 0.15,
        windows: Optional[List[int]] = None,
        feature_weights: Optional[List[float]] = None,
        median_len: Optional[int] = None,
        energy_p30: float = 0.2,
        energy_p50: float = 0.5,
        energy_p70: float = 1.0,
        smoothing_alpha: float = 0.12,
        count_on_entry: bool = True
    ):
        """
        Initialize DTW recognizer
        
        Args:
            templates: list of template dicts with 'data' key
            window_size: sliding window size in frames
            thr_in: threshold for entering recognition state
            thr_out: threshold for exiting recognition state  
            min_frames_in: minimum consecutive frames below thr_in to count
            band_ratio: Sakoe-Chiba band constraint ratio
        """
        # Handle both dict and list formats
        if templates and isinstance(templates[0], dict):
            self.templates = [np.array(t['data']) for t in templates]
        else:
            self.templates = [np.array(t) for t in templates]
        self.window_size = window_size
        self.thr_in = thr_in
        self.thr_out = thr_out
        self.min_frames_in = min_frames_in
        self.min_frames_out = min_frames_out
        self.band_ratio = band_ratio
        self.windows = sorted(list(set(windows))) if windows else [window_size]
        self.feature_weights = np.array(feature_weights, dtype=np.float32) if feature_weights is not None else None
        self.count_on_entry = bool(count_on_entry)
        
        # Feature standardization across all templates to improve robustness
        # Stack all template frames to compute mean/std, then normalize templates
        if len(self.templates) > 0:
            all_frames = np.vstack(self.templates)  # [sum_T, F]
            self.feature_mean = np.mean(all_frames, axis=0)
            feature_std = np.std(all_frames, axis=0)
            # Avoid near-zero std to prevent exploding values
            self.feature_std = np.where(feature_std < 1e-6, 1e-6, feature_std)
            # Normalize templates in-place
            self.templates = [
                (template - self.feature_mean) / self.feature_std for template in self.templates
            ]
            # Compute typical motion energy from templates for adaptive low-motion threshold
            template_energies = []
            for template in self.templates:
                if template.shape[0] >= 3:
                    diffs = np.diff(template, axis=0)
                    template_energies.append(float(np.mean(np.linalg.norm(diffs, axis=1))))
            self.motion_energy_median = float(np.median(template_energies)) if template_energies else 1.0
        else:
            # Fallback if no templates available
            self.feature_mean = None
            self.feature_std = None
            self.motion_energy_median = 1.0

        # State tracking
        self.feature_buffer = deque(maxlen=window_size)
        self.state = 'OUT'  # 'OUT' | 'IN'
        self.frames_in_state = 0
        self.rep_count = 0
        self.min_distance = 999999.0
        self.last_distances = []
        # Smoothed distance (EMA) to stabilize hysteresis against jitter
        self.smoothed_distance = 999999.0
        self.smoothing_alpha = smoothing_alpha
        # Track low-motion frames while IN to avoid getting stuck
        self.low_motion_frames = 0
        self.prev_raw_distance = None
        # Debounce/double-count prevention
        self.cooldown_frames = 0
        self.cooldown_after_count = 5  # frames to block immediate re-entry
        self.high_frames_since_last_count = 0
        # Rearm by time/energy instead of high distance
        self.rearmed_ready = True
        self.out_consecutive = 0
        self.median_len = int(median_len) if median_len else 40
        self.energy_p30 = float(energy_p30)
        self.energy_p50 = float(energy_p50)  # NEW: median energy for entry gate
        self.energy_p70 = float(energy_p70)
        self.min_frames_in = max(2, min(10, int(round(0.10 * self.median_len)))) if min_frames_in <= 1 else min_frames_in
        self.min_frames_out = max(1, min(6, int(round(0.05 * self.median_len)))) if min_frames_out <= 1 else min_frames_out
        # OPTIMIZED: Extended cooldown period (15-20 frames) to prevent double counting
        self.cooldown_after_count = max(15, min(20, int(round(0.40 * self.median_len))))
        self.out_rearm_frames = max(15, min(20, int(round(0.40 * self.median_len))))
        # Rolling stats for z-score quick exit
        self.roll_values: List[float] = []
        self.roll_maxlen = max(60, self.median_len)
        
        # Debug info
        self.debug_info = {}
    
    def update(self, features: np.ndarray) -> Dict[str, Any]:
        """
        Update recognizer with new feature frame
        
        Args:
            features: feature vector for current frame [F,]
        
        Returns:
            dict with 'state', 'reps', 'distance', 'thresholds' keys
        """
        # Add features to buffer
        self.feature_buffer.append(features.copy())
        
        if len(self.feature_buffer) < self.window_size // 2:
            # Not enough data yet
            return self._get_output_dict(distance=999999.0)
        
        # Extract current window (full buffer)
        current_window = np.array(list(self.feature_buffer))  # [T, F]
        # Per-window z-score normalization across time to match training templates' scale
        if current_window.size > 0:
            mu_w = np.mean(current_window, axis=0)
            std_w = np.std(current_window, axis=0)
            std_w = np.where(std_w < 1e-6, 1e-6, std_w)
            current_window = (current_window - mu_w) / std_w

        # Estimate short-term motion energy (higher when moving, low when still)
        if current_window.shape[0] >= 4:
            recent = current_window[-6:] if current_window.shape[0] >= 6 else current_window
            diffs = np.diff(recent, axis=0)  # [K-1, F]
            motion_energy = float(np.mean(np.linalg.norm(diffs, axis=1)))
        else:
            motion_energy = 0.0
        
        # Multi-window distances to all templates; take global minimum
        all_dists = []
        for w in self.windows:
            if current_window.shape[0] < max(8, w // 2):
                continue
            seq_w = current_window[-w:]
            band = max(3, int(round(self.band_ratio * max(seq_w.shape[0], max(t.shape[0] for t in self.templates)))))
            for i, template in enumerate(self.templates):
                d = dtw_distance(seq_w, template, band=band, weights=self.feature_weights, mask=None, lb_keogh=True)
                all_dists.append(d)
        min_dist = min(all_dists) if all_dists else 999999.0
        # Exponential moving average smoothing
        if self.smoothed_distance >= 999999.0:
            self.smoothed_distance = min_dist
        else:
            self.smoothed_distance = (
                self.smoothing_alpha * self.smoothed_distance + (1 - self.smoothing_alpha) * min_dist
            )
        self.min_distance = self.smoothed_distance
        # Update rolling stats for z-score
        self.roll_values.append(min_dist)
        if len(self.roll_values) > self.roll_maxlen:
            self.roll_values.pop(0)
        mu = float(np.mean(self.roll_values)) if self.roll_values else 0.0
        sigma = float(np.std(self.roll_values)) if self.roll_values else 1.0
        z = 0.0 if sigma < 1e-6 else (min_dist - mu) / sigma
        # Distance delta (kept for logging)
        dist_delta = 0.0 if self.prev_raw_distance is None else (min_dist - self.prev_raw_distance)
        self.prev_raw_distance = min_dist
        self.last_distances.append(min_dist)
        if len(self.last_distances) > 10:
            self.last_distances.pop(0)
        
        # Update state machine with hysteresis and motion fallback
        # Use smoothed distance for entering (robust), raw distance for exiting (responsive)
        self._update_state_machine(distance_raw=min_dist, distance_smooth=self.min_distance, motion_energy=motion_energy, dist_delta=dist_delta, z=z)
        
        # Store debug info
        self.debug_info = {
            'buffer_size': len(self.feature_buffer),
            'min_distance_raw': min_dist,
            'min_distance_smoothed': self.min_distance,
            'all_distances': all_dists,
            'frames_in_state': self.frames_in_state,
            'motion_energy': motion_energy,
            'dist_delta': dist_delta,
            'avg_distance': np.mean(self.last_distances) if self.last_distances else 999999.0,
            'cooldown_frames': self.cooldown_frames,
            'rearmed_ready': 1.0 if self.rearmed_ready else 0.0,
            'z': z,
            'thr_in': self.thr_in,
            'thr_out': self.thr_out
        }
        
        return self._get_output_dict(distance=self.min_distance)
    
    def _update_state_machine(self, distance_raw: float, distance_smooth: float, motion_energy: float, dist_delta: float, z: float):
        """Update state with asymmetric hysteresis thresholds.
        - Use smoothed distance for entering IN (reduce false positives)
        - Use raw distance for exiting to OUT (fast recovery)
        - If motion energy is very low持续若干帧，也尝试退出（防卡死）
        """
        # Adaptive low-motion threshold (use energy_p30)
        low_motion = motion_energy < max(0.1, self.energy_p30)
        # Update cooldown
        if self.cooldown_frames > 0:
            self.cooldown_frames -= 1
        if self.state == 'OUT':
            # Rearm by time or energy
            self.out_consecutive += 1
            if self.out_consecutive >= self.out_rearm_frames or motion_energy >= self.energy_p70:
                self.rearmed_ready = True
            # Require: not in cooldown AND re-armed (or first cycle) AND below enter threshold
            # OPTIMIZED: Added energy gate - must have sufficient motion energy to enter
            rearmed = self.rearmed_ready or (self.rep_count == 0)
            energy_gate_ok = motion_energy >= self.energy_p50  # NEW: energy gate to prevent static false entry
            if (self.cooldown_frames == 0) and rearmed and (distance_smooth <= self.thr_in) and energy_gate_ok:
                self.frames_in_state += 1
                if self.frames_in_state >= self.min_frames_in:
                    self.state = 'IN'
                    self.frames_in_state = 0
                    # consume rearm
                    self.rearmed_ready = False
                    self.out_consecutive = 0
                    # Optional: count on entry for small-amplitude motions
                    if self.count_on_entry:
                        self.rep_count += 1
                        self.cooldown_frames = self.cooldown_after_count
            else:
                self.frames_in_state = 0
        elif self.state == 'IN':
            self.out_consecutive = 0
            # Quick-exit via z-score
            fast_rise = z > 1.9
            # Exit reasons: high distance or fast rise. Low-motion只用于退出，不计数
            will_exit_counted = ((distance_raw >= self.thr_out) or fast_rise) and (not self.count_on_entry)
            will_exit_uncounted = low_motion and not will_exit_counted
            if will_exit_counted or will_exit_uncounted:
                self.frames_in_state += 1
                if self.frames_in_state >= self.min_frames_out:
                    self.state = 'OUT'
                    self.frames_in_state = 0
                    # Only count when exit reason is counted
                    if will_exit_counted:
                        self.rep_count += 1
                        # Start cooldown to prevent immediate re-entry at mid-motion
                        self.cooldown_frames = self.cooldown_after_count
            else:
                self.frames_in_state = 0
    
    def _dtw_distance_constrained(
        self, 
        seq1: np.ndarray, 
        seq2: np.ndarray
    ) -> float:
        """
        DTW distance with Sakoe-Chiba band constraint for efficiency
        """
        T1, F1 = seq1.shape
        T2, F2 = seq2.shape
        
        
        if F1 != F2:
            return 999999.0
        
        # Sakoe-Chiba band constraint - make it more permissive for different lengths
        band_width = max(5, int(self.band_ratio * max(T1, T2)) + abs(T1 - T2) // 2)
        # Ensure the band is large enough to always allow reaching (T1,T2)
        band_width = max(band_width, abs(T1 - T2) + 1)
        
        # Initialize DTW matrix with large values
        dtw_matrix = np.full((T1 + 1, T2 + 1), 999999.0)
        dtw_matrix[0, 0] = 0
        
        # Fill DTW matrix with band constraint
        for i in range(1, T1 + 1):
            # Calculate valid j range for Sakoe-Chiba constraint
            j_start = max(1, i - band_width)
            j_end = min(T2 + 1, i + band_width + 1)
            if j_start > j_end:
                # No valid j in band for this i
                continue
            
            for j in range(j_start, j_end):
                # Euclidean distance between feature vectors
                cost = np.linalg.norm(seq1[i-1] - seq2[j-1])
                
                # DTW recurrence relation
                dtw_matrix[i, j] = cost + min(
                    dtw_matrix[i-1, j],     # insertion
                    dtw_matrix[i, j-1],     # deletion
                    dtw_matrix[i-1, j-1]    # match
                )
        
        # Return normalized distance
        final_distance = dtw_matrix[T1, T2]
        normalized_distance = final_distance / max(T1, T2)
        
        # Check if DTW failed (still has the large initial value)
        if final_distance >= 999999.0:
            # Fallback: compute full DTW without band constraint
            return self._dtw_distance_full(seq1, seq2)
        
        return normalized_distance

    def _dtw_distance_full(self, seq1: np.ndarray, seq2: np.ndarray) -> float:
        """Standard DTW without band constraint as a safe fallback."""
        T1, F1 = seq1.shape
        T2, F2 = seq2.shape
        if F1 != F2:
            return 999999.0
        dtw_matrix = np.full((T1 + 1, T2 + 1), 999999.0)
        dtw_matrix[0, 0] = 0.0
        for i in range(1, T1 + 1):
            for j in range(1, T2 + 1):
                cost = np.linalg.norm(seq1[i-1] - seq2[j-1])
                dtw_matrix[i, j] = cost + min(
                    dtw_matrix[i-1, j],
                    dtw_matrix[i, j-1],
                    dtw_matrix[i-1, j-1]
                )
        final_distance = dtw_matrix[T1, T2]
        normalized = final_distance / max(T1, T2)
        return normalized
    
    def _get_output_dict(self, distance: float) -> Dict[str, Any]:
        """Generate output dictionary for API response"""
        return {
            'state': self.state,
            'reps': self.rep_count,
            'distance': safe_float_for_json(distance),
            'thresholds': {
                'thr_in': safe_float_for_json(self.thr_in),
                'thr_out': safe_float_for_json(self.thr_out)
            },
            'debug': {
                k: safe_float_for_json(v) if isinstance(v, (float, np.floating)) else v 
                for k, v in self.debug_info.items()
            }
        }
    
    def reset(self):
        """Reset recognizer state"""
        self.feature_buffer.clear()
        self.state = 'OUT'
        self.frames_in_state = 0
        self.rep_count = 0
        self.min_distance = 999999.0
        self.last_distances = []
        self.debug_info = {}
    
    def update_thresholds(self, thr_in: float, thr_out: float):
        """Update recognition thresholds"""
        self.thr_in = thr_in
        self.thr_out = max(thr_in + 0.1, thr_out)  # Ensure thr_out > thr_in


# Global recognizer instance for stateful recognition
_global_recognizer: Optional[DTWRecognizer] = None


def initialize_recognizer(
    templates: List[Dict],
    thresholds: Dict[str, float],
    window_size: int = 60,
    *,
    windows: Optional[List[int]] = None,
    band_ratio: float = 0.15,
    feature_weights: Optional[List[float]] = None,
    median_len: Optional[int] = None,
    energy_p30: float = 0.2,
    energy_p50: float = 0.5,
    energy_p70: float = 1.0,
    smoothing_alpha: float = 0.12
) -> None:
    """Initialize global DTW recognizer"""
    global _global_recognizer
    
    print(f"  - thresholds: {thresholds}")
    print(f"  - window_size: {window_size}")
    print(f"  - windows: {windows}")
    
    try:
        # Check template data format
        for i, template in enumerate(templates):
            print(f"  - template {i} type: {type(template)}, shape: {np.array(template).shape if isinstance(template, list) else 'not a list'}")
        
        # Extract thresholds with fallback logic
        thr_in = thresholds.get('thr_in', thresholds.get('median', 0.5))
        thr_out = thresholds.get('thr_out', thresholds.get('median', 1.0) + 0.1)
        
        
        _global_recognizer = DTWRecognizer(
            templates=templates,
            window_size=window_size,
            thr_in=thr_in,
            thr_out=thr_out,
            min_frames_in=3,
            band_ratio=band_ratio,
            windows=windows,
            feature_weights=feature_weights,
            median_len=median_len,
            energy_p30=energy_p30,
            energy_p50=energy_p50,
            energy_p70=energy_p70,
            smoothing_alpha=smoothing_alpha
        )

        # --- Auto recalibrate thresholds to runtime distance scale ---
        try:
            tmpl_arrays = _global_recognizer.templates  # already normalized by feature_mean/std
            if len(tmpl_arrays) >= 2:
                pos_dists = []
                # Use the widest window band like update()
                max_len = max(t.shape[0] for t in tmpl_arrays)
                band = max(3, int(round(_global_recognizer.band_ratio * max_len)))
                for i in range(len(tmpl_arrays)):
                    for j in range(i + 1, len(tmpl_arrays)):
                        d = dtw_distance(tmpl_arrays[i], tmpl_arrays[j], band=band, weights=_global_recognizer.feature_weights, mask=None, lb_keogh=True)
                        if d < 999999.0:
                            pos_dists.append(float(d))
                if pos_dists:
                    base = float(np.median(pos_dists))
                    # If provided thresholds are far smaller than runtime scale, bump them
                    too_small = (thr_in < 0.5 * base) or (thr_out < 0.6 * base)
                    if too_small:
                        # OPTIMIZED: Wider hysteresis gap (0.75x - 1.35x) for stability
                        new_in = max(0.1, 0.75 * base)
                        new_out = max(new_in + 0.2, 1.35 * base)
                        _global_recognizer.update_thresholds(new_in, new_out)
        except Exception as cal_e:
            pass;
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise


def dtw_infer_update(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main inference function for real-time DTW recognition
    
    Args:
        payload: dict with 'features' key containing current frame features
    
    Returns:
        dict with recognition results
    """
    global _global_recognizer
    
    
    if _global_recognizer is None:
        return {
            'error': 'Recognizer not initialized',
            'state': 'OUT',
            'reps': 0,
            'distance': safe_float_for_json(999999.0),
            'thresholds': {'thr_in': 0.5, 'thr_out': 1.0}
        }
    
    try:
        # Extract features from payload
        if payload is None:
            return {
                'error': 'Payload is None',
                'state': _global_recognizer.state,
                'reps': _global_recognizer.rep_count,
                'distance': _global_recognizer.min_distance,
                'thresholds': {
                    'thr_in': _global_recognizer.thr_in,
                    'thr_out': _global_recognizer.thr_out
                }
            }
            
        features = payload.get('features')
        
        if features is None:
            return {
                'error': 'No features provided',
                'state': _global_recognizer.state,
                'reps': _global_recognizer.rep_count,
                'distance': _global_recognizer.min_distance,
                'thresholds': {
                    'thr_in': _global_recognizer.thr_in,
                    'thr_out': _global_recognizer.thr_out
                }
            }
        
        # Convert to numpy array
        features = np.array(features, dtype=np.float32)
        
        # Update recognizer
        result = _global_recognizer.update(features)
        
        # Handle threshold updates from payload
        if 'update_thresholds' in payload and payload['update_thresholds'] is not None:
            new_thresholds = payload['update_thresholds']
            _global_recognizer.update_thresholds(
                new_thresholds.get('thr_in', _global_recognizer.thr_in),
                new_thresholds.get('thr_out', _global_recognizer.thr_out)
            )
        
        return result
        
    except Exception as e:
        return {
            'error': str(e),
            'state': 'OUT',
            'reps': 0,
            'distance': safe_float_for_json(999999.0),
            'thresholds': {'thr_in': 0.5, 'thr_out': 1.0}
        }


def reset_recognizer() -> Dict[str, str]:
    """Reset global recognizer state"""
    global _global_recognizer
    
    if _global_recognizer is not None:
        _global_recognizer.reset()
        return {'status': 'reset_success'}
    else:
        return {'status': 'no_recognizer'}


def get_recognizer_status() -> Dict[str, Any]:
    """Get current recognizer status"""
    global _global_recognizer
    
    if _global_recognizer is None:
        return {'initialized': False}
    
    return {
        'initialized': True,
        'state': _global_recognizer.state,
        'reps': _global_recognizer.rep_count,
        'templates_count': len(_global_recognizer.templates),
        'window_size': _global_recognizer.window_size,
        'thresholds': {
            'thr_in': _global_recognizer.thr_in,
            'thr_out': _global_recognizer.thr_out
        }
    }
