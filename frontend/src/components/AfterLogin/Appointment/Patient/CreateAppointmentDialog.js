import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Autocomplete
} from "@mui/material";
import {
  Close,
  Person,
  CalendarToday,
  AccessTime,
  CheckCircle,
  ArrowBack,
  ArrowForward
} from "@mui/icons-material";
import { Avatar } from "@mui/material";
import { toast } from "react-toastify";

const CreateAppointmentDialog = ({ open, onClose, onAppointmentCreated, therapists = [] }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTherapist, setSelectedTherapist] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [patientMessage, setPatientMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const steps = [
    "Select Therapist & Time",
    "Confirm Appointment"
  ];

  // 格式化时间为AM/PM格式
  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Fetch available time slots - 显示所有时间段，标记不可用的
  const fetchAvailableSlots = async (therapistId, date) => {
    if (!therapistId || !date) return;
    
    try {
      setLoading(true);
      const year = new Date(date).getFullYear();
      const month = String(new Date(date).getMonth() + 1).padStart(2, '0');
      const day = String(new Date(date).getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // 1. 获取不可用时间段
      const unavailableRes = await fetch(
        `http://127.0.0.1:8000/api/availability/?therapist_id=${therapistId}&date=${dateStr}`
      );
      
      // 2. 获取已预约的时间段
      const appointmentsRes = await fetch(
        `http://127.0.0.1:8000/api/therapist-available-slots/?therapist_id=${therapistId}&date=${dateStr}`
      );
      
      // 3. 生成所有时间段 (9:00-17:00) 并标记状态
      const allSlots = [];
      for (let h = 9; h < 17; h++) {
        const timeStr = `${String(h).padStart(2, '0')}:00`;
        allSlots.push({
          time: timeStr,
          available: true
        });
      }
      
      let unavailableSlots = [];
      let existingAppointments = [];
      
      if (unavailableRes.ok) {
        const unavailableData = await unavailableRes.json();
        unavailableSlots = unavailableData.slots || [];
      }
      
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        existingAppointments = appointmentsData.appointments || [];
      }
      
      // 4. 标记不可用和已预约的时间段（区分 Scheduled 和 Completed）
      const slotsWithStatus = allSlots.map(slot => {
        const slotStart = new Date(`${dateStr}T${slot.time}:00`);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // +1 hour
        
        // 检查是否不可用
        const isUnavailable = unavailableSlots.some(unavailableSlot => {
          const unavailableStart = new Date(unavailableSlot.start_at);
          const unavailableEnd = new Date(unavailableSlot.end_at);
          return unavailableStart < slotEnd && unavailableEnd > slotStart;
        });
        
        // 检查是否有 Scheduled 预约
        const hasScheduledAppointment = existingAppointments.some(appointment => {
          if (appointment.status !== 'Scheduled') {
            return false;
          }
          const appointmentStart = new Date(appointment.start_at);
          const appointmentEnd = new Date(appointment.end_at);
          return appointmentStart < slotEnd && appointmentEnd > slotStart;
        });
        
        // 检查是否有 Completed 预约
        const hasCompletedAppointment = existingAppointments.some(appointment => {
          if (appointment.status !== 'Completed') {
            return false;
          }
          const appointmentStart = new Date(appointment.start_at);
          const appointmentEnd = new Date(appointment.end_at);
          return appointmentStart < slotEnd && appointmentEnd > slotStart;
        });
        
        const hasAppointment = hasScheduledAppointment || hasCompletedAppointment;
        
        // 确定状态
        let status, available;
        if (hasAppointment) {
          status = 'Booked';
          available = false;
        } else if (isUnavailable) {
          status = 'Unavailable';
          available = false;
        } else {
          status = 'Available';
          available = true;
        }
        
        return {
          ...slot,
          available,
          status,
          hasScheduledAppointment,
          hasCompletedAppointment,
          isUnavailable
        };
      });
      
      setAvailableSlots(slotsWithStatus);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Reset form
      setActiveStep(0);
      setSelectedTherapist("");
      setSelectedDate("");
      setSelectedTime("");
      setPatientMessage("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (selectedTherapist && selectedDate) {
      fetchAvailableSlots(selectedTherapist, selectedDate);
    }
  }, [selectedTherapist, selectedDate]);

  const handleNext = () => {
    if (activeStep === 0 && (!selectedTherapist || !selectedDate || !selectedTime)) {
      setError("Please select therapist, date and time");
      return;
    }
    setError(null);
    setActiveStep(activeStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep(activeStep - 1);
  };

  const handleCreateAppointment = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = localStorage.getItem("id");
      if (!userId) {
        throw new Error("User ID not found. Please login again.");
      }

      // Create appointment data
      const appointmentData = {
        patient_id: userId,
        therapist_id: selectedTherapist,
        start_at: `${selectedDate}T${selectedTime}:00`,
        duration_min: 60, // Default duration
        mode: "onsite", // Default mode
        patient_message: patientMessage
        // Status will be set to Scheduled by default on the backend
      };

      const res = await fetch("http://127.0.0.1:8000/api/appointments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": document.cookie.split("; ").find(row => row.startsWith("csrftoken="))?.split("=")[1] || "",
        },
        credentials: "include",
        body: JSON.stringify(appointmentData),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Appointment created successfully!");
        // 将新创建的预约传递给父组件，用于乐观更新
        onAppointmentCreated(data.appointment);
        onClose();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create appointment");
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 优化：使用 useMemo 记忆化选中的治疗师值，避免每次渲染都执行 find
  const selectedTherapistValue = useMemo(() => {
    return therapists.find(t => t.id === selectedTherapist) || null;
  }, [therapists, selectedTherapist]);

  // Debug: 检查 therapists 数据
  useEffect(() => {
    if (open) {
      console.log('CreateAppointmentDialog opened, therapists count:', therapists.length);
    }
  }, [open, therapists.length]);

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Therapist & Time
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Choose a therapist and select your preferred date and time
            </Typography>
            
            {/* Therapist Selection */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Select Therapist
              </Typography>
              <Autocomplete
                options={therapists}
                getOptionLabel={(option) => `Dr. ${option.username}`}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                value={selectedTherapistValue}
                onChange={(event, newValue) => {
                  setSelectedTherapist(newValue ? newValue.id : "");
                  setSelectedDate(""); // Reset date when therapist changes
                  setSelectedTime(""); // Reset time when therapist changes
                }}
                filterOptions={(options, { inputValue }) => {
                  // 自定义过滤逻辑，提高性能
                  const searchTerm = inputValue.toLowerCase();
                  return options.filter(option => 
                    option.username?.toLowerCase().includes(searchTerm) ||
                    option.email?.toLowerCase().includes(searchTerm)
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Therapist"
                    placeholder="Type to search therapists..."
                    variant="outlined"
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.id}>
                    <Box display="flex" alignItems="center" gap={2}>
                      {option.avatar ? (
                        <Avatar 
                          src={option.avatar} 
                          alt={option.username}
                          sx={{ width: 40, height: 40 }}
                        />
                      ) : (
                        <Avatar sx={{ width: 40, height: 40, bgcolor: '#3b82f6' }}>
                          <Person />
                        </Avatar>
                      )}
                      <Box>
                        <Typography variant="body1">
                          Dr. {option.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
                sx={{ mb: 3 }}
                noOptionsText="No therapists found"
              />
            </Box>

            {/* Date Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Select Date
              </Typography>
              <TextField
                fullWidth
                label="Choose Date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ 
                  min: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0] // UTC+8 today
                }}
                disabled={!selectedTherapist}
                onClick={(e) => {
                  if (!selectedTherapist) return;
                  e.target.showPicker && e.target.showPicker();
                }}
                sx={{
                  '& input': {
                    cursor: selectedTherapist ? 'pointer' : 'not-allowed'
                  }
                }}
              />
            </Box>

            {/* Time Slots */}
            {selectedTherapist && selectedDate && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Available Time Slots
                </Typography>
                
                {loading ? (
                  <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      Loading time slots...
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {availableSlots.map((slot) => {
                      // 根据状态设置颜色
                      let borderColor, bgColor, textColor, statusColor;
                      if (slot.status === 'Booked') {
                        borderColor = selectedTime === slot.time ? '#3b82f6' : '#1976d2';
                        bgColor = selectedTime === slot.time ? '#f0f9ff' : '#e3f2fd';
                        textColor = '#1976d2';
                        statusColor = 'primary';
                      } else if (slot.status === 'Unavailable') {
                        borderColor = selectedTime === slot.time ? '#3b82f6' : '#d32f2f';
                        bgColor = selectedTime === slot.time ? '#f0f9ff' : '#ffebee';
                        textColor = '#d32f2f';
                        statusColor = 'error';
                      } else {
                        borderColor = selectedTime === slot.time ? '#3b82f6' : '#4caf50';
                        bgColor = selectedTime === slot.time ? '#f0f9ff' : '#e8f5e9';
                        textColor = '#4caf50';
                        statusColor = 'success';
                      }
                      
                      return (
                        <Grid item xs={6} sm={4} md={3} key={slot.time}>
                          <Card
                            sx={{
                              cursor: slot.available ? 'pointer' : 'not-allowed',
                              border: selectedTime === slot.time ? 2 : 1,
                              borderColor: borderColor,
                              backgroundColor: bgColor,
                              opacity: slot.available ? 1 : 0.7,
                              '&:hover': slot.available ? {
                                boxShadow: 3,
                                borderColor: '#3b82f6',
                                transform: 'translateY(-2px)'
                              } : {},
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onClick={() => slot.available && setSelectedTime(slot.time)}
                          >
                            <CardContent sx={{ p: 2, textAlign: 'center' }}>
                              <AccessTime 
                                sx={{ 
                                  color: selectedTime === slot.time ? '#3b82f6' : textColor,
                                  mb: 0.5
                                }}
                              />
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: selectedTime === slot.time ? 600 : 500,
                                  color: selectedTime === slot.time ? '#3b82f6' : textColor,
                                  mb: 0.5
                                }}
                              >
                                {formatTime(slot.time)}
                              </Typography>
                              <Chip
                                label={slot.status}
                                size="small"
                                color={statusColor}
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  mt: 0.5
                                }}
                              />
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Box>
            )}
          </Box>
        );

      case 1:
        const selectedTherapistData = therapists.find(t => t.id === selectedTherapist);
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirm Your Appointment
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Please review your appointment details before confirming
            </Typography>
            
            <Card sx={{ mt: 2 }}>
              <CardContent>
                 <Stack spacing={2}>
                   <Box display="flex" alignItems="center" gap={2}>
                     {selectedTherapistData?.avatar ? (
                       <Avatar 
                         src={selectedTherapistData.avatar} 
                         alt={selectedTherapistData.username}
                         sx={{ width: 40, height: 40 }}
                       />
                     ) : (
                       <Avatar sx={{ width: 40, height: 40, bgcolor: '#3b82f6' }}>
                         <Person />
                       </Avatar>
                     )}
                     <Box>
                       <Typography variant="body1">
                         <strong>Therapist:</strong> Dr. {selectedTherapistData?.username}
                       </Typography>
                       <Typography variant="body2" color="text.secondary">
                         {selectedTherapistData?.email}
                       </Typography>
                     </Box>
                   </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <CalendarToday color="primary" />
                    <Typography variant="body1">
                      <strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-GB')}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <AccessTime color="primary" />
                    <Typography variant="body1">
                      <strong>Time:</strong> {formatTime(selectedTime)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle color="primary" />
                    <Typography variant="body1">
                      <strong>Status:</strong> <Chip label="Scheduled" color="primary" size="small" />
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <TextField
              fullWidth
              label="Message to Therapist (Optional)"
              multiline
              rows={3}
              value={patientMessage}
              onChange={(e) => setPatientMessage(e.target.value)}
              placeholder="Leave a message for your therapist..."
              sx={{ mt: 2 }}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          Create New Appointment
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <Divider sx={{ my: 3 }} />
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {getStepContent(activeStep)}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<ArrowBack />}
        >
          Back
        </Button>
        <Button
          onClick={activeStep === steps.length - 1 ? handleCreateAppointment : handleNext}
          variant="contained"
          endIcon={activeStep === steps.length - 1 ? <CheckCircle /> : <ArrowForward />}
          disabled={loading}
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
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : activeStep === steps.length - 1 ? (
            "Confirm Appointment"
          ) : (
            "Next"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateAppointmentDialog;
