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
import { 
  AccessTime as AccessTimeIcon, 
  Add as AddIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material";

// 生成小时时间槽 (09:00-17:00)
const TIME_SLOTS = Array.from({ length: 8 }, (_, i) => {
  const hour = 9 + i;
  return `${hour.toString().padStart(2, '0')}:00`;
});

const CreateAppointmentDialog = ({ open, onClose, onSuccess, initialDate }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate) {
      // 使用本地时区获取日期字符串
      const year = initialDate.getFullYear();
      const month = String(initialDate.getMonth() + 1).padStart(2, '0');
      const day = String(initialDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const now = new Date();
    // 使用本地时区获取日期字符串
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [unavailableSlots, setUnavailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState([]);
  const therapistId = localStorage.getItem("id");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // 新增：占位预约相关状态
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

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
      
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/therapist-available-slots/?therapist_id=${therapistId}&date=${selectedDate}`);
        const data = await res.json();
        
        if (data.appointments && Array.isArray(data.appointments)) {
          setExistingAppointments(data.appointments);
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

  // 获取不可用时间段
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

  // 同步外部传入的日期
  useEffect(() => {
    if (initialDate) {
      // 使用本地时区获取日期字符串
      const year = initialDate.getFullYear();
      const month = String(initialDate.getMonth() + 1).padStart(2, '0');
      const day = String(initialDate.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    }
  }, [initialDate]);

  // 获取选定日期的预约和不可用时间段
  useEffect(() => {
    if (open) {
      fetchAppointments();
      fetchUnavailableSlots();
    }
  }, [selectedDate, therapistId, open]);

  const resetForm = () => {
    setSelectedPatient("");
    // 使用本地时区获取日期字符串
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
    setSelectedTime("");
    setNotes("");
    setIsNewPatient(false);
    setContactName("");
    setContactPhone("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!isNewPatient && !selectedPatient) {
      toast.warn("Please select a patient");
      return;
    }
    if (isNewPatient && (!contactName || !contactPhone)) {
      toast.warn("Please provide contact name and phone for new patient");
      return;
    }
    // 验证电话号码：必须是数字，且长度为 10-11 位
    if (isNewPatient && contactPhone) {
      const phoneDigits = contactPhone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        toast.error("Contact phone must be 10-11 digits");
        return;
      }
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
      // 创建正确的 ISO 格式日期字符串
      const appointmentDate = new Date(`${selectedDate}T${selectedTime}:00`);
      const start_at = appointmentDate.toISOString();

      const requestData = {
        therapist_id: therapistId,
        start_at,
        duration_min: 60, // 固定1小时
        notes: notes || "",
        therapist_created: true, // 标识这是治疗师创建的预约
      };

      // 根据是否为新患者添加不同的字段
      if (isNewPatient) {
        requestData.contact_name = contactName;
        requestData.contact_phone = contactPhone;
      } else {
        requestData.patient_id = selectedPatient;
      }


      const res = await fetch("http://127.0.0.1:8000/api/appointments/", {
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
        // 将新创建的预约传递给父组件，用于乐观更新
        onSuccess(data.appointment);
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
    // 将选择的时间转换为日期对象（固定1小时）
    const slotTime = new Date(`${selectedDate}T${time}`);
    const slotEnd = new Date(slotTime.getTime() + 60 * 60 * 1000); // 1小时

    // 检查是否超出工作时间（17:00）
    const workdayEnd = new Date(`${selectedDate}T17:00`);
    if (slotEnd > workdayEnd) {
      return false;
    }

    // 检查是否与现有预约冲突（考虑所有活跃状态的预约，包括Pending）
    const isConflict = existingAppointments.some(apt => {
      // 检查Scheduled、Completed和Pending状态的预约，Cancelled预约不占用时间段
      if (!['Scheduled', 'Completed', 'Pending'].includes(apt.status)) {
        return false;
      }
      
      const aptTime = new Date(apt.start_at);
      const aptEnd = new Date(aptTime.getTime() + apt.duration_min * 60000);

      // 检查是否有重叠
      const hasOverlap = (
        // 时间槽开始时间在现有预约时间范围内
        (slotTime >= aptTime && slotTime < aptEnd) ||
        // 时间槽结束时间在现有预约时间范围内
        (slotEnd > aptTime && slotEnd <= aptEnd) ||
        // 时间槽完全包含现有预约
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
      
      // 检查是否有重叠
      return slotTime < unavailableEnd && slotEnd > unavailableStart;
    });
  };

  // 格式化时间显示
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };


  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ p: 2, pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <AddIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#000000' }}>
            Create New Appointment
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2, pt: 1 }}>
        <Grid container spacing={2}>
          
          {/* 左侧：患者信息和时间选择 */}
          <Grid item xs={12} lg={12}>
            
            {/* 患者选择区域 */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#000000', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                Patient Information
              </Typography>
              
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Patient Type</InputLabel>
                    <Select
                      value={isNewPatient ? "new" : "existing"}
                      onChange={(e) => {
                        const isNew = e.target.value === "new";
                        setIsNewPatient(isNew);
                        if (isNew) {
                          setSelectedPatient("");
                        } else {
                          setContactName("");
                          setContactPhone("");
                        }
                      }}
                      label="Patient Type"
                    >
                      <MenuItem value="existing">Existing Patient</MenuItem>
                      <MenuItem value="new">New Patient</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {!isNewPatient && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Select Patient</InputLabel>
                      <Select
                        value={selectedPatient}
                        onChange={(e) => setSelectedPatient(e.target.value)}
                        label="Select Patient"
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
                
                {isNewPatient && (
                  <>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Contact Name"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Enter patient's name"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Contact Phone"
                        value={contactPhone}
                        onChange={(e) => {
                          // 只允许数字，限制为 11 位
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setContactPhone(value);
                        }}
                        placeholder="Enter phone number (10-11 digits)"
                        inputProps={{
                          maxLength: 11
                        }}
                        helperText="Enter 10-11 digit phone number"
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
            
            {/* 时间选择区域 */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#000000', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                Appointment Time
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
                      min: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0] // UTC+8 today
                    }}
                    onClick={(e) => {
                      e.target.showPicker && e.target.showPicker();
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
                      Duration: 1 Hour
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
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
                    color = selectedTime === time ? 'primary.dark' : 'success.dark';
                    bgColor = selectedTime === time ? 'primary.light' : 'success.light';
                    borderColor = selectedTime === time ? 'primary.main' : 'success.main';
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
            </Box>
            
            {/* 备注区域 */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#000000', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotesIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                Additional Notes
              </Typography>
              <TextField
                label="Notes (Optional)"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any additional notes..."
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'grey.200' }}>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Typography variant="body2" color="text.secondary">
            {selectedTime ? `Selected: ${selectedTime} - ${(parseInt(selectedTime.split(':')[0]) + 1).toString().padStart(2, '0')}:00` : 'Please select a time slot'}
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
              size="small"
              disabled={loading || !selectedTime}
              sx={{ textTransform: 'uppercase', fontWeight: 600 }}
            >
              {loading ? 'Creating...' : 'Create Appointment'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CreateAppointmentDialog; 