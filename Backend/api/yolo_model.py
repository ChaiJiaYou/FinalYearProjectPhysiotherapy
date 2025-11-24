from ultralytics import YOLO
import torch
import numpy as np
import os

# Try to load the model, fallback to default YOLO pose model if custom model not found
try:
    model_path = r"C:\Workspace\Jupyter\FinalYearProject\Notebooks\runs\pose\train\weights\best.pt"
    if os.path.exists(model_path):
        model = YOLO(model_path)
        print("Loaded custom pose model")
    else:
        # Fallback to default YOLO pose model
        model = YOLO("yolov8n-pose.pt")
        print("Loaded default YOLO pose model")
except Exception as e:
    print(f"Error loading model: {e}")
    # Fallback to default YOLO pose model
    model = YOLO("yolov8n-pose.pt")
    print("Loaded default YOLO pose model as fallback")

def predict_pose_opencv(image_np):
    """
    输入 OpenCV 图像（BGR格式），输出 keypoints 坐标
    返回 None 表示未检测到
    """
    try:
        results = model.predict(source=image_np, imgsz=224, conf=0.5, verbose=False)
        
        if len(results) == 0 or results[0].keypoints is None:
            return None
            
        keypoints = results[0].keypoints
        if keypoints is None or len(keypoints.xy) == 0:
            return None
            
        # Return keypoints as numpy array
        keypoints_np = keypoints.xy[0].cpu().numpy()
        
        # Debug: print keypoint shape (commented out - not needed)
        # print(f"Detected keypoints shape: {keypoints_np.shape}")
        
        return keypoints_np  # [17, 2] 或 [16, 2]
        
    except Exception as e:
        print(f"Error in pose prediction: {e}")
        return None
