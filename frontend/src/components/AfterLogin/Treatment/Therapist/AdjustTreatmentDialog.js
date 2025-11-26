import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Grid,
  Divider,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Collapse,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Edit as EditIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Save as SaveIcon,
  FitnessCenter as FitnessCenterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Settings as SettingsIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`adjust-tabpanel-${index}`}
      aria-labelledby={`adjust-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const TREATMENT_TYPES = [
  { value: 'joint_specific', label: 'Joint Specific' },
  { value: 'functional', label: 'Functional' },
  { value: 'symmetry', label: 'Symmetry' },
  { value: 'pain_adapted', label: 'Pain Adapted' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

const EXERCISE_TEMPLATES = [
  {
    id: 1,
    name: 'Wall Crawl',
    body_part: 'left_shoulder',
    default_metrics: { flexion: 90, hold_sec: 5 },
    description: 'Shoulder flexion exercise using wall support'
  },
  {
    id: 2,
    name: 'Sit to Stand',
    body_part: 'hip',
    default_metrics: { repetitions: 10, hold_sec: 2 },
    description: 'Functional movement training'
  },
  {
    id: 3,
    name: 'Ankle Pumps',
    body_part: 'left_ankle',
    default_metrics: { dorsiflexion: 20, repetitions: 15 },
    description: 'Ankle mobility exercise'
  },
];

const AdjustTreatmentDialog = ({ open, onClose, onSuccess, treatment }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [expandedExercise, setExpandedExercise] = useState(null);
  
  // Basic Info State
  const [treatmentType, setTreatmentType] = useState('');
  const [treatmentSubtype, setTreatmentSubtype] = useState('');
  const [status, setStatus] = useState('');
  const [frequency, setFrequency] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && treatment) {
      // Initialize form with treatment data
      setTreatmentType(treatment.treatment_type || '');
      setTreatmentSubtype(treatment.treatment_subtype || '');
      setStatus(treatment.status || '');
      setFrequency(treatment.frequency || '');
      setEndDate(treatment.end_date || '');
      setNotes('');
      
      // Fetch exercises for this treatment
      fetchTreatmentExercises();
    }
  }, [open, treatment]);

  const fetchTreatmentExercises = async () => {
    if (!treatment?.treatment_id) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/treatment-exercises/${treatment.treatment_id}/`);
      if (response.ok) {
        const data = await response.json();
        const mappedExercises = data.map((exercise) => ({
          ...exercise,
          repetitions: exercise.reps_per_set ?? exercise.repetitions ?? 0,
          sets: exercise.sets ?? 1,
          duration_per_set: exercise.duration_per_set ?? 0,
        }));
        setExercises(mappedExercises);
      } else {
        toast.error("Failed to load treatment exercises");
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Something went wrong while fetching exercises");
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const addNewExercise = (template) => {
    const newExercise = {
      id: `new_${Date.now()}`,
      exercise_name: template.name,
      body_part: template.body_part,
      target_metrics: { ...template.default_metrics },
      repetitions: 10,
      sets: 3,
      pain_threshold: 5,
      isNew: true,
    };
    setExercises([...exercises, newExercise]);
  };

  const removeExercise = (exerciseId) => {
    setExercises(exercises.filter(ex => {
      const id = ex.treatment_exercise_id || ex.exercise_id || ex.id;
      return id !== exerciseId;
    }));
  };

  const updateExercise = (exerciseId, field, value) => {
    setExercises(exercises.map(ex => {
      const id = ex.treatment_exercise_id || ex.exercise_id || ex.id;
      if (id === exerciseId) {
        if (field === 'target_metrics') {
          return { ...ex, target_metrics: { ...ex.target_metrics, ...value } };
        }
        if (field === 'repetitions') {
          const repetitionsValue = value;
          return { ...ex, repetitions: repetitionsValue, reps_per_set: repetitionsValue };
        }
        return { ...ex, [field]: value };
      }
      return ex;
    }));
  };

  const handleSaveBasicInfo = async () => {
    try {
      setLoading(true);
      
      const updateData = {
        treatment_type: treatmentType,
        treatment_subtype: treatmentSubtype,
        status,
        frequency,
        end_date: endDate || null,
      };

      const response = await fetch(`http://127.0.0.1:8000/api/update-treatment/${treatment.treatment_id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success("Treatment information updated successfully!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update treatment");
      }
    } catch (error) {
      console.error("Error updating treatment:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExercises = async () => {
    try {
      setLoading(true);

      // Handle new exercises
      for (const exercise of exercises.filter(ex => ex.isNew)) {
        const exerciseData = {
          treatment_id: treatment.treatment_id,
          exercise_name: exercise.exercise_name,
          body_part: exercise.body_part,
          target_metrics: exercise.target_metrics,
          repetitions: exercise.repetitions,
          sets: exercise.sets,
          pain_threshold: exercise.pain_threshold,
        };

        const response = await fetch("http://127.0.0.1:8000/api/create-treatment-exercise/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(exerciseData),
        });

        if (!response.ok) {
          console.error("Failed to create exercise:", exercise.exercise_name);
        }
      }

      // Handle existing exercise updates
      for (const exercise of exercises.filter(ex => !ex.isNew && (ex.treatment_exercise_id || ex.exercise_id))) {
        const exerciseData = {
          reps_per_set: exercise.repetitions ?? exercise.reps_per_set ?? 0,
          sets: exercise.sets ?? 1,
          duration_per_set: exercise.duration_per_set ?? null,
          notes: exercise.notes ?? null,
          pain_threshold: exercise.pain_threshold ?? null,
          order_in_treatment: exercise.order_in_treatment ?? null,
          is_active: exercise.is_active ?? true,
        };

        const targetId = exercise.treatment_exercise_id || exercise.exercise_id;

        const response = await fetch(`http://127.0.0.1:8000/api/update-treatment-exercise/${targetId}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(exerciseData),
        });

        if (!response.ok) {
          console.error("Failed to update exercise:", exercise.exercise_name);
        }
      }

      toast.success("Exercises updated successfully!");
      fetchTreatmentExercises(); // Refresh exercises
    } catch (error) {
      console.error("Error updating exercises:", error);
      toast.error("Something went wrong while updating exercises");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    await handleSaveBasicInfo();
    await handleSaveExercises();
    onSuccess();
    onClose();
  };

  if (!treatment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h5">
          Adjust Treatment Plan - {treatment.patient_name}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              icon={<SettingsIcon />} 
              label="Basic Information" 
              iconPosition="start"
            />
            <Tab 
              icon={<FitnessCenterIcon />} 
              label="Exercises" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Basic Information Tab */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Patient Information
              </Typography>
              <Typography><strong>Name:</strong> {treatment.patient_name}</Typography>
              <Typography><strong>ID:</strong> {treatment.patient_id}</Typography>
              <Typography><strong>Start Date:</strong> {new Date(treatment.start_date).toLocaleDateString()}</Typography>
            </Paper>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Treatment Type</InputLabel>
                  <Select
                    value={treatmentType}
                    onChange={(e) => setTreatmentType(e.target.value)}
                    label="Treatment Type"
                  >
                    {TREATMENT_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Treatment Subtype"
                  value={treatmentSubtype}
                  onChange={(e) => setTreatmentSubtype(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    label="Status"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="e.g., daily, 3x/week"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="End Date (Optional)"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleSaveBasicInfo}
                disabled={loading}
                startIcon={<SaveIcon />}
              >
                Save Basic Information
              </Button>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Exercises Tab */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Add New Exercise Section */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Add New Exercise
                </Typography>
                <Grid container spacing={2}>
                  {EXERCISE_TEMPLATES.map((template) => (
                    <Grid item xs={12} md={4} key={template.id}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1">{template.name}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {template.body_part.replace('_', ' ')}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {template.description}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => addNewExercise(template)}
                          >
                            Add
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Current Exercises */}
            <Typography variant="h6">
              Current Exercises ({exercises.length})
            </Typography>

            {exercises.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No exercises found. Add some exercises to get started.
                </Typography>
              </Paper>
            ) : (
              exercises.map((exercise) => {
                const exerciseId = exercise.treatment_exercise_id || exercise.exercise_id || exercise.id;
                const isExpanded = expandedExercise === exerciseId;
                
                return (
                  <Card key={exerciseId} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FitnessCenterIcon color="primary" />
                          <Typography variant="h6">
                            {exercise.exercise_name}
                            {exercise.isNew && <Chip label="New" color="success" size="small" sx={{ ml: 1 }} />}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            onClick={() => setExpandedExercise(isExpanded ? null : exerciseId)}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => removeExercise(exerciseId)}
                          >
                            <RemoveIcon />
                          </IconButton>
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Body Part: {exercise.body_part?.replace('_', ' ')}
                      </Typography>

                      <Collapse in={isExpanded}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Exercise Name"
                              value={exercise.exercise_name || ''}
                              onChange={(e) => updateExercise(exerciseId, 'exercise_name', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Body Part"
                              value={exercise.body_part || ''}
                              onChange={(e) => updateExercise(exerciseId, 'body_part', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Repetitions"
                              value={exercise.repetitions || ''}
                              onChange={(e) => updateExercise(exerciseId, 'repetitions', parseInt(e.target.value))}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Sets"
                              value={exercise.sets || ''}
                              onChange={(e) => updateExercise(exerciseId, 'sets', parseInt(e.target.value))}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Pain Threshold (1-10)"
                              value={exercise.pain_threshold || ''}
                              onChange={(e) => updateExercise(exerciseId, 'pain_threshold', parseInt(e.target.value))}
                              inputProps={{ min: 1, max: 10 }}
                            />
                          </Grid>
                          
                          {/* Dynamic target metrics */}
                          {exercise.target_metrics && Object.entries(exercise.target_metrics).map(([key, value]) => (
                            <Grid item xs={12} sm={6} key={key}>
                              <TextField
                                fullWidth
                                type="number"
                                label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                value={value || ''}
                                onChange={(e) => updateExercise(
                                  exerciseId, 
                                  'target_metrics', 
                                  { [key]: parseFloat(e.target.value) || 0 }
                                )}
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </Collapse>
                    </CardContent>
                  </Card>
                );
              })
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleSaveExercises}
                disabled={loading}
                startIcon={<SaveIcon />}
              >
                Save Exercise Changes
              </Button>
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSaveAll} 
          disabled={loading}
          startIcon={<SaveIcon />}
        >
          {loading ? "Saving..." : "Save All Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdjustTreatmentDialog; 