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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  TextField,
  Tooltip
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
  Visibility,
  Cancel,
  EditCalendar
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import CreateAppointmentDialog from "./CreateAppointmentDialog";
import AppointmentHistoryModal from "./AppointmentHistoryModal";
import RescheduleAppointmentDialog from "../Therapist/RescheduleAppointmentDialog";

const PatientAppointmentPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null);
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
      
      setError(null);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setError("Failed to load appointments. Please try again.");
      toast.error("Failed to load appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch therapists on page load
  const fetchTherapists = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/list-therapists/");
      if (res.ok) {
        const data = await res.json();
        setTherapists(data || []);
        console.log('Therapists loaded:', data?.length || 0);
      } else {
        console.error("Failed to fetch therapists:", res.status);
        setTherapists([]);
      }
    } catch (error) {
      console.error("Error fetching therapists:", error);
      setTherapists([]);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchTherapists(); // Load therapists when page loads
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

  const handleAppointmentCreated = (newAppointment) => {
    if (newAppointment) {
      // 乐观更新：直接添加新预约到状态，而不是重新获取所有数据
      // 患者创建的预约状态是 Scheduled
      if (newAppointment.status === 'Scheduled') {
        const appointmentDate = new Date(newAppointment.start_at);
        const today = new Date();
        const isTodayOrFuture = appointmentDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (isTodayOrFuture) {
          setAppointments((prev) => [...prev, newAppointment]);
        }
      }
      
      // 添加到 allAppointments
      setAllAppointments((prev) => [...prev, newAppointment]);
    }
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

  const handleRescheduleAppointment = (appointment) => {
    setAppointmentToReschedule(appointment);
    setShowRescheduleDialog(true);
  };

  const handleCloseRescheduleDialog = () => {
    setShowRescheduleDialog(false);
    setAppointmentToReschedule(null);
  };

  const handleRescheduleSuccess = async (updatedAppointment) => {
    toast.success('Appointment rescheduled successfully!');
    // Refresh appointments
    await fetchAppointments();
    handleCloseRescheduleDialog();
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
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewDetails(appointment)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {appointment.status === 'Scheduled' && (
                      <>
                        <Tooltip title="Reschedule Appointment">
                          <IconButton 
                            size="small" 
                            onClick={() => handleRescheduleAppointment(appointment)}
                            sx={{ color: 'warning.main' }}
                          >
                            <EditCalendar />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel Appointment">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCancelAppointment(appointment)}
                            sx={{ color: 'error.main' }}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </>
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
            View your upcoming appointments
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

        {/* Appointments Table */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Upcoming Appointments ({appointments.length})
          </Typography>
          {renderAppointmentTable(appointments, "No upcoming appointments")}
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
          therapists={therapists}
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

        {/* Reschedule Appointment Dialog */}
        <RescheduleAppointmentDialog
          open={showRescheduleDialog}
          onClose={handleCloseRescheduleDialog}
          onSuccess={handleRescheduleSuccess}
          appointment={appointmentToReschedule}
        />
      </Stack>
    </Box>
  );
};

export default PatientAppointmentPage;
