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
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Collapse,
  RadioGroup,
  FormControlLabel,
  Radio,
  Avatar,
  Alert,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  FitnessCenter as FitnessCenterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Description as TemplateIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { formatDate } from "../../../../utils/dateUtils";

const TREATMENT_TYPES = [
  { value: 'joint_specific', label: 'Joint Specific' },
  { value: 'functional', label: 'Functional' },
  { value: 'symmetry', label: 'Symmetry' },
  { value: 'pain_adapted', label: 'Pain Adapted' },
];

const TREATMENT_SUBTYPES = {
  joint_specific: ['shoulder_rom', 'knee_flexion', 'ankle_mobility'],
  functional: ['sit_to_stand', 'walking', 'balance'],
  symmetry: ['bilateral_coordination', 'posture_correction'],
  pain_adapted: ['gentle_movement', 'low_impact'],
};

// Exercise templates will now be fetched from database

const steps = ['Creation Method', 'Basic Information', 'Exercise Selection', 'Target Settings', 'Review & Create'];

const CreateTreatmentPlanDialog = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [patients, setPatients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Creation method
  const [creationMethod, setCreationMethod] = useState('template'); // 'template' or 'custom'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Template filtering and search
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templateTypeFilter, setTemplateTypeFilter] = useState('');
  
  // Exercise filtering and search
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [exerciseBodyPartFilter, setExerciseBodyPartFilter] = useState('');
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState('');
  
  // Form data
  const [selectedPatient, setSelectedPatient] = useState('');
  const [treatmentType, setTreatmentType] = useState('');
  const [treatmentSubtype, setTreatmentSubtype] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [expandedExercise, setExpandedExercise] = useState(null);
  
  const therapistId = localStorage.getItem("id");

  useEffect(() => {
    if (open) {
      fetchPatients();
      fetchTemplates();
      fetchExercises();
      resetForm();
    }
  }, [open]);

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

  const fetchTemplates = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/treatment-templates/");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        console.error("Failed to load templates");
        // Don't show error toast, just use fallback
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      // Don't show error toast, just use fallback
    }
  };

  const fetchExercises = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/exercises/");
      if (response.ok) {
        const data = await response.json();
        // Filter only active exercises for treatment plan creation
        setExercises(data.filter(exercise => exercise.is_active));
      } else {
        console.error("Failed to load exercises");
        toast.error("Failed to load exercises from database");
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Something went wrong while fetching exercises");
    }
  };

  const resetForm = () => {
    setActiveStep(0);
    setCreationMethod('template');
    setSelectedTemplate(null);
    setTemplateSearchTerm('');
    setTemplateTypeFilter('');
    setExerciseSearchTerm('');
    setExerciseBodyPartFilter('');
    setExerciseCategoryFilter('');
    setSelectedPatient('');
    setTreatmentType('');
    setTreatmentSubtype('');
    setFrequency('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setSelectedExercises([]);
    setExpandedExercise(null);
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    // Pre-fill form with template data
    setTreatmentType(template.treatment_type);
    setTreatmentSubtype(template.treatment_subtype || '');
    setFrequency(template.default_frequency || '');
    
    // Load template exercises
    const templateExercises = template.exercises.map((exercise, index) => ({
      id: `template_${Date.now()}_${index}`,
      exercise_name: exercise.exercise_name,
      body_part: exercise.body_part,
      target_metrics: { ...exercise.default_target_metrics },
      repetitions: exercise.default_repetitions || 10,
      sets: exercise.default_sets || 3,
      pain_threshold: exercise.default_pain_threshold || 5,
      is_required: exercise.is_required,
      order_in_template: exercise.order_in_template,
    }));
    
    setSelectedExercises(templateExercises);
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (creationMethod === 'template' && !selectedTemplate) {
          toast.warn("Please select a template");
          return false;
        }
        return true;
      case 1:
        if (!selectedPatient || !treatmentType || !startDate) {
          toast.warn("Please fill in all required fields");
          return false;
        }
        return true;
      case 2:
        if (selectedExercises.length === 0) {
          toast.warn("Please select at least one exercise");
          return false;
        }
        return true;
      case 3:
        // Validate exercise settings
        for (const exercise of selectedExercises) {
          if (!exercise.target_metrics || Object.keys(exercise.target_metrics).length === 0) {
            toast.warn(`Please set target metrics for ${exercise.exercise_name}`);
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
      id: Date.now(),
      exercise_id: exercise.exercise_id,
      exercise_name: exercise.exercise_name,
      body_part: exercise.body_part,
      target_metrics: exercise.default_target_metrics || { repetitions: 10, hold_sec: 2 },
      repetitions: exercise.default_repetitions || 10,
      sets: exercise.default_sets || 3,
      pain_threshold: exercise.default_pain_threshold || 5,
      category: exercise.category,
      instructions: exercise.instructions,
    };
    setSelectedExercises([...selectedExercises, newExercise]);
  };

  const removeExercise = (exerciseId) => {
    setSelectedExercises(selectedExercises.filter(ex => ex.id !== exerciseId));
  };

  const updateExerciseMetrics = (exerciseId, field, value) => {
    setSelectedExercises(selectedExercises.map(ex => 
      ex.id === exerciseId 
        ? { 
            ...ex, 
            [field]: field === 'target_metrics' 
              ? { ...ex.target_metrics, ...value }
              : value
          }
        : ex
    ));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Create treatment plan
      const treatmentData = {
        patient_id: selectedPatient,
        therapist_id: therapistId,
        template_id: selectedTemplate?.template_id || null,
        name: selectedTemplate?.name || 'Custom Treatment Plan',
        treatment_type: treatmentType,
        treatment_subtype: treatmentSubtype,
        frequency,
        start_date: startDate,
        status: 'active',
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
      for (const exercise of selectedExercises) {
        const exerciseData = {
          treatment_id: treatment.treatment_id,
          exercise_name: exercise.exercise_name,
          body_part: exercise.body_part,
          target_metrics: exercise.target_metrics,
          repetitions: exercise.repetitions,
          sets: exercise.sets,
          pain_threshold: exercise.pain_threshold,
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
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating treatment plan:", error);
      toast.error("Failed to create treatment plan");
    } finally {
      setLoading(false);
    }
  };

  // Filter templates based on search term and type filter
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(templateSearchTerm.toLowerCase());
    const matchesType = !templateTypeFilter || template.treatment_type === templateTypeFilter;
    return matchesSearch && matchesType;
  });

  // Filter exercises based on search term, body part, and category
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.exercise_name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) ||
                         (exercise.description && exercise.description.toLowerCase().includes(exerciseSearchTerm.toLowerCase()));
    const matchesBodyPart = !exerciseBodyPartFilter || exercise.body_part === exerciseBodyPartFilter;
    const matchesCategory = !exerciseCategoryFilter || exercise.category === exerciseCategoryFilter;
    return matchesSearch && matchesBodyPart && matchesCategory;
  });

  // Get unique body parts and categories for filter options
  const uniqueBodyParts = [...new Set(exercises.map(ex => ex.body_part).filter(Boolean))];
  const uniqueCategories = [...new Set(exercises.map(ex => ex.category).filter(Boolean))];

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Choose Creation Method
            </Typography>
            
            <FormControl component="fieldset">
              <RadioGroup
                value={creationMethod}
                onChange={(e) => {
                  setCreationMethod(e.target.value);
                  setSelectedTemplate(null);
                  setSelectedExercises([]);
                }}
              >
                <FormControlLabel
                  value="template"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TemplateIcon />
                      <Box>
                        <Typography variant="subtitle1">Use Template</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Start with a predefined template and customize as needed
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="custom"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildIcon />
                      <Box>
                        <Typography variant="subtitle1">Custom Creation</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Create a completely custom treatment plan from scratch
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            {creationMethod === 'template' && (
              <>
                <Divider />
                <Typography variant="h6">Available Templates</Typography>
                
                {/* Template Search and Filter Controls */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search templates by name or description..."
                    value={templateSearchTerm}
                    onChange={(e) => setTemplateSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Filter by Type</InputLabel>
                    <Select
                      value={templateTypeFilter}
                      onChange={(e) => setTemplateTypeFilter(e.target.value)}
                      label="Filter by Type"
                      startAdornment={
                        <InputAdornment position="start">
                          <FilterIcon />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="">All Types</MenuItem>
                      {TREATMENT_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {templates.length === 0 ? (
                  <Alert severity="info">
                    No templates available. You can create a custom treatment plan instead.
                  </Alert>
                ) : filteredTemplates.length === 0 ? (
                  <Alert severity="info">
                    No templates match your search criteria. Try adjusting your search terms or filters.
                  </Alert>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Showing {filteredTemplates.length} of {templates.length} templates
                    </Typography>
                    <Grid container spacing={2}>
                      {filteredTemplates.map((template) => (
                        <Grid item xs={12} md={6} key={template.template_id}>
                          <Card 
                            sx={{ 
                              cursor: 'pointer',
                              border: selectedTemplate?.template_id === template.template_id ? 2 : 1,
                              borderColor: selectedTemplate?.template_id === template.template_id ? 'primary.main' : 'divider'
                            }}
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main' }}>
                                  <AssignmentIcon />
                                </Avatar>
                                <Typography variant="h6">{template.name}</Typography>
                              </Box>
                              <Typography color="text.secondary" sx={{ mb: 1 }}>
                                Type: {template.treatment_type?.replace('_', ' ')}
                              </Typography>
                              <Typography color="text.secondary" sx={{ mb: 1 }}>
                                Condition: {template.condition}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 2 }}>
                                {template.description}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Exercises:</strong> {template.exercises?.length || 0}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Duration:</strong> {template.estimated_duration_weeks} weeks
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}
              </>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6">Basic Information</Typography>
            
            {selectedTemplate && (
              <Alert severity="info">
                Using template: <strong>{selectedTemplate.name}</strong>
                <br />
                You can modify the settings below if needed.
              </Alert>
            )}

            <FormControl fullWidth required>
              <InputLabel>Select Patient</InputLabel>
              <Select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                label="Select Patient"
              >
                {patients.map((patient) => (
                  <MenuItem key={patient.id} value={patient.id}>
                    {patient.username} ({patient.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Treatment Type</InputLabel>
              <Select
                value={treatmentType}
                onChange={(e) => {
                  setTreatmentType(e.target.value);
                  setTreatmentSubtype('');
                }}
                label="Treatment Type"
              >
                {TREATMENT_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {treatmentType && (
              <FormControl fullWidth>
                <InputLabel>Treatment Subtype</InputLabel>
                <Select
                  value={treatmentSubtype}
                  onChange={(e) => setTreatmentSubtype(e.target.value)}
                  label="Treatment Subtype"
                >
                  {TREATMENT_SUBTYPES[treatmentType]?.map((subtype) => (
                    <MenuItem key={subtype} value={subtype}>
                      {subtype.replace('_', ' ').charAt(0).toUpperCase() + subtype.replace('_', ' ').slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              label="Frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="e.g., daily, 3x/week"
              helperText="How often should the patient perform exercises"
            />

            <TextField
              fullWidth
              required
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {selectedTemplate && (
              <Alert severity="info">
                Template exercises loaded. You can add more exercises or remove existing ones as needed.
              </Alert>
            )}

            {/* Show selected exercises */}
            {selectedExercises.length > 0 && (
              <>
                <Typography variant="h6">
                  {selectedTemplate ? "Template Exercises" : "Selected Exercises"} ({selectedExercises.length})
                </Typography>
                <List>
                  {selectedExercises.map((exercise) => (
                    <ListItem key={exercise.id}>
                      <ListItemIcon>
                        <FitnessCenterIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={exercise.exercise_name}
                        secondary={`Body Part: ${exercise.body_part?.replace('_', ' ')} | Category: ${exercise.category || 'General'}`}
                      />
                      {exercise.is_required && (
                        <Chip 
                          label="Required" 
                          size="small"
                          color="primary"
                          sx={{ mr: 1 }}
                        />
                      )}
                      <IconButton
                        edge="end"
                        onClick={() => removeExercise(exercise.id)}
                        color="error"
                        disabled={exercise.is_required}
                      >
                        <RemoveIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
                <Divider />
              </>
            )}

            <Typography variant="h6">
              {selectedTemplate ? "Add Additional Exercises" : "Available Exercises"}
            </Typography>

            {/* Exercise Search and Filter Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search exercises by name or description..."
                value={exerciseSearchTerm}
                onChange={(e) => setExerciseSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 300 }}
              />
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel>Body Part</InputLabel>
                <Select
                  value={exerciseBodyPartFilter}
                  onChange={(e) => setExerciseBodyPartFilter(e.target.value)}
                  label="Body Part"
                >
                  <MenuItem value="">All Body Parts</MenuItem>
                  {uniqueBodyParts.map((bodyPart) => (
                    <MenuItem key={bodyPart} value={bodyPart}>
                      {bodyPart.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={exerciseCategoryFilter}
                  onChange={(e) => setExerciseCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {uniqueCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
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
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {filteredExercises.length} of {exercises.length} exercises
                </Typography>
                <Grid container spacing={2}>
                  {filteredExercises.map((exercise) => (
                  <Grid item xs={12} md={6} key={exercise.exercise_id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">{exercise.exercise_name}</Typography>
                        <Typography color="text.secondary" sx={{ mb: 1 }}>
                          Body Part: {exercise.body_part?.replace('_', ' ') || 'Not specified'}
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 1 }}>
                          Category: {exercise.category || 'General'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {exercise.description || 'No description available'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                          Instructions: {exercise.instructions || 'Standard execution'}
                        </Typography>
                        <Button
                          variant={selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id) ? "outlined" : "contained"}
                          startIcon={selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id) ? <RemoveIcon /> : <AddIcon />}
                          onClick={() => {
                            if (selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id)) {
                              const exerciseToRemove = selectedExercises.find(ex => ex.exercise_id === exercise.exercise_id);
                              removeExercise(exerciseToRemove.id);
                            } else {
                              addExercise(exercise);
                            }
                          }}
                          size="small"
                          color={selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id) ? "error" : "primary"}
                        >
                          {selectedExercises.some(ex => ex.exercise_id === exercise.exercise_id) ? "Remove" : "Add Exercise"}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
                </>
            )}


          </Box>
        );

      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6">Set Target Metrics for Each Exercise</Typography>
            {selectedExercises.map((exercise) => (
              <Card key={exercise.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{exercise.exercise_name}</Typography>
                    <IconButton
                      onClick={() => setExpandedExercise(
                        expandedExercise === exercise.id ? null : exercise.id
                      )}
                    >
                      {expandedExercise === exercise.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={expandedExercise === exercise.id}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Repetitions"
                          value={exercise.repetitions}
                          onChange={(e) => updateExerciseMetrics(exercise.id, 'repetitions', parseInt(e.target.value))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Sets"
                          value={exercise.sets}
                          onChange={(e) => updateExerciseMetrics(exercise.id, 'sets', parseInt(e.target.value))}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Pain Threshold (1-10)"
                          value={exercise.pain_threshold}
                          onChange={(e) => updateExerciseMetrics(exercise.id, 'pain_threshold', parseInt(e.target.value))}
                          inputProps={{ min: 1, max: 10 }}
                        />
                      </Grid>
                      
                      {/* Dynamic target metrics based on exercise type */}
                      {Object.entries(exercise.target_metrics)
                        .filter(([key]) => !['repetitions', 'sets', 'pain_threshold'].includes(key))
                        .map(([key, value]) => (
                        <Grid item xs={12} sm={6} key={key}>
                          <TextField
                            fullWidth
                            type="number"
                            label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                            value={value}
                            onChange={(e) => updateExerciseMetrics(
                              exercise.id, 
                              'target_metrics', 
                              { [key]: parseFloat(e.target.value) }
                            )}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Collapse>
                </CardContent>
              </Card>
            ))}
          </Box>
        );

      case 4:
        const selectedPatientName = patients.find(p => p.id === selectedPatient)?.username || '';
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header with gradient background */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                p: 3,
                color: 'white',
                textAlign: 'center',
              }}
            >
              <AssignmentIcon sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                Treatment Plan Ready
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Review the details below and create your treatment plan
              </Typography>
            </Box>

            {/* Plan Overview Card */}
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
                  Plan Overview
                </Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                        <AssignmentIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Creation Method
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {creationMethod === 'template' ? 'Template-based' : 'Custom'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {selectedTemplate && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'secondary.light', width: 32, height: 32 }}>
                          <TemplateIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Template
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {selectedTemplate.name}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}

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
                          {selectedPatientName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {selectedPatient}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'info.light', width: 32, height: 32 }}>
                        🏥
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Treatment Type
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {treatmentType?.replace('_', ' ')}
                        </Typography>
                        {treatmentSubtype && (
                          <Typography variant="caption" color="text.secondary">
                            Subtype: {treatmentSubtype?.replace('_', ' ')}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'warning.light', width: 32, height: 32 }}>
                        📅
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Schedule
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {frequency}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Starting {formatDate(startDate)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'error.light', width: 32, height: 32 }}>
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
                </Grid>
              </CardContent>
            </Card>

            {/* Exercise Details Card */}
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
                  Exercise Details ({selectedExercises.length})
                </Typography>
              </Box>
              <CardContent sx={{ p: 0 }}>
                {selectedExercises.map((exercise, index) => (
                  <Box
                    key={exercise.id}
                    sx={{
                      p: 3,
                      borderBottom: index < selectedExercises.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      '&:hover': {
                        bgcolor: 'grey.50',
                      },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item>
                        <Avatar 
                          sx={{ 
                            bgcolor: 'primary.main',
                            width: 40,
                            height: 40,
                            fontWeight: 'bold',
                          }}
                        >
                          {index + 1}
                        </Avatar>
                      </Grid>
                      <Grid item xs>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {exercise.exercise_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                          <Chip 
                            label={exercise.body_part?.replace('_', ' ') || 'General'} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                          {exercise.category && (
                            <Chip 
                              label={exercise.category} 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                            />
                          )}
                          {exercise.is_required && (
                            <Chip 
                              label="Required" 
                              size="small" 
                              color="error"
                            />
                          )}
                        </Box>
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {exercise.sets}
                              </Typography>
                              <Typography variant="caption">
                                Sets
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {exercise.repetitions}
                              </Typography>
                              <Typography variant="caption">
                                Reps
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {exercise.pain_threshold}/10
                              </Typography>
                              <Typography variant="caption">
                                Pain Threshold
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {Object.entries(exercise.target_metrics)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(', ') || 'Basic'}
                              </Typography>
                              <Typography variant="caption">
                                Target Metrics
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">Create Treatment Plan</Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
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
            {loading ? "Creating..." : "Create Treatment Plan"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateTreatmentPlanDialog; 