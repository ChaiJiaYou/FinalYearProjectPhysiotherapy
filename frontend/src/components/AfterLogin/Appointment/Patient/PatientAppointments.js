import React, { useState, useEffect } from "react";
import { 
  Box, 
  Paper, 
  Typography, 
  Stack, 
  Alert, 
  Button, 
  Card, 
  CardContent, 
  Chip, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { CalendarToday, AccessTime, Person, Notes, Schedule } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("id");
      if (!userId) {
        setError("User ID not found. Please login again.");
        toast.error("User ID not found. Please login again.");
        navigate("/login");
        return;
      }

      const res = await fetch(
        `http://127.0.0.1:8000/api/appointments/list/?scope=patient&user_id=${userId}`
      );
      
      if (!res.ok) {
        throw new Error("Failed to fetch appointments");
      }
      
      const data = await res.json();
      setAllAppointments(data.appointments || []);
      
      // Filter future appointments
      const futureAppointments = (data.appointments || []).filter(appointment => {
        const appointmentDate = new Date(appointment.start_at);
        return appointmentDate > new Date() && appointment.status === "Scheduled";
      });
      setAppointments(futureAppointments);
      setError(null);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setError("Failed to load appointments. Please try again.");
      toast.error("Failed to load appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled':
        return 'primary';
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Loading appointments...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
        <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
              My Appointments
            </Typography>
          <Typography variant="body1" color="text.secondary">
            View your upcoming and past appointments
          </Typography>
          </Box>

        {/* Upcoming Appointments */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Upcoming Appointments ({appointments.length})
          </Typography>
          
          {appointments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CalendarToday sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No upcoming appointments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contact your therapist to schedule an appointment
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {appointments.map((appointment) => (
                <Card key={appointment.id} sx={{ cursor: 'pointer' }} onClick={() => handleViewDetails(appointment)}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Schedule color="primary" />
                          <Typography variant="h6">
                            {formatDateTime(appointment.start_at)}
                          </Typography>
                          <Chip
                            label={appointment.status}
                            size="small"
                            color={getStatusColor(appointment.status)}
                          />
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Person color="action" />
                          <Typography variant="body1">
                            Dr. {appointment.therapist.username}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <AccessTime color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {appointment.duration_min} minutes • {appointment.mode}
                          </Typography>
                        </Box>
                        
                        {appointment.notes && (
                          <Box display="flex" alignItems="flex-start" gap={1}>
                            <Notes color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {appointment.notes}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        {/* Appointment History */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Appointment History ({allAppointments.length - appointments.length})
          </Typography>
          
          {allAppointments.length - appointments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No past appointments
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {allAppointments
                .filter(appointment => {
                  const appointmentDate = new Date(appointment.start_at);
                  return appointmentDate <= new Date() || appointment.status !== 'Scheduled';
                })
                .map((appointment) => (
                <Card key={appointment.id} sx={{ cursor: 'pointer' }} onClick={() => handleViewDetails(appointment)}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Schedule color="action" />
                          <Typography variant="body1">
                            {formatDateTime(appointment.start_at)}
                          </Typography>
                          <Chip
                            label={appointment.status}
                            size="small"
                            color={getStatusColor(appointment.status)}
            />
          </Box>
                        
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Person color="action" />
                          <Typography variant="body2">
                            Dr. {appointment.therapist.username}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={1}>
                          <AccessTime color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {appointment.duration_min} minutes • {appointment.mode}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
        </Stack>
          )}
        </Box>

        {/* Appointment Details Modal */}
        {selectedAppointment && (
          <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="md" fullWidth>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Appointment Code:</Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      {selectedAppointment.appointment_code}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Date & Time:</Typography>
                    <Typography variant="body2">
                      {formatDateTime(selectedAppointment.start_at)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Duration:</Typography>
                    <Typography variant="body2">
                      {selectedAppointment.duration_min} minutes
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Mode:</Typography>
                    <Typography variant="body2">
                      {selectedAppointment.mode}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Therapist:</Typography>
                    <Typography variant="body2">
                      Dr. {selectedAppointment.therapist.username}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                    <Chip
                      label={selectedAppointment.status}
                      size="small"
                      color={getStatusColor(selectedAppointment.status)}
                    />
                  </Box>
                  
                  {selectedAppointment.notes && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Notes:
                      </Typography>
                      <Typography variant="body2">
                        {selectedAppointment.notes}
                      </Typography>
                    </Box>
                  )}
                  
                  {selectedAppointment.session_notes && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Session Notes:
                      </Typography>
                      <Typography variant="body2">
                        {selectedAppointment.session_notes}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDetails(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        )}
      </Stack>
    </Box>
  );
};

export default PatientAppointments;