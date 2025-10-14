import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const AddMedicalHistoryPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    past_medical_history: '',
    surgical_history: '',
    family_history: '',
    medications: '',
    allergies: '',
    notes: ''
  });

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://127.0.0.1:8000/api/get-patient-detail/${patientId}/`);
      if (response.ok) {
        const data = await response.json();
        setPatient(data);
      } else {
        toast.error("Failed to load patient information");
        navigate('/home/patients');
      }
    } catch (error) {
      console.error("Error fetching patient data:", error);
      toast.error("Something went wrong while loading patient information");
      navigate('/home/patients');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Check if at least one field is filled
      const hasData = Object.values(formData).some(value => value.trim() !== '');
      if (!hasData) {
        toast.error('Please fill in at least one field');
        return;
      }

      const response = await fetch(`http://127.0.0.1:8000/api/add-medical-history/${patientId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Medical history added successfully');
        navigate(`/home/patients/${patientId}`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to add medical history');
      }
    } catch (error) {
      console.error('Error adding medical history:', error);
      toast.error('Something went wrong while adding medical history');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/home/patients/${patientId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Patient information not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <IconButton onClick={() => navigate(`/home/patients/${patientId}`)} color="primary">
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              Add Medical History
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Add new medical record for {patient.user?.username}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Form Section */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'grey.200',
              boxShadow: 0,
            }}
          >
            <Grid container spacing={3}>
              {/* Past Medical History */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Past Medical History"
                  multiline
                  rows={4}
                  value={formData.past_medical_history}
                  onChange={handleInputChange('past_medical_history')}
                  placeholder="Details of any diagnosed medical conditions, including chronic illnesses and past significant illnesses..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>

              {/* Surgical History */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Surgical History"
                  multiline
                  rows={4}
                  value={formData.surgical_history}
                  onChange={handleInputChange('surgical_history')}
                  placeholder="List of past surgeries with procedures and dates..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>

              {/* Family History */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Family History"
                  multiline
                  rows={4}
                  value={formData.family_history}
                  onChange={handleInputChange('family_history')}
                  placeholder="Information about health of blood relatives, e.g., cancer, hypertension, diabetes..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>

              {/* Medications */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Medications"
                  multiline
                  rows={4}
                  value={formData.medications}
                  onChange={handleInputChange('medications')}
                  placeholder="Comprehensive list of current and past medications, including dosage and frequency..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>

              {/* Allergies */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Allergies"
                  multiline
                  rows={3}
                  value={formData.allergies}
                  onChange={handleInputChange('allergies')}
                  placeholder="Known allergies to medications, food, or environmental factors..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>

              {/* Additional Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Additional Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange('notes')}
                  placeholder="Any additional notes or observations..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button 
                    onClick={handleCancel}
                    variant="outlined"
                    disabled={submitting}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      px: 3
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      px: 3
                    }}
                  >
                    {submitting ? "Saving..." : "Save Medical History"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AddMedicalHistoryPage;
