import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Alert,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Tooltip
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  PlayArrow,
  Stop,
  Refresh,
  Close,
  PlayCircleOutline,
  PlayCircleOutline as PlayCircleOutlineIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

const RealTimeTest = () => {
  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
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
  
  
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  
  const [showActionSelector, setShowActionSelector] = useState(false);
  
  // Demo video states
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState(null);
  const [demoVideoLoading, setDemoVideoLoading] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionIntervalRef = useRef(null);
  const frameCountRef = useRef(0);

  useEffect(() => {
    fetchActions();
    return () => {
      stopRecognition();
      stopCamera();
    };
  }, []);

  useEffect(() => {
    let timer;
    if (isRecognitionActive && sessionStartTime) {
      timer = setInterval(() => {
        setSessionDuration(Date.now() - sessionStartTime);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecognitionActive, sessionStartTime]);

  const fetchActions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/actions/');
      
      if (response.ok) {
        const data = await response.json();
        let actionsList = [];
        if (Array.isArray(data.actions)) {
          actionsList = data.actions;
        } else if (Array.isArray(data)) {
          actionsList = data;
        }
        setActions(actionsList);
        
        // Auto-select first action if available and no action is currently selected
        if (actionsList.length > 0 && !selectedAction) {
          const firstAction = actionsList[0];
          const success = await setupAction(firstAction.id);
          if (success) {
            setSelectedAction(firstAction);
          }
        }
      } else {
        setActions([]);
      }
    } catch (error) {
      toast.error('Failed to load actions');
      setActions([]);
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

  const sendFrameForRecognition = useCallback(async () => {
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
        
        // Update frame count
        frameCountRef.current += 1;
      }
    } catch (error) {
      console.error('Error in recognition:', error);
    }
  }, [selectedAction, isCameraActive, captureFrame, thresholds]);

  const startRecognition = async () => {
    if (!selectedAction) {
      toast.error('Please select an action first');
      return;
    }
    
    if (!isCameraActive) {
      await startCamera();
    }
    
    // Reset recognition state
    try {
      await fetch('http://127.0.0.1:8000/api/infer/reset/', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error resetting recognition:', error);
    }
    
    setIsRecognitionActive(true);
    setSessionStartTime(Date.now());
    setCurrentResults({ reps: 0, distance: 0, state: 'OUT' });
    frameCountRef.current = 0;
    
    // Start recognition loop
    recognitionIntervalRef.current = setInterval(sendFrameForRecognition, 100); // 10 FPS
  };

  const stopRecognition = () => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    setIsRecognitionActive(false);
  };

  const resetSession = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/infer/reset/', {
        method: 'POST'
      });
      
      setCurrentResults({ reps: 0, distance: 0, state: 'OUT' });
      setSessionStartTime(Date.now());
      frameCountRef.current = 0;
      
      toast.success('Session reset');
    } catch (error) {
      console.error('Error resetting session:', error);
      toast.error('Failed to reset session');
    }
  };


  const selectAction = async (action) => {
    const success = await setupAction(action.id);
    if (success) {
      setSelectedAction(action);
      setShowActionSelector(false);
    }
  };

  const viewDemoVideo = async (actionId) => {
    setDemoVideoLoading(true);
    setShowDemoVideo(true);
    
    try {
      // Fetch action samples to get demo video
      const response = await fetch(`http://127.0.0.1:8000/api/actions/${actionId}/`);
      
      if (response.ok) {
        const actionData = await response.json();
        
        // Check if action has samples with video
        if (actionData.samples && actionData.samples.length > 0) {
          const sampleWithVideo = actionData.samples.find(sample => sample.video_url);
          
          if (sampleWithVideo) {
            // Construct full URL for video
            const videoUrl = sampleWithVideo.video_url.startsWith('http')
              ? sampleWithVideo.video_url
              : `http://127.0.0.1:8000${sampleWithVideo.video_url}`;
            setDemoVideoUrl(videoUrl);
          } else {
            setDemoVideoUrl(null);
            toast.info('No demo video available for this action');
          }
        } else {
          setDemoVideoUrl(null);
          toast.info('No demo video available for this action');
        }
      } else {
        throw new Error('Failed to fetch action details');
      }
    } catch (error) {
      console.error('Error fetching demo video:', error);
      toast.error('Failed to load demo video');
      setDemoVideoUrl(null);
    } finally {
      setDemoVideoLoading(false);
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={2} sx={{ height: '100%', flex: 1 }}>
        {/* Left Column - Controls and Settings */}
        <Grid item xs={12} md={5}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            
            {/* Action Selection */}
            <Card sx={{ flex: '0 0 auto' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                  Action Selection
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Action</InputLabel>
                  <Select
                    value={selectedAction ? selectedAction.id : ''}
                    label="Select Action"
                    onChange={(e) => {
                      const actionId = e.target.value;
                      const action = actions.find(a => a.id === actionId);
                      if (action) {
                        selectAction(action);
                      } else {
                        setSelectedAction(null);
                      }
                    }}
                  >
                    {actions.map((action) => (
                      <MenuItem key={action.id} value={action.id}>
                        {action.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {selectedAction && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Chip 
                        label={selectedAction.name}
                        color="primary"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {selectedAction.template_count} templates
                      </Typography>
                    </Box>
                    <Tooltip title="View demo video">
                      <IconButton 
                        size="small" 
                        color="secondary"
                        onClick={() => viewDemoVideo(selectedAction.id)}
                      >
                        <PlayCircleOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </CardContent>
            </Card>
            

            {/* Controls */}
            <Card sx={{ flex: '0 0 auto' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                  Controls
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant={isCameraActive ? 'outlined' : 'contained'}
                    startIcon={isCameraActive ? <VideocamOff /> : <Videocam />}
                    onClick={isCameraActive ? stopCamera : startCamera}
                    color={isCameraActive ? 'error' : 'primary'}
                    fullWidth
                    size="large"
                  >
                    {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                  </Button>
                  
                  <Button
                    variant={isRecognitionActive ? 'outlined' : 'contained'}
                    startIcon={isRecognitionActive ? <Stop /> : <PlayArrow />}
                    onClick={isRecognitionActive ? stopRecognition : startRecognition}
                    disabled={!selectedAction || !isCameraActive}
                    color={isRecognitionActive ? 'error' : 'success'}
                    fullWidth
                    size="large"
                  >
                    {isRecognitionActive ? 'Stop Recognition' : 'Start Recognition'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={resetSession}
                    disabled={!isRecognitionActive}
                    fullWidth
                  >
                    Reset Session
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Current Results */}
            <Card sx={{ flex: '0 0 auto' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                  Current Results
                </Typography>
                
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h2" color="primary" fontWeight="bold" sx={{ fontSize: '2.5rem' }}>
                    {currentResults.reps}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Repetitions
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight="medium">State:</Typography>
                    <Chip 
                      label={currentResults.state}
                      color={currentResults.state === 'IN' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight="medium">Distance:</Typography>
                    <Typography variant="body2" fontFamily="monospace" color="primary">
                      {currentResults.distance.toFixed(3)}
                    </Typography>
                  </Box>
                  
                  {sessionStartTime && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="medium">Duration:</Typography>
                      <Typography variant="body2" fontFamily="monospace" color="primary">
                        {formatDuration(sessionDuration)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Right Column - Video and Visualization */}
        <Grid item xs={12} md={7}>
          {/* Video Feed */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                Live Video Feed
              </Typography>
              
              <Box sx={{ 
                position: 'relative', 
                width: '100%',
                height: 480,
                overflow: 'hidden',
                borderRadius: 1
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    backgroundColor: '#f0f0f0'
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
                
                {isRecognitionActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      display: 'flex',
                      gap: 0.5,
                      alignItems: 'center',
                      zIndex: 10
                    }}
                  >
                    <Chip label="LIVE" color="error" size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                    <Chip 
                      label={currentResults.state} 
                      color={currentResults.state === 'IN' ? 'success' : 'default'} 
                      size="small" 
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

        </Grid>
      </Grid>

      {/* Action Selector Dialog */}
      <Dialog 
        open={showActionSelector} 
        onClose={() => {
          console.log('Action selector dialog closing');
          setShowActionSelector(false);
        }} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Select Action</Typography>
            <IconButton onClick={() => setShowActionSelector(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {actions.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Loading actions... Please wait.
            </Alert>
          )}
          <List>
            {actions.map((action) => (
              <ListItem 
                key={action.id} 
                disablePadding
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    aria-label="view demo"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewDemoVideo(action.id);
                    }}
                    color="primary"
                  >
                    <PlayCircleOutline />
                  </IconButton>
                }
              >
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


      {/* Demo Video Dialog */}
      <Dialog 
        open={showDemoVideo} 
        onClose={() => {
          setShowDemoVideo(false);
          setDemoVideoUrl(null);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Demo Video</Typography>
            <IconButton 
              onClick={() => {
                setShowDemoVideo(false);
                setDemoVideoUrl(null);
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {demoVideoLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Loading demo video...
                </Typography>
              </Box>
            </Box>
          ) : demoVideoUrl ? (
            <Box sx={{ 
              position: 'relative', 
              paddingTop: '56.25%', // 16:9 aspect ratio
              backgroundColor: '#000',
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <video
                controls
                autoPlay
                loop
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              >
                <source src={demoVideoUrl} type="video/mp4" />
                <source src={demoVideoUrl} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: 300,
              backgroundColor: 'grey.100',
              borderRadius: 1,
              p: 3
            }}>
              <VideocamOff sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Demo Video Available
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                This action doesn't have a demonstration video yet. 
                <br />
                Demo videos are recorded during action creation.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default RealTimeTest;
