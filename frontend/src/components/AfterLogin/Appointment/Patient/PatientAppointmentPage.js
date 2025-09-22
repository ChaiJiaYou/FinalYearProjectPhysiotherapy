import React, { useState, useEffect } from "react";
import { 
  Box, 
  Paper, 
  Typography, 
  Stack, 
  Button, 
  Card, 
  CardContent, 
  Chip, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  TextField
} from "@mui/material";
import { 
  CalendarToday, 
  AccessTime, 
  Person, 
  Notes, 
  Schedule, 
  Add,
  History,
  Close,
  CheckCircle,
  Pending,
  Visibility,
  Cancel
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import CreateAppointmentDialog from "./CreateAppointmentDialog";
import AppointmentHistoryModal from "./AppointmentHistoryModal";

const PatientAppointmentPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
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
      console.log('Fetched appointments data:', data);
      setAllAppointments(data.appointments || []);
      
      // Filter upcoming scheduled appointments (include today's appointments)
      const upcomingAppointments = (data.appointments || []).filter(appointment => {
        const appointmentDate = new Date(appointment.start_at);
        const today = new Date();
        const isTodayOrFuture = appointmentDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return isTodayOrFuture && appointment.status === "Scheduled";
      });
      console.log('Filtered upcoming appointments:', upcomingAppointments);
      setAppointments(upcomingAppointments);
      
      // Filter pending appointments (all pending, not just future)
      const pendingApps = (data.appointments || []).filter(appointment => {
        return appointment.status === "Pending";
      });
      console.log('Filtered pending appointments:', pendingApps);
      setPendingAppointments(pendingApps);
      
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

  const handleCreateAppointment = () => {
    setShowCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
  };

  const handleAppointmentCreated = () => {
    fetchAppointments(); // Refresh the appointments list
    setShowCreateDialog(false);
  };

  const handleShowHistory = () => {
    setShowHistoryModal(true);
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
  };

  const handleCancelAppointment = (appointment) => {
    setAppointmentToCancel(appointment);
    setCancelReason('');
    setShowCancelDialog(true);
  };

  const handleCloseCancelDialog = () => {
    setShowCancelDialog(false);
    setAppointmentToCancel(null);
    setCancelReason('');
  };

  const confirmCancelAppointment = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    try {
      const userId = localStorage.getItem("id");
      const csrfToken = document.cookie.split("; ").find(row => row.startsWith("csrftoken="))?.split("=")[1] || "";

      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/${appointmentToCancel.appointment_code}/cancel/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({
            user_id: userId,
            cancel_reason: cancelReason.trim()
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel appointment');
      }

      const data = await response.json();
      toast.success(data.message || 'Appointment cancelled successfully');
      
      // Refresh appointments
      await fetchAppointments();
      
      // Close dialog
      handleCloseCancelDialog();
      
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error(error.message || 'Failed to cancel appointment');
    }
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

  const formatDate = (dateTime) => {
    return new Date(dateTime).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateTime) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateTimeRange = (startAt, durationMin) => {
    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + durationMin * 60000);
    
    const dateStr = startDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    
    const startTime = startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    const endTime = endDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    return `${dateStr} ${startTime} - ${endTime}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled':
        return 'primary';
      case 'Pending':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Scheduled':
        return <CheckCircle />;
      case 'Pending':
        return <Pending />;
      default:
        return <Schedule />;
    }
  };

  const renderAppointmentTable = (appointmentList, emptyMessage) => {
    console.log('renderAppointmentTable called with:', appointmentList, 'emptyMessage:', emptyMessage);
    
    if (appointmentList.length === 0) {
      console.log('Rendering empty state');
      return (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CalendarToday sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {emptyMessage}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click "Create New Appointment" to schedule your first appointment
          </Typography>
        </Paper>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Start Time</TableCell>
              <TableCell>Therapist</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointmentList.map((appointment) => (
              <TableRow key={appointment.id} hover>
                <TableCell>
                  <Typography variant="body2">
                    {formatDateTimeRange(appointment.start_at, appointment.duration_min)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: '#8b5cf6' }}>
                      <Person sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="body2">
                      Dr. {appointment.therapist?.username || 'Unknown'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={appointment.mode} 
                    size="small" 
                    variant="outlined"
                    sx={{ height: 32, borderRadius: 2, fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    icon={getStatusIcon(appointment.status)}
                    label={appointment.status} 
                    size="small" 
                    color={getStatusColor(appointment.status)}
                    sx={{ height: 32, borderRadius: 2, fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewDetails(appointment)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <Visibility />
                    </IconButton>
                    {(appointment.status === 'Scheduled' || appointment.status === 'Pending') && (
                      <IconButton 
                        size="small" 
                        onClick={() => handleCancelAppointment(appointment)}
                        sx={{ color: 'error.main' }}
                        title="Cancel Appointment"
                      >
                        <Cancel />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
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
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            My Appointments
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View your upcoming and pending appointments
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateAppointment}
              sx={{
                backgroundColor: '#3b82f6',
                '&:hover': {
                  backgroundColor: '#2563eb',
                },
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3
              }}
            >
              Create New Appointment
            </Button>
            <Button
              variant="outlined"
              startIcon={<History />}
              onClick={handleShowHistory}
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3
              }}
            >
              View History
            </Button>
          </Stack>
        </Box>

        {/* Tabs and Pending Appointments Card Row */}
        <Box>
          <Grid container spacing={3} alignItems="flex-start">
            {/* Tabs Section */}
            <Grid item xs={12} md={8}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab 
                  label={`Upcoming Appointments (${appointments.length})`}
                  icon={<CheckCircle />}
                  iconPosition="start"
                />
                <Tab 
                  label={`Pending Appointments (${pendingAppointments.length})`}
                  icon={<Pending />}
                  iconPosition="start"
                />
              </Tabs>
              
              {/* Tab Content - Table directly below tabs */}
              <Box sx={{ mt: 2, minHeight: 400 }}>
                {activeTab === 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Upcoming Appointments ({appointments.length})
                    </Typography>
                    {renderAppointmentTable(appointments, "No upcoming appointments")}
                  </Box>
                )}
                
                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Pending Appointments ({pendingAppointments.length})
                    </Typography>
                    {renderAppointmentTable(pendingAppointments, "No pending appointments")}
                  </Box>
                )}
              </Box>
            </Grid>
            
            {/* Pending Appointments Card - Right side */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Pending color="warning" />
                    <Typography variant="h6" color="warning.main">
                      Pending ({pendingAppointments.length})
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Waiting for therapist confirmation
                  </Typography>
                  <Stack spacing={1}>
                    {pendingAppointments.length > 0 ? (
                      pendingAppointments.slice(0, 3).map((appointment) => {
                        const appointmentDate = new Date(appointment.start_at);
                        const isPast = appointmentDate < new Date();
                        
                        return (
                          <Paper 
                            key={appointment.id}
                            sx={{ 
                              p: 1.5, 
                              bgcolor: isPast ? 'rgba(211, 47, 47, 0.08)' : 'rgba(255, 152, 0, 0.08)', 
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: isPast ? 'rgba(211, 47, 47, 0.3)' : 'rgba(255, 152, 0, 0.3)'
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                              <Typography variant="body2" fontWeight="bold" color="text.primary">
                                {formatDateTime(appointment.start_at)}
                              </Typography>
                              <Box display="flex" gap={0.5} alignItems="center">
                                {isPast && (
                                  <Chip 
                                    label="Past" 
                                    size="small" 
                                    color="error"
                                    sx={{ height: 20, fontSize: '0.7rem', borderRadius: 1 }}
                                  />
                                )}
                                <Chip 
                                  label="Pending" 
                                  size="small" 
                                  color="warning"
                                  icon={<Pending sx={{ fontSize: 12 }} />}
                                  sx={{ height: 20, fontSize: '0.7rem', borderRadius: 1 }}
                                />
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleCancelAppointment(appointment)}
                                  sx={{ 
                                    color: 'error.main',
                                    p: 0.5,
                                    ml: 0.5
                                  }}
                                  title="Cancel Appointment"
                                >
                                  <Cancel sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            </Box>
                            <Typography variant="caption" color="text.primary" display="block">
                              Dr. {appointment.therapist?.username || 'Unknown'} • {appointment.duration_min}min
                            </Typography>
                            {appointment.patient_message && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: 'text.primary',
                                  display: 'block',
                                  maxHeight: 30,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  mt: 0.5
                                }}
                                title={appointment.patient_message}
                              >
                                Messages : {appointment.patient_message}
                              </Typography>
                            )}
                          </Paper>
                        );
                      })
                    ) : (
                      <Box 
                        display="flex" 
                        flexDirection="column" 
                        alignItems="center" 
                        justifyContent="center" 
                        py={3}
                        textAlign="center"
                      >
                        <Pending sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          No pending appointments
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          All appointments are confirmed
                        </Typography>
                      </Box>
                    )}
                    {pendingAppointments.length > 3 && (
                      <Typography variant="caption" color="text.secondary" textAlign="center">
                        +{pendingAppointments.length - 3} more pending appointments
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Appointment Details Modal */}
        {selectedAppointment && (
          <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="md" fullWidth>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                Appointment Details
                <IconButton onClick={() => setShowDetails(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
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
                      Dr. {selectedAppointment.therapist?.username || 'Unknown'}
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
                  
                  {selectedAppointment.patient_message && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Your Message to Therapist:
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          {selectedAppointment.patient_message}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                  
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
                  
                  {selectedAppointment.cancel_reason && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Cancellation Reason:
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          {selectedAppointment.cancel_reason}
                        </Typography>
                      </Paper>
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

        {/* Create Appointment Dialog */}
        <CreateAppointmentDialog
          open={showCreateDialog}
          onClose={handleCloseCreateDialog}
          onAppointmentCreated={handleAppointmentCreated}
        />

        {/* History Modal */}
        <AppointmentHistoryModal
          open={showHistoryModal}
          onClose={handleCloseHistoryModal}
          appointments={allAppointments}
        />

        {/* Cancel Appointment Dialog */}
        <Dialog open={showCancelDialog} onClose={handleCloseCancelDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <Cancel color="error" />
              Cancel Appointment
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              {appointmentToCancel && (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    You are about to cancel the following appointment:
                  </Typography>
                  
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {formatDateTime(appointmentToCancel.start_at)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dr. {appointmentToCancel.therapist?.username || 'Unknown'} • {appointmentToCancel.duration_min} min • {appointmentToCancel.mode}
                    </Typography>
                    <Chip 
                      label={appointmentToCancel.status} 
                      size="small" 
                      color={getStatusColor(appointmentToCancel.status)}
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Reason for Cancellation"
                    placeholder="Please provide a reason for cancelling this appointment..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                    helperText="This reason will be sent to the therapist"
                  />
                </Stack>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCancelDialog}>
              Keep Appointment
            </Button>
            <Button 
              onClick={confirmCancelAppointment}
              variant="contained"
              color="error"
              disabled={!cancelReason.trim()}
            >
              Cancel Appointment
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
};

export default PatientAppointmentPage;
