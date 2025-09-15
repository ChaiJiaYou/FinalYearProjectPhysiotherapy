"""
Automatic action segmentation based on velocity peaks, zero-crossings, and energy thresholds
"""
import numpy as np
from typing import List, Tuple, Dict, Optional
from scipy.signal import find_peaks, savgol_filter
from sklearn.preprocessing import StandardScaler


def auto_segment(
    feature_seq: np.ndarray,
    min_segment_length: int = 15,
    max_segment_length: int = 180,
    velocity_threshold: float = 0.5,
    energy_threshold: float = 0.3,
    smoothing_window: int = 5
) -> List[Tuple[int, int]]:
    """
    Automatically segment action sequence into individual repetitions
    
    Args:
        feature_seq: np.ndarray of shape [T, F] where T=time, F=features
        min_segment_length: minimum frames per segment
        max_segment_length: maximum frames per segment
        velocity_threshold: threshold for velocity peak detection
        energy_threshold: threshold for energy-based segmentation
        smoothing_window: window size for smoothing signals
    
    Returns:
        List of (start_frame, end_frame) tuples for each detected segment
    """
    T, F = feature_seq.shape
    if T < min_segment_length * 2:
        return [(0, T-1)]  # Too short to segment
    
    # Method 1: Velocity-based segmentation
    velocity_segments = _segment_by_velocity(
        feature_seq, min_segment_length, max_segment_length, 
        velocity_threshold, smoothing_window
    )
    
    # Method 2: Energy-based segmentation  
    energy_segments = _segment_by_energy(
        feature_seq, min_segment_length, max_segment_length,
        energy_threshold, smoothing_window
    )
    
    # Combine and refine segments
    combined_segments = _combine_segments(
        velocity_segments, energy_segments, T, min_segment_length
    )
    
    return combined_segments


def _segment_by_velocity(
    feature_seq: np.ndarray,
    min_length: int,
    max_length: int,
    threshold: float,
    smoothing_window: int
) -> List[Tuple[int, int]]:
    """Segment based on velocity magnitude peaks"""
    
    # Calculate velocity magnitude (L2 norm of feature derivatives)
    velocity = np.linalg.norm(np.diff(feature_seq, axis=0), axis=1)
    
    # Smooth velocity signal
    if len(velocity) > smoothing_window:
        velocity = savgol_filter(velocity, smoothing_window, 2)
    
    # Normalize velocity
    velocity = (velocity - np.mean(velocity)) / (np.std(velocity) + 1e-6)
    
    # Find low-velocity points (potential segment boundaries)
    low_velocity_mask = velocity < -threshold
    
    # Find continuous low-velocity regions
    segments = []
    in_low_region = False
    start_idx = 0
    
    for i, is_low in enumerate(low_velocity_mask):
        if is_low and not in_low_region:
            # Start of low-velocity region - end previous segment
            if i - start_idx >= min_length:
                segments.append((start_idx, i))
            start_idx = i
            in_low_region = True
        elif not is_low and in_low_region:
            # End of low-velocity region - start new segment
            start_idx = i
            in_low_region = False
    
    # Add final segment
    if len(velocity) - start_idx >= min_length:
        segments.append((start_idx, len(velocity)))
    
    # Filter by length constraints
    segments = [
        (s, e) for s, e in segments 
        if min_length <= e - s <= max_length
    ]
    
    return segments


def _segment_by_energy(
    feature_seq: np.ndarray,
    min_length: int,
    max_length: int,
    threshold: float,
    smoothing_window: int
) -> List[Tuple[int, int]]:
    """Segment based on feature energy (variance) changes"""
    
    # Calculate windowed energy (variance across features)
    window_size = max(3, smoothing_window)
    energy = []
    
    for i in range(len(feature_seq)):
        start = max(0, i - window_size // 2)
        end = min(len(feature_seq), i + window_size // 2 + 1)
        window_features = feature_seq[start:end]
        energy.append(np.var(window_features))
    
    energy = np.array(energy)
    
    # Smooth energy signal
    if len(energy) > smoothing_window:
        energy = savgol_filter(energy, smoothing_window, 2)
    
    # Normalize energy
    energy = (energy - np.mean(energy)) / (np.std(energy) + 1e-6)
    
    # Find energy peaks (high activity periods)
    peaks, _ = find_peaks(energy, height=threshold, distance=min_length//2)
    
    if len(peaks) < 2:
        return [(0, len(energy)-1)]
    
    # Create segments around peaks
    segments = []
    for i in range(len(peaks)):
        if i == 0:
            start = 0
        else:
            # Find valley between previous and current peak
            valley_start = peaks[i-1]
            valley_end = peaks[i]
            valley_idx = valley_start + np.argmin(energy[valley_start:valley_end])
            start = valley_idx
        
        if i == len(peaks) - 1:
            end = len(energy) - 1
        else:
            # Find valley between current and next peak
            valley_start = peaks[i]
            valley_end = peaks[i+1]
            valley_idx = valley_start + np.argmin(energy[valley_start:valley_end])
            end = valley_idx
        
        if end - start >= min_length:
            segments.append((start, end))
    
    return segments


def _combine_segments(
    velocity_segments: List[Tuple[int, int]],
    energy_segments: List[Tuple[int, int]],
    total_length: int,
    min_length: int
) -> List[Tuple[int, int]]:
    """Combine and refine segments from different methods"""
    
    all_segments = velocity_segments + energy_segments
    if not all_segments:
        return [(0, total_length - 1)]
    
    # Sort segments by start time
    all_segments.sort(key=lambda x: x[0])
    
    # Merge overlapping segments
    merged = []
    current_start, current_end = all_segments[0]
    
    for start, end in all_segments[1:]:
        if start <= current_end + min_length // 2:  # Allow small gaps
            # Overlapping or close - merge
            current_end = max(current_end, end)
        else:
            # No overlap - save current and start new
            if current_end - current_start >= min_length:
                merged.append((current_start, current_end))
            current_start, current_end = start, end
    
    # Add final segment
    if current_end - current_start >= min_length:
        merged.append((current_start, current_end))
    
    # Fill gaps if needed
    if not merged:
        return [(0, total_length - 1)]
    
    # Ensure we cover the full sequence
    final_segments = []
    if merged[0][0] > 0:
        final_segments.append((0, merged[0][0]))
    
    final_segments.extend(merged)
    
    if merged[-1][1] < total_length - 1:
        final_segments.append((merged[-1][1], total_length - 1))
    
    return final_segments


def build_templates(
    segments: List[Tuple[int, int]], 
    feature_seq: np.ndarray,
    target_length: Optional[int] = None
) -> List[Dict]:
    """
    Convert segments to standardized templates
    
    Args:
        segments: list of (start, end) frame indices
        feature_seq: full feature sequence [T, F]
        target_length: optional target length for time normalization
    
    Returns:
        List of template dicts with format:
        {'T': int, 'F': int, 'data': List[List[float]], 'original_length': int}
    """
    templates = []
    
    if target_length is None:
        # Use median length as target
        lengths = [end - start + 1 for start, end in segments]
        target_length = int(np.median(lengths)) if lengths else 50
    
    for start, end in segments:
        segment_features = feature_seq[start:end+1]  # [T_seg, F]
        original_length = len(segment_features)
        
        if len(segment_features) < 3:
            continue  # Skip too short segments
        
        # Time normalization via interpolation
        if len(segment_features) != target_length:
            # Simple linear interpolation to target length
            old_indices = np.linspace(0, len(segment_features)-1, len(segment_features))
            new_indices = np.linspace(0, len(segment_features)-1, target_length)
            
            normalized_features = []
            for f_idx in range(segment_features.shape[1]):
                interpolated = np.interp(new_indices, old_indices, segment_features[:, f_idx])
                normalized_features.append(interpolated)
            
            normalized_features = np.array(normalized_features).T  # [target_length, F]
        else:
            normalized_features = segment_features
        
        # Z-score normalize each feature dimension
        scaler = StandardScaler()
        normalized_features = scaler.fit_transform(normalized_features)
        
        template = {
            'T': int(target_length),
            'F': int(normalized_features.shape[1]),
            'data': normalized_features.tolist(),
            'original_length': int(original_length),
            'start_frame': int(start),
            'end_frame': int(end)
        }
        
        templates.append(template)
    
    return templates


def estimate_thresholds(templates: List[Dict]) -> Dict[str, float]:
    """
    Estimate DTW distance thresholds based on template similarity distribution
    
    Args:
        templates: list of template dicts
    
    Returns:
        dict with 'thr_in', 'thr_out', 'median', 'iqr' values
    """
    if len(templates) < 2:
        # Not enough templates for statistical estimation
        return {
            'thr_in': 0.5,
            'thr_out': 1.0,
            'median': 0.75,
            'iqr': 0.25
        }
    
    # Calculate pairwise DTW distances between all templates
    distances = []
    
    for i in range(len(templates)):
        for j in range(i + 1, len(templates)):
            template1 = np.array(templates[i]['data'])
            template2 = np.array(templates[j]['data'])
            
            # Simple DTW distance (can be replaced with more sophisticated version)
            dist = _simple_dtw_distance(template1, template2)
            distances.append(dist)
    
    if not distances:
        return {
            'thr_in': 0.5,
            'thr_out': 1.0,
            'median': 0.75,
            'iqr': 0.25
        }
    
    distances = np.array(distances)
    
    # Calculate statistics
    median = np.median(distances)
    q25 = np.percentile(distances, 25)
    q75 = np.percentile(distances, 75)
    iqr = q75 - q25
    
    # Set thresholds based on distribution
    # thr_in: relatively permissive (for positive detections)
    # thr_out: more strict (for ending detections)
    thr_in = median - 0.5 * iqr
    thr_out = median + 0.5 * iqr
    
    # Ensure reasonable bounds
    thr_in = max(0.1, thr_in)
    thr_out = max(thr_in + 0.1, thr_out)
    
    return {
        'thr_in': float(thr_in),
        'thr_out': float(thr_out),
        'median': float(median),
        'iqr': float(iqr)
    }


def _simple_dtw_distance(seq1: np.ndarray, seq2: np.ndarray) -> float:
    """
    Simple DTW distance calculation (without Sakoe-Chiba constraint)
    For full implementation, consider using specialized DTW libraries
    """
    T1, F1 = seq1.shape
    T2, F2 = seq2.shape
    
    if F1 != F2:
        return float('inf')
    
    # Initialize DTW matrix
    dtw_matrix = np.full((T1 + 1, T2 + 1), float('inf'))
    dtw_matrix[0, 0] = 0
    
    # Fill DTW matrix
    for i in range(1, T1 + 1):
        for j in range(1, T2 + 1):
            cost = np.linalg.norm(seq1[i-1] - seq2[j-1])
            dtw_matrix[i, j] = cost + min(
                dtw_matrix[i-1, j],     # insertion
                dtw_matrix[i, j-1],     # deletion
                dtw_matrix[i-1, j-1]    # match
            )
    
    return dtw_matrix[T1, T2] / max(T1, T2)  # Normalized distance
