# Dependencies Version

## Figure 5.2 Dependencies Version

### Backend Python Dependencies

```python
dependencies = {
    # Django Web Framework
    "django": ">=4.0,<5.0",
    "djangorestframework": ">=3.14.0",
    "django-cors-headers": ">=4.0.0",
    
    # Database
    "psycopg2-binary": ">=2.9.0",
    
    # Computer Vision & Pose Detection
    "opencv-python": ">=4.8.0",
    "mediapipe": ">=0.10.0",
    
    # Deep Learning & AI
    "torch": ">=2.0.0",
    "tensorflow": ">=2.13.0",
    "ultralytics": ">=8.3.0",
    
    # Scientific Computing
    "numpy": ">=1.24.0",
    "scipy": ">=1.10.0",
    "scikit-learn": ">=1.3.0",
    "pandas": ">=2.0.0",
    
    # Visualization
    "matplotlib": ">=3.7.0",
    
    # Timezone Support
    "pytz": ">=2023.3",
    
    # Rehab Engine API
    "flask": ">=2.3.0",
    "flask-cors": ">=4.0.0",
}
```

### Frontend JavaScript Dependencies

```json
{
  "dependencies": {
    "@date-io/date-fns": "^2.16.0",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.0",
    "@fullcalendar/core": "^6.1.15",
    "@fullcalendar/daygrid": "^6.1.15",
    "@fullcalendar/interaction": "^6.1.15",
    "@fullcalendar/react": "^6.1.15",
    "@fullcalendar/timegrid": "^6.1.15",
    "@mediapipe/pose": "^0.5.1675469404",
    "@mui/base": "^5.0.0-alpha.126",
    "@mui/icons-material": "^5.14.14",
    "@mui/material": "^5.14.14",
    "@mui/system": "^5.14.14",
    "@mui/x-date-pickers": "^5.0.18",
    "@tensorflow-models/pose-detection": "^2.1.3",
    "@tensorflow/tfjs": "^4.22.0",
    "@tensorflow/tfjs-backend-webgl": "^4.22.0",
    "@tensorflow/tfjs-backend-webgpu": "^4.22.0",
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "ajv": "^8.17.1",
    "ajv-keywords": "^5.1.0",
    "axios": "^1.7.9",
    "date-fns": "^2.30.0",
    "jspdf": "^3.0.4",
    "jspdf-autotable": "^5.0.2",
    "moment": "^2.30.1",
    "onnxruntime-web": "^1.23.2",
    "react": "^19.0.0",
    "react-big-calendar": "^1.18.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.28.2",
    "react-scripts": "^5.0.1",
    "react-toastify": "^11.0.3",
    "recharts": "^3.1.2",
    "web-vitals": "^2.1.4"
  }
}
```

---

## Version Constraints Explanation

- `>=X.Y.Z`: Minimum version required, allows newer versions
- `^X.Y.Z`: Compatible version (allows minor and patch updates)
- `==X.Y.Z`: Exact version required
- `<X.Y.Z`: Maximum version allowed

