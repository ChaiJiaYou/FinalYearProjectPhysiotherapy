#!/usr/bin/env python3
"""
End-to-end test script for action learning API endpoints
"""

import requests
import json
import time
import numpy as np

BASE_URL = 'http://127.0.0.1:8000/api'


def test_create_action():
    """Test creating a new action"""
    print("Testing action creation...")
    
    url = f"{BASE_URL}/actions/create/"
    data = {
        'name': 'Test Action - Arm Raise',
        'description': 'Simple arm raising exercise for testing',
        'created_by': 1
    }
    
    response = requests.post(url, json=data)
    print(f"Create Action - Status: {response.status_code}")
    
    if response.status_code == 200:
        action_data = response.json()
        print(f"Created action: {action_data}")
        return action_data['id']
    else:
        print(f"Error: {response.text}")
        return None


def test_list_actions():
    """Test listing all actions"""
    print("\nTesting action listing...")
    
    url = f"{BASE_URL}/actions/"
    response = requests.get(url)
    print(f"List Actions - Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('actions', []))} actions")
        return data.get('actions', [])
    else:
        print(f"Error: {response.text}")
        return []


def test_upload_keypoints(action_id):
    """Test uploading keypoints data to an action"""
    print(f"\nTesting keypoints upload for action {action_id}...")
    
    # Create synthetic keypoints data (simulating 3 arm raise repetitions)
    keypoints_data = {}
    
    # Generate 90 frames (3 seconds at 30fps) with 3 repetitions
    for frame in range(90):
        # Simple arm raise pattern: low -> high -> low
        cycle_position = (frame % 30) / 30.0  # 30 frames per cycle
        
        if cycle_position < 0.3:  # Arms down
            arm_height = 0.2
        elif cycle_position < 0.7:  # Arms rising/up  
            arm_height = 0.8
        else:  # Arms lowering
            arm_height = 0.2
        
        # Create keypoints (simplified COCO format)
        keypoints_data[str(frame)] = {
            'keypoints': [
                [100, 50],   # nose
                [95, 45], [105, 45],  # eyes
                [90, 50], [110, 50],  # ears
                [80, 100], [120, 100],  # shoulders
                [70, 100 + arm_height * 100], [130, 100 + arm_height * 100],  # elbows
                [60, 150 + arm_height * 150], [140, 150 + arm_height * 150],  # wrists
                [85, 200], [115, 200],  # hips
                [80, 250], [120, 250],  # knees
                [75, 300], [125, 300],  # ankles
            ]
        }
    
    url = f"{BASE_URL}/actions/{action_id}/record/"
    data = {
        'keypoints': json.dumps(keypoints_data),
        'fps': 30
    }
    
    response = requests.post(url, data=data)
    print(f"Upload Keypoints - Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Upload result: {result}")
        return result.get('sample_id')
    else:
        print(f"Error: {response.text}")
        return None


def test_finalize_action(action_id):
    """Test finalizing an action (processing keypoints)"""
    print(f"\nTesting action finalization for action {action_id}...")
    
    url = f"{BASE_URL}/actions/{action_id}/finalize/"
    response = requests.post(url)
    print(f"Finalize Action - Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Finalization result: {result}")
        return result.get('success', False)
    else:
        print(f"Error: {response.text}")
        return False


def test_setup_inference(action_id):
    """Test setting up inference for an action"""
    print(f"\nTesting inference setup for action {action_id}...")
    
    url = f"{BASE_URL}/actions/{action_id}/setup/"
    response = requests.post(url)
    print(f"Setup Inference - Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Setup result: {result}")
        return result.get('success', False)
    else:
        print(f"Error: {response.text}")
        return False


def test_inference_stream():
    """Test streaming inference"""
    print("\nTesting inference stream...")
    
    # Reset inference state
    reset_url = f"{BASE_URL}/infer/reset/"
    requests.post(reset_url)
    
    # Test with dummy features (64-dimensional as expected)
    url = f"{BASE_URL}/infer/stream/"
    
    # Simulate several frames
    for i in range(10):
        # Create dummy features that slightly vary
        features = np.random.random(64).tolist()
        
        data = {'features': features}
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"Frame {i}: State={result.get('state')}, Reps={result.get('reps')}, Distance={result.get('distance', 0):.3f}")
        else:
            print(f"Frame {i} error: {response.text}")
        
        time.sleep(0.1)  # Small delay


def test_inference_status():
    """Test getting inference status"""
    print("\nTesting inference status...")
    
    url = f"{BASE_URL}/infer/status/"
    response = requests.get(url)
    print(f"Inference Status - Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Status: {result}")
        return result
    else:
        print(f"Error: {response.text}")
        return None


def test_legacy_mode():
    """Test legacy mode endpoints"""
    print("\nTesting legacy mode...")
    
    url = f"{BASE_URL}/legacy/mode-status/"
    response = requests.get(url)
    print(f"Legacy Mode Status - Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Legacy mode status: {result}")
        return result
    else:
        print(f"Error: {response.text}")
        return None


def main():
    """Run all tests"""
    print("=== Action Learning API End-to-End Test ===\n")
    
    try:
        # Test 1: Create action
        action_id = test_create_action()
        if not action_id:
            print("Failed to create action. Stopping tests.")
            return
        
        # Test 2: List actions
        actions = test_list_actions()
        
        # Test 3: Upload keypoints
        sample_id = test_upload_keypoints(action_id)
        if not sample_id:
            print("Failed to upload keypoints. Stopping tests.")
            return
        
        # Test 4: Finalize action
        finalized = test_finalize_action(action_id)
        if not finalized:
            print("Failed to finalize action. Stopping tests.")
            return
        
        # Test 5: Setup inference
        setup_success = test_setup_inference(action_id)
        if not setup_success:
            print("Failed to setup inference. Stopping tests.")
            return
        
        # Test 6: Stream inference
        test_inference_stream()
        
        # Test 7: Check inference status
        test_inference_status()
        
        # Test 8: Legacy mode
        test_legacy_mode()
        
        print("\n=== All Tests Completed Successfully! ===")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to Django server. Make sure it's running at http://127.0.0.1:8000")
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == '__main__':
    main()
