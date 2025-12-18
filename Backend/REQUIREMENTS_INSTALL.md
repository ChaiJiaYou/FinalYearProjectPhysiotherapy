# Required Packages Installation Guide

## Figure 5.1 Required Packages

### Web Framework
```bash
pip install django>=4.0,<5.0          # Django web framework for backend API
pip install djangorestframework>=3.14.0  # Django REST Framework for RESTful API
pip install django-cors-headers>=4.0.0    # CORS middleware for cross-origin requests
```

### Database
```bash
pip install psycopg2-binary>=2.9.0    # PostgreSQL database adapter (for production)
```

### Computer Vision & Pose Detection
```bash
pip install opencv-python>=4.8.0      # OpenCV for image processing and video operations
pip install mediapipe>=0.10.0         # MediaPipe Pose for real-time pose detection
```

### Deep Learning & AI
```bash
pip install torch>=2.0.0              # PyTorch deep learning framework
pip install tensorflow>=2.13.0        # TensorFlow for Transformer models
pip install ultralytics>=8.3.0        # YOLOv8 model library (optional)
```

### Scientific Computing
```bash
pip install numpy>=1.24.0             # NumPy for numerical computing and array operations
pip install scipy>=1.10.0             # SciPy for signal processing and statistics
pip install scikit-learn>=1.3.0       # Scikit-learn for machine learning utilities
pip install pandas>=2.0.0             # Pandas for data processing and analysis
```

### Visualization
```bash
pip install matplotlib>=3.7.0        # Matplotlib for data visualization (development)
```

### Timezone Support
```bash
pip install pytz>=2023.3              # Pytz for timezone handling in appointment system
```

### Rehab Engine API
```bash
pip install flask>=2.3.0              # Flask web framework for Rehab Engine API
pip install flask-cors>=4.0.0         # Flask CORS support for cross-origin requests
```

---

## Quick Install (All Packages)

```bash
pip install django>=4.0,<5.0 djangorestframework>=3.14.0 django-cors-headers>=4.0.0 psycopg2-binary>=2.9.0 opencv-python>=4.8.0 mediapipe>=0.10.0 torch>=2.0.0 tensorflow>=2.13.0 ultralytics>=8.3.0 numpy>=1.24.0 scipy>=1.10.0 scikit-learn>=1.3.0 pandas>=2.0.0 matplotlib>=3.7.0 pytz>=2023.3 flask>=2.3.0 flask-cors>=4.0.0
```

**Or use requirements.txt:**
```bash
pip install -r requirements.txt
```

