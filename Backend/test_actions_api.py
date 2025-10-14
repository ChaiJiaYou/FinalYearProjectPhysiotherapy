import requests
import time

# Wait for server
time.sleep(2)

print("=== Testing Actions API ===")

try:
    # Test the same endpoint that RealTimeTest uses
    response = requests.get("http://127.0.0.1:8000/api/actions/", timeout=5)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("Response data:")
        print(data)
        
        # Check if it's the format RealTimeTest expects
        if isinstance(data, list):
            print(f"Found {len(data)} actions (array format)")
            for action in data:
                print(f"  - {action.get('name', 'Unknown')} (ID: {action.get('id', 'Unknown')})")
        elif isinstance(data, dict) and 'actions' in data:
            print(f"Found {len(data['actions'])} actions (object format)")
            for action in data['actions']:
                print(f"  - {action.get('name', 'Unknown')} (ID: {action.get('id', 'Unknown')})")
        else:
            print("Unexpected data format")
            
    else:
        print(f"Error: {response.text}")
        
except Exception as e:
    print(f"Error: {e}")

print("\n=== Testing Video Access ===")
try:
    video_url = "http://127.0.0.1:8000/media/action_videos/action_52_1760203818.mp4"
    print(f"Testing: {video_url}")
    
    response = requests.head(video_url, timeout=5)
    print(f"Video status: {response.status_code}")
    
    if response.status_code == 200:
        print("Video is accessible!")
    else:
        print("Video not accessible")
        
except Exception as e:
    print(f"Video test error: {e}")
