import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Fab,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  SmartToy as SmartToyIcon,
  FitnessCenter as FitnessCenterIcon,
  CheckCircle as CheckIcon,
  Timer as TimerIcon,
  Repeat as RepeatIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

const PatientExercisePage = () => {
  // State management
  const [activeTreatment, setActiveTreatment] = useState(null);
  const [treatmentExercises, setTreatmentExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Camera and recognition states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [isExercisePaused, setIsExercisePaused] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  
  // Exercise timer states
  const [exerciseTime, setExerciseTime] = useState(0);
  const [allExercisesCompleted, setAllExercisesCompleted] = useState(false);
  const [currentResults, setCurrentResults] = useState({
    reps: 0,
    distance: 0,
    state: 'OUT',
    totalTime: 0,
    startTime: null,
    exerciseStartTime: null
  });
  
  // Video refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const demoVideoRef = useRef(null);
  const recognitionIntervalRef = useRef(null);
  const frameCountRef = useRef(0);
  const restTimerRef = useRef(null);
  const exerciseTimerRef = useRef(null);
  
  // Get current user info
  const currentUserId = localStorage.getItem("id");
  const currentUserRole = localStorage.getItem("role");

  // Helper functions
  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getMotivationalMessage = (currentReps, targetReps) => {
    const progress = targetReps > 0 ? (currentReps / targetReps) * 100 : 0;
    
    if (progress === 0) {
      return "💪 Let's get started! You've got this!";
    } else if (progress < 25) {
      return "🔥 Great start! Keep pushing forward!";
    } else if (progress < 50) {
      return "⚡ You're doing amazing! Halfway there!";
    } else if (progress < 75) {
      return "🚀 Almost there! You're on fire!";
    } else if (progress < 100) {
      return "🎯 So close! Finish strong!";
    } else {
      return "🏆 Fantastic! You've completed your goal!";
    }
  };

  // Start exercise timer
  const startExerciseTimer = () => {
    // Clear any existing timer
    if (exerciseTimerRef.current) {
      clearInterval(exerciseTimerRef.current);
      exerciseTimerRef.current = null;
    }
    
    // Reset time to 0
    setExerciseTime(0);
    
    // Start timer that increments every second
    exerciseTimerRef.current = setInterval(() => {
      setExerciseTime(prev => prev + 1);
    }, 1000);
  };

  // Stop exercise timer
  const stopExerciseTimer = () => {
    if (exerciseTimerRef.current) {
      clearInterval(exerciseTimerRef.current);
      exerciseTimerRef.current = null;
    }
  };

  // Reset exercise timer
  const resetExerciseTimer = () => {
    stopExerciseTimer();
    setExerciseTime(0);
  };

  // Frame capture function for DTW recognition
  const captureFrame = () => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        resolve(null);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  };

  // Send frame for DTW recognition
  const sendFrameForRecognition = async () => {
    if (!selectedExercise) return;
    
    // Check if recognition interval is still running (more reliable than state)
    if (!recognitionIntervalRef.current) return;
    
    // Check if camera is actually ready
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
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
        const newReps = result.reps || 0;
        
        // Update results first
        setCurrentResults(prev => ({
          ...prev,
          reps: newReps,
          distance: result.distance || 0,
          state: result.state || 'OUT'
        }));
        
        // Check if target reps reached (outside of setState callback)
        if (newReps >= selectedExercise.reps_per_set && recognitionIntervalRef.current) {
          console.log(`🎯 TARGET REACHED! ${newReps}/${selectedExercise.reps_per_set}, stopping recognition...`);
          stopRecognition();
          startRestPeriod();
        }
        
        // Update frame count
        frameCountRef.current += 1;
      }
    } catch (error) {
      console.error('Error in DTW recognition:', error);
    }
  };

  // Start rest period when target reps reached
  const startRestPeriod = () => {
    // Clear any existing rest timer first
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    
    // Set rest state
    setIsResting(true);
    setRestTimeLeft(60); // 60 seconds rest
    
    // Start rest timer
    restTimerRef.current = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          // Rest period finished - just reset timer, don't auto-start next exercise
          setIsResting(false);
          setRestTimeLeft(0);
          if (restTimerRef.current) {
            clearInterval(restTimerRef.current);
            restTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End rest period (manual reset when user clicks continue)
  const endRestPeriod = () => {
    // Clear rest timer
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    
    // Reset rest state
    setIsResting(false);
    setRestTimeLeft(0);
    
    // Check if there are more exercises
    const nextExerciseIndex = currentExerciseIndex + 1;
    if (nextExerciseIndex < treatmentExercises.length) {
      // Move to next exercise
      setCurrentExerciseIndex(nextExerciseIndex);
      setSelectedExercise(treatmentExercises[nextExerciseIndex]);
      toast.info(`Moving to next exercise: ${treatmentExercises[nextExerciseIndex].exercise_name}`);
      
      // Start exercise timer for the next exercise
      startExerciseTimer();
    } else {
      // All exercises completed
      setAllExercisesCompleted(true);
      toast.success('🎉 Congratulations! You have completed all exercises in this treatment plan!');
    }
    
    // Reset exercise timer for next exercise (this will be overridden by startExerciseTimer if there are more exercises)
    resetExerciseTimer();
    
    // Reset reps for next exercise
    setCurrentResults(prev => ({
      ...prev,
      reps: 0,
      state: 'OUT'
    }));
  };

  // Fetch patient's active treatment
  const fetchActiveTreatment = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://127.0.0.1:8000/api/patient-treatments/${currentUserId}/`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setActiveTreatment(data[0]); // Only one active treatment
          fetchTreatmentExercises(data[0].treatment_id);
        } else {
          setActiveTreatment(null);
        }
      } else {
        toast.error('Failed to load treatment plan');
      }
    } catch (error) {
      console.error('Error fetching treatment:', error);
      toast.error('Failed to load treatment plan');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch exercises for selected treatment
  const fetchTreatmentExercises = async (treatmentId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/treatment-exercises/${treatmentId}/`);
      if (response.ok) {
        const data = await response.json();
        
        // Sort exercises by order_in_treatment and filter only exercises with linked actions
        const sortedExercises = data
          .sort((a, b) => {
            const orderA = a.order_in_treatment || 999;
            const orderB = b.order_in_treatment || 999;
            return orderA - orderB;
          })
          .filter(exercise => exercise.action_id); // Only exercises with linked actions
        
        setTreatmentExercises(sortedExercises);
        
        // Auto-select the first exercise with linked action
        if (sortedExercises.length > 0) {
          setSelectedExercise(sortedExercises[0]);
          setCurrentExerciseIndex(0);
        } else {
          // No exercises with linked actions
          toast.warning('No exercises with linked actions found in this treatment plan');
        }
      } else {
        toast.error('Failed to load exercises');
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      toast.error('Failed to load exercises');
    }
  };

  // No need for treatment selection since there's only one active treatment

  // Handle exercise selection
  const handleExerciseSelect = (exercise) => {
    setSelectedExercise(exercise);
    stopRecognition();
    stopCamera();
  };

  // Start exercise (camera + recognition combined)
  const startExercise = async () => {
    try {
      // Stop demo video if playing
      if (demoVideoRef.current && !demoVideoRef.current.paused) {
        demoVideoRef.current.pause();
      }
      
      // If not paused, start exercise timer and record start time
      if (!isExercisePaused) {
        startExerciseTimer(); // Start the independent timer
        
        const startTime = new Date().toLocaleTimeString();
        const exerciseStartTime = Date.now();
        
        setCurrentResults(prev => ({
          ...prev,
          startTime: startTime,
          exerciseStartTime: exerciseStartTime,
          totalTime: 0
        }));
      }
      
      setIsExercisePaused(false);
      
      // Start camera and wait for it to be ready
      await startCamera();
      
      // Start recognition immediately after camera is ready
      await startRecognition();
      
    } catch (error) {
      console.error('Error starting exercise:', error);
      toast.error('Failed to start exercise');
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
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
    stopRecognition();
  };

  // Recognition functions
  const startRecognition = async () => {
    if (!selectedExercise) {
      return;
    }
    
    // Check if camera is actually active by checking the video element
    if (!videoRef.current || !videoRef.current.srcObject) {
      console.log('Camera not ready yet, waiting...');
      return;
    }
    
    // Check if exercise has linked action
    console.log('Selected exercise:', selectedExercise);
    console.log('Action ID:', selectedExercise.action_id);
    console.log('Action ID type:', typeof selectedExercise.action_id);
    
    if (!selectedExercise.action_id) {
      toast.error('This exercise is not linked to an action for recognition');
      return;
    }
    
    try {
      // Setup DTW recognizer for the linked action
      const setupResponse = await fetch(`http://127.0.0.1:8000/api/actions/${selectedExercise.action_id}/setup/`, {
        method: 'POST'
      });
      
      if (!setupResponse.ok) {
        const errorData = await setupResponse.json();
        throw new Error(errorData.error || 'Failed to setup action recognition');
      }
      
      // Reset DTW recognition state on backend
      await fetch('http://127.0.0.1:8000/api/infer/reset/', {
        method: 'POST'
      });
      
      // Reset only reps, keep other data
      setCurrentResults(prev => ({ 
        ...prev, 
        reps: 0, 
        distance: 0, 
        state: 'OUT' 
      }));
      frameCountRef.current = 0;
      
      // Start DTW recognition loop
      setIsRecognitionActive(true);
      
      // Use a small delay to ensure state is updated before starting the interval
      setTimeout(() => {
        recognitionIntervalRef.current = setInterval(sendFrameForRecognition, 200); // 5 FPS
      }, 50);
      
    } catch (error) {
      console.error('Error setting up DTW recognition:', error);
      toast.error(`Failed to setup recognition: ${error.message}`);
    }
  };

  const stopRecognition = () => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    
    // Stop the exercise timer when recognition stops
    stopExerciseTimer();
    
    setIsRecognitionActive(false);
    setIsExercisePaused(true);
  };

  const resetSession = () => {
    stopRecognition();
    setCurrentResults({ reps: 0, distance: 0, state: 'OUT' });
  };

  // Load data on component mount
  useEffect(() => {
    fetchActiveTreatment();
    return () => {
      stopCamera();
      stopRecognition();
      // Clear rest timer
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
      }
      // Clear exercise timer
      if (exerciseTimerRef.current) {
        clearInterval(exerciseTimerRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!activeTreatment) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Exercise Center
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          AI-powered action recognition and exercise tracking
        </Typography>
        
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <InfoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Treatment Plans Available
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You don't have any active treatment plans yet. Please contact your therapist to get started.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Treatment Plan Title and Start Exercise Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {activeTreatment && (
          <Typography variant="h4" gutterBottom>
            Treatment Plan for {activeTreatment.name}
          </Typography>
        )}
        
        {/* Start Exercise Button - Top Right */}
        <Button
          variant={allExercisesCompleted ? 'contained' : (isRecognitionActive ? 'outlined' : 'contained')}
          startIcon={allExercisesCompleted ? <CheckIcon /> : (isRecognitionActive ? <StopIcon /> : <PlayIcon />)}
          onClick={allExercisesCompleted ? null : (isRecognitionActive ? stopRecognition : (isResting ? endRestPeriod : startExercise))}
          disabled={!selectedExercise || allExercisesCompleted}
          color={allExercisesCompleted ? 'success' : (isRecognitionActive ? 'error' : (isResting ? 'warning' : 'success'))}
          size="large"
          sx={{ py: 1.5, px: 4 }}
        >
          {allExercisesCompleted ? 
            `All Exercises Completed! 🎉` : 
            (isResting ? 
              `Continue Exercise (${restTimeLeft}s) - ${currentExerciseIndex + 1}/${treatmentExercises.length}` : 
              (isRecognitionActive ? 
                `Stop Exercise - ${currentExerciseIndex + 1}/${treatmentExercises.length}` : 
                (isExercisePaused ? 
                  `Continue Exercise - ${currentExerciseIndex + 1}/${treatmentExercises.length}` : 
                  `Start Exercise - ${currentExerciseIndex + 1}/${treatmentExercises.length}`
                )
              )
            )
          }
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Left Panel - Video Feed */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              {/* Exercise Name and Description */}
              {selectedExercise ? (
                <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(25, 118, 210, 0.04)', borderRadius: 1 }}>
                  <Typography variant="h5" gutterBottom color="primary">
                    {selectedExercise.exercise_name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {selectedExercise.instructions || 'No instructions available'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip label={selectedExercise.category} size="small" />
                    <Chip label={selectedExercise.difficulty} size="small" color="secondary" />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Please select an exercise to start
                  </Typography>
                </Box>
              )}
              
              <Typography variant="h6" gutterBottom>
                Live Video Feed
              </Typography>
              
              <Box sx={{ 
                position: 'relative', 
                width: '100%',
                height: 480,
                overflow: 'hidden',
                borderRadius: 1,
                backgroundColor: '#f5f5f5'
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
                
                {/* Hidden canvas for frame capture */}
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
                      borderRadius: 1
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

        {/* Right Panel - Exercises and Controls */}
        <Grid item xs={12} md={5}>
          <Stack spacing={2}>

            {/* Demo Video */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Demo Video
                </Typography>
                {selectedExercise?.demo_video_url ? (
                  <Box sx={{ 
                    width: '100%', 
                    height: 300, 
                    borderRadius: 2, 
                    overflow: 'hidden',
                    backgroundColor: '#f0f0f0',
                    border: '2px solid #e0e0e0'
                  }}>
                    <video
                      ref={demoVideoRef}
                      controls
                      autoPlay
                      loop
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    >
                      <source 
                        src={selectedExercise.demo_video_url.startsWith('http') 
                          ? selectedExercise.demo_video_url 
                          : `http://127.0.0.1:8000${selectedExercise.demo_video_url}`} 
                        type="video/mp4" 
                      />
                      <source 
                        src={selectedExercise.demo_video_url.startsWith('http') 
                          ? selectedExercise.demo_video_url 
                          : `http://127.0.0.1:8000${selectedExercise.demo_video_url}`} 
                        type="video/webm" 
                      />
                      Your browser does not support the video tag.
                    </video>
                  </Box>
                ) : (
                  <Box sx={{ 
                    width: '100%', 
                    height: 300, 
                    borderRadius: 2, 
                    overflow: 'hidden',
                    backgroundColor: '#f0f0f0',
                    border: '2px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography color="text.secondary">
                      No demo video available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>


            {/* Current Results */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Current Results - Exercise {currentExerciseIndex + 1} of {treatmentExercises.length}
                </Typography>
                
                <Stack spacing={2}>
                  {/* Current Reps vs Target */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary" fontWeight="bold" sx={{ fontSize: '2.5rem' }}>
                      {currentResults.reps}/{selectedExercise?.reps_per_set || 0}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Repetitions
                    </Typography>
                  </Box>
                  
                  {/* Current Sets vs Target */}
                  {selectedExercise?.sets && (
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="secondary" fontWeight="bold">
                        {Math.floor(currentResults.reps / (selectedExercise.reps_per_set || 1))}/{selectedExercise.sets}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Sets Completed
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Total Time Used */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="success.main" fontWeight="bold">
                      {formatTime(exerciseTime)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Time Used
                    </Typography>
                  </Box>
                  
                  {/* Rest Timer */}
                  {isResting && (
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 2, 
                      backgroundColor: 'warning.50', 
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: 'warning.200'
                    }}>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {restTimeLeft}s
                      </Typography>
                      <Typography variant="body1" color="warning.dark">
                        Rest Time Remaining
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Motivational Message */}
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: 2, 
                    backgroundColor: isResting ? 'warning.50' : 'primary.50', 
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: isResting ? 'warning.200' : 'primary.200'
                  }}>
                    <Typography variant="h6" color={isResting ? 'warning.main' : 'primary.main'} fontWeight="bold">
                      {isResting ? 
                        (currentExerciseIndex + 1 < treatmentExercises.length ? 
                          `🏆 Great job! Rest for ${restTimeLeft}s, then click "Continue Exercise" for next exercise!` :
                          `🎉 Congratulations! You completed all exercises! Rest for ${restTimeLeft}s to finish.`
                        ) : 
                        getMotivationalMessage(currentResults.reps, selectedExercise?.reps_per_set || 0)
                      }
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatientExercisePage;
