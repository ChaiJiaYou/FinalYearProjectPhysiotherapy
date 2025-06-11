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
} from "@mui/material";
import { toast } from "react-toastify";
import { AccessTime as AccessTimeIcon, Add as AddIcon } from "@mui/icons-material";

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

const CreateAppointmentDialog = ({ open, onClose, onSuccess }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 8); // 调整为 UTC+8
    return now.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState([]);
  const therapistId = localStorage.getItem("id");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 获取病人列表
  useEffect(() => {
    if (open) {
      fetch("http://127.0.0.1:8000/api/list-patients/")
        .then((res) => res.json())
        .then(setPatients)
        .catch(() => toast.error("Failed to load patients"));
    }
  }, [open]);

  const fetchAppointments = async () => {
    if (selectedDate && therapistId) {
      console.log('Fetching appointments for:', selectedDate, 'therapistId:', therapistId);
      
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/therapist-available-slots/?therapist_id=${therapistId}&date=${selectedDate}`);
        const data = await res.json();
        
        if (data.appointments && Array.isArray(data.appointments)) {
          setExistingAppointments(data.appointments);
          console.log('Updated appointments:', data.appointments);
        } else {
          console.error('Unexpected data format:', data);
          setExistingAppointments([]);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error("Failed to load appointments");
        setExistingAppointments([]);
      }
    }
  };

  // 获取选定日期的预约
  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, therapistId]);

  const resetForm = () => {
    setSelectedPatient("");
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setSelectedTime("");
    setDuration(30);
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
      // 创建一个新的日期对象，并设置为 UTC+8
      const appointmentDate = new Date(`${selectedDate}T${selectedTime}`);
      appointmentDate.setHours(appointmentDate.getHours() + 8);
      const appointmentDateTime = appointmentDate.toISOString();

      const requestData = {
        patient_id: selectedPatient,
        therapist_id: therapistId,
        appointmentDateTime,
        duration,
        notes: notes || "",
      };

      const res = await fetch("http://127.0.0.1:8000/api/create-appointment/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.cookie.split("; ").find(row => row.startsWith("csrftoken="))?.split("=")[1] || "",
        },
        credentials: "include",
        body: JSON.stringify(requestData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Appointment created successfully!");
        // 立即获取更新后的预约列表
        fetchAppointments();
        onSuccess();
        handleClose();
      } else {
        toast.error(data.error || "Failed to create appointment");
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isTimeSlotAvailable = (time) => {
    // 将选择的时间转换为日期对象
    const slotTime = new Date(`${selectedDate}T${time}`);
    const slotEnd = new Date(slotTime.getTime() + duration * 60000);

    console.log('Checking availability for:', time);
    console.log('Slot time:', slotTime);
    console.log('Slot end:', slotEnd);
    console.log('Duration:', duration);
    console.log('Existing appointments:', existingAppointments);

    // 检查是否超出工作时间（17:00）
    const workdayEnd = new Date(`${selectedDate}T17:00`);
    if (slotEnd > workdayEnd) {
      console.log('Slot ends after work hours');
      return false;
    }

    // 检查是否与现有预约冲突
    const isConflict = existingAppointments.some(apt => {
      const aptTime = new Date(apt.appointmentDateTime);
      const aptEnd = new Date(aptTime.getTime() + apt.duration * 60000);
      
      console.log('Checking against appointment:', apt);
      console.log('Appointment time:', aptTime);
      console.log('Appointment end:', aptEnd);

      // 检查是否有重叠
      const hasOverlap = (
        // 时间槽开始时间在现有预约时间范围内
        (slotTime >= aptTime && slotTime < aptEnd) ||
        // 时间槽结束时间在现有预约时间范围内
        (slotEnd > aptTime && slotEnd <= aptEnd) ||
        // 时间槽完全包含现有预约
        (slotTime <= aptTime && slotEnd >= aptEnd)
      );

      if (hasOverlap) {
        console.log('Conflict found with appointment:', apt);
      }

      return hasOverlap;
    });

    console.log('Time slot', time, 'is', isConflict ? 'not available' : 'available');
    return !isConflict;
  };

  // 格式化时间显示
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // 在duration更改时重新检查时间槽可用性
  useEffect(() => {
    if (selectedTime && !isTimeSlotAvailable(selectedTime)) {
      setSelectedTime(""); // 如果当前选择的时间槽变得不可用，则清除选择
    }
  }, [duration]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Appointment</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* 病人选择区 */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
            <Typography variant="h6" gutterBottom>
              Select Patient
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Patient</InputLabel>
              <Select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                label="Patient"
              >
                {patients.map((patient) => (
                  <MenuItem key={patient.id} value={patient.id}>
                    {patient.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          <Divider sx={{ my: 3 }} />

          {/* 预约时间选择区 */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Select Date & Time
              </Typography>
              <TextField
                type="date"
                label="Date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime(""); // 清除已选择的时间
                }}
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle1" gutterBottom>
                Available Time Slots
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {TIME_SLOTS.map((time) => (
                  <Chip
                    key={time}
                    label={time}
                    onClick={() => setSelectedTime(time)}
                    color={selectedTime === time ? "primary" : "default"}
                    variant={selectedTime === time ? "filled" : "outlined"}
                    disabled={!isTimeSlotAvailable(time)}
                  />
                ))}
              </Box>

              <FormControl fullWidth sx={{ mt: 2 }}>
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

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Existing Appointments
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default", maxHeight: 300, overflow: 'auto' }}>
                {existingAppointments.length > 0 ? (
                  existingAppointments.map((apt) => (
                    <Box
                      key={apt.appointmentId}
                      sx={{
                        mb: 2,
                        p: 2,
                        borderRadius: 1,
                        bgcolor: "background.paper",
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {apt.patient.username}
                        </Typography>
                        <Chip
                          label={apt.status}
                          color={apt.status === "Scheduled" ? "primary" : "default"}
                          size="small"
                        />
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatTime(apt.appointmentDateTime)} - {formatTime(new Date(new Date(apt.appointmentDateTime).getTime() + apt.duration * 60000))}
                          {" "}({apt.duration} mins)
                        </Typography>
                      </Box>
                      {apt.notes && (
                        <Typography variant="body2" color="text.secondary" mt={1}>
                          Note: {apt.notes}
                        </Typography>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography color="text.secondary">
                    No appointments scheduled for this date
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Notes (Optional)"
                multiline
                rows={3}
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          Create Appointment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateAppointmentDialog; 