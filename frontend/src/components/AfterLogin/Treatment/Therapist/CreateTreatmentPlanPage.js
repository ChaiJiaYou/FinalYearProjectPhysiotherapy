import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Avatar,
  Alert,
  InputAdornment,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Tooltip,
  Fade,
  Slide,
  Grow,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  FitnessCenter as FitnessCenterIcon,
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { formatDate } from "../../../../utils/dateUtils";

const steps = ['Treatment Details', 'Exercise Selection', 'Configure & Review'];

const CreateTreatmentPlanPage = () => {
  const navigate = useNavigate();
  const { patientId, treatmentId } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [patients, setPatients] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingTreatment, setExistingTreatment] = useState(null);
  
  // Exercise filtering and search
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState('');
  
  // User role detection - use useMemo to prevent unnecessary re-renders
  const userRole = useMemo(() => localStorage.getItem("role"), []);
  const currentUserId = useMemo(() => localStorage.getItem("id"), []);
  const isAdmin = useMemo(() => userRole === 'admin', [userRole]);
  const isTherapist = useMemo(() => userRole === 'therapist', [userRole]);

  // Form data - based on actual model fields
  const [treatmentName, setTreatmentName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [goalNotes, setGoalNotes] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [animatingExercise, setAnimatingExercise] = useState(null);
  const [originalExerciseIds, setOriginalExerciseIds] = useState([]);
  const [originalExercisesMap, setOriginalExercisesMap] = useState({}); // Map exercise_id to original exercise data
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(isAdmin ? '' : currentUserId);
  const [expandedExercises, setExpandedExercises] = useState({});
  
  // Use ref to track timeout for cleanup
  const animationTimeoutRef = useRef(null);
  
  // Determine therapist_id to use
  const therapistId = isAdmin ? selectedTherapist : currentUserId;

  useEffect(() => {
    fetchPatients();
    fetchExercises();
    // Fetch therapists for both admin (to select) and therapist (to display current user info)
    if (isAdmin || isTherapist) {
      fetchTherapists();
    }
    
    // Check if we're in edit mode
    if (treatmentId) {
      setIsEditMode(true);
      fetchExistingTreatment();
    } else {
      setIsEditMode(false);
      setOriginalExerciseIds([]);
      setOriginalExercisesMap({});
      setSelectedExercises([]);
    }
    
    // Cleanup function
    return () => {
      // Clear any pending timeouts
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [treatmentId, isAdmin, isTherapist]);

  // Set default end date (start date + 2 weeks)
  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 14); // Add 2 weeks
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate]);

  // Pre-select patient if patientId is provided in URL
  // Note: Treatment name is now manually entered by user

  const fetchPatients = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/list-patients/");
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      } else {
        toast.error("Failed to load patients");
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Something went wrong while fetching patients");
    }
  };

  const fetchExercises = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/exercises/");
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      } else {
        console.error("Failed to load exercises");
        toast.error("Failed to load exercises from database");
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Something went wrong while fetching exercises");
    }
  };

  const fetchTherapists = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/list-therapists/");
      if (response.ok) {
        const data = await response.json();
        setTherapists(data || []);
      } else {
        toast.error("Failed to load therapists");
      }
    } catch (error) {
      console.error("Error fetching therapists:", error);
      toast.error("Something went wrong while fetching therapists");
    }
  };

  const fetchExistingTreatment = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching treatment details for ID:', treatmentId);
      
      // Fetch treatment details
      const treatmentResponse = await fetch(`http://127.0.0.1:8000/api/treatments/${treatmentId}/`);
      console.log('Treatment response status:', treatmentResponse.status);
      
      if (!treatmentResponse.ok) {
        const errorText = await treatmentResponse.text();
        console.error('Treatment fetch error:', errorText);
        throw new Error(`Failed to fetch treatment details: ${treatmentResponse.status}`);
      }
      
      const treatmentData = await treatmentResponse.json();
      console.log('Treatment data received:', treatmentData);
      setExistingTreatment(treatmentData);
      
      // Pre-fill form data
      setTreatmentName(treatmentData.name || '');
      setStartDate(treatmentData.start_date || '');
      setEndDate(treatmentData.end_date || '');
      setGoalNotes(treatmentData.goal_notes || '');
      
      // Pre-select therapist if admin (therapist cannot change their own assignment)
      if (isAdmin && treatmentData.therapist_id) {
        setSelectedTherapist(treatmentData.therapist_id);
      }
      
      // Fetch existing exercises for this treatment
      console.log('Fetching exercises for treatment:', treatmentId);
      const exercisesResponse = await fetch(`http://127.0.0.1:8000/api/treatment-exercises/${treatmentId}/`);
      console.log('Exercises response status:', exercisesResponse.status);
      
      if (exercisesResponse.ok) {
        const exercisesData = await exercisesResponse.json();
        console.log('Exercises data received:', exercisesData);
        const activeExercises = (exercisesData || []).filter(ex => ex.is_active !== false);
        
        // Track original treatment exercise ids for deletion detection
        const treatmentExerciseIds = activeExercises
          .map((exercise) => exercise.treatment_exercise_id)
          .filter(Boolean);
        setOriginalExerciseIds(treatmentExerciseIds);
        
        // Transform the data to match the expected format
        const transformedExercises = activeExercises.map((exercise, index) => ({
          id: exercise.treatment_exercise_id || exercise.exercise_id || `${Date.now()}_${index}`,
          treatment_exercise_id: exercise.treatment_exercise_id || null,
          exercise_id: exercise.exercise_id,
          exercise_name: exercise.exercise_name,
          category: exercise.category,
          difficulty: exercise.difficulty,
          instructions: exercise.instructions || '',
          reps_per_set: exercise.reps_per_set || 10,
          sets: exercise.sets || 1,
          duration: exercise.duration || 1,
          notes: exercise.notes || '',
        }));
        
        // Create a map of exercise_id to original exercise data for restoration
        const exercisesMap = {};
        transformedExercises.forEach(ex => {
          exercisesMap[ex.exercise_id] = {
            id: ex.id,
            treatment_exercise_id: ex.treatment_exercise_id,
            reps_per_set: ex.reps_per_set,
            sets: ex.sets,
            duration: ex.duration,
            notes: ex.notes,
          };
        });
        setOriginalExercisesMap(exercisesMap);
        
        setSelectedExercises(transformedExercises);
      } else {
        console.error('Failed to fetch exercises:', exercisesResponse.status);
        setSelectedExercises([]);
        setOriginalExerciseIds([]);
      }
      
    } catch (error) {
      console.error("Error fetching existing treatment:", error);
      toast.error("Failed to load treatment details");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (!treatmentName || !startDate || !endDate) {
          toast.warn("Please fill in all required fields");
          return false;
        }
        if (isAdmin && !selectedTherapist) {
          toast.warn("Please select a therapist");
          return false;
        }
        
        // Validate dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        
        // Check if start_date is in the past (only for create mode, or if start_date was changed in edit mode)
        if (isEditMode) {
          // In edit mode, only validate if start_date was changed
          const originalStartDate = existingTreatment?.start_date;
          if (originalStartDate) {
            const originalStart = new Date(originalStartDate);
            originalStart.setHours(0, 0, 0, 0);
            // Only validate if start_date was actually changed
            if (start.getTime() !== originalStart.getTime() && start < today) {
              toast.warn("Start date cannot be in the past");
              return false;
            }
          }
        } else {
          // In create mode, start_date cannot be in the past
          if (start < today) {
            toast.warn("Start date cannot be in the past");
            return false;
          }
        }
        
        // Check if end_date is after start_date
        if (end <= start) {
          toast.warn("End date must be after start date");
          return false;
        }
        
        return true;
      case 1:
        if (selectedExercises.length === 0) {
          toast.warn("Please select at least one exercise");
          return false;
        }
        return true;
      case 2:
        // Validate exercise settings
        for (const exercise of selectedExercises) {
          if (!exercise.reps_per_set || exercise.reps_per_set <= 0) {
            toast.warn(`Please set reps per set for ${exercise.exercise_name}`);
            return false;
          }
          if (!exercise.sets || exercise.sets <= 0) {
            toast.warn(`Please set number of sets for ${exercise.exercise_name}`);
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const addExercise = (exercise) => {
    // Check if exercise is already added
    if (selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id)) {
      return;
    }

    // Check if this exercise was previously in the treatment (for edit mode)
    const originalExercise = originalExercisesMap[exercise.exercise_id];
    
    const newExercise = originalExercise ? {
      // Restore original data if it exists
      id: originalExercise.id,
      treatment_exercise_id: originalExercise.treatment_exercise_id,
      exercise_id: exercise.exercise_id,
      exercise_name: exercise.name,
      category: exercise.category,
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      reps_per_set: originalExercise.reps_per_set || 10,
      sets: originalExercise.sets || 1,
      duration: originalExercise.duration || 1,
      notes: originalExercise.notes || '',
    } : {
      // New exercise
      id: `new_${Date.now()}`,
      treatment_exercise_id: null,
      exercise_id: exercise.exercise_id,
      exercise_name: exercise.name,
      category: exercise.category,
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      reps_per_set: 10,
      sets: 1,
      duration: 1,
      notes: '',
    };

    // Set animation state
    setAnimatingExercise(exercise.exercise_id);
    
    // Add exercise with animation
    setSelectedExercises([...selectedExercises, newExercise]);
    
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    // Clear animation after animation completes
    animationTimeoutRef.current = setTimeout(() => {
      setAnimatingExercise(null);
      animationTimeoutRef.current = null;
    }, 600);
  };

  const removeExercise = (exerciseId) => {
    setSelectedExercises(selectedExercises.filter(ex => ex.id !== exerciseId));
  };

  const updateExerciseSettings = (exerciseId, field, value) => {
    setSelectedExercises(selectedExercises.map(ex => 
      ex.id === exerciseId 
        ? { 
            ...ex, 
            [field]: value
          }
        : ex
    ));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (isEditMode) {
        // Update existing treatment
        const treatmentData = {
          name: treatmentName,
          start_date: startDate,
          end_date: endDate || null,
          goal_notes: goalNotes || null,
          // created_by is not updated when editing
        };
        
        // Only allow admin to update therapist_id
        if (isAdmin && selectedTherapist) {
          treatmentData.therapist_id = selectedTherapist;
        }

        const treatmentResponse = await fetch(`http://127.0.0.1:8000/api/treatments/${treatmentId}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(treatmentData),
        });

        if (!treatmentResponse.ok) {
          throw new Error("Failed to update treatment");
        }

        // Split exercises into existing and new
        const existingExercisesToUpdate = selectedExercises.filter((exercise) => !!exercise.treatment_exercise_id);
        const newExercisesToCreate = selectedExercises.filter((exercise) => !exercise.treatment_exercise_id);

        // FIRST: Handle removed exercises (delete before creating new ones to avoid unique constraint violation)
        const currentExistingIds = existingExercisesToUpdate.map((exercise) => exercise.treatment_exercise_id);
        const removedExerciseIds = originalExerciseIds.filter((id) => !currentExistingIds.includes(id));

        for (const removedId of removedExerciseIds) {
          // Use PATCH to soft delete (set is_active to False)
          const deleteResponse = await fetch(`http://127.0.0.1:8000/api/update-treatment-exercise/${removedId}/`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ is_active: false }),
          });

          if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.error("Failed to deactivate treatment exercise:", removedId, errorText);
            throw new Error("Failed to deactivate treatment exercise");
          }
        }

        // SECOND: Update existing exercises
        for (let index = 0; index < existingExercisesToUpdate.length; index += 1) {
          const exercise = existingExercisesToUpdate[index];
          const exerciseData = {
            reps_per_set: exercise.reps_per_set,
            sets: exercise.sets,
            duration: exercise.duration || 1,
            notes: exercise.notes || null,
            order_in_treatment: index + 1,
            is_active: true,
          };

          const response = await fetch(`http://127.0.0.1:8000/api/update-treatment-exercise/${exercise.treatment_exercise_id}/`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(exerciseData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to update exercise:", exercise.exercise_name, errorText);
            throw new Error("Failed to update treatment exercise");
          }
        }

        // THIRD: Create newly added exercises (continue order after existing ones)
        for (let i = 0; i < newExercisesToCreate.length; i += 1) {
          const exercise = newExercisesToCreate[i];
          const orderIndex = existingExercisesToUpdate.length + i + 1;
          const exerciseData = {
            treatment_id: treatmentId,
            exercise_id: exercise.exercise_id,
            reps_per_set: exercise.reps_per_set,
            sets: exercise.sets,
            duration: exercise.duration || 1,
            notes: exercise.notes || null,
            order_in_treatment: orderIndex,
            is_active: true,
          };

          const exerciseResponse = await fetch("http://127.0.0.1:8000/api/create-treatment-exercise/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(exerciseData),
          });

          if (!exerciseResponse.ok) {
            const errorText = await exerciseResponse.text();
            console.error("Failed to create exercise:", exercise.exercise_name, errorText);
            throw new Error("Failed to create treatment exercise");
          }
        }

        toast.success("Treatment plan updated successfully!");
        navigate(`/home/treatment/${patientId}`);
      } else {
        // Create new treatment plan
        const treatmentData = {
          patient_id: patientId,
          therapist_id: therapistId,
          name: treatmentName,
          is_active: true,
          start_date: startDate,
          end_date: endDate || null,
          goal_notes: goalNotes || null,
          created_by: currentUserId, // Record who created this treatment (admin or therapist)
        };

        const treatmentResponse = await fetch("http://127.0.0.1:8000/api/create-treatment/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(treatmentData),
        });

        if (!treatmentResponse.ok) {
          throw new Error("Failed to create treatment");
        }

        const treatment = await treatmentResponse.json();

        // Create exercises for the treatment
        for (let i = 0; i < selectedExercises.length; i++) {
          const exercise = selectedExercises[i];
          const exerciseData = {
            treatment_id: treatment.treatment_id,
            exercise_id: exercise.exercise_id,
            reps_per_set: exercise.reps_per_set,
            sets: exercise.sets,
            duration: exercise.duration || 1,
            notes: exercise.notes || null,
            order_in_treatment: i + 1,
            is_active: true,
          };

          const exerciseResponse = await fetch("http://127.0.0.1:8000/api/create-treatment-exercise/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(exerciseData),
          });

          if (!exerciseResponse.ok) {
            console.error("Failed to create exercise:", exercise.exercise_name);
          }
        }

        toast.success("Treatment plan created successfully!");
        navigate(`/home/treatment/${patientId}`);
      }
    } catch (error) {
      console.error("Error processing treatment plan:", error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} treatment plan`);
    } finally {
      setLoading(false);
    }
  };

  // Filter exercises based on search term and category - use useMemo to prevent unnecessary recalculations
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) ||
                           (exercise.instructions && exercise.instructions.toLowerCase().includes(exerciseSearchTerm.toLowerCase()));
      const matchesCategory = !exerciseCategoryFilter || exercise.category === exerciseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [exercises, exerciseSearchTerm, exerciseCategoryFilter]);

  // Get unique categories for filter options - use useMemo to prevent unnecessary recalculations
  const uniqueCategories = useMemo(() => {
    return [...new Set(exercises.map(ex => ex.category).filter(Boolean))];
  }, [exercises]);

  const toggleExerciseDetails = (exerciseId) => {
    setExpandedExercises((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  // Get patient info for display
  const currentPatient = patients.find(p => p.id === patientId);

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6">Treatment Details</Typography>

            {currentPatient && (
              <Alert severity="info">
                Creating treatment plan for: <strong>{currentPatient.username}</strong>
              </Alert>
            )}

            <TextField
              fullWidth
              required
              label="Treatment Name"
              value={treatmentName}
              onChange={(e) => setTreatmentName(e.target.value)}
              helperText="Give your treatment plan a descriptive name"
            />

            {isAdmin ? (
              <FormControl fullWidth required>
                <InputLabel>Select Therapist</InputLabel>
                <Select
                  value={selectedTherapist}
                  onChange={(e) => setSelectedTherapist(e.target.value)}
                  label="Select Therapist"
                >
                  {therapists.map((therapist) => (
                    <MenuItem key={therapist.id} value={therapist.id}>
                      {therapist.username} ({therapist.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                label="Therapist"
                value={therapists.find(t => t.id === currentUserId)?.username || currentUserId}
                InputProps={{
                  readOnly: true,
                }}
                helperText="This treatment will be assigned to you"
              />
            )}

            <TextField
              fullWidth
              required
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              required
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Automatically set to 2 weeks after start date (can be modified)"
            />

            <TextField
              fullWidth
              label="Goal Notes (Optional)"
              multiline
              rows={3}
              value={goalNotes}
              onChange={(e) => setGoalNotes(e.target.value)}
              placeholder="Describe the goals and objectives for this treatment plan..."
              helperText="Optional notes about treatment goals and objectives"
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Always show selected exercises section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Selected Exercises ({selectedExercises.length})
              </Typography>
              
              {selectedExercises.length === 0 ? (
                <Paper 
                  sx={{ 
                    p: 3, 
                    textAlign: 'center',
                    backgroundColor: 'grey.50',
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    borderRadius: 2
                  }}
                >
                  <FitnessCenterIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary">
                    No exercises selected yet. Choose exercises from the list below.
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ p: 1, borderRadius: 2 }}>
                  <List>
                    {selectedExercises.map((exercise, index) => (
                      <Grow 
                        key={exercise.id} 
                        in={true} 
                        timeout={300 + (index * 100)}
                      >
                        <ListItem 
                          sx={{ 
                            borderRadius: 1,
                            mb: 1,
                            backgroundColor: 'primary.50',
                            border: '1px solid',
                            borderColor: 'primary.200',
                            '&:hover': {
                              backgroundColor: 'primary.100',
                            }
                          }}
                        >
                          <ListItemIcon>
                            <FitnessCenterIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={exercise.exercise_name}
                            secondary={`Category: ${exercise.category} | Difficulty: ${exercise.difficulty}`}
                          />
                          <IconButton
                            edge="end"
                            onClick={() => removeExercise(exercise.id)}
                            color="error"
                            size="small"
                          >
                            <RemoveIcon />
                          </IconButton>
                        </ListItem>
                      </Grow>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
            
            <Divider />

            {/* Exercise Search and Filter Controls - All in one line */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ flexShrink: 0 }}>
                Available Exercises
              </Typography>
              <TextField
                sx={{ flexGrow: 1, minWidth: 300 }}
                variant="outlined"
                placeholder="Search exercises by name or instructions..."
                value={exerciseSearchTerm}
                onChange={(e) => setExerciseSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={exerciseCategoryFilter}
                  onChange={(e) => setExerciseCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {uniqueCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {exercises.length === 0 ? (
              <Alert severity="info">
                No exercises available in the database. Please contact your administrator.
              </Alert>
            ) : filteredExercises.length === 0 ? (
              <Alert severity="info">
                No exercises match your search criteria. Try adjusting your search terms or filters.
              </Alert>
            ) : (
              <>
                
                {/* Efficient Table View */}
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">Select</TableCell>
                          <TableCell>Exercise Name</TableCell>
                          <TableCell>Instructions</TableCell>
                          <TableCell align="center">Actions</TableCell>
                          <TableCell align="center">Details</TableCell>
                        </TableRow>
                      </TableHead>
                    <TableBody>
                      {filteredExercises.map((exercise) => {
                        const isSelected = selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id);
                        const isAnimating = animatingExercise === exercise.exercise_id;
                        const isExpanded = !!expandedExercises[exercise.exercise_id];
                        return (
                          <React.Fragment key={exercise.exercise_id}>
                            <TableRow 
                              hover
                              selected={isSelected}
                              sx={{ 
                                '&:nth-of-type(odd)': { 
                                  backgroundColor: 'action.hover' 
                                },
                                '&:last-child td, &:last-child th': { 
                                  border: 0 
                                },
                                transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
                                transition: 'all 0.3s ease-in-out',
                                backgroundColor: isAnimating ? 'primary.100' : isSelected ? 'action.selected' : 'inherit',
                              }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      const exerciseToRemove = selectedExercises.find(ex => ex.exercise_id === exercise.exercise_id);
                                      removeExercise(exerciseToRemove.id);
                                    } else {
                                      addExercise(exercise);
                                    }
                                  }}
                                  color="primary"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                  {exercise.name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    maxWidth: 240, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {exercise.instructions || 'No instructions provided'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  variant={isSelected ? "outlined" : "contained"}
                                  size="small"
                                  startIcon={isSelected ? <RemoveIcon /> : <AddIcon />}
                                  onClick={() => {
                                    if (isSelected) {
                                      const exerciseToRemove = selectedExercises.find(ex => ex.exercise_id === exercise.exercise_id);
                                      removeExercise(exerciseToRemove.id);
                                    } else {
                                      addExercise(exercise);
                                    }
                                  }}
                                  color={isSelected ? "error" : "primary"}
                                >
                                  {isSelected ? "Remove" : "Add"}
                                </Button>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExerciseDetails(exercise.exercise_id);
                                  }}
                                >
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={5} sx={{ bgcolor: 'grey.50' }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Instructions
                                  </Typography>
                                  <Typography variant="body2">
                                    {exercise.instructions || 'No instructions provided'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Exercise Configuration */}
            {selectedExercises.map((exercise) => (
              <Card key={exercise.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{exercise.exercise_name}</Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Reps per Set"
                          value={exercise.reps_per_set}
                          onChange={(e) => updateExerciseSettings(exercise.id, 'reps_per_set', parseInt(e.target.value))}
                          inputProps={{ min: 1 }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Sets"
                          value={exercise.sets || ''}
                          onChange={(e) => updateExerciseSettings(exercise.id, 'sets', parseInt(e.target.value) || 1)}
                          inputProps={{ min: 1 }}
                          placeholder="1"
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Time to Complete Within (Minute)"
                          value={exercise.duration || ''}
                          onChange={(e) => updateExerciseSettings(exercise.id, 'duration', parseInt(e.target.value) || 1)}
                          inputProps={{ min: 1 }}
                          placeholder="1"
                          helperText="Min 1"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Exercise Notes (Optional)"
                          multiline
                          rows={2}
                          value={exercise.notes}
                          onChange={(e) => updateExerciseSettings(exercise.id, 'notes', e.target.value)}
                          placeholder="Add specific notes for this exercise..."
                        />
                      </Grid>
                    </Grid>
                </CardContent>
              </Card>
            ))}

            {/* Review Summary */}
            <Card 
              elevation={4}
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%)',
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FitnessCenterIcon color="primary" />
                  Treatment Plan Summary
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'success.light', width: 32, height: 32 }}>
                        👤
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Patient
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {currentPatient?.username || 'Unknown'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'info.light', width: 32, height: 32 }}>
                        📅
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Start Date
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {formatDate(startDate)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'warning.light', width: 32, height: 32 }}>
                        💪
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Exercises
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {selectedExercises.length} exercises
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'error.light', width: 32, height: 32 }}>
                        📝
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Treatment Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {treatmentName}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Success Message */}
            <Alert 
              severity="success" 
              sx={{ 
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem',
                },
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                Ready to create! Your treatment plan has been configured and is ready to be saved.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {isEditMode ? 'Edit Treatment Plan' : 'Create Treatment Plan'}
        </Typography>
      </Box>

      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Stepper */}
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        {/* Step Content */}
        <Paper sx={{ p: 3, mb: 3 }}>
          {renderStepContent(activeStep)}
        </Paper>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep > 0 && (
              <Button onClick={handleBack} disabled={loading}>
                Back
              </Button>
            )}
            {activeStep < steps.length - 1 ? (
              <Button variant="contained" onClick={handleNext} disabled={loading}>
                Next
              </Button>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleSubmit} 
                disabled={loading}
                startIcon={loading ? null : <AddIcon />}
              >
                {loading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Treatment Plan" : "Create Treatment Plan")}
              </Button>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CreateTreatmentPlanPage;