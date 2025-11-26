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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
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
  Pause as PauseIcon,
  FiberManualRecord as RecordIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

const PatientExercisePage = () => {
  // State management
  const [activeTreatment, setActiveTreatment] = useState(null);
  const [treatmentExercises, setTreatmentExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasExercisedToday, setHasExercisedToday] = useState(false);
  const [todayCompletedExercises, setTodayCompletedExercises] = useState([]);
  const [showStopDialog, setShowStopDialog] = useState(false);
  
  // Camera and recognition states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [isExercisePaused, setIsExercisePaused] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  
  // Exercise timer states
  const [exerciseTime, setExerciseTime] = useState(0);
  const [allExercisesCompleted, setAllExercisesCompleted] = useState(false);
  const [exerciseStartTime, setExerciseStartTime] = useState(null);
  const [pauseCount, setPauseCount] = useState(0);
  const [repetitionTimes, setRepetitionTimes] = useState([]);
  const [currentResults, setCurrentResults] = useState({
    reps: 0,
    distance: 0,
    state: 'OUT',
    totalTime: 0,
    startTime: null,
    exerciseStartTime: null
  });
  const [completedSets, setCompletedSets] = useState(0);
  const [restTarget, setRestTarget] = useState('nextExercise'); // 'nextExercise' | 'sameExercise'
  const [currentRepTime, setCurrentRepTime] = useState(0); // Track current rep duration in seconds
  
  // Video refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const demoVideoRef = useRef(null);
  const recognitionIntervalRef = useRef(null);
  const frameCountRef = useRef(0);
  const restTimerRef = useRef(null);
  const exerciseTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const pausedRepsRef = useRef(0); // Store reps count when paused
  const lastRepsRef = useRef(0); // Track last reps count to detect new repetition
  const currentRepStartTimeRef = useRef(null); // Track when current repetition started
  const sessionStartTimeRef = useRef(null); // Track entire exercise session start
  const totalRepsRef = useRef(0); // Track total reps across sets
  const totalActiveDurationRef = useRef(0); // Track total active duration (seconds)
  const totalPauseCountRef = useRef(0); // Track total pauses across sets
  const nextSetShouldResetRef = useRef(false); // Ensure backend resets before new set
  const repetitionTimesRef = useRef([]); // Mirror of repetitionTimes state for immediate reads

  const addRepetitionTime = (duration) => {
    repetitionTimesRef.current = [...repetitionTimesRef.current, duration];
    setRepetitionTimes(prev => [...prev, duration]);
  };

  const resetRepetitionTimes = () => {
    repetitionTimesRef.current = [];
    setRepetitionTimes([]);
  };
  
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
        const backendReps = result.reps || 0;
        
        // If we have paused reps, add them to the backend reps (continue from where we paused)
        const newReps = pausedRepsRef.current + backendReps;
        const overallReps = totalRepsRef.current + newReps;
        // console.log('📊 Reps calculation:', {
        //   pausedReps: pausedRepsRef.current,
        //   backendReps: backendReps,
        //   totalReps: newReps
        // });
        
        // Detect if a new repetition was completed
        if (newReps > lastRepsRef.current) {
          // A new repetition was completed
          if (currentRepStartTimeRef.current !== null) {
            // Calculate time taken for the completed repetition
            const repDuration = (Date.now() - currentRepStartTimeRef.current) / 1000; // in seconds
            console.log(`✅ Repetition ${newReps} completed in ${repDuration.toFixed(2)}s`);
            
            // Add to repetition_times array
            if (repetitionTimesRef.current.length < overallReps) {
              addRepetitionTime(repDuration);
            }
          }
          
          // Start timing for the next repetition
          currentRepStartTimeRef.current = Date.now();
          lastRepsRef.current = newReps;
        } else if (newReps === 0 && lastRepsRef.current > 0) {
          // Reset if reps went back to 0 (new exercise)
          currentRepStartTimeRef.current = Date.now();
          lastRepsRef.current = 0;
        } else if (currentRepStartTimeRef.current === null && newReps === 0) {
          // First time, start tracking
          currentRepStartTimeRef.current = Date.now();
        }
        
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
          
          // Record the last repetition time if we just reached the target
          if (currentRepStartTimeRef.current !== null) {
            const finalRepDuration = (Date.now() - currentRepStartTimeRef.current) / 1000;
            if (repetitionTimesRef.current.length < overallReps) {
              addRepetitionTime(finalRepDuration);
            }
          }
          
          stopRecognition();
          
          // Save exercise record first, then check if treatment is complete before rest
          // Pass newReps directly to avoid state update timing issues
          handleExerciseCompletion(newReps);
        }
        
        // Update frame count
        frameCountRef.current += 1;
      }
    } catch (error) {
      console.error('Error in DTW recognition:', error);
    }
  };

  // Save exercise record to database
  const saveExerciseRecord = async (
    completedReps = null,
    completedSetNumber = selectedExercise?.sets || completedSets,
    options = { shouldSend: true, label: '' }
  ) => {
    // Use passed reps value or fallback to current aggregate reps
    const repsToSave =
      completedReps !== null
        ? completedReps
        : (totalRepsRef.current > 0 ? totalRepsRef.current : currentResults.reps);
    
    console.log('🔵 saveExerciseRecord called');
    console.log('🔵 selectedExercise:', selectedExercise);
    console.log('🔵 completedReps (parameter):', completedReps);
    console.log('🔵 completedSetNumber (parameter):', completedSetNumber);
    console.log('🔵 currentResults.reps:', currentResults.reps);
    console.log('🔵 totalRepsRef.current:', totalRepsRef.current);
    console.log('🔵 repsToSave (will be used):', repsToSave);
    console.log('🔵 options:', options);
    
    if (!selectedExercise || !repsToSave) {
      console.log('❌ saveExerciseRecord: Missing required data, returning early');
      console.log('   - selectedExercise:', !!selectedExercise);
      console.log('   - repsToSave:', repsToSave);
      return;
    }
    
    try {
      const endTime = new Date();
      
      // Calculate total duration across sets (prefer aggregated active duration)
      let calculatedTotalDuration = Math.round(totalActiveDurationRef.current || 0);
      if (!calculatedTotalDuration || calculatedTotalDuration <= 0) {
        if (sessionStartTimeRef.current) {
          calculatedTotalDuration = Math.floor((endTime - sessionStartTimeRef.current) / 1000);
        } else if (exerciseStartTime) {
          calculatedTotalDuration = Math.floor((endTime - exerciseStartTime) / 1000);
        } else {
          calculatedTotalDuration = exerciseTime;
        }
      }
      
      const pauseCountToSave = totalPauseCountRef.current ?? pauseCount;
      const repetitionTimesToSave =
        repetitionTimesRef.current.length > 0 ? repetitionTimesRef.current : null;
      const sessionStartTime = sessionStartTimeRef.current || exerciseStartTime;
      const averageDuration =
        repsToSave > 0 && calculatedTotalDuration
          ? Number((calculatedTotalDuration / repsToSave).toFixed(2))
          : null;
      
      const recordData = {
        treatment_exercise_id: selectedExercise.treatment_exercise_id,
        patient_id: currentUserId,
        repetitions_completed: repsToSave,
        sets_completed: completedSetNumber,
        start_time: sessionStartTime ? sessionStartTime.toISOString() : null,
        end_time: endTime.toISOString(),
        total_duration: calculatedTotalDuration,
        pause_count: pauseCountToSave,
        avg_duration: averageDuration,
        repetition_times: repetitionTimesToSave
      };

      console.log('📝 Exercise Record Snapshot', {
        label: options.label || 'final',
        shouldSend: options.shouldSend,
        recordData
      });

      if (!options.shouldSend) {
        console.log('ℹ️ Skipping API call (logging only).');
        return;
      }

      console.log('📤 Sending exercise record to API:', recordData);
      console.log('📤 API URL: http://127.0.0.1:8000/api/save-exercise-record/');

      const response = await fetch('http://127.0.0.1:8000/api/save-exercise-record/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Exercise record saved successfully:', responseData);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save exercise record:', errorData);
      }
    } catch (error) {
      console.error('❌ Error saving exercise record:', error);
      console.error('   Error details:', error.message);
      console.error('   Error stack:', error.stack);
    }
  };

  // Handle exercise completion: save data first, then check if treatment is complete
  const handleExerciseCompletion = async (completedReps) => {
    console.log('🟢 handleExerciseCompletion called');
    console.log('🟢 completedReps:', completedReps);
    console.log('🟢 currentExerciseIndex:', currentExerciseIndex);
    console.log('🟢 treatmentExercises.length:', treatmentExercises.length);
    
    const totalSetsForExercise = selectedExercise?.sets || 1;
    const repsPerSet = selectedExercise?.reps_per_set || 1;
    
    // Update aggregate trackers
    totalRepsRef.current += completedReps || 0;
    totalActiveDurationRef.current += Number(exerciseTime || 0);
    
    // Calculate actual completed sets based on total reps completed
    // Use Math.ceil to count sets that have been started (even if not fully completed)
    // Example: 5 reps / 5 reps per set = 1 set, 6 reps / 5 reps per set = 2 sets (second set started)
    const actualCompletedSets = Math.ceil(totalRepsRef.current / repsPerSet);
    // Cap at total sets for this exercise
    const actualSetsCompleted = Math.min(actualCompletedSets, totalSetsForExercise);
    
    // Update completed sets count for UI display
    const nextCompletedSetNumber = Math.min(completedSets + 1, totalSetsForExercise);
    setCompletedSets(nextCompletedSetNumber);
    
    const hasAdditionalSets = actualSetsCompleted < totalSetsForExercise;
    const nextExerciseIndex = currentExerciseIndex + 1;
    const hasNextExercise = nextExerciseIndex < treatmentExercises.length;
    
    const snapshotLabel = hasAdditionalSets
      ? `set-${actualSetsCompleted}-partial`
      : `set-${actualSetsCompleted}-final`;
    const shouldSend = !hasAdditionalSets;
    
    // Save with actual completed sets (based on reps, not counter)
    await saveExerciseRecord(totalRepsRef.current, actualSetsCompleted, {
      shouldSend,
      label: snapshotLabel
    });
    
    if (hasAdditionalSets) {
      console.log(`🟢 Set ${nextCompletedSetNumber} completed. Preparing for next set.`);
      // toast.success(`Set ${nextCompletedSetNumber}/${totalSetsForExercise} completed! Rest up for the next set.`);
      startRestPeriod('sameExercise');
      return;
    }
    
    if (hasNextExercise) {
      console.log('🟢 Exercise completed. Preparing for next exercise.');
      // toast.success(`Great job! ${selectedExercise?.exercise_name || 'Exercise'} completed. Rest before the next exercise.`);
      // Don't reset completedSets here - keep it to show user they completed all sets
      // It will be reset when moving to next exercise in endRestPeriod
      resetRepetitionTimes();
      sessionStartTimeRef.current = null;
      totalRepsRef.current = 0;
      totalActiveDurationRef.current = 0;
      totalPauseCountRef.current = 0;
      startRestPeriod('nextExercise');
      return;
    }
    
    // All exercises completed - no need for rest period
    console.log('🟢 All exercises completed!');
    
    // Stop exercise timer when all exercises are completed
    stopExerciseTimer();
    
    // Stop recognition if still running
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
      setIsRecognitionActive(false);
    }
    
    setAllExercisesCompleted(true);
    
    // Reset aggregates for safety
    sessionStartTimeRef.current = null;
    totalRepsRef.current = 0;
    totalActiveDurationRef.current = 0;
    totalPauseCountRef.current = 0;
    resetRepetitionTimes();
  };

  // Start rest period when target reps reached
  const startRestPeriod = (target = 'nextExercise') => {
    // Stop exercise timer when rest period starts
    stopExerciseTimer();
    
    // Clear any existing rest timer first
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    
    setRestTarget(target);
    if (target === 'sameExercise') {
      nextSetShouldResetRef.current = true;
    }
    
    // Set rest state
    setIsResting(true);
    setRestTimeLeft(60); // 60 seconds rest
    
    // Start rest timer
    restTimerRef.current = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          // Rest period finished
          setIsResting(false);
          setRestTimeLeft(0);
          if (restTimerRef.current) {
            clearInterval(restTimerRef.current);
            restTimerRef.current = null;
          }
          
          // Automatically start countdown after rest ONLY for same exercise (next set)
          if (target === 'sameExercise') {
            setTimeout(() => {
              startCountdown();
            }, 500);
          }
          // For next exercise, don't auto-start - let user see the new exercise info
          
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
    
    if (restTarget === 'sameExercise') {
      const upcomingSet = Math.min(completedSets + 1, selectedExercise?.sets || 1);
      
      // Reset states for the next set of the same exercise
      setExerciseStartTime(null);
      setPauseCount(0);
      setIsExercisePaused(false);
      pausedRepsRef.current = 0;
      lastRepsRef.current = 0;
      currentRepStartTimeRef.current = null;
      resetExerciseTimer();
      
      setCurrentResults(prev => ({
        ...prev,
        reps: 0,
        state: 'OUT'
      }));
      
      setRestTarget('nextExercise');
      
      // Start countdown automatically for same exercise (next set)
      setTimeout(() => {
        startCountdown();
      }, 500);
      return;
    }
    
    // Check if there are more exercises
    const nextExerciseIndex = currentExerciseIndex + 1;
    if (nextExerciseIndex < treatmentExercises.length) {
      // Move to next exercise
      setCurrentExerciseIndex(nextExerciseIndex);
      const nextExercise = treatmentExercises[nextExerciseIndex];
      setSelectedExercise(nextExercise);
      setCompletedSets(0);
      
      console.log('🔄 Switching to next exercise:', nextExercise.exercise_name);
      console.log('🔄 Next exercise action_id:', nextExercise.action_id);
      
      // Reset states for next exercise
      setExerciseStartTime(null);
      setPauseCount(0);
      setIsExercisePaused(false); // Ensure pause state is reset for next exercise
      resetRepetitionTimes();
      pausedRepsRef.current = 0; // Reset paused reps for next exercise
      lastRepsRef.current = 0; // Reset repetition tracking
      currentRepStartTimeRef.current = null; // Reset repetition timing
      resetExerciseTimer();
      sessionStartTimeRef.current = null;
      totalRepsRef.current = 0;
      totalActiveDurationRef.current = 0;
      totalPauseCountRef.current = 0;
      
      // Reset reps for next exercise
      setCurrentResults(prev => ({
        ...prev,
        reps: 0,
        state: 'OUT'
      }));
      
      // DON'T auto-start countdown for new exercise - let user see what's next
      // User needs to manually click "Start Exercise" for new exercise
    } else {
      // All exercises completed
      setAllExercisesCompleted(true);
    }
    
    setRestTarget('nextExercise');
  };

  // Check if user has exercised today
  const checkTodayExercise = async () => {
    try {
      const now = new Date();
      // Create separate Date objects for start and end
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const startIso = startOfDay.toISOString();
      const endIso = endOfDay.toISOString();
      
      console.log('🔍 Checking today\'s exercises:', {
        startOfDay: startIso,
        endOfDay: endIso
      });
      
      const response = await fetch(
        `http://127.0.0.1:8000/api/patient-exercise-records/${currentUserId}/?start_date=${startIso}&end_date=${endIso}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('📅 Today\'s exercise records:', data);
        
        if (data && data.length > 0) {
          // User has exercised today
          setHasExercisedToday(true);
          setTodayCompletedExercises(data);
          // toast.info('You have already completed your exercises today! Great job! 🎉');
        } else {
          setHasExercisedToday(false);
          setTodayCompletedExercises([]);
        }
      }
    } catch (error) {
      console.error('Error checking today\'s exercise:', error);
      // Don't block user if API fails
      setHasExercisedToday(false);
    }
  };

  // Fetch patient's active treatment
  const fetchActiveTreatment = async () => {
    try {
      setIsLoading(true);
      
      // Check if user has exercised today first
      await checkTodayExercise();
      
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
        // Don't show toast if no treatment plan, just set to null
        setActiveTreatment(null);
        console.error('Failed to load treatment plan:', response.status);
      }
    } catch (error) {
      console.error('Error fetching treatment:', error);
      // Don't show toast if no treatment plan, just set to null
      setActiveTreatment(null);
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
          setCompletedSets(0);
          resetRepetitionTimes();
          setExerciseStartTime(null);
          setPauseCount(0);
          setIsExercisePaused(false); // Reset pause state when loading exercises
          setIsResting(false); // Reset rest state
          setRestTimeLeft(0); // Reset rest timer
          setAllExercisesCompleted(false); // Reset completion state
          sessionStartTimeRef.current = null;
          totalRepsRef.current = 0;
          totalActiveDurationRef.current = 0;
          totalPauseCountRef.current = 0;
          pausedRepsRef.current = 0;
          lastRepsRef.current = 0;
          currentRepStartTimeRef.current = null;
        }
        // No toast if no exercises - just show empty state
      } else {
        // Don't show toast if no exercises, just set empty array
        setTreatmentExercises([]);
        console.error('Failed to load exercises:', response.status);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      // Don't show toast if no exercises, just set empty array
      setTreatmentExercises([]);
    }
  };

  // No need for treatment selection since there's only one active treatment

  // Handle exercise selection
  const handleExerciseSelect = (exercise) => {
    setSelectedExercise(exercise);
    setCompletedSets(0);
    resetRepetitionTimes();
    setExerciseStartTime(null);
    setPauseCount(0);
    setIsExercisePaused(false); // Reset pause state when manually selecting exercise
    sessionStartTimeRef.current = null;
    totalRepsRef.current = 0;
    totalActiveDurationRef.current = 0;
    totalPauseCountRef.current = 0;
    pausedRepsRef.current = 0;
    lastRepsRef.current = 0;
    currentRepStartTimeRef.current = null;
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
      
      // Save pause state before changing it
      const wasPaused = isExercisePaused;
      
      // Start exercise timer (either for new exercise or continuing paused exercise)
      if (!wasPaused) {
        // Starting (or restarting) exercise without pause
        const startDateTime = new Date();
        setExerciseStartTime(startDateTime);
        setPauseCount(0);
        lastRepsRef.current = 0;
        currentRepStartTimeRef.current = null;
        pausedRepsRef.current = 0;
        startExerciseTimer();
        
        const startTime = startDateTime.toLocaleTimeString();
        const exerciseStartTime = Date.now();
        
        setCurrentResults(prev => ({
          ...prev,
          startTime: startTime,
          exerciseStartTime: exerciseStartTime,
          totalTime: 0
        }));
        
        if (completedSets === 0) {
          // Brand new exercise session - reset aggregate trackers
          sessionStartTimeRef.current = startDateTime;
          totalRepsRef.current = 0;
          totalActiveDurationRef.current = 0;
          totalPauseCountRef.current = 0;
          resetRepetitionTimes();
        }
      } else {
        // Increment pause count when continuing from a paused exercise
        setPauseCount(prev => prev + 1);
        totalPauseCountRef.current += 1;
        
        // Continuing paused exercise - resume timer without resetting time
        // Timer is already stopped by stopExerciseTimer, so restart it
        exerciseTimerRef.current = setInterval(() => {
          setExerciseTime(prev => prev + 1);
        }, 1000);
      }
      
      setIsExercisePaused(false);
      
      // Start camera and wait for it to be ready
      await startCamera();
      
      // Start recognition immediately after camera is ready
      // Only reset reps if starting a new exercise (not paused)
      await startRecognition(!wasPaused);
      
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
  const startRecognition = async (shouldResetReps = true) => {
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
      console.log('🎯 Setting up recognition for action_id:', selectedExercise.action_id);
      console.log('🎯 Exercise name:', selectedExercise.exercise_name);
      
      // Setup DTW recognizer for the linked action
      const setupResponse = await fetch(`http://127.0.0.1:8000/api/actions/${selectedExercise.action_id}/setup/`, {
        method: 'POST'
      });
      
      if (!setupResponse.ok) {
        const errorData = await setupResponse.json();
        throw new Error(errorData.error || 'Failed to setup action recognition');
      }
      
      console.log('✅ Recognition setup successful for:', selectedExercise.exercise_name);
      
      const forceResetForNextSet = nextSetShouldResetRef.current;
      const shouldPerformReset = shouldResetReps || forceResetForNextSet;
      
      // Only reset backend DTW recognition state if starting a new exercise or new set
      if (shouldPerformReset) {
        console.log('🔄 Resetting recognition (new exercise/set)');
        await fetch('http://127.0.0.1:8000/api/infer/reset/', {
          method: 'POST'
        });
        
        // Reset reps and frame count for new exercise
        setCurrentResults(prev => ({ 
          ...prev, 
          reps: 0, 
          distance: 0, 
          state: 'OUT' 
        }));
        frameCountRef.current = 0;
        pausedRepsRef.current = 0; // Reset paused reps for new exercise
        lastRepsRef.current = 0; // Reset repetition tracking
        currentRepStartTimeRef.current = Date.now(); // Start timing for first repetition
        nextSetShouldResetRef.current = false;
      } else {
        console.log('▶️ Continuing recognition (paused exercise resumed)');
        console.log('   - Previous reps saved:', pausedRepsRef.current);
        console.log('   - Will add to backend reps when recognition starts');
        // Don't reset backend or frontend state when resuming from pause
        // pausedRepsRef.current already has the saved value from stopRecognition
        if (currentRepStartTimeRef.current === null) {
          currentRepStartTimeRef.current = Date.now();
        }
      }
      
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
    
    // Save current reps count when pausing
    pausedRepsRef.current = currentResults.reps;
    console.log('⏸️ Paused - saved reps count:', pausedRepsRef.current);
    
    // Stop the exercise timer when recognition stops
    stopExerciseTimer();
    
    setIsRecognitionActive(false);
    setIsExercisePaused(true);
  };

  const resetSession = () => {
    stopRecognition();
    setCurrentResults({ reps: 0, distance: 0, state: 'OUT' });
  };

  // Start countdown before exercise
  const startCountdown = async () => {
    setIsCountingDown(true);
    setCountdownValue(3);
    
    // Countdown timer
    for (let i = 3; i > 0; i--) {
      setCountdownValue(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsCountingDown(false);
    
    // Automatically start exercise after countdown
    await startExercise();
  };

  // Manual rep increment for testing
  const handleManualRepIncrement = async () => {
    if (!selectedExercise) return;
    
    const newReps = currentResults.reps + 1;
    const overallReps = totalRepsRef.current + newReps;
    
    // Use current rep time if available, otherwise use a default
    const repDuration = currentRepTime > 0 ? currentRepTime : 3.0;
    
    // Add repetition time
    if (repetitionTimesRef.current.length < overallReps) {
      addRepetitionTime(repDuration);
    }
    
    // Update tracking refs
    lastRepsRef.current = newReps;
    currentRepStartTimeRef.current = Date.now(); // Start timing for next rep
    
    // IMPORTANT: Tell backend to reset, then immediately update pausedReps
    // This ensures backend starts counting from 0, and we add our manual count on top
    try {
      await fetch('http://127.0.0.1:8000/api/infer/reset/', {
        method: 'POST'
      });
      // After reset, backend will count from 0
      // So we set pausedReps to our manual count
      pausedRepsRef.current = newReps;
    } catch (error) {
      console.error('Failed to reset backend:', error);
    }
    
    setCurrentResults(prev => ({
      ...prev,
      reps: newReps
    }));
    
    console.log(`🧪 Manual rep added: ${newReps}/${selectedExercise.reps_per_set}`);
    
    // Check if target reached
    if (newReps >= selectedExercise.reps_per_set) {
      console.log('🎯 Manual target reached!');
      // Stop recognition immediately to prevent backend from resetting
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
        setIsRecognitionActive(false);
      }
      // Trigger the same logic as automatic completion
      setTimeout(() => {
        handleExerciseCompletion(newReps);
      }, 500);
    }
  };

  // Handle force stop exercise (when user is too tired to continue)
  const handleStopExercise = async () => {
    console.log('🛑 Force stopping exercise...');
    
    // Close dialog
    setShowStopDialog(false);
    
    // Stop all timers and recognition
    stopRecognition();
    stopExerciseTimer();
    
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    
    // Get current reps (even if not completed target)
    const currentReps = totalRepsRef.current > 0 ? totalRepsRef.current : currentResults.reps;
    
    if (currentReps > 0) {
      // Save whatever progress has been made
      console.log(`💾 Saving partial progress: ${currentReps} reps`);
      
      // Calculate actual completed sets based on reps completed
      // Use Math.ceil to count sets that have been started (even if not fully completed)
      const repsPerSet = selectedExercise?.reps_per_set || 1;
      const totalSetsForExercise = selectedExercise?.sets || 1;
      const actualSetsCompleted = Math.min(Math.ceil(currentReps / repsPerSet), totalSetsForExercise);
      const currentSetNumber = Math.max(1, actualSetsCompleted); // At least 1 set (if any reps completed)
      
      await saveExerciseRecord(currentReps, currentSetNumber, {
        shouldSend: true,
        label: 'forced-stop'
      });
      
      toast.info(`Exercise stopped. Progress saved: ${currentReps} reps completed.`);
      
      // Re-check if user has exercised today to prevent duplicate exercises
      await checkTodayExercise();
    } else {
      toast.info('Exercise stopped. No progress to save.');
    }
    
    // Reset to initial state
    setIsRecognitionActive(false);
    setIsExercisePaused(false);
    setIsResting(false);
    setRestTimeLeft(0);
    setCompletedSets(0);
    setExerciseTime(0);
    setPauseCount(0);
    setCurrentRepTime(0);
    setCurrentResults({
      reps: 0,
      distance: 0,
      state: 'OUT',
      totalTime: 0,
      startTime: null,
      exerciseStartTime: null
    });
    
    // Reset refs
    totalRepsRef.current = 0;
    totalActiveDurationRef.current = 0;
    totalPauseCountRef.current = 0;
    pausedRepsRef.current = 0;
    lastRepsRef.current = 0;
    sessionStartTimeRef.current = null;
    resetRepetitionTimes();
    
    console.log('✅ Exercise force stopped and state reset');
  };

  // Track current rep time
  useEffect(() => {
    if (isRecognitionActive && currentRepStartTimeRef.current) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - currentRepStartTimeRef.current) / 1000;
        setCurrentRepTime(elapsed);
      }, 100); // Update every 100ms for smooth display
      
      return () => clearInterval(interval);
    } else {
      setCurrentRepTime(0);
    }
  }, [isRecognitionActive, currentResults.reps]); // Reset when reps change

  // Load data on component mount
  useEffect(() => {
    // Reset all states when component mounts (navigation from other pages)
    setIsExercisePaused(false);
    setIsResting(false);
    setRestTimeLeft(0);
    setIsCountingDown(false);
    setCountdownValue(3);
    setAllExercisesCompleted(false);
    setCompletedSets(0);
    setExerciseTime(0);
    setPauseCount(0);
    setCurrentRepTime(0);
    setCurrentResults({
      reps: 0,
      distance: 0,
      state: 'OUT',
      totalTime: 0,
      startTime: null,
      exerciseStartTime: null
    });
    
    // Fetch treatment data
    fetchActiveTreatment();
    
    // Cleanup on unmount
    return () => {
      stopCamera();
      stopRecognition();
      // Clear rest timer
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
      // Clear exercise timer
      if (exerciseTimerRef.current) {
        clearInterval(exerciseTimerRef.current);
        exerciseTimerRef.current = null;
      }
      // Clear countdown timer
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
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

  if (!activeTreatment || (activeTreatment && treatmentExercises.length === 0)) {
    return (
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
          {/* Header Section */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
                Exercise Center
              </Typography>
            </Box>
          </Box>

          {/* Main Content */}
          <Paper
            elevation={1}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'grey.200',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <Box sx={{
              bgcolor: 'white',
              minHeight: 300,
              p: 3,
            }}>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <InfoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  No exercise for you
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {!activeTreatment 
                    ? "You don't have any active treatment plans yet. Please contact your therapist to get started."
                    : "There are no exercises assigned to your treatment plan. Please contact your therapist to get started."
                  }
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, overflow: 'hidden', height: '100vh' }}>
      {/* Header with Treatment Plan Title and Start Exercise Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {activeTreatment && (
          <Typography variant="h4" gutterBottom>
            {activeTreatment.name}
          </Typography>
        )}
        
        {/* Start Exercise Button - Top Right */}
        {!allExercisesCompleted && !hasExercisedToday && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Button
                variant={isRecognitionActive ? 'outlined' : 'contained'}
                startIcon={isRecognitionActive ? <PauseIcon /> : <PlayIcon />}
                onClick={isRecognitionActive ? stopRecognition : (isResting ? endRestPeriod : startExercise)}
                disabled={!selectedExercise || isCountingDown}
                color={isRecognitionActive ? 'warning' : (isResting ? 'warning' : 'success')}
                size="large"
                sx={{ py: 1.5, px: 4 }}
              >
                {isResting ? 
                  `Continue Exercise (${restTimeLeft}s) - ${currentExerciseIndex + 1}/${treatmentExercises.length}` : 
                  (isRecognitionActive ? 
                    `Pause Exercise - ${currentExerciseIndex + 1}/${treatmentExercises.length}` : 
                    (isExercisePaused ? 
                      `Continue Exercise - ${currentExerciseIndex + 1}/${treatmentExercises.length}` : 
                      `Start Exercise - ${currentExerciseIndex + 1}/${treatmentExercises.length}`
                    )
                  )
                }
              </Button>
              {!isCountingDown && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                  {isRecognitionActive ? 'Temporarily pause to rest' : (isExercisePaused ? 'Resume your exercise' : 'Begin your exercise session')}
                </Typography>
              )}
            </Box>
            
            {/* End Exercise Button (for when user is too tired) */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Button
                variant="outlined"
                color="error"
                size="large"
                startIcon={<StopIcon />}
                onClick={() => setShowStopDialog(true)}
                disabled={(!isRecognitionActive && !isExercisePaused && !isResting) || isCountingDown}
                sx={{ py: 1.5, px: 4 }}
              >
                End Exercise
              </Button>
              {!isCountingDown && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                  {(isRecognitionActive || isExercisePaused || isResting) ? 'Stop completely & save progress' : 'End session when unable to continue'}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
      
      {/* Countdown Display - Fixed at Top Center */}
      {isCountingDown && (
        <Box sx={{ 
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          py: 1.5,
          px: 4,
          bgcolor: 'primary.main',
          borderRadius: 2,
          boxShadow: 6
        }}>
          <Typography variant="h3" color="white" fontWeight="bold">
            {countdownValue}
          </Typography>
          <Typography variant="body2" color="white" sx={{ opacity: 0.9 }}>
            Get Ready...
          </Typography>
        </Box>
      )}

      {/* Already Completed Today Alert */}
      {hasExercisedToday && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
          icon={<CheckIcon fontSize="large" />}
        >
          <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Exercise Session Completed
            </Typography>
            <Typography variant="body2">
              You have already completed your exercise session for today. Please allow adequate rest time for recovery. Your next session will be available tomorrow.
            </Typography>
          </Box>
        </Alert>
      )}

      {/* All Exercises Completed Card */}
      {allExercisesCompleted && (
        <Card 
          sx={{ 
            mb: 3,
            textAlign: 'center',
            bgcolor: 'success.50',
            border: '2px solid',
            borderColor: 'success.main',
            borderRadius: 3
          }}
        >
          <CardContent sx={{ py: 6 }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h3" fontWeight={700} color="success.dark" gutterBottom>
              Excellent Work!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              You've completed all exercises in today's treatment plan
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Your progress has been saved. Take time to rest and recover. 
              Your next exercise session will be available tomorrow.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button 
                variant="contained" 
                color="success" 
                size="large"
                onClick={() => window.location.reload()}
                startIcon={<RefreshIcon />}
              >
                View Summary
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Left Panel - Video Feed */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              {/* Exercise Name and Description */}
              {selectedExercise ? (
                <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(25, 118, 210, 0.04)', borderRadius: 2 }}>
                  <Typography variant="h5" color="primary" fontWeight={600} gutterBottom>
                    {selectedExercise.exercise_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {selectedExercise.instructions || 'No instructions available'}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Please select an exercise to start
                  </Typography>
                </Box>
              )}
              
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

              {/* Next Exercise Information Section */}
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Next Exercise
                  </Typography>
                  {(() => {
                    const nextExerciseIndex = currentExerciseIndex + 1;
                    const hasNextExercise = nextExerciseIndex < treatmentExercises.length;
                    const nextExercise = hasNextExercise ? treatmentExercises[nextExerciseIndex] : null;

                    if (!hasNextExercise) {
                      return (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            This is the last exercise
                          </Typography>
                        </Box>
                      );
                    }

                    return (
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Exercise Name
                          </Typography>
                          <Typography variant="h6" color="primary" fontWeight={600}>
                            {nextExercise?.exercise_name || 'Unknown'}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Target Reps
                          </Typography>
                          <Typography variant="h6" color="info.main" fontWeight={600}>
                            {nextExercise?.reps_per_set || 0} Reps
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Target Sets
                          </Typography>
                          <Typography variant="h6" color="secondary.main" fontWeight={600}>
                            {nextExercise?.sets || 0} Sets
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })()}
                </CardContent>
              </Card>
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
                      key={selectedExercise.exercise_id || selectedExercise.exercise_name}
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
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h6">
                    Exercise {currentExerciseIndex + 1} of {treatmentExercises.length}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleManualRepIncrement}
                    disabled={!isRecognitionActive && !isExercisePaused}
                  >
                    🧪 +1 Rep (Test)
                  </Button>
                </Box>
                
                <Stack spacing={2}>
                  {/* Reps and Sets in Grid Layout */}
                  <Grid container spacing={2}>
                    {/* Reps Section */}
                    <Grid item xs={6}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'primary.50', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'primary.200'
                      }}>
                        <Typography variant="h3" color="primary" fontWeight="bold">
                          {currentResults.reps}/{selectedExercise?.reps_per_set || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Repetitions
                        </Typography>
                        {/* Progress Bar */}
                        <Box sx={{ width: '100%', mt: 1.5 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={selectedExercise?.reps_per_set ? (currentResults.reps / selectedExercise.reps_per_set * 100) : 0}
                            sx={{ 
                              height: 8, 
                              borderRadius: 4,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                bgcolor: currentResults.reps >= selectedExercise?.reps_per_set ? 'success.main' : 'primary.main'
                              }
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                            {selectedExercise?.reps_per_set ? Math.round((currentResults.reps / selectedExercise.reps_per_set * 100)) : 0}% Complete
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    {/* Sets Section */}
                    <Grid item xs={6}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'secondary.50', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'secondary.200',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <Typography variant="h3" color="secondary" fontWeight="bold">
                          {completedSets}/{selectedExercise?.sets || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Completed Sets
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {/* Total Time and Pauses in Grid */}
                  <Grid container spacing={2}>
                    <Grid item xs={pauseCount > 0 ? 6 : 12}>
                      <Box sx={{ 
                        p: 1.5, 
                        bgcolor: 'success.50', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'success.200'
                      }}>
                        <Typography variant="h5" color="success.main" fontWeight="bold">
                          {formatTime(exerciseTime)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Time
                        </Typography>
                      </Box>
                    </Grid>
                    {pauseCount > 0 && (
                      <Grid item xs={6}>
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: 'warning.50', 
                          borderRadius: 2,
                          textAlign: 'center',
                          border: '1px solid',
                          borderColor: 'warning.200'
                        }}>
                          <Typography variant="h5" color="warning.main" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <PauseIcon sx={{ fontSize: 20 }} />
                            {pauseCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pauses
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                  
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* End Exercise Confirmation Dialog */}
      <Dialog
        open={showStopDialog}
        onClose={() => setShowStopDialog(false)}
        aria-labelledby="stop-dialog-title"
        aria-describedby="stop-dialog-description"
      >
        <DialogTitle id="stop-dialog-title" sx={{ color: 'error.main' }}>
          End Exercise?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="stop-dialog-description">
            Are you sure you want to end this exercise session? 
            <br /><br />
            Your current progress ({currentResults.reps > 0 ? `${currentResults.reps} reps` : 'no reps'}) will be saved, 
            but you won't complete the full exercise session.
            <br /><br />
            <strong>This should only be used if you're too tired or unable to continue safely.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStopDialog(false)} color="primary">
            Continue Exercise
          </Button>
          <Button onClick={handleStopExercise} color="error" variant="contained" autoFocus>
            Yes, End Exercise
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientExercisePage;
