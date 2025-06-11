import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from "@mui/material";
import {
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  FitnessCenter as FitnessCenterIcon,
  TrendingUp as TrendingUpIcon,
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  Target as TargetIcon,
} from "@mui/icons-material";
import { formatDate, formatDateTime } from "../../../../utils/dateUtils";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`details-tabpanel-${index}`}
      aria-labelledby={`details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const TreatmentDetailsDialog = ({ open, onClose, treatment }) => {
  const [tabValue, setTabValue] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [exerciseRecords, setExerciseRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && treatment) {
      fetchTreatmentData();
    }
  }, [open, treatment]);

  const fetchTreatmentData = async () => {
    if (!treatment?.treatment_id) return;
    
    setLoading(true);
    try {
      // Fetch exercises
      const exercisesResponse = await fetch(`http://127.0.0.1:8000/api/treatment-exercises/${treatment.treatment_id}/`);
      if (exercisesResponse.ok) {
        const exercisesData = await exercisesResponse.json();
        setExercises(exercisesData);
      }

      // Fetch exercise records
      const recordsResponse = await fetch(`http://127.0.0.1:8000/api/treatment-exercise-records/${treatment.treatment_id}/`);
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setExerciseRecords(recordsData);
      }

      // Fetch appointments
      const appointmentsResponse = await fetch(`http://127.0.0.1:8000/api/treatment-appointments/${treatment.treatment_id}/`);
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        setAppointments(appointmentsData);
      }
    } catch (error) {
      console.error("Error fetching treatment data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  // formatDate and formatDateTime are now imported from dateUtils

  const calculateProgress = (exercise) => {
    const records = exerciseRecords.filter(r => r.exercise_id === exercise.exercise_id);
    if (records.length === 0) return 0;
    
    // Simple progress calculation based on completion rate
    return Math.min(100, (records.length / (exercise.sets * 7)) * 100); // Assuming weekly target
  };

  const getAverageMetrics = (exercise) => {
    const records = exerciseRecords.filter(r => r.exercise_id === exercise.exercise_id);
    if (records.length === 0) return {};
    
    const avgMetrics = {};
    const targetMetrics = exercise.target_metrics || {};
    
    Object.keys(targetMetrics).forEach(key => {
      const values = records
        .map(r => r.actual_metrics?.[key])
        .filter(v => v !== undefined && v !== null);
      
      if (values.length > 0) {
        avgMetrics[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });
    
    return avgMetrics;
  };

  if (!treatment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            Treatment Details - {treatment.patient_name}
          </Typography>
          <Chip 
            label={treatment.status?.charAt(0).toUpperCase() + treatment.status?.slice(1)}
            color={getStatusColor(treatment.status)}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <LinearProgress sx={{ width: '100%' }} />
          </Box>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab 
                  icon={<AssignmentIcon />} 
                  label="Overview" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<FitnessCenterIcon />} 
                  label="Exercises" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<TrendingUpIcon />} 
                  label="Progress" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<EventIcon />} 
                  label="Appointments" 
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              {/* Overview Tab */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Patient Information
                    </Typography>
                    <Typography><strong>Name:</strong> {treatment.patient_name}</Typography>
                    <Typography><strong>ID:</strong> {treatment.patient_id}</Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Treatment Information
                    </Typography>
                    <Typography>
                      <strong>Type:</strong> {treatment.treatment_type?.replace('_', ' ').charAt(0).toUpperCase() + treatment.treatment_type?.replace('_', ' ').slice(1)}
                    </Typography>
                    {treatment.treatment_subtype && (
                      <Typography>
                        <strong>Subtype:</strong> {treatment.treatment_subtype.replace('_', ' ')}
                      </Typography>
                    )}
                    <Typography>
                      <strong>Status:</strong> {treatment.status?.charAt(0).toUpperCase() + treatment.status?.slice(1)}
                    </Typography>
                    <Typography>
                      <strong>Frequency:</strong> {treatment.frequency || 'Not specified'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Timeline
                    </Typography>
                    <Typography><strong>Start Date:</strong> {formatDate(treatment.start_date)}</Typography>
                    {treatment.end_date && (
                      <Typography><strong>End Date:</strong> {formatDate(treatment.end_date)}</Typography>
                    )}
                    <Typography><strong>Created:</strong> {formatDateTime(treatment.created_at)}</Typography>
                    <Typography><strong>Last Updated:</strong> {formatDateTime(treatment.updated_at)}</Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Quick Stats
                    </Typography>
                    <Typography><strong>Total Exercises:</strong> {exercises.length}</Typography>
                    <Typography><strong>Completed Sessions:</strong> {exerciseRecords.length}</Typography>
                    <Typography><strong>Scheduled Appointments:</strong> {appointments.length}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Exercises Tab */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Treatment Exercises ({exercises.length})
              </Typography>
              
              {exercises.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No exercises found for this treatment.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {exercises.map((exercise) => (
                    <Grid item xs={12} md={6} key={exercise.exercise_id}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 1 }}>
                            {exercise.exercise_name}
                          </Typography>
                          <Typography color="text.secondary" sx={{ mb: 2 }}>
                            Body Part: {exercise.body_part?.replace('_', ' ')}
                          </Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2">Target Settings:</Typography>
                            <Typography variant="body2">
                              Sets: {exercise.sets}, Repetitions: {exercise.repetitions}
                            </Typography>
                            <Typography variant="body2">
                              Pain Threshold: {exercise.pain_threshold}/10
                            </Typography>
                          </Box>

                          {exercise.target_metrics && (
                            <Box>
                              <Typography variant="subtitle2">Target Metrics:</Typography>
                              {Object.entries(exercise.target_metrics).map(([key, value]) => (
                                <Typography key={key} variant="body2">
                                  {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}: {value}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {/* Progress Tab */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Exercise Progress
              </Typography>
              
              {exercises.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No exercises to track progress.
                  </Typography>
                </Paper>
              ) : (
                exercises.map((exercise) => {
                  const progress = calculateProgress(exercise);
                  const avgMetrics = getAverageMetrics(exercise);
                  
                  return (
                    <Card key={exercise.exercise_id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {exercise.exercise_name}
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Progress: {progress.toFixed(1)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={progress} 
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>

                        {Object.keys(avgMetrics).length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Average Performance vs Target:
                            </Typography>
                            <Grid container spacing={2}>
                              {Object.entries(avgMetrics).map(([key, avgValue]) => {
                                const targetValue = exercise.target_metrics?.[key];
                                const percentage = targetValue ? (avgValue / targetValue) * 100 : 0;
                                
                                return (
                                  <Grid item xs={6} sm={4} key={key}>
                                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                                      <Typography variant="body2" color="text.secondary">
                                        {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                      </Typography>
                                      <Typography variant="h6">
                                        {avgValue.toFixed(1)} / {targetValue}
                                      </Typography>
                                      <Typography 
                                        variant="body2" 
                                        color={percentage >= 80 ? 'success.main' : percentage >= 60 ? 'warning.main' : 'error.main'}
                                      >
                                        {percentage.toFixed(1)}%
                                      </Typography>
                                    </Paper>
                                  </Grid>
                                );
                              })}
                            </Grid>
                          </Box>
                        )}

                        <Typography variant="body2" color="text.secondary">
                          Total Sessions: {exerciseRecords.filter(r => r.exercise_id === exercise.exercise_id).length}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              {/* Appointments Tab */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                Related Appointments ({appointments.length})
              </Typography>
              
              {appointments.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No appointments found for this treatment.
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date & Time</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {appointments.map((appointment, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {formatDateTime(appointment.appointmentDateTime)}
                          </TableCell>
                          <TableCell>{appointment.duration} minutes</TableCell>
                          <TableCell>
                            <Chip 
                              label={appointment.status} 
                              color={
                                appointment.status === 'Completed' ? 'success' :
                                appointment.status === 'Cancelled' ? 'error' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {appointment.notes || appointment.sessionNotes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TreatmentDetailsDialog; 