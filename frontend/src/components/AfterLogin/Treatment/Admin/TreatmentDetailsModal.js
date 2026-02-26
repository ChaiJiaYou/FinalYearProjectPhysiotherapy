import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

const TreatmentDetailsModal = ({ open, onClose, treatmentId, patientId }) => {
  const [treatment, setTreatment] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && treatmentId) {
      fetchTreatmentDetails();
    }
  }, [open, treatmentId]);

  const fetchTreatmentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch treatment details
      const treatmentResponse = await fetch(`http://127.0.0.1:8000/api/treatments/${treatmentId}/`);
      if (!treatmentResponse.ok) {
        throw new Error('Failed to fetch treatment details');
      }
      const treatmentData = await treatmentResponse.json();
      setTreatment(treatmentData);

      // Fetch exercises for this treatment
      const exercisesResponse = await fetch(`http://127.0.0.1:8000/api/treatment-exercises/${treatmentId}/`);
      if (exercisesResponse.ok) {
        const exercisesData = await exercisesResponse.json();
        setExercises((exercisesData || []).filter(ex => ex.is_active !== false));
      }
    } catch (error) {
      console.error('Error fetching treatment details:', error);
      setError('Failed to load treatment details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (!open) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssignmentIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Treatment Plan Details
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : treatment ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Treatment Information */}
            <Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                    Name:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {treatment.name}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                    Start Date:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {new Date(treatment.start_date).toLocaleDateString('en-GB')}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                    End Date:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {treatment.end_date 
                      ? new Date(treatment.end_date).toLocaleDateString('en-GB')
                      : 'Ongoing'
                    }
                  </Typography>
                </Box>
                
                {treatment.goal_notes && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                      Goal Notes:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {treatment.goal_notes}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            <Divider />

            {/* Exercises Information */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Exercises ({exercises.length})
              </Typography>
              
              {exercises.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <FitnessCenterIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary">
                    No exercises assigned to this treatment plan.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {exercises.map((exercise, index) => (
                    <Box 
                      key={exercise.treatment_exercise_id}
                      sx={{ 
                        p: 2, 
                        border: '1px solid', 
                        borderColor: 'grey.200', 
                        borderRadius: 1,
                        backgroundColor: 'grey.50'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {index + 1}. {exercise.exercise_name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        {exercise.reps_per_set && exercise.sets ? (
                          <>Reps: {exercise.reps_per_set} | Sets: {exercise.sets}</>
                        ) : exercise.reps_per_set ? (
                          <>Reps: {exercise.reps_per_set}</>
                        ) : exercise.sets ? (
                          <>Sets: {exercise.sets}</>
                        ) : null}
                      </Typography>
                      
                      {exercise.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          <strong>Notes:</strong> {exercise.notes}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TreatmentDetailsModal;
