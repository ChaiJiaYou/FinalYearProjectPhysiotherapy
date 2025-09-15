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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  FitnessCenter as ExerciseIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { toast } from "react-toastify";
import BodyPartPicker from "./BodyPartPicker";
import RuleTypeIllustrations from "./RuleTypeIllustrations";

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

// Simple keypoint indices for presets
const KP = {
  leftShoulder: 5,
  rightShoulder: 6,
  leftElbow: 7,
  rightElbow: 8,
  leftWrist: 9,
  rightWrist: 10,
  leftHip: 11,
  rightHip: 12,
  leftKnee: 13,
  rightKnee: 14,
  leftAnkle: 15,
  rightAnkle: 16,
};

const RULE_TYPES = [
  { value: 'angle', label: 'Angle (关节角度)' },
  { value: 'distance', label: 'Distance (两点距离)' },
  { value: 'direction', label: 'Direction (位移方向累计)' },
  { value: 'position', label: 'Position (坐标范围)' },
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
    is_active: true,
    detection_rules: null,
  });

  // Detection rule builder state
  const [enableRule, setEnableRule] = useState(false);
  const [ruleType, setRuleType] = useState('angle');
  const [ruleSide, setRuleSide] = useState('auto');
  const [ruleAxis, setRuleAxis] = useState('y');
  const [ruleDirection, setRuleDirection] = useState('down');
  const [confirmFrames, setConfirmFrames] = useState(3);
  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(60);
  const [countThreshold, setCountThreshold] = useState(0.12);

  const buildPoints = () => {
    if (ruleType === 'angle') {
      return ruleSide === 'right'
        ? [KP.rightShoulder, KP.rightElbow, KP.rightWrist]
        : [KP.leftShoulder, KP.leftElbow, KP.leftWrist];
    }
    if (ruleType === 'distance') {
      return ruleSide === 'right'
        ? [KP.rightKnee, KP.rightAnkle]
        : [KP.leftKnee, KP.leftAnkle];
    }
    if (ruleType === 'position' || ruleType === 'direction') {
      return ruleSide === 'right' ? [KP.rightWrist] : [KP.leftWrist];
    }
    return [];
  };

  const getComposedDetectionRules = () => {
    if (!enableRule) return null;
    const rule = { type: ruleType, points: buildPoints() };
    if (ruleType === 'angle' || ruleType === 'distance' || ruleType === 'position') {
      rule.range = [Number(rangeMin), Number(rangeMax)];
    }
    if (ruleType === 'position') {
      rule.axis = ruleAxis;
    }
    if (ruleType === 'direction') {
      rule.axis = ruleAxis;
      rule.direction = ruleDirection;
      rule.count_threshold = Number(countThreshold);
    }
    return {
      confirmFrames: Number(confirmFrames) || 3,
      rules: [rule],
    };
  };

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
        is_active: editingExercise.is_active !== undefined ? editingExercise.is_active : true,
        detection_rules: editingExercise.detection_rules || null,
      });

      const dr = editingExercise.detection_rules;
      if (dr) {
        setEnableRule(true);
        if (typeof dr.confirmFrames === 'number') setConfirmFrames(dr.confirmFrames);
        const r0 = Array.isArray(dr.rules) ? dr.rules[0] : (dr.type ? dr : null);
        if (r0) {
          if (r0.type) setRuleType(r0.type);
          if (r0.axis) setRuleAxis(r0.axis);
          if (r0.direction) setRuleDirection(r0.direction);
          if (Array.isArray(r0.range)) {
            setRangeMin(Number(r0.range[0] ?? 0));
            setRangeMax(Number(r0.range[1] ?? 0));
          } else {
            if (r0.type === 'angle') { setRangeMin(0); setRangeMax(60); }
            if (r0.type === 'distance') { setRangeMin(0.35); setRangeMax(1.0); }
            if (r0.type === 'position') { setRangeMin(0.0); setRangeMax(0.3); }
          }
          if (typeof r0.count_threshold === 'number') setCountThreshold(r0.count_threshold);
        }
      } else {
        setEnableRule(false);
      }
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
      is_active: true,
      detection_rules: null,
    });
    setEnableRule(false);
    setRuleType('angle');
    setRuleSide('auto');
    setRuleAxis('y');
    setRuleDirection('down');
    setConfirmFrames(3);
    setRangeMin(0); setRangeMax(60);
    setCountThreshold(0.12);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // removed hold duration/target metrics editor

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const url = editingExercise 
        ? `http://127.0.0.1:8000/api/exercises/${editingExercise.exercise_id}/`
        : "http://127.0.0.1:8000/api/exercises/";
      const method = editingExercise ? "PUT" : "POST";
      const detection = getComposedDetectionRules();
      const payload = { ...formData, detection_rules: detection || null };
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
                placeholder="1. Starting position: ...\n2. Movement: ...\n3. End position: ..."
                helperText="Provide step-by-step instructions for performing the exercise"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <BodyPartPicker
                value={formData.body_part}
                onChange={(part) => handleChange('body_part', part)}
              />
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


            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 1.5, color: 'primary.main' }}>
                Detection Rule (Optional)
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableRule}
                    onChange={(e) => setEnableRule(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Enable Movement Counting</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Turn on to define how repetitions are detected in real-time
                    </Typography>
                  </Box>
                }
              />

              {enableRule && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Rule Type</InputLabel>
                        <Select value={ruleType} label="Rule Type" onChange={(e) => {
                          const v = e.target.value; setRuleType(v);
                          if (v === 'angle') { setRangeMin(0); setRangeMax(60); }
                          if (v === 'distance') { setRangeMin(0.35); setRangeMax(1.0); }
                          if (v === 'position') { setRangeMin(0.0); setRangeMax(0.3); setRuleAxis('y'); }
                          if (v === 'direction') { setRuleAxis('y'); setRuleDirection('down'); setCountThreshold(0.12); }
                        }}>
                          {RULE_TYPES.map(t => (
                            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Side</InputLabel>
                        <Select value={ruleSide} label="Side" onChange={(e) => setRuleSide(e.target.value)}>
                          <MenuItem value="auto">Auto (choose clearer side)</MenuItem>
                          <MenuItem value="left">Left</MenuItem>
                          <MenuItem value="right">Right</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Confirm Frames"
                        value={confirmFrames}
                        onChange={(e) => setConfirmFrames(parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1, max: 30 }}
                        helperText="How many consecutive frames must meet the rule to confirm"
                      />
                    </Grid>

                    {(ruleType === 'angle' || ruleType === 'distance' || ruleType === 'position') && (
                      <>
                        <Grid item xs={12} sm={6} md={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label={ruleType === 'angle' ? 'Range Min (deg)' : (ruleType === 'distance' ? 'Range Min (0-1)' : 'Range Min (0-1)')}
                            value={rangeMin}
                            onChange={(e) => setRangeMin(Number(e.target.value))}
                            helperText={ruleType === 'angle' ? 'Lower bound of angle in degrees' : 'Lower bound of normalized value'}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label={ruleType === 'angle' ? 'Range Max (deg)' : (ruleType === 'distance' ? 'Range Max (0-1)' : 'Range Max (0-1)')}
                            value={rangeMax}
                            onChange={(e) => setRangeMax(Number(e.target.value))}
                            helperText={ruleType === 'angle' ? 'Upper bound of angle in degrees' : 'Upper bound of normalized value'}
                          />
                        </Grid>
                      </>
                    )}

                    {(ruleType === 'position' || ruleType === 'direction') && (
                      <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>Axis</InputLabel>
                          <Select value={ruleAxis} label="Axis" onChange={(e) => setRuleAxis(e.target.value)}>
                            <MenuItem value="x">X (left-right)</MenuItem>
                            <MenuItem value="y">Y (up-down)</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    {ruleType === 'direction' && (
                      <>
                        <Grid item xs={12} sm={6} md={4}>
                          <FormControl fullWidth>
                            <InputLabel>Direction</InputLabel>
                            <Select value={ruleDirection} label="Direction" onChange={(e) => setRuleDirection(e.target.value)}>
                              <MenuItem value="up">Up</MenuItem>
                              <MenuItem value="down">Down</MenuItem>
                              <MenuItem value="left">Left</MenuItem>
                              <MenuItem value="right">Right</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Movement Threshold (0-1)"
                            value={countThreshold}
                            onChange={(e) => setCountThreshold(Number(e.target.value))}
                            helperText="How far it must move along axis before counting"
                          />
                        </Grid>
                      </>
                    )}

                    <Grid item xs={12}>
                      <Accordion sx={{ bgcolor: 'grey.50' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle2">What is a detection rule?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            A detection rule tells the counter when to add one repetition. Choose a type and simple thresholds.
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <RuleTypeIllustrations />
                          </Box>
                          <ul style={{ marginTop: 0 }}>
                            <li>
                              <strong>Angle</strong>: 3 points [A,B,C], measures the angle at B (degrees). When angle is within [min,max], it is considered ON.
                            </li>
                            <li>
                              <strong>Distance</strong>: 2 points [P,Q], uses normalized distance (0–1). Within [min,max] is ON.
                            </li>
                            <li>
                              <strong>Position</strong>: 1 point, compare its X or Y (0–1) with [min,max]. Within range is ON.
                            </li>
                            <li>
                              <strong>Direction</strong>: 1 point, accumulates movement along X or Y towards a direction. When accumulated movement ≥ threshold, it is ON.
                            </li>
                          </ul>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Confirm Frames debounces noise (e.g., 3). Recommended defaults: Angle [0,60], Distance [0.35,1.0], Position [0.0,0.3], Direction threshold 0.12.
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Preview</Typography>
                      <Paper sx={{ p: 1.5, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(getComposedDetectionRules() || {}, null, 2)}
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
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