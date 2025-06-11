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
  Assignment as TemplateIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

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

const CreateTemplateDialog = ({ open, onClose, onSuccess, editingTemplate }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    treatment_type: '',
    treatment_subtype: '',
    condition: '',
    estimated_duration_weeks: 4,
    default_frequency: '',
    is_active: true,
  });

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name || '',
        description: editingTemplate.description || '',
        treatment_type: editingTemplate.treatment_type || '',
        treatment_subtype: editingTemplate.treatment_subtype || '',
        condition: editingTemplate.condition || '',
        estimated_duration_weeks: editingTemplate.estimated_duration_weeks || 4,
        default_frequency: editingTemplate.default_frequency || '',
        is_active: editingTemplate.is_active !== undefined ? editingTemplate.is_active : true,
      });
    } else if (open) {
      resetForm();
    }
  }, [editingTemplate, open]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      treatment_type: '',
      treatment_subtype: '',
      condition: '',
      estimated_duration_weeks: 4,
      default_frequency: '',
      is_active: true,
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Reset subtype when treatment type changes
      if (field === 'treatment_type') {
        newData.treatment_subtype = '';
      }
      return newData;
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const url = editingTemplate 
        ? `http://127.0.0.1:8000/api/treatment-templates/${editingTemplate.template_id}/`
        : "http://127.0.0.1:8000/api/treatment-templates/";
      
      const method = editingTemplate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(`Template ${editingTemplate ? 'updated' : 'created'} successfully!`);
        onSuccess();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || `Failed to ${editingTemplate ? 'update' : 'create'} template`);
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Something went wrong while saving template");
    } finally {
      setLoading(false);
    }
  };

  const isValid = formData.name && formData.description && formData.treatment_type && formData.condition;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TemplateIcon color="primary" />
          <Typography variant="h5">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Templates help standardize treatment plans and can be reused for patients with similar conditions.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Template Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Shoulder Rehabilitation Program"
                helperText="Enter a descriptive name for the template"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe the purpose and goals of this treatment template..."
                helperText="Provide a detailed description of what this template is designed for"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Treatment Type</InputLabel>
                <Select
                  value={formData.treatment_type}
                  onChange={(e) => handleChange('treatment_type', e.target.value)}
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
              <FormControl fullWidth disabled={!formData.treatment_type}>
                <InputLabel>Treatment Subtype</InputLabel>
                <Select
                  value={formData.treatment_subtype}
                  onChange={(e) => handleChange('treatment_subtype', e.target.value)}
                  label="Treatment Subtype"
                >
                  {formData.treatment_type && TREATMENT_SUBTYPES[formData.treatment_type]?.map((subtype) => (
                    <MenuItem key={subtype} value={subtype}>
                      {subtype.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Condition"
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
                placeholder="e.g., Post-surgical shoulder impingement"
                helperText="Specify the medical condition this template addresses"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Estimated Duration (weeks)"
                value={formData.estimated_duration_weeks}
                onChange={(e) => handleChange('estimated_duration_weeks', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 52 }}
                helperText="Expected duration of treatment in weeks"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Default Frequency"
                value={formData.default_frequency}
                onChange={(e) => handleChange('default_frequency', e.target.value)}
                placeholder="e.g., 3 times per week, daily, twice daily"
                helperText="Recommended frequency for exercises (optional)"
              />
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
                      Active Template
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active templates are available for creating treatment plans
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>

          {/* Preview Card */}
          <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Template Preview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">
                  <strong>{formData.name || 'Template Name'}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {formData.description || 'Template description will appear here...'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {formData.treatment_type && (
                    <Chip 
                      label={TREATMENT_TYPES.find(t => t.value === formData.treatment_type)?.label || formData.treatment_type}
                      size="small" 
                      color="primary"
                    />
                  )}
                  {formData.condition && (
                    <Chip 
                      label={formData.condition}
                      size="small" 
                      color="secondary"
                    />
                  )}
                  {formData.estimated_duration_weeks && (
                    <Chip 
                      label={`${formData.estimated_duration_weeks} weeks`}
                      size="small" 
                      variant="outlined"
                    />
                  )}
                  <Chip 
                    label={formData.is_active ? 'Active' : 'Inactive'}
                    size="small" 
                    color={formData.is_active ? 'success' : 'default'}
                  />
                </Box>
              </Grid>
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
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
          }}
        >
          {loading ? "Saving..." : (editingTemplate ? "Update Template" : "Create Template")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTemplateDialog; 