import React, { useState, useEffect } from "react";
import TreatmentDetailsModal from './TreatmentDetailsModal';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  MedicalServices as MedicalServicesIcon,
  Assignment as AssignmentIcon,
  PlayArrow as PlayArrowIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const PatientTreatmentDetail = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const fromAdmin = searchParams.get('from') === 'admin';
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  const [patient, setPatient] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [treatmentToRemove, setTreatmentToRemove] = useState(null);

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
      fetchTreatments();
      fetchAppointments();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      console.log('Fetching patient data for ID:', patientId);
      const response = await fetch(`http://127.0.0.1:8000/api/get-patient-detail/${patientId}/`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Patient data received:', data);
        setPatient(data);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setError('Failed to fetch patient data');
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
      setError('Error fetching patient data');
    }
  };

  const fetchTreatments = async () => {
    try {
      console.log('Fetching treatments for patient ID:', patientId);
      const response = await fetch(`http://127.0.0.1:8000/api/treatments/?patient_id=${patientId}`);
      console.log('Treatments response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Treatments data received:', data);
        console.log('Number of treatments:', data ? data.length : 0);
        
        // Fetch exercises for each treatment
        const treatmentsWithExercises = await Promise.all(
          (data || []).map(async (treatment) => {
            try {
              const exercisesResponse = await fetch(`http://127.0.0.1:8000/api/treatment-exercises/${treatment.treatment_id}/`);
              if (exercisesResponse.ok) {
                const exercisesData = await exercisesResponse.json();
                return {
                  ...treatment,
                  exercises: exercisesData || []
                };
              } else {
                console.error(`Failed to fetch exercises for treatment ${treatment.treatment_id}`);
                return {
                  ...treatment,
                  exercises: []
                };
              }
            } catch (error) {
              console.error(`Error fetching exercises for treatment ${treatment.treatment_id}:`, error);
              return {
                ...treatment,
                exercises: []
              };
            }
          })
        );
        
        setTreatments(treatmentsWithExercises);
      } else {
        console.error('Failed to fetch treatments:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching treatments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      console.log('Fetching appointments for patient ID:', patientId);
      const response = await fetch(`http://127.0.0.1:8000/api/appointments/list/?scope=patient&user_id=${patientId}`);
      console.log('Appointments response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Appointments data received:', data);
        console.log('Data type:', typeof data, 'Is array:', Array.isArray(data));
        // 确保data是数组
        const appointmentsArray = Array.isArray(data) ? data : (data.appointments || []);
        setAppointments(appointmentsArray);
      } else {
        console.error('Failed to fetch appointments');
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  const handleBack = () => {
    if (fromAdmin) {
      navigate('/home/admin-treatment');
    } else {
      navigate('/home/treatment');
    }
  };

  const handleCreateTreatment = () => {
    navigate(`/home/treatment/${patientId}/create`);
  };

  const handleViewTreatment = (treatmentId) => {
    setSelectedTreatmentId(treatmentId);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedTreatmentId(null);
  };

  const handleRemoveTreatment = (treatmentId) => {
    setTreatmentToRemove(treatmentId);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!treatmentToRemove) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/treatments/${treatmentToRemove}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'inactive' }),
      });

      if (response.ok) {
        toast.success('Treatment plan has been deactivated');
        fetchTreatments(); // Refresh the data
      } else {
        toast.error('Failed to deactivate treatment plan');
      }
    } catch (error) {
      console.error('Error deactivating treatment:', error);
      toast.error('Error deactivating treatment plan');
    } finally {
      setRemoveDialogOpen(false);
      setTreatmentToRemove(null);
    }
  };

  const handleCancelRemove = () => {
    setRemoveDialogOpen(false);
    setTreatmentToRemove(null);
  };

  const handleEditTreatment = (treatmentId) => {
    navigate(`/home/treatment/${patientId}/${treatmentId}/edit`);
  };

  const handleDeleteTreatment = async (treatmentId) => {
    if (window.confirm('Are you sure you want to delete this treatment?')) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/treatments/${treatmentId}/`, {
          method: 'DELETE',
        });
        if (response.ok) {
          toast.success('Treatment deleted successfully');
          fetchTreatments();
        } else {
          toast.error('Failed to delete treatment');
        }
      } catch (error) {
        console.error('Error deleting treatment:', error);
        toast.error('Error deleting treatment');
      }
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return "N/A";
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading patient data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchPatientData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              Patient Treatment Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage treatments for {patient?.username || 'Patient'}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchPatientData();
            fetchTreatments();
            fetchAppointments();
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Patient Info Card */}
      {patient && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid",
            borderColor: "grey.200",
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "primary.main",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                }}
              >
                {patient.user?.avatar ? (
                  <img
                    src={`data:image/jpeg;base64,${patient.user.avatar}`}
                    alt={patient.user.username}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                {!patient.user?.avatar && (
                  <span style={{ display: patient.user?.avatar ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {patient.user?.username ? patient.user.username.charAt(0).toUpperCase() : 'P'}
                  </span>
                )}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
                {patient.user?.username || 'Unknown Patient'}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Username: {patient.user?.username || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Age: {patient.user?.dob ? calculateAge(patient.user.dob) : "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gender: {patient.user?.gender || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contact: {patient.user?.contact_number || "N/A"}
              </Typography>
            </Grid>
            <Grid item>
              <Chip
                label={patient.user?.status ? 'Active' : 'Inactive'}
                color={patient.user?.status ? 'success' : 'error'}
                sx={{ 
                  borderRadius: 2, 
                  fontWeight: 600,
                  textTransform: "uppercase",
                  fontSize: "0.75rem"
                }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Current Active Plan Section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 1 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          flexDirection={isSmallScreen ? "column" : "row"}
          gap={isSmallScreen ? 2 : 0}
        >
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#000000' }}>
            Current Active Plan
          </Typography>
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const currentActiveTreatment = treatments.find(treatment => {
              if (treatment.status !== 'active') return false;
              
              const startDate = new Date(treatment.start_date);
              startDate.setHours(0, 0, 0, 0);
              
              if (!treatment.end_date) {
                return startDate <= today;
              }
              
              const endDate = new Date(treatment.end_date);
              endDate.setHours(0, 0, 0, 0);
              
              return startDate <= today && today <= endDate;
            });

            if (currentActiveTreatment) {
              return (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditTreatment(currentActiveTreatment.treatment_id)}
                    sx={{
                      bgcolor: 'warning.main',
                      '&:hover': {
                        bgcolor: 'warning.dark',
                      },
                    }}
                  >
                    Edit Treatment
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleRemoveTreatment(currentActiveTreatment.treatment_id)}
                    sx={{
                      borderColor: 'error.main',
                      color: 'error.main',
                      '&:hover': {
                        borderColor: 'error.dark',
                        backgroundColor: 'error.light',
                        color: 'error.dark',
                      },
                    }}
                  >
                    Remove
                  </Button>
                </Box>
              );
            } else {
              return (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateTreatment}
                  sx={{
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  Create New Plan
                </Button>
              );
            }
          })()}
        </Box>
        
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Start of today
          
          // Find current active treatment (today is within start_date and end_date range)
          const currentActiveTreatment = treatments.find(treatment => {
            if (treatment.status !== 'active') return false;
            
            const startDate = new Date(treatment.start_date);
            startDate.setHours(0, 0, 0, 0);
            
            // If no end_date, treatment is ongoing
            if (!treatment.end_date) {
              return startDate <= today;
            }
            
            const endDate = new Date(treatment.end_date);
            endDate.setHours(0, 0, 0, 0);
            
            return startDate <= today && today <= endDate;
          });

          if (!currentActiveTreatment) {
            return (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PlayArrowIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Current Active Treatment
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This patient has no active treatment plan for today.
                </Typography>
              </Box>
            );
          }

          return (
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {currentActiveTreatment.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Start Date: {new Date(currentActiveTreatment.start_date).toLocaleDateString('en-GB')}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                End Date: {currentActiveTreatment.end_date 
                  ? new Date(currentActiveTreatment.end_date).toLocaleDateString('en-GB')
                  : 'Ongoing'
                }
              </Typography>
              
              {/* Display Exercises List */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Exercises ({currentActiveTreatment.exercise_count || 0})
                </Typography>
                {currentActiveTreatment.exercises && currentActiveTreatment.exercises.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {currentActiveTreatment.exercises.map((exercise, index) => (
                      <Box 
                        key={index}
                        sx={{ 
                          p: 2, 
                          border: '1px solid', 
                          borderColor: 'grey.200', 
                          borderRadius: 1,
                          backgroundColor: 'grey.50'
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {exercise.exercise_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {exercise.reps_per_set && `Reps: ${exercise.reps_per_set}`}
                          {exercise.sets && ` | Sets: ${exercise.sets}`}
                          {exercise.duration_per_set && ` | Duration: ${exercise.duration_per_set}s`}
                        </Typography>
                        {exercise.notes && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Notes: {exercise.notes}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No exercises assigned
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })()}
      </Paper>

      {/* Treatment Plans History */}
      <Paper
        sx={{
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid",
          borderColor: "grey.200",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "grey.200" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Treatment Plans History
          </Typography>
        </Box>
        
        {(() => {
          const currentDate = new Date();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          console.log('Treatment Plans History - Debug Info:');
          console.log('- Total treatments:', treatments.length);
          console.log('- Treatments data:', treatments);
          
          // Check if there's an appointment today
          const appointmentsArray = Array.isArray(appointments) ? appointments : [];
          const todayAppointment = appointmentsArray.find(appointment => {
            const appointmentDate = new Date(appointment.start_at);
            appointmentDate.setHours(0, 0, 0, 0);
            return appointmentDate.getTime() === today.getTime() && 
                   (appointment.status === 'scheduled' || appointment.status === 'completed');
          });
          
          console.log('- Today appointment:', todayAppointment);
          console.log('- Appointments array:', appointmentsArray);
          
          const historyTreatments = treatments.filter(treatment => {
            const endDate = treatment.end_date ? new Date(treatment.end_date) : 
                           treatment.estimated_end_date ? new Date(treatment.estimated_end_date) : null;
            
            // Exclude inactive treatments from history
            if (treatment.status === 'inactive') {
              return false;
            }
            
            // If there's an appointment today, exclude active treatments from history
            if (todayAppointment && treatment.status === 'active' && 
                (!endDate || endDate >= currentDate)) {
              return false;
            }
            
            // If no appointment today, show all treatments (active, completed, expired) except inactive
            if (!todayAppointment) {
              return treatment.status !== 'inactive';
            }
            
            // If there's an appointment today, only show completed or expired treatments
            return treatment.status === 'completed' || 
                   (endDate && endDate < currentDate);
          });

          console.log('- Filtered history treatments:', historyTreatments.length);
          console.log('- History treatments data:', historyTreatments);

          if (historyTreatments.length === 0) {
            return (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <AssignmentIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {todayAppointment ? 'No Treatment History' : 'No Treatment History'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {todayAppointment 
                    ? 'This patient has no completed or expired treatment plans. Active treatments are shown above.'
                    : 'This patient has no completed or expired treatment plans.'
                  }
                </Typography>
              </Box>
            );
          }

          return (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: "bold", py: 2 }}>Treatment Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold", py: 2 }}>Start Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold", py: 2 }}>End Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold", py: 2 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyTreatments.map((treatment) => (
                    <TableRow 
                      key={treatment.treatment_id} 
                      hover
                      sx={{ 
                        "&:hover": { 
                          bgcolor: "grey.50" 
                        } 
                      }}
                    >
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                        {treatment.name}
                      </Typography>
                      {treatment.goal_notes && (
                        <Typography variant="body2" color="text.secondary">
                          {treatment.goal_notes.length > 50 ? treatment.goal_notes.substring(0, 50) + '...' : treatment.goal_notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2">
                          {new Date(treatment.start_date).toLocaleDateString('en-GB')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2">
                          {treatment.end_date 
                            ? new Date(treatment.end_date).toLocaleDateString('en-GB')
                            : treatment.estimated_end_date 
                              ? new Date(treatment.estimated_end_date).toLocaleDateString('en-GB') + ' (Est.)'
                              : 'N/A'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewTreatment(treatment.treatment_id)}
                            sx={{ color: 'primary.main' }}
                          >
                            <AssignmentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        })()}
      </Paper>
      
      {/* Treatment Details Modal */}
      <TreatmentDetailsModal
        open={modalOpen}
        onClose={handleCloseModal}
        treatmentId={selectedTreatmentId}
        patientId={patientId}
      />
      
      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onClose={handleCancelRemove}>
        <DialogTitle>Confirm Removal</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this treatment plan? 
            This will change the status to "Inactive" and the patient will no longer have an active treatment plan.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemove} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmRemove} 
            variant="contained" 
            color="error"
            startIcon={<DeleteIcon />}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PatientTreatmentDetail;
