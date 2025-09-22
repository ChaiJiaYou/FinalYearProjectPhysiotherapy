import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Error as ErrorIcon,
  Today as TodayIcon,
  Add as AddIcon,
  CalendarMonth as CalendarMonthIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const TherapistSchedulePage = () => {
  const [appointments, setAppointments] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tabValue, setTabValue] = useState(0);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [patients, setPatients] = useState([]);
  const [therapistId] = useState(localStorage.getItem('id'));
  
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (!therapistId) {
      setError('Therapist ID not found. Please login again.');
      setLoading(false);
      return;
    }
    fetchAppointments();
    fetchAvailabilitySlots();
    fetchPatients();
  }, [therapistId, selectedDate]);

  const fetchAppointments = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/list/?scope=therapist&user_id=${therapistId}&from=${dateStr}&to=${dateStr}`
      );
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to fetch appointments');
    }
  };

  const fetchAvailabilitySlots = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(
        `http://127.0.0.1:8000/api/availability/?therapist_id=${therapistId}&date=${dateStr}`
      );
      const data = await response.json();
      setAvailabilitySlots(data.slots || []);
    } catch (error) {
      console.error('Error fetching availability slots:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/list-patients/');
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const updateAppointmentStatus = async (appointmentId, action) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/${appointmentId}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        }
      );

      if (response.ok) {
        toast.success(`Appointment ${action} successfully`);
        fetchAppointments();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || `Failed to ${action} appointment`);
      }
    } catch (error) {
      console.error(`Error ${action} appointment:`, error);
      toast.error(`An error occurred while ${action} the appointment`);
    }
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

  const formatTime = (dateTime) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">
            Appointment Schedule
          </Typography>
          <Box display="flex" gap={2}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateAppointment(true)}
              sx={{ minWidth: 150 }}
            >
              Create Appointment
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Appointments" icon={<CalendarMonthIcon />} />
            <Tab label="Availability Slots" icon={<ScheduleIcon />} />
          </Tabs>
        </Box>

        {/* Appointments Tab */}
        {tabValue === 0 && (
          <Box>
            {appointments.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No appointments scheduled for {selectedDate.toLocaleDateString()}
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Patient</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Mode</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <AccessTimeIcon fontSize="small" />
                            {formatTime(appointment.start_at)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {appointment.patient.is_placeholder ? (
                            <Box>
                              <Typography variant="body2">
                                {appointment.patient.contact_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {appointment.patient.contact_phone}
                              </Typography>
                            </Box>
                          ) : (
                            <Box>
                              <Typography variant="body2">
                                {appointment.patient.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {appointment.patient.email}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>{appointment.duration_min} min</TableCell>
                        <TableCell>
                          <Chip
                            label={appointment.mode}
                            size="small"
                            color="default"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={appointment.status}
                            size="small"
                            color={getStatusColor(appointment.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {appointment.notes || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {appointment.status === 'Scheduled' && (
                            <Box display="flex" gap={1}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => updateAppointmentStatus(appointment.appointment_code, 'complete')}
                              >
                                Complete
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => updateAppointmentStatus(appointment.appointment_code, 'cancel')}
                              >
                                Cancel
                              </Button>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Availability Slots Tab */}
        {tabValue === 1 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Available Time Slots</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateSlot(true)}
              >
                Add Time Slot
              </Button>
            </Box>
            
            {availabilitySlots.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No availability slots for {selectedDate.toLocaleDateString()}
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {availabilitySlots.map((slot) => (
                  <Grid item xs={12} sm={6} md={4} key={slot.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6">
                            {formatTime(slot.start_at)} - {formatTime(slot.end_at)}
                          </Typography>
                          <Chip
                            label={slot.status}
                            size="small"
                            color={slot.status === 'open' ? 'success' : 'default'}
                          />
                        </Box>
                        {slot.buffer_min > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Buffer: {slot.buffer_min} min
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* Create Appointment Dialog */}
        <CreateAppointmentDialog
          open={showCreateAppointment}
          onClose={() => setShowCreateAppointment(false)}
          onSuccess={() => {
            fetchAppointments();
            setShowCreateAppointment(false);
          }}
          patients={patients}
          therapistId={therapistId}
          selectedDate={selectedDate}
        />

        {/* Create Availability Slot Dialog */}
        <CreateAvailabilitySlotDialog
          open={showCreateSlot}
          onClose={() => setShowCreateSlot(false)}
          onSuccess={() => {
            fetchAvailabilitySlots();
            setShowCreateSlot(false);
          }}
          therapistId={therapistId}
          selectedDate={selectedDate}
        />
      </Container>
    </LocalizationProvider>
  );
};

// Create Appointment Dialog Component
const CreateAppointmentDialog = ({ open, onClose, onSuccess, patients, therapistId, selectedDate }) => {
  const [formData, setFormData] = useState({
    patient_id: '',
    contact_name: '',
    contact_phone: '',
    start_at: '',
    duration_min: 30,
    mode: 'onsite',
    notes: '',
  });
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!isNewPatient && !formData.patient_id) {
      toast.error('Please select a patient');
      return;
    }
    if (isNewPatient && (!formData.contact_name || !formData.contact_phone)) {
      toast.error('Please provide contact name and phone');
      return;
    }
    if (!formData.start_at) {
      toast.error('Please select start time');
      return;
    }

    try {
      setLoading(true);
      
      // 构建请求数据
      const requestData = {
        therapist_id: therapistId,
        start_at: formData.start_at,
        duration_min: formData.duration_min,
        mode: formData.mode,
        notes: formData.notes,
      };

      if (isNewPatient) {
        requestData.contact_name = formData.contact_name;
        requestData.contact_phone = formData.contact_phone;
      } else {
        requestData.patient_id = formData.patient_id;
      }

      const response = await fetch('http://127.0.0.1:8000/api/appointments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Appointment created successfully!');
        onSuccess();
        setFormData({
          patient_id: '',
          contact_name: '',
          contact_phone: '',
          start_at: '',
          duration_min: 30,
          mode: 'onsite',
          notes: '',
        });
        setIsNewPatient(false);
      } else {
        toast.error(data.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Appointment</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {/* Patient Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Patient Type</InputLabel>
                <Select
                  value={isNewPatient ? 'new' : 'existing'}
                  onChange={(e) => setIsNewPatient(e.target.value === 'new')}
                >
                  <MenuItem value="existing">Existing Patient</MenuItem>
                  <MenuItem value="new">New Patient (Placeholder)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {isNewPatient ? (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Contact Name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Contact Phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Patient</InputLabel>
                  <Select
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  >
                    {patients.map((patient) => (
                      <MenuItem key={patient.id} value={patient.id}>
                        {patient.username} ({patient.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Time"
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Duration</InputLabel>
                <Select
                  value={formData.duration_min}
                  onChange={(e) => setFormData({ ...formData, duration_min: e.target.value })}
                >
                  <MenuItem value={30}>30 minutes</MenuItem>
                  <MenuItem value={45}>45 minutes</MenuItem>
                  <MenuItem value={60}>60 minutes</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Mode</InputLabel>
                <Select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                >
                  <MenuItem value="onsite">On-site</MenuItem>
                  <MenuItem value="tele">Telemedicine</MenuItem>
                  <MenuItem value="home">Home visit</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Creating...' : 'Create Appointment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Create Availability Slot Dialog Component
const CreateAvailabilitySlotDialog = ({ open, onClose, onSuccess, therapistId, selectedDate }) => {
  const [formData, setFormData] = useState({
    start_at: '',
    end_at: '',
    buffer_min: 0,
    status: 'open',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.start_at || !formData.end_at) {
      toast.error('Please provide start and end times');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('http://127.0.0.1:8000/api/availability/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          therapist_id: therapistId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Availability slot created successfully!');
        onSuccess();
        setFormData({
          start_at: '',
          end_at: '',
          buffer_min: 0,
          status: 'open',
        });
      } else {
        toast.error(data.error || 'Failed to create availability slot');
      }
    } catch (error) {
      console.error('Error creating availability slot:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Availability Slot</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Time"
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Time"
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Buffer (minutes)"
                type="number"
                value={formData.buffer_min}
                onChange={(e) => setFormData({ ...formData, buffer_min: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Creating...' : 'Create Slot'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TherapistSchedulePage;
