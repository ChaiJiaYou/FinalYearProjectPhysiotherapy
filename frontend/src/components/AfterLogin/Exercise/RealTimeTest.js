import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Chip,
  Slider,
  Grid,
  Alert,
  IconButton,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  Close,
  TrendingUp,
  Timer,
  Assessment
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'react-toastify';

const RealTimeTest = () => {
  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [isInferenceActive, setIsInferenceActive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentResults, setCurrentResults] = useState({
    reps: 0,
    distance: 0,
    state: 'OUT'
  });
  
  const [thresholds, setThresholds] = useState({
    thr_in: 0.5,
    thr_out: 1.0
  });
  
  const [distanceHistory, setDistanceHistory] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showActionSelector, setShowActionSelector] = useState(false);
  const [legacyMode, setLegacyMode] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const inferenceIntervalRef = useRef(null);
  const frameCountRef = useRef(0);

  useEffect(() => {
    fetchActions();
    return () => {
      stopInference();
      stopCamera();
    };
  }, []);

  useEffect(() => {
    let timer;
    if (isInferenceActive && sessionStartTime) {
      timer = setInterval(() => {
        setSessionDuration(Date.now() - sessionStartTime);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isInferenceActive, sessionStartTime]);

  const fetchActions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/actions/');
      if (response.ok) {
        const data = await response.json();
        setActions(data.actions || []);
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
      toast.error('Failed to load actions');
    }
  };

  const setupAction = async (actionId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/actions/${actionId}/setup/`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        setThresholds({
          thr_in: result.thresholds?.thr_in || 0.5,
          thr_out: result.thresholds?.thr_out || 1.0
        });
        toast.success('Action setup complete');
        return true;
      } else {
        throw new Error('Setup failed');
      }
    } catch (error) {
      console.error('Error setting up action:', error);
      toast.error('Failed to setup action');
      return false;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  }, []);

  const sendFrameForInference = useCallback(async () => {
    if (!selectedAction || !isCameraActive) return;
    
    try {
      const frameBlob = await captureFrame();
      if (!frameBlob) return;
      
      const formData = new FormData();
      formData.append('frame', frameBlob);
      
      const response = await fetch('http://127.0.0.1:8000/api/infer/stream/', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        
        setCurrentResults({
          reps: result.reps || 0,
          distance: result.distance || 0,
          state: result.state || 'OUT'
        });
        
        // Update distance history for visualization
        frameCountRef.current += 1;
        if (frameCountRef.current % 3 === 0) { // Update every 3 frames to reduce noise
          setDistanceHistory(prev => {
            const newHistory = [...prev, {
              frame: frameCountRef.current,
              distance: result.distance || 0,
              threshold_in: thresholds.thr_in,
              threshold_out: thresholds.thr_out
            }];
            // Keep only last 100 points
            return newHistory.slice(-100);
          });
        }
      }
    } catch (error) {
      console.error('Error in inference:', error);
    }
  }, [selectedAction, isCameraActive, captureFrame, thresholds]);

  const startInference = async () => {
    if (!selectedAction) {
      toast.error('Please select an action first');
      return;
    }
    
    if (!isCameraActive) {
      await startCamera();
    }
    
    // Reset inference state
    try {
      await fetch('http://127.0.0.1:8000/api/infer/reset/', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error resetting inference:', error);
    }
    
    setIsInferenceActive(true);
    setSessionStartTime(Date.now());
    setCurrentResults({ reps: 0, distance: 0, state: 'OUT' });
    setDistanceHistory([]);
    frameCountRef.current = 0;
    
    // Start inference loop
    inferenceIntervalRef.current = setInterval(sendFrameForInference, 100); // 10 FPS
    
    toast.success('Real-time inference started!');
  };

  const stopInference = () => {
    if (inferenceIntervalRef.current) {
      clearInterval(inferenceIntervalRef.current);
      inferenceIntervalRef.current = null;
    }
    setIsInferenceActive(false);
    toast.info('Inference stopped');
  };

  const resetSession = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/infer/reset/', {
        method: 'POST'
      });
      
      setCurrentResults({ reps: 0, distance: 0, state: 'OUT' });
      setDistanceHistory([]);
      setSessionStartTime(Date.now());
      frameCountRef.current = 0;
      
      toast.success('Session reset');
    } catch (error) {
      console.error('Error resetting session:', error);
      toast.error('Failed to reset session');
    }
  };

  const updateThresholds = async (newThresholds) => {
    setThresholds(newThresholds);
    
    if (isInferenceActive) {
      try {
        await fetch('http://127.0.0.1:8000/api/infer/stream/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            features: new Array(64).fill(0), // Dummy features
            update_thresholds: newThresholds
          })
        });
      } catch (error) {
        console.error('Error updating thresholds:', error);
      }
    }
  };

  const selectAction = async (action) => {
    const success = await setupAction(action.id);
    if (success) {
      setSelectedAction(action);
      setShowActionSelector(false);
      toast.success(`Selected action: ${action.name}`);
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Real-Time Action Recognition
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Test your trained actions with live pose detection
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={legacyMode}
                  onChange={(e) => setLegacyMode(e.target.checked)}
                />
              }
              label="Legacy Mode"
            />
            <IconButton onClick={() => setShowSettings(true)}>
              <Settings />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column - Controls and Status */}
        <Grid item xs={12} md={4}>
          {/* Action Selection */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Action Selection
              </Typography>
              
              {selectedAction ? (
                <Box>
                  <Chip 
                    label={selectedAction.name}
                    color="primary"
                    onDelete={() => setSelectedAction(null)}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {selectedAction.description}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Templates: {selectedAction.template_count}
                  </Typography>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  onClick={() => setShowActionSelector(true)}
                  fullWidth
                >
                  Select Action
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Controls
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant={isCameraActive ? 'outlined' : 'contained'}
                  startIcon={isCameraActive ? <VideocamOff /> : <Videocam />}
                  onClick={isCameraActive ? stopCamera : startCamera}
                  color={isCameraActive ? 'error' : 'primary'}
                  fullWidth
                >
                  {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                </Button>
                
                <Button
                  variant={isInferenceActive ? 'outlined' : 'contained'}
                  startIcon={isInferenceActive ? <Stop /> : <PlayArrow />}
                  onClick={isInferenceActive ? stopInference : startInference}
                  disabled={!selectedAction || !isCameraActive}
                  color={isInferenceActive ? 'error' : 'success'}
                  fullWidth
                >
                  {isInferenceActive ? 'Stop Inference' : 'Start Inference'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={resetSession}
                  disabled={!isInferenceActive}
                  fullWidth
                >
                  Reset Session
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Current Results */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Results
              </Typography>
              
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h2" color="primary" fontWeight="bold">
                  {currentResults.reps}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Repetitions
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">State:</Typography>
                <Chip 
                  label={currentResults.state}
                  color={currentResults.state === 'IN' ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Distance:</Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {currentResults.distance.toFixed(3)}
                </Typography>
              </Box>
              
              {sessionStartTime && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Duration:</Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {formatDuration(sessionDuration)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Sensitivity Settings */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sensitivity
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Enter Threshold: {thresholds.thr_in.toFixed(2)}
                </Typography>
                <Slider
                  value={thresholds.thr_in}
                  onChange={(e, value) => updateThresholds({ ...thresholds, thr_in: value })}
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  marks={[
                    { value: 0.1, label: 'Sensitive' },
                    { value: 1.0, label: 'Normal' },
                    { value: 2.0, label: 'Strict' }
                  ]}
                />
              </Box>
              
              <Box>
                <Typography gutterBottom>
                  Exit Threshold: {thresholds.thr_out.toFixed(2)}
                </Typography>
                <Slider
                  value={thresholds.thr_out}
                  onChange={(e, value) => updateThresholds({ ...thresholds, thr_out: value })}
                  min={0.2}
                  max={3.0}
                  step={0.05}
                  marks={[
                    { value: 0.2, label: 'Sensitive' },
                    { value: 1.5, label: 'Normal' },
                    { value: 3.0, label: 'Strict' }
                  ]}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Video and Visualization */}
        <Grid item xs={12} md={8}>
          {/* Video Feed */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Live Video Feed
              </Typography>
              
              <Box sx={{ position: 'relative', textAlign: 'center' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    maxWidth: 640,
                    height: 480,
                    borderRadius: 8,
                    backgroundColor: '#f0f0f0',
                    objectFit: 'cover'
                  }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
                />
                
                {!isCameraActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="h6">Camera not active</Typography>
                  </Box>
                )}
                
                {isInferenceActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      display: 'flex',
                      gap: 1
                    }}
                  >
                    <Chip label="LIVE" color="error" size="small" />
                    <Chip 
                      label={currentResults.state} 
                      color={currentResults.state === 'IN' ? 'success' : 'default'} 
                      size="small" 
                    />
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Distance Visualization */}
          {distanceHistory.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Distance Timeline
                </Typography>
                
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={distanceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="frame" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="distance" 
                        stroke="#2196f3" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="threshold_in" 
                        stroke="#4caf50" 
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="threshold_out" 
                        stroke="#f44336" 
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 20, height: 2, bgcolor: '#2196f3' }} />
                    <Typography variant="caption">Distance</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 20, height: 2, bgcolor: '#4caf50', borderStyle: 'dashed' }} />
                    <Typography variant="caption">Enter Threshold</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 20, height: 2, bgcolor: '#f44336', borderStyle: 'dashed' }} />
                    <Typography variant="caption">Exit Threshold</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Action Selector Dialog */}
      <Dialog open={showActionSelector} onClose={() => setShowActionSelector(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Action</DialogTitle>
        <DialogContent>
          <List>
            {actions.map((action) => (
              <ListItem key={action.id} disablePadding>
                <ListItemButton onClick={() => selectAction(action)}>
                  <ListItemText
                    primary={action.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {action.description}
                        </Typography>
                        <Typography variant="caption">
                          Templates: {action.template_count} | Samples: {action.sample_count}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          {actions.length === 0 && (
            <Alert severity="info">
              No trained actions available. Create some actions first using the New Action Wizard.
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Inference Settings
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={legacyMode}
                onChange={(e) => setLegacyMode(e.target.checked)}
              />
            }
            label="Enable Legacy Mode"
            sx={{ mb: 2 }}
          />
          
          <Alert severity="info">
            Legacy mode uses the original rule-based detection system.
            Disable to use the new AI-based action recognition.
          </Alert>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default RealTimeTest;
