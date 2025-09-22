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
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
} from "@mui/material";
import {
  Event as EventIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { formatDate } from "../../../../utils/dateUtils";

const DURATION_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
];

const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

const AssignTreatmentDialog = ({ open, onClose, onSuccess, selectedTreatment }) => {
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [existingAppointments, setExistingAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 8);
    return now.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  
  const therapistId = localStorage.getItem("id");

  useEffect(() => {
    if (open) {
      fetchPatients();
      fetchTreatments();
      resetForm();
      
      // If a treatment is pre-selected, set it
      if (selectedTreatment) {
        setSelectedTreatmentId(selectedTreatment.treatment_id);
        setSelectedPatient(selectedTreatment.patient_id);
      }
    }
  }, [open, selectedTreatment]);

  useEffect(() => {
    if (selectedDate && therapistId) {
      fetchAppointments();
    }
  }, [selectedDate, therapistId]);

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

  const fetchTreatments = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/therapist-treatments/${therapistId}/`);
      if (response.ok) {
        const data = await response.json();
        // Only show active treatments
        setTreatments(data.filter(t => t.status === 'active'));
      } else {
        toast.error("Failed to load treatments");
      }
    } catch (error) {
      console.error("Error fetching treatments:", error);
      toast.error("Something went wrong while fetching treatments");
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/therapist-available-slots/?therapist_id=${therapistId}&date=${selectedDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setExistingAppointments(data.appointments || []);
      } else {
        console.error("Failed to fetch appointments");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const resetForm = () => {
    if (!selectedTreatment) {
      setSelectedPatient('');
      setSelectedTreatmentId('');
    }
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedTime('');
    setDuration(30);
    setNotes('');
  };

  const isTimeSlotAvailable = (time) => {
    const slotTime = new Date(`${selectedDate}T${time}`);
    const slotEnd = new Date(slotTime.getTime() + duration * 60000);

    // Check if slot ends after work hours (17:00)
    const workdayEnd = new Date(`${selectedDate}T17:00`);
    if (slotEnd > workdayEnd) {
      return false;
    }

    // Check for conflicts with existing appointments (including Pending status)
    return !existingAppointments.some(apt => {
      // 检查Scheduled、Completed和Pending状态的预约，Cancelled预约不占用时间段
      if (!['Scheduled', 'Completed', 'Pending'].includes(apt.status)) {
        return false;
      }
      
      const aptTime = new Date(apt.appointmentDateTime);
      const aptEnd = new Date(aptTime.getTime() + apt.duration * 60000);
      
      return (
        (slotTime >= aptTime && slotTime < aptEnd) ||
        (slotEnd > aptTime && slotEnd <= aptEnd) ||
        (slotTime <= aptTime && slotEnd >= aptEnd)
      );
    });
  };

  const handlePatientChange = (patientId) => {
    setSelectedPatient(patientId);
    // Reset treatment selection if patient changes
    if (!selectedTreatment) {
      setSelectedTreatmentId('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast.warn("Please select a patient");
      return;
    }
    if (!selectedDate) {
      toast.warn("Please select a date");
      return;
    }
    if (!selectedTime) {
      toast.warn("Please select a time");
      return;
    }

    try {
      setLoading(true);
      
      const appointmentDate = new Date(`${selectedDate}T${selectedTime}`);
      appointmentDate.setHours(appointmentDate.getHours() + 8);
      const appointmentDateTime = appointmentDate.toISOString();

      const requestData = {
        patient_id: selectedPatient,
        therapist_id: therapistId,
        treatment_id: selectedTreatmentId || null,
        appointmentDateTime,
        duration,
        notes: notes || "",
      };

      const response = await fetch("http://127.0.0.1:8000/api/create-appointment/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.cookie.split("; ").find(row => row.startswith("csrftoken="))?.split("=")[1] || "",
        },
        credentials: "include",
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Appointment assigned successfully!");
        fetchAppointments(); // Refresh appointments
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to assign appointment");
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const selectedPatientData = patients.find(p => p.id === selectedPatient);
  const selectedTreatmentData = treatments.find(t => t.treatment_id === selectedTreatmentId);
  const patientTreatments = treatments.filter(t => t.patient_id === selectedPatient);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">Assign Appointment with Treatment</Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Patient Selection */}
          <FormControl fullWidth required>
            <InputLabel>Select Patient</InputLabel>
            <Select
              value={selectedPatient}
              onChange={(e) => handlePatientChange(e.target.value)}
              label="Select Patient"
              disabled={!!selectedTreatment} // Disable if treatment is pre-selected
            >
              {patients.map((patient) => (
                <MenuItem key={patient.id} value={patient.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      {patient.username.charAt(0).toUpperCase()}
                    </Avatar>
                    {patient.username} ({patient.id})
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Treatment Selection */}
          {selectedPatient && (
            <FormControl fullWidth>
              <InputLabel>Select Treatment (Optional)</InputLabel>
              <Select
                value={selectedTreatmentId}
                onChange={(e) => setSelectedTreatmentId(e.target.value)}
                label="Select Treatment (Optional)"
                disabled={!!selectedTreatment} // Disable if treatment is pre-selected
              >
                <MenuItem value="">
                  <em>No specific treatment (General consultation)</em>
                </MenuItem>
                {patientTreatments.map((treatment) => (
                  <MenuItem key={treatment.treatment_id} value={treatment.treatment_id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography>
                        {treatment.treatment_type.replace('_', ' ').charAt(0).toUpperCase() + 
                         treatment.treatment_type.replace('_', ' ').slice(1)}
                      </Typography>
                      {treatment.treatment_subtype && (
                        <Typography variant="body2" color="text.secondary">
                          {treatment.treatment_subtype.replace('_', ' ')}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Selected Patient Info */}
          {selectedPatientData && (
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Patient Information
              </Typography>
              <Typography><strong>Name:</strong> {selectedPatientData.username}</Typography>
              <Typography><strong>ID:</strong> {selectedPatientData.id}</Typography>
              <Typography><strong>Active Treatments:</strong> {patientTreatments.length}</Typography>
            </Paper>
          )}

          {/* Selected Treatment Info */}
          {selectedTreatmentData && (
            <Paper sx={{ p: 2, bgcolor: 'blue.50' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Treatment Information
              </Typography>
              <Typography>
                <strong>Type:</strong> {selectedTreatmentData.treatment_type.replace('_', ' ')}
              </Typography>
              {selectedTreatmentData.treatment_subtype && (
                <Typography>
                  <strong>Subtype:</strong> {selectedTreatmentData.treatment_subtype.replace('_', ' ')}
                </Typography>
              )}
              <Typography>
                <strong>Frequency:</strong> {selectedTreatmentData.frequency || 'Not specified'}
              </Typography>
              <Typography>
                <strong>Start Date:</strong> {formatDate(selectedTreatmentData.start_date)}
              </Typography>
            </Paper>
          )}

          <Divider />

          {/* Appointment Details */}
          <Typography variant="h6">
            <EventIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Appointment Details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Appointment Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Duration</InputLabel>
                <Select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  label="Duration"
                >
                  {DURATION_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Time Slot Selection */}
          <Typography variant="subtitle1">Available Time Slots</Typography>
          <Grid container spacing={1}>
            {TIME_SLOTS.map((time) => {
              const isAvailable = isTimeSlotAvailable(time);
              return (
                <Grid item key={time}>
                  <Button
                    variant={selectedTime === time ? "contained" : "outlined"}
                    onClick={() => setSelectedTime(time)}
                    disabled={!isAvailable}
                    size="small"
                    sx={{
                      minWidth: '80px',
                      bgcolor: selectedTime === time ? 'primary.main' : 
                              isAvailable ? 'background.paper' : 'grey.200',
                    }}
                  >
                    {time}
                  </Button>
                </Grid>
              );
            })}
          </Grid>

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes for this appointment..."
          />

          {/* Existing Appointments Display */}
          {existingAppointments.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Existing Appointments on {formatDate(selectedDate)}
              </Typography>
              <List>
                {existingAppointments.map((apt, index) => (
                  <ListItem key={index} sx={{ bgcolor: 'grey.100', mb: 1, borderRadius: 1 }}>
                    <ListItemIcon>
                      <AccessTimeIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${new Date(apt.appointmentDateTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })} - ${new Date(new Date(apt.appointmentDateTime).getTime() + apt.duration * 60000).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}`}
                      secondary={`Patient: ${apt.patient_name || 'Unknown'} (${apt.duration} min)`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={loading || !selectedPatient || !selectedDate || !selectedTime}
          startIcon={<EventIcon />}
        >
          {loading ? "Assigning..." : "Assign Appointment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignTreatmentDialog; 