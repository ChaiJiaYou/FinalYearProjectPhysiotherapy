"""
Unit tests for action learning functionality
"""
import unittest
import numpy as np
from django.test import TestCase
from api.services.feat import normalize_keypoints, frame_features, add_velocity_features, z_score_normalize
from api.services.segmentation import auto_segment, build_templates, estimate_thresholds
from api.services.dtw_recognition import DTWRecognizer


class TestAdaptiveNormalization(TestCase):
    """Test adaptive normalization functionality"""
    
    def setUp(self):
        # Create sample keypoints data
        self.sample_keypoints = {
            'left_shoulder': {'xy': np.array([100.0, 200.0]), 'conf': 0.9},
            'right_shoulder': {'xy': np.array([150.0, 200.0]), 'conf': 0.9},
            'left_elbow': {'xy': np.array([80.0, 250.0]), 'conf': 0.8},
            'right_elbow': {'xy': np.array([170.0, 250.0]), 'conf': 0.8},
            'left_wrist': {'xy': np.array([60.0, 300.0]), 'conf': 0.7},
            'right_wrist': {'xy': np.array([190.0, 300.0]), 'conf': 0.7},
            'left_hip': {'xy': np.array([110.0, 350.0]), 'conf': 0.9},
            'right_hip': {'xy': np.array([140.0, 350.0]), 'conf': 0.9},
            'left_knee': {'xy': np.array([105.0, 400.0]), 'conf': 0.8},
            'right_knee': {'xy': np.array([145.0, 400.0]), 'conf': 0.8},
            'left_ankle': {'xy': np.array([100.0, 450.0]), 'conf': 0.7},
            'right_ankle': {'xy': np.array([150.0, 450.0]), 'conf': 0.7},
            'nose': {'xy': np.array([125.0, 150.0]), 'conf': 0.9},
            'left_eye': {'xy': np.array([120.0, 145.0]), 'conf': 0.8},
            'right_eye': {'xy': np.array([130.0, 145.0]), 'conf': 0.8},
            'left_ear': {'xy': np.array([115.0, 150.0]), 'conf': 0.7},
            'right_ear': {'xy': np.array([135.0, 150.0]), 'conf': 0.7},
        }
        
        self.bbox = {'cx': 125.0, 'cy': 300.0, 'h': 300.0}
    
    def test_full_body_detection(self):
        """Test full body mode detection with all keypoints visible"""
        normed_kps, root, scale, mode = normalize_keypoints(self.sample_keypoints, self.bbox)
        
        self.assertEqual(mode, 'full_body')
        self.assertIsInstance(root, np.ndarray)
        self.assertIsInstance(scale, float)
        self.assertGreater(scale, 0)
        
        # Check that all keypoints are normalized
        self.assertEqual(len(normed_kps), 17)
        for name, point in normed_kps.items():
            self.assertIsInstance(point, np.ndarray)
            self.assertEqual(len(point), 2)
    
    def test_upper_body_detection(self):
        """Test upper body mode when hips/legs are missing"""
        upper_body_kps = {k: v for k, v in self.sample_keypoints.items() 
                         if not any(part in k for part in ['hip', 'knee', 'ankle'])}
        
        normed_kps, root, scale, mode = normalize_keypoints(upper_body_kps, self.bbox)
        
        self.assertEqual(mode, 'upper_body')
        self.assertGreater(scale, 0)
    
    def test_lower_body_detection(self):
        """Test lower body mode when shoulders are missing"""
        lower_body_kps = {k: v for k, v in self.sample_keypoints.items() 
                         if not any(part in k for part in ['shoulder', 'elbow', 'wrist'])}
        
        normed_kps, root, scale, mode = normalize_keypoints(lower_body_kps, self.bbox)
        
        self.assertEqual(mode, 'lower_body')
        self.assertGreater(scale, 0)
    
    def test_missing_points_handling(self):
        """Test handling of missing keypoints"""
        # Create keypoints with some missing points (low confidence)
        sparse_keypoints = self.sample_keypoints.copy()
        sparse_keypoints['left_wrist']['conf'] = 0.1  # Below threshold
        sparse_keypoints['right_ankle']['conf'] = 0.1
        
        normed_kps, root, scale, mode = normalize_keypoints(sparse_keypoints, self.bbox)
        
        # Should still work and return normalized points
        self.assertIsInstance(normed_kps, dict)
        self.assertGreater(scale, 0)
    
    def test_scale_limiting(self):
        """Test scale limiting and EMA smoothing"""
        # Test with extreme scale values
        extreme_kps = self.sample_keypoints.copy()
        extreme_kps['right_shoulder']['xy'] = np.array([100000.0, 200.0])  # Very far apart
        
        normed_kps, root, scale, mode = normalize_keypoints(extreme_kps, self.bbox)
        
        # Scale should be limited to reasonable range
        self.assertLessEqual(scale, 500.0)
        self.assertGreaterEqual(scale, 20.0)
        
        # Test EMA smoothing
        last_scale = 100.0
        normed_kps2, root2, scale2, mode2 = normalize_keypoints(
            self.sample_keypoints, self.bbox, last_scale=last_scale, ema=0.8
        )
        
        # New scale should be influenced by previous scale
        self.assertNotEqual(scale2, scale)


class TestFeatureEngineering(TestCase):
    """Test feature extraction functionality"""
    
    def setUp(self):
        # Create normalized keypoints
        self.normed_keypoints = {
            'left_shoulder': np.array([0.0, 0.0]),
            'right_shoulder': np.array([1.0, 0.0]),
            'left_elbow': np.array([-0.2, 0.5]),
            'right_elbow': np.array([1.2, 0.5]),
            'left_wrist': np.array([-0.4, 1.0]),
            'right_wrist': np.array([1.4, 1.0]),
            'left_hip': np.array([0.1, 1.5]),
            'right_hip': np.array([0.9, 1.5]),
            'left_knee': np.array([0.05, 2.0]),
            'right_knee': np.array([0.95, 2.0]),
            'left_ankle': np.array([0.0, 2.5]),
            'right_ankle': np.array([1.0, 2.5]),
            'nose': np.array([0.5, -0.5]),
            'left_eye': np.array([0.4, -0.6]),
            'right_eye': np.array([0.6, -0.6]),
            'left_ear': np.array([0.3, -0.5]),
            'right_ear': np.array([0.7, -0.5]),
        }
    
    def test_feature_extraction_dimensions(self):
        """Test that feature extraction returns correct dimensions"""
        features = frame_features(self.normed_keypoints)
        
        self.assertIsInstance(features, np.ndarray)
        self.assertEqual(len(features.shape), 1)  # 1D array
        self.assertGreater(len(features), 20)  # Should have multiple features
        self.assertLess(len(features), 100)   # But not too many
        
        # Check for NaN or inf values
        self.assertFalse(np.any(np.isnan(features)))
        self.assertFalse(np.any(np.isinf(features)))
    
    def test_feature_consistency(self):
        """Test that same input produces same features"""
        features1 = frame_features(self.normed_keypoints)
        features2 = frame_features(self.normed_keypoints)
        
        np.testing.assert_array_equal(features1, features2)
    
    def test_velocity_features(self):
        """Test velocity feature addition"""
        # Create a sequence of features
        feature_seq = np.array([
            [1, 2, 3, 4],
            [2, 3, 4, 5],
            [3, 4, 5, 6]
        ])
        
        features_with_velocity = add_velocity_features(feature_seq)
        
        # Should double the feature dimensions
        self.assertEqual(features_with_velocity.shape[1], feature_seq.shape[1] * 2)
        self.assertEqual(features_with_velocity.shape[0], feature_seq.shape[0])
    
    def test_z_score_normalization(self):
        """Test z-score normalization"""
        features = np.array([
            [1, 10, 100],
            [2, 20, 200],
            [3, 30, 300]
        ])
        
        normalized = z_score_normalize(features, axis=0)
        
        # Check that each column has mean ~0 and std ~1
        means = np.mean(normalized, axis=0)
        stds = np.std(normalized, axis=0)
        
        np.testing.assert_array_almost_equal(means, [0, 0, 0], decimal=10)
        np.testing.assert_array_almost_equal(stds, [1, 1, 1], decimal=10)


class TestAutoSegmentation(TestCase):
    """Test automatic action segmentation"""
    
    def test_synthetic_signal_segmentation(self):
        """Test segmentation with synthetic signal containing clear repetitions"""
        # Create synthetic feature sequence with 3 repetitions
        T = 150  # Total frames
        F = 10   # Features
        
        # Create a signal with 3 clear peaks
        feature_seq = np.zeros((T, F))
        
        # Add 3 action repetitions at frames 20-40, 60-80, 100-120
        for start in [20, 60, 100]:
            end = start + 20
            # Create a "bump" pattern
            for i in range(start, min(end, T)):
                intensity = np.sin((i - start) * np.pi / 20) ** 2
                feature_seq[i, :] = intensity
        
        # Add some noise
        feature_seq += np.random.normal(0, 0.1, feature_seq.shape)
        
        segments = auto_segment(feature_seq, min_segment_length=10, max_segment_length=50)
        
        # Should detect around 3 segments (±1 tolerance)
        self.assertGreaterEqual(len(segments), 2)
        self.assertLessEqual(len(segments), 4)
        
        # Check segment format
        for start, end in segments:
            self.assertIsInstance(start, int)
            self.assertIsInstance(end, int)
            self.assertLess(start, end)
            self.assertGreaterEqual(start, 0)
            self.assertLess(end, T)
    
    def test_template_building(self):
        """Test template building from segments"""
        # Create mock segments
        segments = [(10, 30), (50, 70), (90, 110)]
        
        # Create feature sequence
        T = 120
        F = 8
        feature_seq = np.random.random((T, F))
        
        templates = build_templates(segments, feature_seq, target_length=20)
        
        # Should have same number of templates as segments
        self.assertEqual(len(templates), len(segments))
        
        # Check template format
        for template in templates:
            self.assertIn('T', template)
            self.assertIn('F', template)
            self.assertIn('data', template)
            self.assertEqual(template['T'], 20)  # Target length
            self.assertEqual(template['F'], F)
            self.assertEqual(len(template['data']), 20)
            self.assertEqual(len(template['data'][0]), F)
    
    def test_threshold_estimation(self):
        """Test DTW threshold estimation"""
        # Create similar templates
        templates = [
            {
                'T': 10,
                'F': 4,
                'data': [[1, 2, 3, 4] for _ in range(10)]
            },
            {
                'T': 10,
                'F': 4,
                'data': [[1.1, 2.1, 3.1, 4.1] for _ in range(10)]
            },
            {
                'T': 10,
                'F': 4,
                'data': [[0.9, 1.9, 2.9, 3.9] for _ in range(10)]
            }
        ]
        
        thresholds = estimate_thresholds(templates)
        
        # Check threshold format
        self.assertIn('thr_in', thresholds)
        self.assertIn('thr_out', thresholds)
        self.assertIn('median', thresholds)
        self.assertIn('iqr', thresholds)
        
        # Check reasonable values
        self.assertGreater(thresholds['thr_out'], thresholds['thr_in'])
        self.assertGreater(thresholds['thr_in'], 0)
        self.assertLess(thresholds['thr_out'], 10)  # Should be reasonable


class TestDTWRecognition(TestCase):
    """Test DTW-based recognition"""
    
    def setUp(self):
        # Create simple templates
        self.templates = [
            {
                'T': 5,
                'F': 3,
                'data': [
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1],
                    [0, 1, 0],
                    [1, 0, 0]
                ]
            }
        ]
        
        self.recognizer = DTWRecognizer(
            templates=self.templates,
            window_size=10,
            thr_in=0.5,
            thr_out=1.0,
            min_frames_in=2
        )
    
    def test_recognizer_initialization(self):
        """Test DTW recognizer initialization"""
        self.assertEqual(len(self.recognizer.templates), 1)
        self.assertEqual(self.recognizer.window_size, 10)
        self.assertEqual(self.recognizer.state, 'OUT')
        self.assertEqual(self.recognizer.rep_count, 0)
    
    def test_recognizer_update(self):
        """Test recognizer update with feature frames"""
        # Feed some features
        features = np.array([1, 0, 0], dtype=np.float32)
        result = self.recognizer.update(features)
        
        # Check result format
        self.assertIn('state', result)
        self.assertIn('reps', result)
        self.assertIn('distance', result)
        self.assertIn('thresholds', result)
        
        # Initial state should be OUT
        self.assertEqual(result['state'], 'OUT')
        self.assertEqual(result['reps'], 0)
    
    def test_recognition_cycle(self):
        """Test a complete recognition cycle"""
        # Create a sequence that matches the template
        test_sequence = [
            [1, 0, 0],  # Match template start
            [0, 1, 0],
            [0, 0, 1],
            [0, 1, 0],
            [1, 0, 0],  # Match template end
            [0, 0, 0],  # Different pattern
            [0, 0, 0],
            [0, 0, 0]
        ]
        
        results = []
        for features in test_sequence:
            result = self.recognizer.update(np.array(features, dtype=np.float32))
            results.append(result)
        
        # Should eventually detect at least partial matching
        distances = [r['distance'] for r in results if r['distance'] < float('inf')]
        self.assertGreater(len(distances), 0)
    
    def test_threshold_updates(self):
        """Test threshold updating"""
        original_thr_in = self.recognizer.thr_in
        original_thr_out = self.recognizer.thr_out
        
        self.recognizer.update_thresholds(0.3, 1.5)
        
        self.assertEqual(self.recognizer.thr_in, 0.3)
        self.assertEqual(self.recognizer.thr_out, 1.5)
        self.assertNotEqual(self.recognizer.thr_in, original_thr_in)
        self.assertNotEqual(self.recognizer.thr_out, original_thr_out)
    
    def test_recognizer_reset(self):
        """Test recognizer reset functionality"""
        # Update some state
        self.recognizer.rep_count = 5
        self.recognizer.state = 'IN'
        
        # Reset
        self.recognizer.reset()
        
        # Should be back to initial state
        self.assertEqual(self.recognizer.state, 'OUT')
        self.assertEqual(self.recognizer.rep_count, 0)
        self.assertEqual(len(self.recognizer.feature_buffer), 0)


if __name__ == '__main__':
    unittest.main()
