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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  Divider,
} from "@mui/material";
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  SmartToy as SmartToyIcon,
  FitnessCenter as FitnessCenterIcon,
  CheckCircle as CheckIcon,
  Timer as TimerIcon,
  Repeat as RepeatIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  Info as InfoIcon,
  Pause as PauseIcon,
  FiberManualRecord as RecordIcon,
  Warning as WarningIcon,
  WhatsApp as WhatsAppIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

const REHAB_ENGINE_URL = process.env.REACT_APP_REHAB_ENGINE_URL || "http://127.0.0.1:8808";
const SUPPORTED_ACTIVITIES = [
  'hurdle_step',
  'idle',
  'inline_lunge',
  'jump',
  'run',
  'side_lunge',
  'sit_to_stand',
  'squats',
  'standing_shoulder_abduction',
  'standing_shoulder_extension',
  'standing_shoulder_internal_external_rotation',
  'standing_shoulder_scapation',
  'custom_elbow_flexion',
  'standing_shoulder_external_rotation_custom'
];
const ENABLED_CUSTOM_ACTIVITIES = new Set([
  'custom_elbow_flexion',
  'standing_shoulder_external_rotation_custom',
  'standing_shoulder_abduction',
  'standing_shoulder_extension'
]);
const SUPPORTED_ACTIVITIES_LABEL = SUPPORTED_ACTIVITIES.join(', ');
const ENGINE_HINT_TOAST_ID = 'engine-hint-toast';

const normalizeActivityValue = (value = '') =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');

const getCanonicalActivityName = (rawValue) => {
  if (typeof rawValue !== 'string') {
    return null;
  }
  const normalizedValue = normalizeActivityValue(rawValue);
  if (!normalizedValue) {
    return null;
  }
  return SUPPORTED_ACTIVITIES.find(
    (activity) => normalizeActivityValue(activity) === normalizedValue
  ) || null;
};

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
  const [patientEmergencyContact, setPatientEmergencyContact] = useState('');
  const [patientName, setPatientName] = useState('');
  
  // Camera and recognition states
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
    exerciseStartTime: null,
    targetReps: null,
    stopReason: null
  });
  const [completedSets, setCompletedSets] = useState(0);
  const [restTarget, setRestTarget] = useState('nextExercise'); // 'nextExercise' | 'sameExercise'
  const [currentRepTime, setCurrentRepTime] = useState(0); // Track current rep duration in seconds
  
  // Video refs
  const demoVideoRef = useRef(null);
  const recognitionIntervalRef = useRef(null);
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
  const lastEngineRepetitionTimesLengthRef = useRef(0); // Track last engine repetition_times length to detect resets
  const repSparcScoresRef = useRef([]); // Track SPARC smoothness scores per rep
  const lastEngineSparcScoresLengthRef = useRef(0); // Track last engine rep_sparc_scores length to detect resets
  const repRomScoresRef = useRef([]); // Track ROM per rep
  const lastEngineRomScoresLengthRef = useRef(0); // Track last engine rep_rom_scores length to detect resets
  const isSavingRef = useRef(false); // Prevent duplicate saves
  const lastSavedRepsRef = useRef(0); // Track last saved reps to prevent duplicate saves
  const engineWaitingRef = useRef(false);

  const totalExercises = treatmentExercises.length || activeTreatment?.exercise_count || 0;
  const completedExercisesCount = allExercisesCompleted
    ? totalExercises
    : Math.min(currentExerciseIndex, totalExercises);
  const isTreatmentActive = activeTreatment
    ? (() => {
        const start = activeTreatment.start_date ? new Date(activeTreatment.start_date) : null;
        const end = activeTreatment.end_date ? new Date(activeTreatment.end_date) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (start && today < start) {
          return false;
        }
        if (end && today > end) {
          return false;
        }
        return true;
      })()
    : false;
  const repsPerSet = selectedExercise?.reps_per_set || 0;
  const totalSets = selectedExercise?.sets || 0;
  const setProgressText =
    totalSets > 0 ? `${completedSets} / ${totalSets}` : '0 / 0';

  const addRepetitionTime = (duration) => {
    repetitionTimesRef.current = [...repetitionTimesRef.current, duration];
    setRepetitionTimes(prev => [...prev, duration]);
  };

  const resetRepetitionTimes = () => {
    repetitionTimesRef.current = [];
    setRepetitionTimes([]);
    lastEngineRepetitionTimesLengthRef.current = 0; // Reset tracking
  };
  
  const resetSparcScores = () => {
    repSparcScoresRef.current = [];
    lastEngineSparcScoresLengthRef.current = 0; // Reset tracking
  };
  
const resetRomScores = () => {
  repRomScoresRef.current = [];
  lastEngineRomScoresLengthRef.current = 0; // Reset tracking
};

  const resetRepMetrics = () => {
  resetRepetitionTimes();
  resetSparcScores();
  resetRomScores();
  };
  
  const dismissEngineToast = useCallback(() => {
    toast.dismiss(ENGINE_HINT_TOAST_ID);
  }, []);

  const showEngineStartToast = useCallback(() => {
    toast.dismiss(ENGINE_HINT_TOAST_ID);
    toast.info('Starting Rehab Engine... please hold steady (4-5s)', {
      toastId: ENGINE_HINT_TOAST_ID,
      autoClose: false,
      closeOnClick: false,
      draggable: false
    });
  }, []);

  const showEngineStartErrorToast = useCallback(() => {
    if (toast.isActive(ENGINE_HINT_TOAST_ID)) {
      toast.update(ENGINE_HINT_TOAST_ID, {
        render: 'Unable to start Rehab Engine. Please try again.',
        type: toast.TYPE.ERROR,
        autoClose: 5000
      });
    } else {
      toast.error('Unable to start Rehab Engine. Please try again.', {
        autoClose: 5000
      });
    }
  }, []);
  
  // Get current user info
  const currentUserId = localStorage.getItem("id");
  const currentUserRole = localStorage.getItem("role");

  useEffect(() => {
    const fetchPatientProfile = async () => {
      if (!currentUserId) return;
      try {
      const response = await fetch(`http://127.0.0.1:8000/api/get-user/${currentUserId}/`);
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
        const data = await response.json();
        setPatientName(
          data?.username ||
          [data?.first_name, data?.last_name].filter(Boolean).join(' ') ||
          'Patient'
        );
        setPatientEmergencyContact(data?.patient_profile?.emergency_contact || '');
      } catch (error) {
        console.error('Error fetching patient profile:', error);
      }
    };
    fetchPatientProfile();
  }, [currentUserId]);

  // Helper functions
  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return 'Not set';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

const getWhatsappLink = (contactNumber, message) => {
  if (!contactNumber) return null;
  let digitsOnly = contactNumber.replace(/\D/g, '');
  if (!digitsOnly) return null;

  // If number starts with a leading zero (e.g., Malaysian 0XX...), prepend country code 60
  if (digitsOnly.startsWith('0')) {
    digitsOnly = `60${digitsOnly.slice(1)}`;
  }

  const encodedMessage = message ? encodeURIComponent(message) : null;
  return `https://wa.me/${digitsOnly}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
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

  const handleEmergencyStop = () => {
          stopRecognition();
    const message = `-- Emergency Alert --\n${patientName || 'Patient'} triggered the emergency stop during a rehab session at ${new Date().toLocaleString()}. Please reach out immediately.`;
    const whatsappLink = getWhatsappLink(patientEmergencyContact, message);
    if (whatsappLink) {
      window.open(whatsappLink, '_blank', 'noopener,noreferrer');
    } else {
      toast.warn('Emergency contact number is unavailable.');
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
        repetition_times: repetitionTimesToSave,
        rep_sparc_scores: repSparcScoresRef.current.length > 0 ? repSparcScoresRef.current : null,
        rep_rom_scores: repRomScoresRef.current.length > 0 ? repRomScoresRef.current : null
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

  // Handle exercise completion: save data first, then check if treatment is complete
  const handleExerciseCompletion = useCallback(async (completedReps, isDurationExceeded = false) => {
    // Prevent duplicate calls
    if (isSavingRef.current) {
      console.log('⏸️ handleExerciseCompletion already in progress, skipping...');
      return;
    }
    
    // Check if we've already saved for this set
    // lastSavedRepsRef tracks the reps that were saved for the current set
    // If it's >= repsPerSet, we've already completed and saved this set
    // Skip this check if duration exceeded, as we need to proceed regardless
    const repsPerSet = selectedExercise?.reps_per_set || 1;
    if (!isDurationExceeded && lastSavedRepsRef.current >= repsPerSet) {
      console.log(`⏸️ Already saved for this set (last saved: ${lastSavedRepsRef.current}, repsPerSet: ${repsPerSet}), skipping...`);
      return;
    }
    
    console.log('🟢 handleExerciseCompletion called');
    console.log('🟢 completedReps:', completedReps);
    console.log('🟢 currentExerciseIndex:', currentExerciseIndex);
    console.log('🟢 treatmentExercises.length:', treatmentExercises.length);
    
    // Immediately stop recognition to prevent further count changes
    setIsRecognitionActive(false);
    setIsExercisePaused(false);
    pausedRepsRef.current = 0;
    
    isSavingRef.current = true;
    // Mark that we've saved for this set's reps
    // This prevents duplicate saves if status polling reports the same count multiple times
    lastSavedRepsRef.current = completedReps;
    
    try {
      const totalSetsForExercise = selectedExercise?.sets || 1;
      const repsPerSet = selectedExercise?.reps_per_set || 1;
      
      // Update aggregate trackers
      // completedReps is the reps for the CURRENT set that just finished
      totalRepsRef.current += completedReps || 0;
      totalActiveDurationRef.current += Number(exerciseTime || 0);
      
      // Calculate actual completed sets based on total reps completed
      // If at least 1 rep is completed, count as at least 1 set (even if less than repsPerSet)
      // Example: 1 rep / 5 reps per set = 1 set (first set started), 5 reps / 5 reps per set = 1 set (first set completed)
      let actualCompletedSets = Math.floor(totalRepsRef.current / repsPerSet);
      // If user did at least 1 rep, ensure at least 1 set is recorded
      if (totalRepsRef.current > 0 && actualCompletedSets === 0) {
        actualCompletedSets = 1;
      }
      // Cap at total sets for this exercise
      const actualSetsCompleted = Math.min(actualCompletedSets, totalSetsForExercise);
      
      console.log(`📊 Set completion check: totalReps=${totalRepsRef.current}, repsPerSet=${repsPerSet}, actualSetsCompleted=${actualSetsCompleted}, totalSetsForExercise=${totalSetsForExercise}`);
      
      // Update completed sets count for UI display
      const nextCompletedSetNumber = actualSetsCompleted;
      setCompletedSets(nextCompletedSetNumber);
      
      // Check if there are more sets to complete
      // If duration exceeded, skip to next exercise regardless of sets completion
      // Use actualSetsCompleted (after ensuring at least 1 set) for the check
      const hasAdditionalSets = isDurationExceeded ? false : (actualSetsCompleted < totalSetsForExercise);
      console.log(`📊 hasAdditionalSets=${hasAdditionalSets}, actualSetsCompleted=${actualSetsCompleted}, totalSetsForExercise=${totalSetsForExercise}, isDurationExceeded=${isDurationExceeded}`);
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
      
      if (hasAdditionalSets && !isDurationExceeded) {
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
        resetRepMetrics();
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
      setHasExercisedToday(true);
      
      // Reset aggregates for safety
      sessionStartTimeRef.current = null;
      totalRepsRef.current = 0;
      totalActiveDurationRef.current = 0;
      totalPauseCountRef.current = 0;
      resetRepMetrics();
    } finally {
      isSavingRef.current = false;
    }
  }, [selectedExercise, currentExerciseIndex, treatmentExercises, completedSets, exerciseTime]);

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
      
      lastSavedRepsRef.current = 0; // Reset saved reps tracking for new set
      
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
      
      // Reset states for next exercise
      setExerciseStartTime(null);
      setPauseCount(0);
      setIsExercisePaused(false); // Ensure pause state is reset for next exercise
      resetRepMetrics();
      pausedRepsRef.current = 0; // Reset paused reps for next exercise
      lastRepsRef.current = 0; // Reset repetition tracking
      currentRepStartTimeRef.current = null; // Reset repetition timing
      resetExerciseTimer();
      sessionStartTimeRef.current = null;
      totalRepsRef.current = 0;
      totalActiveDurationRef.current = 0;
      totalPauseCountRef.current = 0;
      
      lastSavedRepsRef.current = 0; // Reset saved reps tracking for new exercise
      isSavingRef.current = false; // Reset saving flag for new exercise
      
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
      console.log('🔄 Fetching active treatment for patient:', currentUserId);
      
      // Check if user has exercised today first
      await checkTodayExercise();
      
      const response = await fetch(`http://127.0.0.1:8000/api/patient-treatments/${currentUserId}/`);
      console.log('📡 GET /api/patient-treatments status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 patient treatments payload:', data);
        if (data.length > 0) {
          // Find treatment where today is within start_date and end_date range
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const currentTreatment = data.find(treatment => {
            if (!treatment.is_active) return false;
            
            const startDate = new Date(treatment.start_date);
            startDate.setHours(0, 0, 0, 0);
            
            // If no end_date, treatment is ongoing
            if (!treatment.end_date) {
              return startDate <= today;
            }
            
            const endDate = new Date(treatment.end_date);
            endDate.setHours(0, 0, 0, 0);
            
            return startDate <= today && today <= endDate;
          }) || data[0]; // If no treatment in current date range, use the first one (latest)
          
          setActiveTreatment(currentTreatment);
          fetchTreatmentExercises(currentTreatment.treatment_id);
        } else {
          console.warn('⚠️ No active treatments returned for patient.');
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
      console.log('🔄 Fetching exercises for treatment:', treatmentId);
      const response = await fetch(`http://127.0.0.1:8000/api/treatment-exercises/${treatmentId}/`);
      console.log('📡 GET /api/treatment-exercises status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 treatment exercises payload:', data);
        
        // Sort exercises by order_in_treatment
        const sortedExercises = data
          .sort((a, b) => {
            const orderA = a.order_in_treatment || 999;
            const orderB = b.order_in_treatment || 999;
            return orderA - orderB;
          });
        
        setTreatmentExercises(sortedExercises);
        
        // Auto-select the first exercise with linked action
        if (sortedExercises.length > 0) {
          setSelectedExercise(sortedExercises[0]);
          setCurrentExerciseIndex(0);
          setCompletedSets(0);
          resetRepMetrics();
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
          resetRepMetrics();
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
      
      // Start recognition immediately
      // Only reset reps if starting a new exercise (not paused)
      await startRecognition(!wasPaused);
      
    } catch (error) {
      console.error('Error starting exercise:', error);
      toast.error('Failed to start exercise');
    }
  };

  const pollRehabStatus = async () => {
    try {
      const response = await fetch(`${REHAB_ENGINE_URL}/status`);
      if (!response.ok) {
        throw new Error(`Status request failed: ${response.status}`);
      }

      const statusData = await response.json();
      if (Array.isArray(statusData.rep_sparc_scores)) {
        // Accumulate rep_sparc_scores across all sets instead of replacing
        const currentSparc = repSparcScoresRef.current || [];
        const newSparc = statusData.rep_sparc_scores || [];
        const lastSparcLength = lastEngineSparcScoresLengthRef.current;
        
        const engineWasReset = newSparc.length < lastSparcLength;
        
        if (engineWasReset) {
          // Engine was reset (new set started), append new scores to existing accumulated data
          if (newSparc.length > 0) {
            repSparcScoresRef.current = [...currentSparc, ...newSparc];
          }
          // If newSparc is empty (engine just reset), keep existing data
        } else if (newSparc.length > lastSparcLength) {
          // New scores have been added to current set, append only the new ones
          const newScores = newSparc.slice(lastSparcLength);
          repSparcScoresRef.current = [...currentSparc, ...newScores];
        }
        
        lastEngineSparcScoresLengthRef.current = newSparc.length;
      }
      if (Array.isArray(statusData.rep_rom_scores)) {
        // Accumulate rep_rom_scores across all sets instead of replacing
        const currentRom = repRomScoresRef.current || [];
        const newRom = statusData.rep_rom_scores || [];
        const lastRomLength = lastEngineRomScoresLengthRef.current;
        
        const engineWasReset = newRom.length < lastRomLength;
        
        if (engineWasReset) {
          // Engine was reset (new set started), append new scores to existing accumulated data
          if (newRom.length > 0) {
            repRomScoresRef.current = [...currentRom, ...newRom];
          }
          // If newRom is empty (engine just reset), keep existing data
        } else if (newRom.length > lastRomLength) {
          // New scores have been added to current set, append only the new ones
          const newScores = newRom.slice(lastRomLength);
          repRomScoresRef.current = [...currentRom, ...newScores];
        }
        
        lastEngineRomScoresLengthRef.current = newRom.length;
      }
      if (Array.isArray(statusData.repetition_times)) {
        // Accumulate repetition_times across all sets instead of replacing
        const currentTimes = repetitionTimesRef.current || [];
        const newTimes = statusData.repetition_times || [];
        const lastLength = lastEngineRepetitionTimesLengthRef.current;
        
        // Detect if engine was reset (new set started)
        // Engine reset is detected when newTimes.length < lastLength (engine went backwards)
        const engineWasReset = newTimes.length < lastLength;
        
        if (engineWasReset) {
          // Engine was reset (new set started), append new times to existing accumulated data
          if (newTimes.length > 0) {
            repetitionTimesRef.current = [...currentTimes, ...newTimes];
            setRepetitionTimes([...currentTimes, ...newTimes]);
          }
          // If newTimes is empty (engine just reset), keep existing data
        } else if (newTimes.length > lastLength) {
          // New reps have been added to current set, append only the new ones
          const newReps = newTimes.slice(lastLength);
          repetitionTimesRef.current = [...currentTimes, ...newReps];
          setRepetitionTimes([...currentTimes, ...newReps]);
        } else if (newTimes.length === lastLength && newTimes.length > 0) {
          // Same length - might be updated values, but we'll keep existing accumulated data
          // This prevents overwriting when engine sends same-length arrays during set transitions
        }
        
        // Update last length for next comparison
        lastEngineRepetitionTimesLengthRef.current = newTimes.length;
      }

      const backendReps = statusData.current_reps || 0;
      const newReps = pausedRepsRef.current + backendReps;
      const overallReps = totalRepsRef.current + newReps;
      const targetForExercise = selectedExercise?.reps_per_set || 0;
      const hasTarget = targetForExercise > 0;
      const hasReachedTarget = hasTarget && newReps >= targetForExercise;

      if (statusData.is_running) {
        engineWaitingRef.current = false;
        dismissEngineToast();
      }

      setCurrentResults(prev => ({
        ...prev,
        reps: newReps,
        state: statusData.is_running ? 'IN' : 'OUT',
        targetReps: statusData.target_reps ?? prev.targetReps ?? null,
        stopReason: statusData.stop_reason || null
      }));

      if (!statusData.is_running) {
        if (engineWaitingRef.current && !statusData.stop_reason) {
          return;
        }
        
        // Handle duration exceeded - complete exercise with current reps and move to next
        if (statusData.stop_reason === 'duration_exceeded' && !isSavingRef.current) {
          console.log('⏱️ Duration exceeded, completing exercise with', newReps, 'reps and moving to next');
          lastRepsRef.current = newReps;

          stopRecognition({ skipApi: true, overrideReps: newReps });
          // Complete exercise and proceed to next (skip remaining sets if any)
          handleExerciseCompletion(newReps, true); // Pass true to indicate duration exceeded
          return;
        }
        
        if (
          statusData.stop_reason === 'target_reached' &&
          hasReachedTarget &&
          lastSavedRepsRef.current < targetForExercise &&
          !isSavingRef.current
        ) {
          lastRepsRef.current = newReps;

          handleExerciseCompletion(newReps);
        }

        stopRecognition({ skipApi: true, overrideReps: newReps });
        if (!isRecognitionActive && newReps > 0) {
          setIsExercisePaused(true);
        }
        return;
      }

      if (hasReachedTarget) {
        stopRecognition({ skipApi: true, overrideReps: newReps });

        handleExerciseCompletion(newReps);
      }
    } catch (error) {
      console.error('Error polling Rehab Engine status:', error);
    }
  };

  // Recognition functions
  const startRecognition = async (shouldResetReps = true) => {
    if (!selectedExercise) {
      return;
    }
    
      const repsPerSetValue = Number(selectedExercise?.reps_per_set);
    const targetReps = Number.isFinite(repsPerSetValue) && repsPerSetValue > 0
      ? repsPerSetValue
      : null;
    const exerciseDuration = selectedExercise?.duration || 1; // Duration in minutes
    const rawActivityName =
      selectedExercise?.activity_name ||
      selectedExercise?.exercise_name ||
      selectedExercise?.name ||
      '';

    const activityName = getCanonicalActivityName(rawActivityName);

    if (!activityName) {
      console.error('[Rehab Engine] Unsupported activity name', {
        rawActivityName,
        supported: SUPPORTED_ACTIVITIES
      });
      toast.error(`Exercise must use one of: ${SUPPORTED_ACTIVITIES_LABEL}`);
      return;
    }
    
    if (!ENABLED_CUSTOM_ACTIVITIES.has(activityName)) {
      console.warn('[Rehab Engine] Activity not yet enabled', {
        activityName,
        rawActivityName,
        enabledActivities: Array.from(ENABLED_CUSTOM_ACTIVITIES)
      });
      toast.error('No supported exercise detected for this activity.');
      return;
    }

    engineWaitingRef.current = true;
    showEngineStartToast();

    console.log('[Rehab Engine] Starting recognition with activity:', {
      rawActivityName,
      activityName,
      selectedExercise,
      targetReps,
    });

    try {
      const forceResetForNextSet = nextSetShouldResetRef.current;
      const shouldPerformReset = shouldResetReps || forceResetForNextSet;
      const resumeRepsPayload =
        shouldPerformReset ? 0 : Math.max(pausedRepsRef.current || 0, 0);

      const response = await fetch(`${REHAB_ENGINE_URL}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity: activityName,
          ...(targetReps ? { target_reps: targetReps } : {}),
          ...(resumeRepsPayload ? { resume_reps: resumeRepsPayload } : {}),
          duration_minutes: exerciseDuration
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to start Rehab Engine');
      }
      
      const responseData = await response.json().catch(() => ({}));
      const engineTarget = responseData?.target_reps ?? targetReps ?? null;
      setCurrentResults(prev => ({
        ...prev,
        targetReps: engineTarget,
        stopReason: null
      }));
      
      
      if (shouldPerformReset) {
        isSavingRef.current = false;
        lastSavedRepsRef.current = 0;
        // Keep previously accumulated metrics so multiple sets share a single dataset
        lastEngineRepetitionTimesLengthRef.current = 0;
        lastEngineSparcScoresLengthRef.current = 0;
        lastEngineRomScoresLengthRef.current = 0;
        setCurrentResults(prev => ({ 
          ...prev, 
          reps: 0, 
          distance: 0, 
          state: 'OUT',
          stopReason: null,
          targetReps: engineTarget
        }));
        pausedRepsRef.current = 0;
        lastRepsRef.current = 0;
        currentRepStartTimeRef.current = Date.now();
        nextSetShouldResetRef.current = false;
      } else {
        if (currentRepStartTimeRef.current === null) {
          currentRepStartTimeRef.current = Date.now();
        }
      }
      
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
      recognitionIntervalRef.current = setInterval(() => {
        pollRehabStatus();
      }, 1000);

      setIsRecognitionActive(true);
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast.error(`Failed to start recognition: ${error.message}`);
      engineWaitingRef.current = false;
      showEngineStartErrorToast();
    }
  };

  const stopRecognition = ({ skipApi = false, overrideReps = null } = {}) => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    engineWaitingRef.current = false;
    dismissEngineToast();
    
    if (Number.isFinite(overrideReps)) {
      pausedRepsRef.current = overrideReps;
    } else {
    pausedRepsRef.current = currentResults.reps;
    }
    stopExerciseTimer();
    setIsRecognitionActive(false);
    setIsExercisePaused(true);

    if (!skipApi) {
      fetch(`${REHAB_ENGINE_URL}/stop`, { method: 'POST' }).catch(error => {
        console.error('Failed to stop Rehab Engine:', error);
      });
    }
  };

  const resetSession = () => {
    stopRecognition();
    setCurrentResults({
      reps: 0,
      distance: 0,
      state: 'OUT',
      totalTime: 0,
      startTime: null,
      exerciseStartTime: null,
      targetReps: null,
      stopReason: null
    });
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
    
      pausedRepsRef.current = newReps;
    
    setCurrentResults(prev => ({
      ...prev,
      reps: newReps
    }));
    
    console.log(`🧪 Manual rep added: ${newReps}/${selectedExercise.reps_per_set}`);
    
    // Check if target reached
    if (newReps >= selectedExercise.reps_per_set) {
      console.log('🎯 Manual target reached!');
      stopRecognition({ skipApi: true, overrideReps: newReps });
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
      exerciseStartTime: null,
      targetReps: null,
      stopReason: null
    });
    
    // Reset refs
    totalRepsRef.current = 0;
    totalActiveDurationRef.current = 0;
    totalPauseCountRef.current = 0;
    pausedRepsRef.current = 0;
    lastRepsRef.current = 0;
    sessionStartTimeRef.current = null;
    resetRepMetrics();
    
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
  }, [isRecognitionActive]); // Removed currentResults.reps to prevent infinite loop

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
      exerciseStartTime: null,
      targetReps: null,
      stopReason: null
    });
    
    // Fetch treatment data
    fetchActiveTreatment();
    
    // Cleanup on unmount
    return () => {
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
                disabled={!isTreatmentActive || !selectedExercise || isCountingDown}
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
                {!isTreatmentActive
                  ? 'This treatment has ended.'
                  : (isRecognitionActive ? 'Temporarily pause to rest' : (isExercisePaused ? 'Resume your exercise' : 'Begin your exercise session'))}
                </Typography>
              )}
            </Box>
            
            {/* Emergency Stop Button */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', minWidth: 220 }}>
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<WarningIcon />}
                onClick={handleEmergencyStop}
                disabled={!isTreatmentActive}
                sx={{ py: 1.8, px: 4, fontWeight: 600 }}
              >
                Emergency Stop
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, textAlign: 'center' }}>
                Tap to emergency stop and notify your emergency contact.
              </Typography>
            </Box>
            
            {/* End Exercise Button (for when user is too tired) */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Button
                variant="outlined"
                color="error"
                size="large"
                startIcon={<StopIcon />}
                onClick={() => setShowStopDialog(true)}
                disabled={(!isRecognitionActive && !isExercisePaused && !isResting) || isCountingDown || !isTreatmentActive}
                sx={{ py: 1.5, px: 4 }}
              >
                End Exercise
              </Button>
              {!isCountingDown && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                  {!isTreatmentActive
                    ? 'This treatment has ended.'
                    : (isRecognitionActive || isExercisePaused || isResting) ? 'Stop completely & save progress' : 'End session when unable to continue'}
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

      {activeTreatment && (
        <Grid container spacing={2} sx={{ mb: 3 }} alignItems="stretch">
          <Grid item xs={12} md={8} sx={{ display: 'flex' }}>
            <Card sx={{ width: '100%', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                <Typography variant="h5" fontWeight={600}>
                  {activeTreatment.name || 'Active Treatment Plan'}
            </Typography>
                  </Box>
                  <Chip 
                label={isTreatmentActive ? 'In Progress' : 'Ended'} 
                color={isTreatmentActive ? 'success' : 'default'} 
                    variant="outlined" 
                    sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                  />
                </Box>

                <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 2 }}>
                  <Chip label={`Started: ${formatDate(activeTreatment.start_date)}`} color="primary" variant="outlined" />
                  <Chip label={`Ends: ${formatDate(activeTreatment.end_date)}`} color="primary" variant="outlined" />
              <Chip label={`Exercises: ${totalExercises}`} color="secondary" variant="outlined" />
                </Stack>

                {activeTreatment.goal_notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {activeTreatment.goal_notes}
            </Typography>
                )}
          </CardContent>
        </Card>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex' }}>
            <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                  Therapist Information
                  </Typography>
                <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
                  {activeTreatment.therapist_name || 'Therapist Assigned'}
                  </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This therapist created your plan. Reach out if you have questions or need adjustments.
                  </Typography>

                <Stack spacing={1.5} sx={{ mt: 'auto' }}>
                  <Button
                    variant="outlined"
                    startIcon={<WhatsAppIcon />}
                    component="a"
                    href={getWhatsappLink(activeTreatment.therapist_contact) || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    disabled={!getWhatsappLink(activeTreatment.therapist_contact)}
                      sx={{
                      borderRadius: 999,
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1,
                    }}
                  >
                    {activeTreatment.therapist_contact
                      ? `WhatsApp ${activeTreatment.therapist_contact}`
                      : 'Contact not available'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Card sx={{ mt: 3 }}>
                <CardContent>
          {treatmentExercises.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" color="text.secondary">
                A therapist has not assigned any exercises yet.
                          </Typography>
                        </Box>
          ) : (
            <Stack spacing={2}>
              {treatmentExercises.map((exercise, index) => {
                const isCurrent = index === currentExerciseIndex;
                const isCompleted = index < currentExerciseIndex;
                const baseStatusLabel = isCurrent ? 'Current' : (isCompleted ? 'Completed' : 'Upcoming');
                const exerciseStatusLabel = !isTreatmentActive ? 'Ended' : baseStatusLabel;
                const statusColor = !isTreatmentActive
                  ? 'default'
                  : isCurrent ? 'info' : (isCompleted ? 'success' : 'default');
                const exerciseReps = exercise.reps_per_set || 0;
                const exerciseSets = exercise.sets || 0;
                const exerciseDuration = exercise.duration || 1;
                const isSelected = exercise.exercise_id === selectedExercise?.exercise_id;

                    return (
                  <Card
                    key={exercise.treatment_exercise_id || `${exercise.exercise_id}_${index}`}
                    variant="outlined"
                    sx={{
                      borderColor: isCurrent ? 'primary.main' : 'grey.300',
                      backgroundColor: isSelected ? 'rgba(25,118,210,0.06)' : 'background.paper',
                    }}
                  >
                    <CardContent
                      sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3, alignItems: 'stretch' }}
                    >
                      <Box sx={{ flex: { xs: '1 1 auto', lg: '0 0 60%' } }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                          {exercise.exercise_name}
                          </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {exercise.instructions || 'No description available.'}
                          </Typography>
                        </Box>

                      <Box
                        sx={{
                          flex: { xs: '1 1 auto', lg: '0 0 10%' },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Button
                          variant="outlined"
                          startIcon={<PlayCircleOutlineIcon />}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Demo Video
                        </Button>
                  </Box>

                      <Box
                        sx={{
                          flex: { xs: '1 1 auto', lg: '0 0 40%' },
                    display: 'flex',
                    alignItems: 'center',
                          justifyContent: 'space-evenly',
                          color: 'text.primary'
                        }}
                      >
                        <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                          <Typography variant="caption" color="text.secondary">
                            Reps / Set
                    </Typography>
                          <Typography variant="subtitle1" fontWeight={600} color="error.main">
                            {exerciseReps}
                  </Typography>
                </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                          <Typography variant="caption" color="text.secondary">
                            Sets
                        </Typography>
                          <Typography variant="subtitle1" fontWeight={600} color="error.main">
                            {exerciseSets}
                          </Typography>
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box sx={{ textAlign: 'center', minWidth: 160 }}>
                          <Typography variant="caption" color="text.secondary">
                            Target Reps
                        </Typography>
                          <Typography variant="subtitle1" fontWeight={600} color="error.main">
                            {exerciseReps} reps × {exerciseSets} sets
                        </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Complete within
                        </Typography>
                          <Typography variant="subtitle1" fontWeight={600} color="error.main">
                            {exerciseDuration} min
                        </Typography>
                          {isCurrent && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {isRecognitionActive ? 'Live counting in progress' : 'Waiting to resume'}
                          </Typography>
                          )}
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box sx={{ textAlign: 'center', minWidth: 140 }}>
                          <Typography variant="caption" color="text.secondary">
                            Status
                          </Typography>
                          <Typography
                            variant="subtitle1"
                            fontWeight={600}
                            color={!isTreatmentActive ? 'text.secondary' : isCurrent ? 'info.main' : isCompleted ? 'success.main' : 'text.secondary'}
                          >
                            {exerciseStatusLabel}
                          </Typography>
                        </Box>
                      </Box>
              </CardContent>
            </Card>
                );
              })}
          </Stack>
          )}
        </CardContent>
      </Card>

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
