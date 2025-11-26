import React, { useState, useEffect } from "react";
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
  
  // User role detection
  const userRole = localStorage.getItem("role");
  const currentUserId = localStorage.getItem("id");
  const isAdmin = userRole === 'admin';
  const isTherapist = userRole === 'therapist';

  // Form data - based on actual model fields
  const [treatmentName, setTreatmentName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [goalNotes, setGoalNotes] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [animatingExercise, setAnimatingExercise] = useState(null);
  const [originalExerciseIds, setOriginalExerciseIds] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(isAdmin ? '' : currentUserId);
  
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
      setSelectedExercises([]);
    }
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
  useEffect(() => {
    if (patientId && patients.length > 0) {
      const patient = patients.find(p => p.id === patientId);
      if (patient) {
        setTreatmentName(`Treatment Plan for ${patient.username}`);
      }
    }
  }, [patientId, patients]);

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
      
      // Fetch existing exercises for this treatment
      console.log('Fetching exercises for treatment:', treatmentId);
      const exercisesResponse = await fetch(`http://127.0.0.1:8000/api/treatment-exercises/${treatmentId}/`);
      console.log('Exercises response status:', exercisesResponse.status);
      
      if (exercisesResponse.ok) {
        const exercisesData = await exercisesResponse.json();
        console.log('Exercises data received:', exercisesData);
        
        // Track original treatment exercise ids for deletion detection
        const treatmentExerciseIds = exercisesData
          .map((exercise) => exercise.treatment_exercise_id)
          .filter(Boolean);
        setOriginalExerciseIds(treatmentExerciseIds);
        
        // Transform the data to match the expected format
        const transformedExercises = exercisesData.map((exercise, index) => ({
          id: exercise.treatment_exercise_id || exercise.exercise_id || `${Date.now()}_${index}`,
          treatment_exercise_id: exercise.treatment_exercise_id || null,
          exercise_id: exercise.exercise_id,
          exercise_name: exercise.exercise_name,
          category: exercise.category,
          difficulty: exercise.difficulty,
          instructions: exercise.instructions || '',
          reps_per_set: exercise.reps_per_set || 10,
          sets: exercise.sets || 1,
          duration_per_set: exercise.duration_per_set || 60,
          notes: exercise.notes || '',
        }));
        
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
        if (!treatmentName || !startDate) {
          toast.warn("Please fill in all required fields");
          return false;
        }
        if (isAdmin && !selectedTherapist) {
          toast.warn("Please select a therapist");
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
          if (!exercise.duration_per_set || exercise.duration_per_set <= 0) {
            toast.warn(`Please set duration per set for ${exercise.exercise_name}`);
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

    const newExercise = {
      id: `new_${Date.now()}`,
      treatment_exercise_id: null,
      exercise_id: exercise.exercise_id,
      exercise_name: exercise.name,
      category: exercise.category,
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      reps_per_set: 10,
      sets: 1,
      duration_per_set: 60,
      notes: '',
    };

    // Set animation state
    setAnimatingExercise(exercise.exercise_id);
    
    // Add exercise with animation
    setSelectedExercises([...selectedExercises, newExercise]);
    
    // Clear animation after animation completes
    setTimeout(() => {
      setAnimatingExercise(null);
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
        };

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

        // Update existing exercises
        for (let index = 0; index < existingExercisesToUpdate.length; index += 1) {
          const exercise = existingExercisesToUpdate[index];
          const exerciseData = {
            reps_per_set: exercise.reps_per_set,
            sets: exercise.sets,
            duration_per_set: exercise.duration_per_set,
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

        // Create newly added exercises (continue order after existing ones)
        for (let i = 0; i < newExercisesToCreate.length; i += 1) {
          const exercise = newExercisesToCreate[i];
          const orderIndex = existingExercisesToUpdate.length + i + 1;
          const exerciseData = {
            treatment_id: treatmentId,
            exercise_id: exercise.exercise_id,
            reps_per_set: exercise.reps_per_set,
            sets: exercise.sets,
            duration_per_set: exercise.duration_per_set,
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

        // Handle removed exercises
        const currentExistingIds = existingExercisesToUpdate.map((exercise) => exercise.treatment_exercise_id);
        const removedExerciseIds = originalExerciseIds.filter((id) => !currentExistingIds.includes(id));

        for (const removedId of removedExerciseIds) {
          const deleteResponse = await fetch(`http://127.0.0.1:8000/api/delete-treatment-exercise/${removedId}/`, {
            method: "DELETE",
          });

          if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.error("Failed to delete treatment exercise:", removedId, errorText);
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
          status: 'active',
          start_date: startDate,
          end_date: endDate || null,
          goal_notes: goalNotes || null,
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
            duration_per_set: exercise.duration_per_set,
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

  // Filter exercises based on search term and category
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) ||
                         (exercise.instructions && exercise.instructions.toLowerCase().includes(exerciseSearchTerm.toLowerCase()));
    const matchesCategory = !exerciseCategoryFilter || exercise.category === exerciseCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter options
  const uniqueCategories = [...new Set(exercises.map(ex => ex.category).filter(Boolean))];

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
              placeholder="e.g., Post-Surgery Rehabilitation Plan"
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
              type="date"
              label="End Date (Optional)"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Automatically set to 2 weeks after start date"
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
                        <TableCell>Category</TableCell>
                        <TableCell>Difficulty</TableCell>
                        <TableCell>Instructions</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredExercises.map((exercise) => {
                        const isSelected = selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id);
                        const isAnimating = animatingExercise === exercise.exercise_id;
                        return (
                          <TableRow 
                            key={exercise.exercise_id}
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
                              <Chip 
                                label={exercise.category.replace('_', ' ')} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={exercise.difficulty} 
                                size="small" 
                                color="secondary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={exercise.instructions} arrow>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    maxWidth: 200, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    cursor: 'help'
                                  }}
                                >
                                  {exercise.instructions}
                                </Typography>
                              </Tooltip>
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
                          </TableRow>
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
                          label="Duration (sec)"
                          value={exercise.duration_per_set || ''}
                          onChange={(e) => updateExerciseSettings(exercise.id, 'duration_per_set', parseInt(e.target.value) || 60)}
                          inputProps={{ min: 0 }}
                          placeholder="60"
                          helperText="Duration for one set"
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