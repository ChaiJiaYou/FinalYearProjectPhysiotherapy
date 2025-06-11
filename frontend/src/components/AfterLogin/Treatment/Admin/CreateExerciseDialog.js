import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Chip,
  Paper,
  Divider,
  Alert,
} from "@mui/material";
import {
  FitnessCenter as ExerciseIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

const BODY_PARTS = [
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'knee', label: 'Knee' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'hip', label: 'Hip' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'elbow', label: 'Elbow' },
  { value: 'spine', label: 'Spine' },
  { value: 'neck', label: 'Neck' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Full Body' },
];

const CATEGORIES = [
  { value: 'strength', label: 'Strength' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'balance', label: 'Balance' },
  { value: 'coordination', label: 'Coordination' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'range_of_motion', label: 'Range of Motion' },
  { value: 'functional', label: 'Functional' },
  { value: 'stabilization', label: 'Stabilization' },
];

const CreateExerciseDialog = ({ open, onClose, onSuccess, editingExercise }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    exercise_name: '',
    description: '',
    instructions: '',
    body_part: '',
    category: '',
    default_sets: 3,
    default_repetitions: 10,
    default_pain_threshold: 5,
    default_target_metrics: {
      repetitions: 10,
      hold_sec: 2,
    },
    is_active: true,
  });

  useEffect(() => {
    if (editingExercise) {
      setFormData({
        exercise_name: editingExercise.exercise_name || '',
        description: editingExercise.description || '',
        instructions: editingExercise.instructions || '',
        body_part: editingExercise.body_part || '',
        category: editingExercise.category || '',
        default_sets: editingExercise.default_sets || 3,
        default_repetitions: editingExercise.default_repetitions || 10,
        default_pain_threshold: editingExercise.default_pain_threshold || 5,
        default_target_metrics: editingExercise.default_target_metrics || {
          repetitions: 10,
          hold_sec: 2,
        },
        is_active: editingExercise.is_active !== undefined ? editingExercise.is_active : true,
      });
    } else if (open) {
      resetForm();
    }
  }, [editingExercise, open]);

  const resetForm = () => {
    setFormData({
      exercise_name: '',
      description: '',
      instructions: '',
      body_part: '',
      category: '',
      default_sets: 3,
      default_repetitions: 10,
      default_pain_threshold: 5,
      default_target_metrics: {
        repetitions: 10,
        hold_sec: 2,
      },
      is_active: true,
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTargetMetricChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      default_target_metrics: {
        ...prev.default_target_metrics,
        [key]: value
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const url = editingExercise 
        ? `http://127.0.0.1:8000/api/exercises/${editingExercise.exercise_id}/`
        : "http://127.0.0.1:8000/api/exercises/";
      
      const method = editingExercise ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(`Exercise ${editingExercise ? 'updated' : 'created'} successfully!`);
        onSuccess();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || `Failed to ${editingExercise ? 'update' : 'create'} exercise`);
      }
    } catch (error) {
      console.error("Error saving exercise:", error);
      toast.error("Something went wrong while saving exercise");
    } finally {
      setLoading(false);
    }
  };

  const isValid = formData.exercise_name && formData.body_part && formData.category;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ExerciseIcon color="secondary" />
          <Typography variant="h5">
            {editingExercise ? 'Edit Exercise' : 'Create New Exercise'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Create detailed exercise definitions with default settings that can be used in treatment plans.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Exercise Name"
                value={formData.exercise_name}
                onChange={(e) => handleChange('exercise_name', e.target.value)}
                placeholder="e.g., Sit to Stand"
                helperText="Enter a clear, descriptive name for the exercise"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what this exercise does and its benefits..."
                helperText="Provide a detailed description of the exercise and its purpose"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Instructions"
                value={formData.instructions}
                onChange={(e) => handleChange('instructions', e.target.value)}
                placeholder="1. Starting position: ...&#10;2. Movement: ...&#10;3. End position: ..."
                helperText="Provide step-by-step instructions for performing the exercise"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Body Part</InputLabel>
                <Select
                  value={formData.body_part}
                  onChange={(e) => handleChange('body_part', e.target.value)}
                  label="Body Part"
                >
                  {BODY_PARTS.map((part) => (
                    <MenuItem key={part.value} value={part.value}>
                      {part.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  label="Category"
                >
                  {CATEGORIES.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                Default Settings
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Default Sets"
                value={formData.default_sets}
                onChange={(e) => handleChange('default_sets', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 10 }}
                helperText="Default number of sets"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Default Repetitions"
                value={formData.default_repetitions}
                onChange={(e) => handleChange('default_repetitions', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 100 }}
                helperText="Default number of repetitions"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Default Pain Threshold (1-10)"
                value={formData.default_pain_threshold}
                onChange={(e) => handleChange('default_pain_threshold', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 10 }}
                helperText="Default pain threshold level"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                Default Target Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Target Repetitions"
                    value={formData.default_target_metrics.repetitions}
                    onChange={(e) => handleTargetMetricChange('repetitions', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Hold Duration (seconds)"
                    value={formData.default_target_metrics.hold_sec}
                    onChange={(e) => handleTargetMetricChange('hold_sec', parseInt(e.target.value))}
                    inputProps={{ min: 0, max: 60 }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      Active Exercise
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active exercises are available for use in treatment plans
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>

          {/* Preview Card */}
          <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
              Exercise Preview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">
                  <strong>{formData.exercise_name || 'Exercise Name'}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {formData.description || 'Exercise description will appear here...'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {formData.body_part && (
                    <Chip 
                      label={BODY_PARTS.find(p => p.value === formData.body_part)?.label || formData.body_part}
                      size="small" 
                      color="primary"
                    />
                  )}
                  {formData.category && (
                    <Chip 
                      label={CATEGORIES.find(c => c.value === formData.category)?.label || formData.category}
                      size="small" 
                      color="secondary"
                    />
                  )}
                  <Chip 
                    label={`${formData.default_sets} sets × ${formData.default_repetitions} reps`}
                    size="small" 
                    variant="outlined"
                  />
                  <Chip 
                    label={formData.is_active ? 'Active' : 'Inactive'}
                    size="small" 
                    color={formData.is_active ? 'success' : 'default'}
                  />
                </Box>
              </Grid>
              {formData.instructions && (
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ 
                    bgcolor: 'white', 
                    p: 1.5, 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    whiteSpace: 'pre-line'
                  }}>
                    <strong>Instructions:</strong><br/>
                    {formData.instructions}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading || !isValid}
          startIcon={loading ? null : <SaveIcon />}
          sx={{
            background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
          }}
        >
          {loading ? "Saving..." : (editingExercise ? "Update Exercise" : "Create Exercise")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateExerciseDialog; 