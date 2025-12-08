import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  IconButton,
} from "@mui/material";
import { toast } from "react-toastify";
import { 
  AccessTime as AccessTimeIcon, 
  CalendarMonth as CalendarMonthIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

// 生成小时时间槽 (09:00-17:00)
const TIME_SLOTS = Array.from({ length: 8 }, (_, i) => {
  const hour = 9 + i;
  return `${hour.toString().padStart(2, '0')}:00`;
});

const RescheduleAppointmentDialog = ({ open, onClose, onSuccess, appointment, therapistId: propTherapistId }) => {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [existingAppointments, setExistingAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  // 优先使用传入的 therapistId，否则从 appointment 中获取，最后回退到 localStorage
  const therapistId = propTherapistId || appointment?.therapist_id || appointment?.therapist?.id || localStorage.getItem("id");

  // 初始化当前预约信息
  useEffect(() => {
    if (appointment && open) {
      const appointmentDate = new Date(appointment.start_at);
      const year = appointmentDate.getFullYear();
      const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
      const day = String(appointmentDate.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
      
      const hours = String(appointmentDate.getHours()).padStart(2, '0');
      const minutes = String(appointmentDate.getMinutes()).padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  }, [appointment, open]);

  // 获取预约和不可用时间段
  useEffect(() => {
    if (open && selectedDate && therapistId) {
      fetchAppointments();
      fetchUnavailableSlots();
    }
  }, [selectedDate, therapistId, open]);

  const fetchAppointments = async () => {
    if (selectedDate && therapistId) {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/therapist-available-slots/?therapist_id=${therapistId}&date=${selectedDate}`);
        const data = await res.json();
        
        if (data.appointments && Array.isArray(data.appointments)) {
          // 排除当前预约本身（避免与自己冲突）
          const filtered = data.appointments.filter(apt => 
            apt.appointment_code !== appointment?.appointment_code
          );
          setExistingAppointments(filtered);
        } else {
          setExistingAppointments([]);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error("Failed to load appointments");
        setExistingAppointments([]);
      }
    }
  };

  const fetchUnavailableSlots = async () => {
    if (selectedDate && therapistId) {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/availability/?therapist_id=${therapistId}&date=${selectedDate}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setUnavailableSlots(data.slots || []);
        }
      } catch (error) {
        console.error('Error fetching unavailable slots:', error);
      }
    }
  };

  const resetForm = () => {
    if (appointment) {
      const appointmentDate = new Date(appointment.start_at);
      const year = appointmentDate.getFullYear();
      const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
      const day = String(appointmentDate.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
      
      const hours = String(appointmentDate.getHours()).padStart(2, '0');
      const minutes = String(appointmentDate.getMinutes()).padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast.warn("Please select a date");
      return;
    }
    if (!selectedTime) {
      toast.warn("Please select a time slot");
      return;
    }

    try {
      setLoading(true);
      // 创建正确的 ISO 格式日期字符串
      const appointmentDate = new Date(`${selectedDate}T${selectedTime}:00`);
      const newStartAt = appointmentDate.toISOString();
      
      // 计算结束时间（使用原预约的 duration）
      const duration = appointment?.duration_min || 60;
      const newEndAt = new Date(appointmentDate.getTime() + duration * 60000).toISOString();

      const userId = localStorage.getItem("id");
      const res = await fetch(
        `http://127.0.0.1:8000/api/appointments/${appointment.appointment_code}/reschedule/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.cookie.split("; ").find(row => row.startsWith("csrftoken="))?.split("=")[1] || "",
          },
          credentials: "include",
          body: JSON.stringify({
            start_at: newStartAt,
            end_at: newEndAt,
            user_id: userId,  // 添加 user_id 用于权限检查
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Appointment rescheduled successfully!");
        onSuccess(data.appointment);
        handleClose();
      } else {
        toast.error(data.error || "Failed to reschedule appointment");
      }
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isTimeSlotAvailable = (time) => {
    // 将选择的时间转换为日期对象
    const slotTime = new Date(`${selectedDate}T${time}`);
    const slotEnd = new Date(slotTime.getTime() + 60 * 60 * 1000); // 1小时

    // 检查是否超出工作时间（17:00）
    const workdayEnd = new Date(`${selectedDate}T17:00`);
    if (slotEnd > workdayEnd) {
      return false;
    }

    // 检查是否与现有预约冲突（排除当前预约）
    const isConflict = existingAppointments.some(apt => {
      if (!['Scheduled', 'Completed'].includes(apt.status)) {
        return false;
      }
      
      const aptTime = new Date(apt.start_at);
      const aptEnd = new Date(aptTime.getTime() + apt.duration_min * 60000);

      const hasOverlap = (
        (slotTime >= aptTime && slotTime < aptEnd) ||
        (slotEnd > aptTime && slotEnd <= aptEnd) ||
        (slotTime <= aptTime && slotEnd >= aptEnd)
      );

      return hasOverlap;
    });

    return !isConflict;
  };

  // 检查时间槽是否被标记为不可用
  const isTimeSlotUnavailable = (time) => {
    const slotTime = new Date(`${selectedDate}T${time}`);
    const slotEnd = new Date(slotTime.getTime() + 60 * 60 * 1000); // 1小时

    return unavailableSlots.some(slot => {
      const unavailableStart = new Date(slot.start_at);
      const unavailableEnd = new Date(slot.end_at);
      
      return slotTime < unavailableEnd && slotEnd > unavailableStart;
    });
  };

  if (!appointment) return null;

  const currentDate = new Date(appointment.start_at);
  const currentDateStr = currentDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const currentTimeStr = currentDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ p: 2, pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <ScheduleIcon color="warning" sx={{ fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#000000' }}>
              Reschedule Appointment
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2, pt: 1 }}>
        <Grid container spacing={2}>
          {/* 当前预约信息 */}
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, border: '1px solid', borderColor: 'info.main', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.dark', mb: 1 }}>
                Current Appointment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Patient:</strong> {appointment.patient?.username || appointment.contact_name || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Date:</strong> {currentDateStr}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Time:</strong> {currentTimeStr} - {new Date(appointment.end_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Duration:</strong> {appointment.duration_min} minutes
              </Typography>
            </Box>
          </Grid>
          
          {/* 新时间选择区域 */}
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#000000', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonthIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                New Appointment Date & Time
              </Typography>
              
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    type="date"
                    label="Date"
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime("");
                    }}
                    inputProps={{ 
                      min: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0]
                    }}
                    sx={{
                      '& input': {
                        cursor: 'pointer'
                      }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    p: 1, 
                    bgcolor: 'primary.light', 
                    borderRadius: 1,
                    textAlign: 'center',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="body2" color="primary.dark" fontWeight={600}>
                      Duration: {appointment.duration_min} Minutes
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {selectedDate && (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 16 }} />
                    Available Time Slots
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 1,
                    mb: 1
                  }}>
                    {TIME_SLOTS.map((time) => {
                      const isAvailable = isTimeSlotAvailable(time);
                      const isUnavailable = isTimeSlotUnavailable(time);
                      const isBooked = !isAvailable && !isUnavailable;
                      
                      let status, color, bgColor, borderColor, cursor;
                      
                      if (isUnavailable) {
                        status = 'Unavailable';
                        color = 'error.dark';
                        bgColor = 'error.light';
                        borderColor = 'error.main';
                        cursor = 'not-allowed';
                      } else if (isBooked) {
                        status = 'Booked';
                        color = 'primary.dark';
                        bgColor = 'primary.light';
                        borderColor = 'primary.main';
                        cursor = 'not-allowed';
                      } else {
                        status = 'Available';
                        color = selectedTime === time ? 'warning.dark' : 'success.dark';
                        bgColor = selectedTime === time ? 'warning.light' : 'success.light';
                        borderColor = selectedTime === time ? 'warning.main' : 'success.main';
                        cursor = 'pointer';
                      }
                      
                      return (
                        <Box
                          key={time}
                          sx={{
                            p: 1.5,
                            borderRadius: 1,
                            bgcolor: bgColor,
                            border: '2px solid',
                            borderColor: borderColor,
                            cursor: cursor,
                            opacity: (isUnavailable || isBooked) ? 0.7 : 1,
                            textAlign: 'center',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': { 
                              opacity: (isUnavailable || isBooked) ? 0.7 : 0.9,
                              transform: (isUnavailable || isBooked) ? 'none' : 'translateY(-1px)',
                              boxShadow: (isUnavailable || isBooked) ? 'none' : 2
                            },
                          }}
                          onClick={() => {
                            if (isAvailable) {
                              setSelectedTime(time);
                            }
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: color, mb: 0.5 }}>
                            {time}
                          </Typography>
                          <Typography variant="caption" sx={{ color: color, fontWeight: 600, fontSize: '0.7rem' }}>
                            {status}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                    Click on available time slots to select
                  </Typography>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'grey.200' }}>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Typography variant="body2" color="text.secondary">
            {selectedTime && selectedDate 
              ? `New time: ${selectedDate} ${selectedTime} - ${(parseInt(selectedTime.split(':')[0]) + Math.floor((appointment.duration_min || 60) / 60)).toString().padStart(2, '0')}:${String((appointment.duration_min || 60) % 60).padStart(2, '0')}` 
              : 'Please select a new date and time slot'}
          </Typography>
          <Box display="flex" gap={1}>
            <Button 
              onClick={handleClose} 
              variant="outlined"
              size="small"
              sx={{ textTransform: 'uppercase', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              color="warning"
              size="small"
              disabled={loading || !selectedTime || !selectedDate}
              sx={{ textTransform: 'uppercase', fontWeight: 600 }}
            >
              {loading ? 'Rescheduling...' : 'Reschedule Appointment'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default RescheduleAppointmentDialog;
