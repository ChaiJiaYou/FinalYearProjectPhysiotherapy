import React, { useState, useRef, useEffect, useCallback } from "react";
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Stack,
  Fab,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Camera as CameraIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Add as AddIcon,
  SmartToy as SmartToyIcon,
  Rule as RuleIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

import NewActionWizard from './NewActionWizard';
import RealTimeTest from './RealTimeTest';

const ExercisePage = () => {
  // Tab management
  const [currentTab, setCurrentTab] = useState(0);
  const [legacyMode, setLegacyMode] = useState(false);
  
  // New Action Wizard
  const [showNewActionWizard, setShowNewActionWizard] = useState(false);
  
  // Legacy mode states
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [poseCount, setPoseCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const [poseStatus, setPoseStatus] = useState("No pose detected");
  const [currentKeypoints, setCurrentKeypoints] = useState(null);
  const [frameCount, setFrameCount] = useState(0);
  const [exerciseSettings, setExerciseSettings] = useState({
    targetRepetitions: 10,
    targetSets: 3,
    restTime: 60,
    flexAngleThreshold: 60,    // degrees: <= this => flexed
    extendAngleThreshold: 160, // degrees: >= this => extended
    armSide: 'auto',           // 'auto' | 'left' | 'right'
  });
  const [detector, setDetector] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const detectorRef = useRef(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const skeletonCanvasRef = useRef(null);

  // Movement counter refs (stable across frames, no re-render)
  const frameIndexRef = useRef(0);
  const confirmFramesRef = useRef(3);
  const [debugAngle, setDebugAngle] = useState(null);
  // Unified rule engine state
  const ruleRef = useRef(null); // { type, points, range, axis, direction, count_threshold, repeatable }
  const phaseRef = useRef('waiting_enter'); // 'waiting_enter' -> need trigger; 'waiting_exit' -> need release
  const triggeredStreakRef = useRef(0);
  const untriggeredStreakRef = useRef(0);
  // For direction rules
  const movementAccumRef = useRef(0);
  const prevAxisValueRef = useRef(null);
  const countedOnceRef = useRef(false);

  // Apply detection_rules from selected exercise (unified format)
  const applyDetectionRules = useCallback((rules) => {
    if (!rules || typeof rules !== 'object') return;
    // confirm frames at top-level optional
    if (typeof rules.confirmFrames === 'number' && rules.confirmFrames > 0) {
      confirmFramesRef.current = rules.confirmFrames;
    }
    // primary rule: either rules.rules[0] or rules as single rule when type exists
    let primaryRule = null;
    if (Array.isArray(rules.rules) && rules.rules.length > 0) {
      primaryRule = rules.rules[0];
    } else if (typeof rules.type === 'string') {
      primaryRule = rules; // single rule object stored directly
    }
    // validate and store
    if (primaryRule && typeof primaryRule.type === 'string') {
      const normalized = {
        type: primaryRule.type,
        points: Array.isArray(primaryRule.points) ? primaryRule.points.slice(0, 3) : [],
        range: Array.isArray(primaryRule.range) ? primaryRule.range : null,
        axis: primaryRule.axis || 'y',
        direction: primaryRule.direction || null,
        count_threshold: typeof primaryRule.count_threshold === 'number' ? primaryRule.count_threshold : 0.1,
        repeatable: primaryRule.repeatable !== false,
      };
      ruleRef.current = normalized;
      // reset state machine
      phaseRef.current = 'waiting_enter';
      triggeredStreakRef.current = 0;
      untriggeredStreakRef.current = 0;
      movementAccumRef.current = 0;
      prevAxisValueRef.current = null;
      countedOnceRef.current = false;
    }
  }, []);

  // When chosen exercise changes, apply detection_rules
  useEffect(() => {
    if (selectedExercise && selectedExercise.detection_rules) {
      applyDetectionRules(selectedExercise.detection_rules);
    }
  }, [selectedExercise, applyDetectionRules]);


  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // no-op

  useEffect(() => {
    fetchExercises();
    return () => {
      stopCamera();
    };
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/api/exercises/");
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      } else {
        toast.error("Failed to load exercises");
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Something went wrong while fetching exercises");
    } finally {
      setLoading(false);
    }
  };

  // Initialize TensorFlow.js pose detection model
  const initializePoseDetection = async () => {
    try {
      console.log("Initializing TensorFlow.js pose detection...");
      
      // Set WebGL backend for better performance
      await tf.setBackend('webgl');
      await tf.ready();
      console.log("TF Backend:", tf.getBackend());
      
      // Create detector with MoveNet model (faster than BlazePose)
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      };
      
      const created = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );
      
      setDetector(created);
      detectorRef.current = created;
      setIsModelLoaded(true);
      console.log("✅ TensorFlow.js pose detection model loaded successfully!");
      toast.success("Pose detection model loaded!");
      
    } catch (error) {
      console.error("❌ Error initializing pose detection:", error);
      toast.error("Failed to load pose detection model");
    }
  };

  const startCamera = async () => {
    console.log("=== START CAMERA CALLED ===");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      console.log("Camera stream obtained:", !!stream);

      if (videoRef.current) {
        const videoEl = videoRef.current;
        videoEl.srcObject = stream;
        streamRef.current = stream;
        console.log("Setting isCameraActive to true");
        setIsCameraActive(true);
        setCameraPermission("granted");

        // Wait for metadata to ensure videoWidth/Height are available
        await new Promise((resolve) => {
          if (videoEl.readyState >= 1 && videoEl.videoWidth > 0) {
            console.log("Video metadata ready immediately:", videoEl.videoWidth, videoEl.videoHeight);
            resolve();
          } else {
            const onLoaded = () => {
              console.log("Video metadata loaded:", videoEl.videoWidth, videoEl.videoHeight);
              videoEl.removeEventListener('loadedmetadata', onLoaded);
              resolve();
            };
            videoEl.addEventListener('loadedmetadata', onLoaded);
          }
        });
        try { await videoEl.play(); console.log("Video playing. readyState=", videoEl.readyState); } catch (e) { console.warn("video.play() failed", e); }

        // Initialize TensorFlow.js model if not already loaded
        if (!isModelLoaded) {
          console.log("Loading TensorFlow.js model...");
          await initializePoseDetection();
        }
        
        console.log("Starting pose detection...");
        // Start pose detection loop
        startPoseDetection();
      } else {
        console.log("Video ref not available");
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraPermission("denied");
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    console.log("=== STOP CAMERA CALLED ===");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Clear skeleton canvas
    if (skeletonCanvasRef.current) {
      const ctx = skeletonCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, skeletonCanvasRef.current.width, skeletonCanvasRef.current.height);
    }
    setIsCameraActive(false);
    setIsRecording(false);
    console.log("Camera stopped, pose detection loop cancelled");
    // Reset rule engine state
    frameIndexRef.current = 0;
    phaseRef.current = 'waiting_enter';
    triggeredStreakRef.current = 0;
    untriggeredStreakRef.current = 0;
    movementAccumRef.current = 0;
    prevAxisValueRef.current = null;
    countedOnceRef.current = false;
  };

  const startPoseDetection = () => {
    console.log("Pose detection loop starting. detector?", !!detectorRef.current);
    const detectPose = async () => {
      // Heartbeat log every 60 frames
      if (frameIndexRef.current % 60 === 0) {
        const v = videoRef.current;
        console.log("[LOOP] frame:", frameIndexRef.current, "video ready:",
          !!v, v?.videoWidth, v?.videoHeight, "detector:", !!detectorRef.current);
      }

      const currentDetector = detectorRef.current;
      if (!videoRef.current || !currentDetector) {
        animationFrameRef.current = requestAnimationFrame(detectPose);
        return;
      }

      // Advance frame index (use ref to avoid state lag)
      frameIndexRef.current += 1;
      const video = videoRef.current;

      try {
        const t0 = performance.now();
        const poses = await currentDetector.estimatePoses(video, { flipHorizontal: false });
        const t1 = performance.now();
        if (frameIndexRef.current % 30 === 0) {
          console.log(`[POSE] took ${(t1 - t0).toFixed(1)}ms, poses:`, poses?.length || 0);
        }

        if (poses && poses.length > 0) {
          const pose = poses[0];
          const keypoints = pose.keypoints;

          // Update keypoints for skeleton drawing
          setCurrentKeypoints(keypoints);
          drawSkeletonRealTime(keypoints);

          // Unified Rule Engine evaluation
          const rule = ruleRef.current;
          if (rule) {
            const width = video.videoWidth || 1;
            const height = video.videoHeight || 1;

            const getPt = (idx) => keypoints[idx] || null;
            const norm = (x, y) => ({ x: x / width, y: y / height });
            const conf = (pt) => (pt?.score ?? 0);

            let triggered = false;
            let debugStr = '';

            if (rule.type === 'angle') {
              const [a,b,c] = rule.points;
              const pa = getPt(a), pb = getPt(b), pc = getPt(c);
              if (pa && pb && pc && conf(pa) > 0.2 && conf(pb) > 0.2 && conf(pc) > 0.2) {
                const ux = pa.x - pb.x, uy = pa.y - pb.y;
                const vx = pc.x - pb.x, vy = pc.y - pb.y;
                const dot = ux*vx + uy*vy;
                const mu = Math.hypot(ux, uy), mv = Math.hypot(vx, vy);
                if (mu > 1e-3 && mv > 1e-3) {
                  let cos = dot / (mu * mv); cos = Math.max(-1, Math.min(1, cos));
                  const angle = Math.acos(cos) * 180 / Math.PI;
                  debugStr = `angle=${angle.toFixed(1)}`;
                  if (Array.isArray(rule.range)) {
                    const [lo, hi] = rule.range;
                    triggered = angle >= lo && angle <= hi;
                  }
                }
              }
            } else if (rule.type === 'distance') {
              const [p, q] = rule.points;
              const pp = getPt(p), qq = getPt(q);
              if (pp && qq && conf(pp) > 0.2 && conf(qq) > 0.2) {
                const P = norm(pp.x, pp.y), Q = norm(qq.x, qq.y);
                const d = Math.hypot(P.x - Q.x, P.y - Q.y);
                debugStr = `dist=${d.toFixed(3)}`;
                if (Array.isArray(rule.range)) {
                  const [lo, hi] = rule.range;
                  triggered = d >= lo && d <= hi;
                }
              }
            } else if (rule.type === 'position') {
              const [p] = rule.points;
              const pp = getPt(p);
              if (pp && conf(pp) > 0.2) {
                const P = norm(pp.x, pp.y);
                const val = rule.axis === 'x' ? P.x : P.y;
                debugStr = `${rule.axis}=${val.toFixed(3)}`;
                if (Array.isArray(rule.range)) {
                  const [lo, hi] = rule.range;
                  triggered = val >= lo && val <= hi;
                }
              }
            } else if (rule.type === 'direction') {
              const [p] = rule.points;
              const pp = getPt(p);
              if (pp && conf(pp) > 0.2) {
                const P = norm(pp.x, pp.y);
                const axisVal = rule.axis === 'x' ? P.x : P.y;
                if (prevAxisValueRef.current == null) prevAxisValueRef.current = axisVal;
                const delta = axisVal - prevAxisValueRef.current;
                prevAxisValueRef.current = axisVal;
                // Accumulate signed movement considering direction
                const sign = (rule.direction === 'up' || rule.direction === 'left') ? -1 : 1;
                movementAccumRef.current += sign * delta;
                debugStr = `move=${movementAccumRef.current.toFixed(3)}`;
                if (Math.abs(movementAccumRef.current) >= (rule.count_threshold || 0.1)) {
                  triggered = true;
                }
              }
            }

            if (debugStr && frameIndexRef.current % 5 === 0) setDebugAngle(debugStr);

            // State machine with confirm frames
            if (triggered) {
              triggeredStreakRef.current += 1;
              untriggeredStreakRef.current = 0;
              if (phaseRef.current === 'waiting_enter' && triggeredStreakRef.current >= confirmFramesRef.current) {
                phaseRef.current = 'waiting_exit';
              }
            } else {
              untriggeredStreakRef.current += 1;
              triggeredStreakRef.current = 0;
              if (phaseRef.current === 'waiting_exit' && untriggeredStreakRef.current >= confirmFramesRef.current) {
                // one repetition completed
                if (isRecordingRef.current) {
                  if (!countedOnceRef.current || rule.repeatable) {
                    setPoseCount(prev => prev + 1);
                    countedOnceRef.current = true;
                  }
                }
                // reset for next cycle
                phaseRef.current = 'waiting_enter';
                movementAccumRef.current = 0;
              }
            }
          }
        } else {
          // Clear canvas if no pose
          const canvas = skeletonCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } catch (error) {
        console.error("Error in TensorFlow.js pose detection:", error);
      }

      // Continue the loop
      animationFrameRef.current = requestAnimationFrame(detectPose);
    };

    animationFrameRef.current = requestAnimationFrame(detectPose);
  };

  const startRecording = () => {
    if (!isCameraActive) {
      toast.error("Please start camera first");
      return;
    }
    setIsRecording(true);
    setPoseCount(0);
    // Reset rule engine state for counting
    phaseRef.current = 'waiting_enter';
    triggeredStreakRef.current = 0;
    untriggeredStreakRef.current = 0;
    movementAccumRef.current = 0;
    prevAxisValueRef.current = null;
    countedOnceRef.current = false;
    console.log('[REC] start: reset phase to waiting_enter');
    toast.success("Exercise recording started!");
  };

  const stopRecording = () => {
    setIsRecording(false);
    toast.info("Exercise recording stopped");
  };

  const handleExerciseSelect = (exercise) => {
    setSelectedExercise(exercise);
    toast.success(`Selected exercise: ${exercise.exercise_name}`);
  };

  const handleSettingsSave = () => {
    setSettingsOpen(false);
    toast.success("Exercise settings saved!");
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'error';
      default:
        return 'default';
    }
  };

  const getBodyPartColor = (bodyPart) => {
    const colors = {
      'shoulder': '#2196f3',
      'knee': '#4caf50',
      'ankle': '#ff9800',
      'hip': '#9c27b0',
      'wrist': '#f44336',
      'elbow': '#795548',
      'spine': '#607d8b',
      'neck': '#e91e63',
      'core': '#ff5722',
      'full_body': '#3f51b5',
    };
    return colors[bodyPart] || '#9e9e9e';
  };

  // High-performance skeleton drawing function
  const drawSkeletonRealTime = useCallback((keypoints) => {
    if (!skeletonCanvasRef.current || !keypoints || keypoints.length < 17) {
      return;
    }

    const canvas = skeletonCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video (fallback to client size if metadata not ready)
    const video = videoRef.current;
    const vw = (video && video.videoWidth) || (video && video.clientWidth) || 640;
    const vh = (video && video.videoHeight) || (video && video.clientHeight) || 480;
    if (canvas.width !== vw || canvas.height !== vh) {
      console.log("[CANVAS] resize to", vw, vh);
    }
    canvas.width = vw;
    canvas.height = vh;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // MoveNet connections
    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 4],        // face
      [5, 6],                                // shoulders
      [5, 7], [7, 9],                        // left arm
      [6, 8], [8, 10],                       // right arm
      [11, 12],                              // hips
      [5, 11], [6, 12],                      // torso sides
      [11, 13], [13, 15],                    // left leg
      [12, 14], [14, 16],                    // right leg
    ];

    const scoreMin = 0.2;

    // Draw connections (bones)
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    connections.forEach(([start, end]) => {
      const a = keypoints[start];
      const b = keypoints[end];
      if (!a || !b) return;
      if ((a.score ?? 0) < scoreMin || (b.score ?? 0) < scoreMin) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    // Draw keypoints (joints)
    keypoints.forEach((p) => {
      if (!p) return;
      if ((p.score ?? 0) < scoreMin) return;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const TabPanel = ({ children, value, index, ...other }) => {
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`exercise-tabpanel-${index}`}
        aria-labelledby={`exercise-tab-${index}`}
        {...other}
      >
        {value === index && <Box>{children}</Box>}
      </div>
    );
  };

  const renderLegacyContent = () => {
    return (
      <Grid container spacing={3}>
        {/* Left Column - Exercise List */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
              mb: 3,
            }}
          >
            <Typography variant="h6" fontWeight="600" color="text.primary" mb={2}>
              Available Exercises
            </Typography>
            
            {exercises.length === 0 ? (
              <Alert severity="info">No exercises available</Alert>
            ) : (
              <Stack spacing={2}>
                {exercises.map((exercise) => (
                  <Card
                    key={exercise.exercise_id}
                    variant="outlined"
                    sx={{
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        boxShadow: 2,
                        transform: "translateY(-2px)",
                      },
                      border: selectedExercise?.exercise_id === exercise.exercise_id 
                        ? "2px solid" 
                        : "1px solid",
                      borderColor: selectedExercise?.exercise_id === exercise.exercise_id 
                        ? "primary.main" 
                        : "grey.300",
                    }}
                    onClick={() => handleExerciseSelect(exercise)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Typography variant="h6" fontWeight="600">
                          {exercise.exercise_name}
                        </Typography>
                        <Chip
                          label={exercise.difficulty}
                          size="small"
                          color={getDifficultyColor(exercise.difficulty)}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {exercise.instructions}
                      </Typography>
                      
                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip
                          label={exercise.body_part}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: getBodyPartColor(exercise.body_part),
                            color: getBodyPartColor(exercise.body_part),
                          }}
                        />
                        <Chip
                          label={exercise.category}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Right Column - Camera and Exercise Display */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
              mb: 3,
            }}
          >
            <Typography variant="h6" fontWeight="600" color="text.primary" mb={2}>
              Exercise Practice
            </Typography>

            {/* Camera Controls */}
            <Box display="flex" gap={2} mb={3} flexWrap="wrap">
              <Button
                variant={isCameraActive ? "outlined" : "contained"}
                startIcon={isCameraActive ? <VideocamOffIcon /> : <VideocamIcon />}
                onClick={isCameraActive ? stopCamera : startCamera}
                color={isCameraActive ? "error" : "primary"}
              >
                {isCameraActive ? "Stop Camera" : "Start Camera"}
              </Button>

              <Button
                variant={isRecording ? "outlined" : "contained"}
                startIcon={isRecording ? <StopIcon /> : <PlayIcon />}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isCameraActive}
                color={isRecording ? "error" : "success"}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => setPoseCount(0)}
                disabled={!isRecording}
              >
                Reset Count
              </Button>

              <Button
                variant="outlined"
                startIcon={<CameraIcon />}
                onClick={async () => {
                  if (!videoRef.current) {
                    toast.error("Camera not ready");
                    return;
                  }
                  
                  const video = videoRef.current;
                  
                  // Create a temporary canvas to capture video frame
                  const tempCanvas = document.createElement('canvas');
                  const tempCtx = tempCanvas.getContext('2d');
                  tempCanvas.width = video.videoWidth;
                  tempCanvas.height = video.videoHeight;
                  tempCtx.drawImage(video, 0, 0);
                  
                  // Convert canvas to blob and send to backend
                  tempCanvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    formData.append("frame", blob);
                    
                    try {
                      const response = await fetch("http://127.0.0.1:8000/api/detect-pose/", {
                        method: "POST",
                        body: formData,
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        setDebugInfo(`Test response: ${JSON.stringify(data)}`);
                        
                        // Update keypoints for skeleton drawing (map [[x,y],...] to {x,y})
                        if (Array.isArray(data.keypoints)) {
                          const mapped = data.keypoints.map((pt) => ({ x: pt[0], y: pt[1], score: 1 }));
                          setCurrentKeypoints(mapped);
                          drawSkeletonRealTime(mapped);
                        }
                        
                        toast.success("Test pose detection completed!");
                      } else {
                        setDebugInfo(`Test failed: ${response.status}`);
                        toast.error("Test pose detection failed");
                      }
                    } catch (error) {
                      setDebugInfo(`Test error: ${error.message}`);
                      toast.error("Test pose detection error");
                    }
                  }, "image/jpeg");
                }}
                disabled={!isCameraActive}
              >
                Test Detection
              </Button>
            </Box>

            {/* Camera Display */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: 640,
                margin: "0 auto",
                mb: 3,
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "8px",
                  display: isCameraActive ? "block" : "none",
                }}
              />
              
              {/* High-performance Canvas for Skeleton */}
              <canvas
                ref={skeletonCanvasRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  borderRadius: "8px",
                  pointerEvents: "none",
                  zIndex: 20,
                  display: isCameraActive ? 'block' : 'none',
                }}
              />
              
              {!isCameraActive && (
                <Box
                  sx={{
                    width: "100%",
                    height: 360,
                    bgcolor: "grey.100",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px dashed",
                    borderColor: "grey.300",
                  }}
                >
                  <Box textAlign="center">
                    <CameraIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      Camera not active
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click "Start Camera" to begin
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Exercise Information */}
            {selectedExercise && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="600" color="primary" mb={2}>
                    {selectedExercise.exercise_name}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        <strong>Instructions:</strong>
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {selectedExercise.instructions}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        <strong>Target Metrics:</strong>
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {Object.entries(selectedExercise.default_target_metrics || {}).map(([key, value]) => (
                          <Chip
                            key={key}
                            label={`${key}: ${value}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Pose Counter */}
            {isRecording && (
              <Card sx={{ bgcolor: "primary.main", color: "white", mb: 2 }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold" textAlign="center">
                    Repetitions: {poseCount}
                  </Typography>
                  <Typography variant="body2" textAlign="center" sx={{ opacity: 0.8 }}>
                    Keep performing the exercise to count repetitions
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Pose Status */}
            {isCameraActive && (
              <Card sx={{ bgcolor: "secondary.main", color: "white", mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" textAlign="center">
                    Current Pose: {poseStatus}
                  </Typography>
                  <Typography variant="body2" textAlign="center" sx={{ opacity: 0.8 }}>
                    {isRecording ? "Recording active - movements will be counted" : "Camera active - click Start Recording to begin"}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Debug Information */}
            {(debugInfo || debugAngle !== null) && (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" mb={1}>
                    Debug Information
                  </Typography>
                  {debugAngle !== null && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {String(debugAngle)}
                    </Typography>
                  )}
                  {debugInfo && (
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.8rem',
                      wordBreak: 'break-all'
                    }}>
                      {debugInfo}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderClassicExercises = () => {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Classic Exercise Mode
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Traditional exercise selection and practice mode.
        </Typography>
        <Button
          variant="outlined"
          sx={{ mt: 2 }}
          onClick={() => setLegacyMode(true)}
        >
          Switch to Legacy Mode
        </Button>
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          bgcolor: "white",
          border: "1px solid",
          borderColor: "grey.200",
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
              Exercise Center
            </Typography>
            <Typography variant="body1" color="text.secondary">
              AI-powered action recognition and exercise tracking
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={legacyMode}
                  onChange={(e) => setLegacyMode(e.target.checked)}
                />
              }
              label="Legacy Mode"
            />
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={() => setSettingsOpen(true)}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Settings
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
        >
          <Tab 
            icon={<SmartToyIcon />} 
            label="AI Recognition" 
            id="exercise-tab-0" 
            aria-controls="exercise-tabpanel-0"
          />
          <Tab 
            icon={<RuleIcon />} 
            label={legacyMode ? "Rule-Based (Legacy)" : "Classic Exercises"} 
            id="exercise-tab-1" 
            aria-controls="exercise-tabpanel-1"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={currentTab} index={0}>
        <RealTimeTest />
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        {legacyMode ? renderLegacyContent() : renderClassicExercises()}
      </TabPanel>

      {/* Floating Action Button for New Action */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => setShowNewActionWizard(true)}
      >
        <AddIcon />
      </Fab>

      {/* New Action Wizard */}
      <NewActionWizard
        open={showNewActionWizard}
        onClose={() => setShowNewActionWizard(false)}
        onSuccess={(actionData) => {
          toast.success(`Action "${actionData.name}" created successfully!`);
          // Optionally refresh actions list or switch to test tab
        }}
      />

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Exercise Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Target Repetitions"
              type="number"
              value={exerciseSettings.targetRepetitions}
              onChange={(e) => setExerciseSettings(prev => ({
                ...prev,
                targetRepetitions: parseInt(e.target.value) || 0
              }))}
              fullWidth
            />
            
            <TextField
              label="Target Sets"
              type="number"
              value={exerciseSettings.targetSets}
              onChange={(e) => setExerciseSettings(prev => ({
                ...prev,
                targetSets: parseInt(e.target.value) || 0
              }))}
              fullWidth
            />
            
            <TextField
              label="Rest Time (seconds)"
              type="number"
              value={exerciseSettings.restTime}
              onChange={(e) => setExerciseSettings(prev => ({
                ...prev,
                restTime: parseInt(e.target.value) || 0
              }))}
              fullWidth
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Flexed Angle Threshold (°)"
                  type="number"
                  value={exerciseSettings.flexAngleThreshold}
                  onChange={(e) => setExerciseSettings(prev => ({
                    ...prev,
                    flexAngleThreshold: Number(e.target.value)
                  }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Extended Angle Threshold (°)"
                  type="number"
                  value={exerciseSettings.extendAngleThreshold}
                  onChange={(e) => setExerciseSettings(prev => ({
                    ...prev,
                    extendAngleThreshold: Number(e.target.value)
                  }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="arm-side-label">Arm Side</InputLabel>
                  <Select
                    labelId="arm-side-label"
                    label="Arm Side"
                    value={exerciseSettings.armSide}
                    onChange={(e) => setExerciseSettings(prev => ({ ...prev, armSide: e.target.value }))}
                  >
                    <MenuItem value="auto">Auto</MenuItem>
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="right">Right</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button onClick={handleSettingsSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExercisePage; 