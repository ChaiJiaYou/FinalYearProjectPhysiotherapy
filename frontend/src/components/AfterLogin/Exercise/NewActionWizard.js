import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  TextField,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Grid,
  Switch,
  FormControlLabel,
  Fab
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  PlayArrow,
  Stop,
  Save,
  Refresh,
  Close,
  CheckCircle,
  Settings
} from '@mui/icons-material';
import { toast } from 'react-toastify';

const NewActionWizard = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [actionData, setActionData] = useState({
    name: '',
    description: ''
  });
  
  // Step 1: Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Step 2: Processing & Preview
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [extractedData, setExtractedData] = useState(null);
  
  // Step 3: Testing
  const [isTestMode, setIsTestMode] = useState(false);
  const [testResults, setTestResults] = useState({
    reps: 0,
    distance: 0,
    state: 'OUT'
  });
  const [thresholds, setThresholds] = useState({
    thr_in: 0.5,
    thr_out: 1.0
  });
  // Auto threshold: default ON. Only send manual thresholds once when user commits a change
  const [autoThreshold, setAutoThreshold] = useState(true);
  const manualPendingRef = useRef(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const inferenceIntervalRef = useRef(null);
  const inflightRef = useRef(0); // limit concurrent in-flight requests
  
  const steps = ['Record Demo', 'Process & Preview', 'Test & Save'];

  useEffect(() => {
    return () => {
      stopCamera();
      if (inferenceIntervalRef.current) {
        clearInterval(inferenceIntervalRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Auto-clear console after a number of logs to keep terminal readable
  useEffect(() => {
    const LOG_CLEAR_INTERVAL = 80; // clear every 80 logs
    const originalLog = console.log;
    let hitCount = 0;
    console.log = (...args) => {
      hitCount += 1;
      if (hitCount % LOG_CLEAR_INTERVAL === 0) {
        console.clear();
        originalLog('🔄 Console auto-cleared to keep logs concise');
      }
      originalLog(...args);
    };
    return () => {
      console.log = originalLog;
    };
  }, []);

  // Manage camera based on active step
  useEffect(() => {
    if (activeStep === 0) {
      // Step 1: Record Demo - manual camera control
      return;
    } else if (activeStep === 1) {
      // Step 2: Process & Preview - stop camera to save resources
      if (isCameraActive) {
        stopCamera();
      }
    } else if (activeStep === 2 && extractedData) {
      // Step 3: Test & Save - auto-start camera for testing
      if (!isCameraActive) {
        startCamera();
      }
    }
  }, [activeStep, extractedData, isCameraActive]);

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
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!streamRef.current) {
      toast.error('Camera not active');
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm'
      });
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        toast.success('Recording completed!');
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast.info('Recording started! Perform 3-5 repetitions of your action');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const processRecording = async () => {
    console.log('🎬 ========== PROCESSING RECORDING ==========');
    console.log('📊 Input validation:', {
      recordedBlob: !!recordedBlob,
      blobSize: recordedBlob?.size,
      blobType: recordedBlob?.type,
      actionName: actionData.name,
      actionDescription: actionData.description
    });

    if (!recordedBlob || !actionData.name) {
      console.error('❌ Missing required data');
      toast.error('Please provide action name and record a demo');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Step 1: Create action
      console.log('🔨 Step 1: Creating action...');
      setProcessingProgress(20);
      const actionPayload = {
        name: actionData.name,
        description: actionData.description
      };
      console.log('📤 Action payload:', actionPayload);

      const actionResponse = await fetch('http://127.0.0.1:8000/api/actions/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(actionPayload)
      });

      console.log(`📡 Action creation response: ${actionResponse.status}`);
      if (!actionResponse.ok) {
        const errorText = await actionResponse.text();
        console.error('❌ Action creation failed:', errorText);
        throw new Error(`Failed to create action: ${actionResponse.status}`);
      }

      const actionResult = await actionResponse.json();
      console.log('✅ Action created:', actionResult);
      const actionId = actionResult.id;
      
      // Step 2: Upload video
      console.log('📤 Step 2: Uploading video...');
      setProcessingProgress(40);
      const formData = new FormData();
      formData.append('video', recordedBlob, 'demo.webm');
      formData.append('fps', '30');
      console.log('📦 FormData created for upload');

      const uploadResponse = await fetch(`http://127.0.0.1:8000/api/actions/${actionId}/record/`, {
        method: 'POST',
        body: formData
      });

      console.log(`📡 Upload response: ${uploadResponse.status}`);
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload failed:', errorText);
        throw new Error(`Failed to upload video: ${uploadResponse.status}`);
      }
      console.log('✅ Video uploaded successfully');

      // Step 3: Process and finalize
      console.log('🔄 Step 3: Processing and finalizing...');
      setProcessingProgress(70);
      const finalizeResponse = await fetch(`http://127.0.0.1:8000/api/actions/${actionId}/finalize/`, {
        method: 'POST'
      });

      console.log(`📡 Finalize response: ${finalizeResponse.status}`);
      if (!finalizeResponse.ok) {
        const errorText = await finalizeResponse.text();
        console.error('❌ Finalize failed:', errorText);
        throw new Error(`Failed to process action: ${finalizeResponse.status}`);
      }

      const finalizeResult = await finalizeResponse.json();
      console.log('✅ Finalize result:', finalizeResult);
      
      // Step 4: Setup for testing
      console.log('🔧 Step 4: Setting up inference...');
      setProcessingProgress(90);
      const setupResponse = await fetch(`http://127.0.0.1:8000/api/actions/${actionId}/setup/`, {
        method: 'POST'
      });

      console.log(`📡 Setup response: ${setupResponse.status}`);
      if (!setupResponse.ok) {
        const errorText = await setupResponse.text();
        console.error('❌ Setup failed:', errorText);
        throw new Error(`Failed to setup inference: ${setupResponse.status}`);
      }

      const setupResult = await setupResponse.json();
      console.log('✅ Setup result:', setupResult);
      
      setProcessingProgress(100);
      const extractedInfo = {
        action_id: actionId,  // Note: changed from actionId to action_id for consistency
        ...finalizeResult,
        ...setupResult
      };
      console.log('📊 Final extracted data:', extractedInfo);
      setExtractedData(extractedInfo);
      
      // Update thresholds
      if (finalizeResult.thresholds) {
        console.log('🎯 Updating thresholds:', finalizeResult.thresholds);
        setThresholds(finalizeResult.thresholds);
      }
      
      console.log('🎉 Processing complete! Moving to Step 3...');
      toast.success(`Action processed successfully! Found ${finalizeResult.templates_count} templates`);
      setActiveStep(2); // Move to testing step
      
    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error(`Processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startTesting = async () => {
    console.log('🎬 ========== START TESTING INITIATED ==========');
    console.log('📊 Current state:', {
      extractedData: !!extractedData,
      extractedDataDetails: extractedData,
      isCameraActive: isCameraActive,
      isTestMode: isTestMode,
      activeStep: activeStep
    });

    if (!extractedData) {
      console.error('❌ No extracted data available');
      toast.error('No processed action available');
      return;
    }

    try {
      console.log('🚀 Starting test mode...');
      
      // Ensure camera is active first
      if (!isCameraActive) {
        console.log('📷 Camera not active, starting camera for testing...');
        await startCamera();
        console.log('⏳ Waiting for camera to initialize...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`📷 Camera status after initialization: ${isCameraActive}`);
      } else {
        console.log('✅ Camera already active');
      }

      // Check video element
      if (videoRef.current) {
        console.log('🎥 Video element status:', {
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
          readyState: videoRef.current.readyState,
          currentTime: videoRef.current.currentTime
        });
      } else {
        console.error('❌ Video element not found');
      }

      // Reset inference state
      console.log('🔄 Resetting inference state...');
      const resetResponse = await fetch('http://127.0.0.1:8000/api/infer/reset/', {
        method: 'POST'
      });
      
      console.log(`📡 Reset response: ${resetResponse.status}`);
      if (!resetResponse.ok) {
        const resetError = await resetResponse.text();
        console.error('❌ Reset error:', resetError);
        throw new Error(`Reset failed: ${resetResponse.status} - ${resetError}`);
      }

      // Setup action for inference
      console.log(`🔧 Setting up action for inference (ID: ${extractedData.action_id})...`);
      const setupResponse = await fetch(`http://127.0.0.1:8000/api/actions/${extractedData.action_id}/setup/`, {
        method: 'POST'
      });
      
      console.log(`📡 Setup response: ${setupResponse.status}`);
      if (!setupResponse.ok) {
        const setupError = await setupResponse.text();
        console.error('❌ Setup error:', setupError);
        throw new Error(`Setup failed: ${setupResponse.status} - ${setupError}`);
      }

      const setupData = await setupResponse.json();
      console.log('✅ Setup successful:', setupData);

      console.log('🎯 Setting test mode to true...');
      setIsTestMode(true);
      setTestResults({ reps: 0, distance: 0, state: 'OUT' });
      
      // Start real-time inference loop immediately
      console.log('🔄 Starting inference loop...');
      startInferenceLoop();
      
      console.log('✅ Test mode initialization complete!');
      toast.success('Test mode started! Perform the action to see real-time counting');
      
    } catch (error) {
      console.error('❌ Error starting test:', error);
      toast.error(`Failed to start testing: ${error.message}`);
      setIsTestMode(false);
    }
  };

  const startInferenceLoop = () => {
    if (inferenceIntervalRef.current) {
      clearInterval(inferenceIntervalRef.current);
    }
    
    console.log('🚀 Starting inference loop...');
    let frameCount = 0;
    
    inferenceIntervalRef.current = setInterval(async () => {
      frameCount++;
      console.log(`📸 Frame ${frameCount}: Checking conditions...`);
      
      // Debug: Check all conditions
      console.log(`  - videoRef.current: ${!!videoRef.current}`);
      console.log(`  - isCameraActive: ${isCameraActive}`);
      console.log(`  - isTestMode (state): ${isTestMode}`);
      
      // Check if loop is still active
      if (!inferenceIntervalRef.current) {
        console.log('❌ Stopping loop: interval cleared');
        return;
      }
      
      if (!videoRef.current || !isCameraActive) {
        console.log('❌ Skipping frame: video or camera not ready');
        return;
      }
      
      try {
        // Check if video is ready
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        console.log(`  - Video dimensions: ${videoWidth}x${videoHeight}`);
        
        if (videoWidth === 0 || videoHeight === 0) {
          console.log('❌ Skipping frame: video not ready');
          return;
        }
        
        // Capture current frame (downscaled to reduce bandwidth)
        console.log('🖼️ Capturing frame...');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetW = 320;
        const scale = targetW / videoWidth;
        const targetH = Math.max(180, Math.round(videoHeight * scale));
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.drawImage(videoRef.current, 0, 0, targetW, targetH);
        
        // Convert to blob and send to backend
        canvas.toBlob(async (blob) => {
          if (!blob) {
            console.log('❌ Blob creation failed');
            return;
          }
          
          // Check if test mode is still active (using a more reliable check)
          if (!inferenceIntervalRef.current) {
            console.log('❌ Test mode stopped during processing');
            return;
          }
          
          console.log(`📦 Blob created: ${blob.size} bytes, type: ${blob.type}`);
          
          try {
            // Backpressure: if too many requests are in flight, skip this frame
            if (inflightRef.current >= 2) {
              console.log('⏭️ Skipping frame due to backpressure');
              return;
            }
            inflightRef.current += 1;
            const formData = new FormData();
            formData.append('frame', blob);
            // Only send thresholds when user manually overrides (one-shot after commit)
            if (!autoThreshold && manualPendingRef.current) {
              formData.append('thr_in', thresholds.thr_in.toString());
              formData.append('thr_out', thresholds.thr_out.toString());
              manualPendingRef.current = false;
            }
            
            console.log('🌐 Sending request to backend...');
            console.log(`📊 Threshold mode: ${autoThreshold ? 'AUTO' : (manualPendingRef.current ? 'MANUAL(SEND-ONCE)' : 'MANUAL(IDLE)')} thr_in=${thresholds.thr_in}, thr_out=${thresholds.thr_out}`);
            const startTime = Date.now();
            
            const response = await fetch('http://127.0.0.1:8000/api/infer/stream/', {
              method: 'POST',
              body: formData
            });
            
            const endTime = Date.now();
            console.log(`⏱️ Request took ${endTime - startTime}ms`);
            console.log(`📡 Response status: ${response.status}`);
            
            if (response.ok) {
              const data = await response.json();
              console.log('✅ Inference result:', JSON.stringify(data, null, 2));
              
              const newResults = {
                reps: data.reps || 0,
                distance: data.distance || 0,
                state: data.state || 'OUT'
              };
              
              console.log('🔄 Updating test results:', newResults);
              setTestResults(newResults);
            } else {
              const errorText = await response.text();
              console.error('❌ Inference response error:', response.status, errorText);
            }
          } catch (error) {
            console.error('❌ Inference request error:', error);
          } finally {
            inflightRef.current = Math.max(0, inflightRef.current - 1);
          }
        }, 'image/jpeg', 0.6);
        
      } catch (error) {
        console.error('❌ Inference loop error:', error);
      }
    }, 150); // Send frame every 150ms (~6.6 FPS) for faster responsiveness
  };

  const stopTesting = () => {
    console.log('🛑 Stopping test mode...');
    setIsTestMode(false);
    if (inferenceIntervalRef.current) {
      clearInterval(inferenceIntervalRef.current);
      inferenceIntervalRef.current = null;
      console.log('✅ Inference loop stopped');
    }
    toast.info('Test mode stopped');
  };

  const updateThresholds = async () => {
    // Thresholds will be updated automatically in the next inference request
    console.log(`🎛️ Thresholds will be updated in next request: thr_in=${thresholds.thr_in}, thr_out=${thresholds.thr_out}`);
    toast.success('Thresholds updated');
  };

  const saveAction = () => {
    if (extractedData) {
      toast.success('Action saved successfully!');
      onSuccess && onSuccess(extractedData);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setActiveStep(0);
    setActionData({ name: '', description: '' });
    setRecordedBlob(null);
    setRecordingDuration(0);
    setExtractedData(null);
    setIsTestMode(false);
    setTestResults({ reps: 0, distance: 0, state: 'OUT' });
    onClose && onClose();
  };

  const handleNext = () => {
    if (activeStep === 0 && recordedBlob && actionData.name) {
      // When moving from Step 1 to Step 2, stop recording if still active
      if (isRecording) {
        stopRecording();
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      processRecording();
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Step 1: Record Demo Video
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Action Name"
                  value={actionData.name}
                  onChange={(e) => setActionData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Description (Optional)"
                  multiline
                  rows={3}
                  value={actionData.description}
                  onChange={(e) => setActionData(prev => ({ ...prev, description: e.target.value }))}
                />
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  Record a video showing 3-5 repetitions of your action. Make sure you're clearly visible in the frame.
                </Alert>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: 2
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      maxWidth: 400,
                      height: 300,
                      borderRadius: 8,
                      backgroundColor: '#f0f0f0',
                      objectFit: 'cover'
                    }}
                  />
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant={isCameraActive ? 'outlined' : 'contained'}
                      startIcon={isCameraActive ? <VideocamOff /> : <Videocam />}
                      onClick={isCameraActive ? stopCamera : startCamera}
                      color={isCameraActive ? 'error' : 'primary'}
                    >
                      {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                    </Button>
                    
                    <Button
                      variant={isRecording ? 'outlined' : 'contained'}
                      startIcon={isRecording ? <Stop /> : <PlayArrow />}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={!isCameraActive}
                      color={isRecording ? 'error' : 'success'}
                    >
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                  </Box>
                  
                  {isRecording && (
                    <Chip 
                      label={`Recording: ${formatTime(recordingDuration)}`}
                      color="error"
                      variant="filled"
                    />
                  )}
                  
                  {recordedBlob && (
                    <Chip 
                      label="Demo recorded ✓"
                      color="success"
                      variant="filled"
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Step 2: Process & Preview
            </Typography>
            
            {!isProcessing && !extractedData && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Click "Process Recording" to extract action templates and set up recognition.
              </Alert>
            )}
            
            {isProcessing && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Processing your demo video...
                </Typography>
                <LinearProgress variant="determinate" value={processingProgress} />
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  {processingProgress}% complete
                </Typography>
              </Box>
            )}
            
            {extractedData && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    <CheckCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Processing Complete!
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Templates Found:</strong> {extractedData.templates_count}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Frames Processed:</strong> {extractedData.frames_processed}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Recognition Mode:</strong> DTW
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Window Size:</strong> {extractedData.window_size} frames
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Step 3: Test & Save
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Real-time Testing
                    </Typography>
                    
                    {/* Debug Info */}
                    <Card variant="outlined" sx={{ mb: 2, p: 1, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        🔍 Debug: Camera={isCameraActive ? '✅' : '❌'} | TestMode={isTestMode ? '✅' : '❌'} | ActionID={extractedData?.action_id || 'N/A'}
                      </Typography>
                    </Card>
                    
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button
                        variant={isTestMode ? 'outlined' : 'contained'}
                        startIcon={isTestMode ? <Stop /> : <PlayArrow />}
                        onClick={isTestMode ? stopTesting : startTesting}
                        color={isTestMode ? 'error' : 'success'}
                      >
                        {isTestMode ? 'Stop Test' : 'Start Test'}
                      </Button>
                      
                      <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => {
                          console.log('🔄 Manual reset triggered');
                          fetch('http://127.0.0.1:8000/api/infer/reset/', { method: 'POST' });
                          setTestResults({ reps: 0, distance: 0, state: 'OUT' });
                          toast.info('Reset complete');
                        }}
                        disabled={!isTestMode}
                      >
                        Reset
                      </Button>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Typography variant="h3" color="primary">
                        {testResults.reps}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Repetitions Counted
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        State: <Chip 
                          label={testResults.state} 
                          color={testResults.state === 'IN' ? 'success' : 'default'}
                          size="small" 
                        />
                      </Typography>
                      <Typography variant="body2">
                        Distance: {testResults.distance.toFixed(3)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Sensitivity Settings
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={autoThreshold}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setAutoThreshold(on);
                              if (on) {
                                // When turning AUTO on, next frames won't send overrides
                                manualPendingRef.current = false;
                                toast.info('Auto Threshold: ON');
                              } else {
                                toast.warning('Auto Threshold: OFF (manual control)');
                              }
                            }}
                          />
                        }
                        label="Auto Threshold"
                      />
                      {!autoThreshold && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Refresh />}
                          onClick={() => {
                            // Restore server thresholds if available
                            if (extractedData?.thresholds) {
                              setThresholds(extractedData.thresholds);
                            }
                            setAutoThreshold(true);
                            manualPendingRef.current = false;
                            toast.success('Restored automatic thresholds');
                          }}
                        >
                          Restore Auto
                        </Button>
                      )}
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography gutterBottom>
                        Enter Threshold: {thresholds.thr_in.toFixed(2)}
                      </Typography>
                      <Slider
                        value={thresholds.thr_in}
                        onChange={(e, value) => {
                          setThresholds(prev => ({ ...prev, thr_in: value }));
                        }}
                        onChangeCommitted={() => {
                          if (!autoThreshold) {
                            manualPendingRef.current = true; // send once on next frame
                            updateThresholds();
                          } else {
                            toast.info('Auto mode: using server thresholds');
                          }
                        }}
                        min={1}
                        max={500}
                        step={1}
                        marks={[
                          { value: 1, label: 'Sensitive' },
                          { value: 50, label: 'Mild' },
                          { value: 150, label: 'Normal' },
                          { value: 300, label: 'Strict' },
                          { value: 500, label: 'Max' }
                        ]}
                      />
                    </Box>
                    
                    <Box>
                      <Typography gutterBottom>
                        Exit Threshold: {thresholds.thr_out.toFixed(2)}
                      </Typography>
                      <Slider
                        value={thresholds.thr_out}
                        onChange={(e, value) => {
                          setThresholds(prev => ({ ...prev, thr_out: value }));
                        }}
                        onChangeCommitted={() => {
                          if (!autoThreshold) {
                            manualPendingRef.current = true; // send once on next frame
                            updateThresholds();
                          } else {
                            toast.info('Auto mode: using server thresholds');
                          }
                        }}
                        min={2}
                        max={600}
                        step={1}
                        marks={[
                          { value: 2, label: 'Sensitive' },
                          { value: 60, label: 'Mild' },
                          { value: 200, label: 'Normal' },
                          { value: 400, label: 'Strict' },
                          { value: 600, label: 'Max' }
                        ]}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: 400,
                    borderRadius: 8,
                    backgroundColor: '#f0f0f0',
                    objectFit: 'cover'
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">New Action Wizard</Typography>
          <Button onClick={handleClose} startIcon={<Close />}>
            Close
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {renderStepContent()}
      </DialogContent>
      
      <DialogActions>
        <Button 
          disabled={activeStep === 0 || isProcessing} 
          onClick={handleBack}
        >
          Back
        </Button>
        
        <Box sx={{ flex: '1 1 auto' }} />
        
        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!recordedBlob || !actionData.name}
          >
            Next
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={processRecording}
            disabled={isProcessing || extractedData}
          >
            {isProcessing ? 'Processing...' : extractedData ? 'Processed' : 'Process Recording'}
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={saveAction}
            color="success"
          >
            Save Action
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NewActionWizard;
