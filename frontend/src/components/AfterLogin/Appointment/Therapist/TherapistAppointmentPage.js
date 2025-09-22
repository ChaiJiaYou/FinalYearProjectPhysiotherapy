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
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Tooltip,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
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
  Pending as PendingIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CreateAppointmentDialog from './CreateAppointmentDialog';

const TherapistAppointmentPage = () => {
  // 状态管理
  const [appointments, setAppointments] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // 对话框状态
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showEditNotes, setShowEditNotes] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // 其他状态
  const [therapistId] = useState(localStorage.getItem('id'));
  const [sessionNotes, setSessionNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [currentAppointment, setCurrentAppointment] = useState(null);
  
  // 可用时间管理状态
  const [timeSlots, setTimeSlots] = useState([]);
  
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // 数据获取
  useEffect(() => {
    if (!therapistId) {
      setError('Therapist ID not found. Please login again.');
      setLoading(false);
      return;
    }
    fetchData();
  }, [therapistId, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAppointments(),
        fetchPendingAppointments(),
        fetchAvailabilitySlots(),
        fetchPatients()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ===== 可用时间管理：模板与编辑 =====
  const generateTimeSlots = (startTime = '09:00', endTime = '17:00') => {
    const startHour = parseInt(startTime.split(':')[0], 10);
    const endHour = parseInt(endTime.split(':')[0], 10);
    const slots = [];
    for (let h = startHour; h < endHour; h += 1) {
      // 每小时生成一个时间段：整点
      slots.push({ time: `${String(h).padStart(2, '0')}:00`, status: 'available' });
    }
    return slots;
  };


  const toggleTimeSlot = (time) => {
    setTimeSlots((prev) =>
      prev.map((slot) =>
        slot.time === time
          ? {
              ...slot,
              status: slot.status === 'available' ? 'unavailable' : 'available',
            }
          : slot
      )
    );
  };


  // 辅助函数：将时间字符串转换为分钟数
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // 打开时间管理对话框时，生成时间格子并加载已保存的unavailable时间段
  useEffect(() => {
    if (showCreateSlot) {
      loadUnavailableSlots();
    }
  }, [showCreateSlot]);

  // 加载已保存的unavailable时间段
  const loadUnavailableSlots = async () => {
    try {
      // 先生成基础时间格子
      const baseSlots = generateTimeSlots('09:00', '17:00');
      
      // 加载已保存的unavailable时间段
      // 使用本地时区获取日期字符串
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const response = await fetch(
        `http://127.0.0.1:8000/api/availability/?therapist_id=${therapistId}&date=${dateStr}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const unavailableSlots = data.slots || [];
        
        // 将已保存的unavailable时间段标记到时间格子中
        const updatedSlots = baseSlots.map(slot => {
          const slotStart = new Date(`${dateStr}T${slot.time}:00`);
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // +1 hour
          
          // 检查是否有unavailable时间段覆盖这个时间
          const isUnavailable = unavailableSlots.some(unavailableSlot => {
            const unavailableStart = new Date(unavailableSlot.start_at);
            const unavailableEnd = new Date(unavailableSlot.end_at);
            return unavailableStart < slotEnd && unavailableEnd > slotStart;
          });
          
          return {
            ...slot,
            status: isUnavailable ? 'unavailable' : 'available',
            slotId: isUnavailable ? unavailableSlots.find(s => {
              const sStart = new Date(s.start_at);
              const sEnd = new Date(s.end_at);
              return sStart < slotEnd && sEnd > slotStart;
            })?.id : null
          };
        });
        
        setTimeSlots(updatedSlots);
      } else {
        // 如果加载失败，使用基础时间格子
        setTimeSlots(baseSlots);
      }
    } catch (error) {
      console.error('Error loading unavailable slots:', error);
      // 如果出错，使用基础时间格子
      setTimeSlots(generateTimeSlots('09:00', '17:00'));
    }
  };

  const saveAvailability = async () => {
    try {
      // 使用本地时区获取日期字符串
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // 1. 首先获取当前已保存的所有unavailable时间段
      const response = await fetch(
        `http://127.0.0.1:8000/api/availability/?therapist_id=${therapistId}&date=${dateStr}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch existing unavailable slots');
      }
      
      const data = await response.json();
      const existingSlots = data.slots || [];
      
      // 2. 计算当前用户设置的unavailable时间段
      const currentUnavailableSlots = timeSlots
        .filter((s) => s.status === 'unavailable')
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      
      // 3. 将连续的unavailable时间段合并为块
      const currentBlocks = [];
      let blockStart = null;
      let prev = null;
      
      for (const slot of currentUnavailableSlots) {
        const minutes = timeToMinutes(slot.time);
        if (blockStart === null) {
          blockStart = minutes;
          prev = minutes;
        } else if (minutes === prev + 60) { // 60分钟间隔（1小时）
          prev = minutes;
        } else {
          currentBlocks.push([blockStart, prev + 60]);
          blockStart = minutes;
          prev = minutes;
        }
      }
      if (blockStart !== null) currentBlocks.push([blockStart, prev + 60]);
      
      // 4. 删除所有现有的unavailable时间段
      for (const existingSlot of existingSlots) {
        const deleteResponse = await fetch(
          `http://127.0.0.1:8000/api/availability/${existingSlot.id}/`,
          {
            method: 'DELETE',
          }
        );
        
        if (!deleteResponse.ok) {
          console.warn(`Failed to delete slot ${existingSlot.id}`);
        } else {
        }
      }
      
      // 5. 创建新的unavailable时间段
      for (const [startMinutes, endMinutes] of currentBlocks) {
        const startTime = minutesToTimeString(startMinutes);
        const endTime = minutesToTimeString(endMinutes);
        const start_at = new Date(`${dateStr}T${startTime}:00`).toISOString();
        const end_at = new Date(`${dateStr}T${endTime}:00`).toISOString();


        const createResponse = await fetch('http://127.0.0.1:8000/api/availability/create/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            therapist_id: therapistId,
            start_at,
            end_at,
            description: `Unavailable time: ${startTime}-${endTime}`,
          }),
        });
        
        if (!createResponse.ok) {
          const txt = await createResponse.text();
          console.error('API Error:', txt);
          throw new Error(txt);
        }
        
        const result = await createResponse.json();
      }

      toast.success('Availability updated successfully');
      setShowCreateSlot(false);
      await fetchAvailabilitySlots();
    } catch (e) {
      console.error('Save error:', e);
      toast.error('Failed to save availability: ' + e.message);
    }
  };

  // 辅助函数：将分钟数转换为时间字符串
  const minutesToTimeString = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const fetchAppointments = async () => {
    try {
      // 使用本地时区获取日期字符串
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/list/?scope=therapist&user_id=${therapistId}&from=${dateStr}&to=${dateStr}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching appointments:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  };

  const fetchAvailabilitySlots = async () => {
    try {
      // 使用本地时区获取日期字符串
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const response = await fetch(
        `http://127.0.0.1:8000/api/availability/?therapist_id=${therapistId}&date=${dateStr}`
      );
      const data = await response.json();
      setAvailabilitySlots(data.slots || []);
    } catch (error) {
      console.error('Error fetching availability slots:', error);
      throw error;
    }
  };

  const fetchPendingAppointments = async () => {
    try {
      // 只获取 Pending 状态的预约
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/list/?scope=therapist&user_id=${therapistId}&status=Pending`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching pending appointments:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setPendingAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching pending appointments:', error);
      throw error;
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/list-patients/');
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  };

  // 预约状态更新
  const updateAppointmentStatus = async (appointmentId, action) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/${appointmentId}/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action,
            session_notes: sessionNotes
          }),
        }
      );

      if (response.ok) {
        toast.success(`Appointment ${action} successfully`);
        await fetchAppointments();
        setShowAppointmentDetails(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || `Failed to ${action} appointment`);
      }
    } catch (error) {
      console.error(`Error ${action} appointment:`, error);
      toast.error(`An error occurred while ${action} the appointment`);
    }
  };

  // 响应预约请求（接受/拒绝）
  const respondToAppointment = async (appointmentId, action) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/${appointmentId}/respond/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '',
          },
          credentials: 'include',
          body: JSON.stringify({ action }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        await fetchPendingAppointments();
        await fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || `Failed to ${action} appointment`);
      }
    } catch (error) {
      console.error(`Error ${action} appointment:`, error);
      toast.error(`An error occurred while ${action} the appointment`);
    }
  };

  const handleCompleteAppointment = (appointment) => {
    setCurrentAppointment(appointment);
    setSessionNotes('');
    setShowCompleteDialog(true);
  };

  const handleCancelAppointment = (appointment) => {
    setCurrentAppointment(appointment);
    setCancelReason('');
    setShowCancelDialog(true);
  };

  const completeAppointment = async () => {
    if (!sessionNotes.trim()) {
      toast.error('Please enter session notes');
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/${currentAppointment.appointment_code}/complete/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            session_notes: sessionNotes,
            user_id: therapistId 
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowCompleteDialog(false);
        setSessionNotes('');
        setCurrentAppointment(null);
        await fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to complete appointment');
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('An error occurred while completing the appointment');
    }
  };

  const cancelAppointment = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please enter cancel reason');
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/${currentAppointment.appointment_code}/cancel/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '',
          },
          credentials: 'include',
          body: JSON.stringify({ 
            cancel_reason: cancelReason,
            user_id: therapistId 
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowCancelDialog(false);
        setCancelReason('');
        setCurrentAppointment(null);
        await fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('An error occurred while cancelling the appointment');
    }
  };

  // 过滤和搜索
  const filteredAppointments = appointments.filter(appointment => {
    // 只显示Pending、Scheduled和Completed状态的预约，不显示Cancelled
    if (!['Pending', 'Scheduled', 'Completed'].includes(appointment.status)) {
      return false;
    }
    
    const matchesSearch = !searchTerm || 
      appointment.patient?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.appointment_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 统计数据
    const stats = {
      pending: appointments.filter(a => a.status === 'Pending').length,
      todaySessions: appointments.filter(a => {
        const appointmentDate = new Date(a.start_at);
        const today = new Date();
        return appointmentDate.toDateString() === today.toDateString() && 
               a.status !== 'Cancelled';
      }).length,
      scheduled: appointments.filter(a => a.status === 'Scheduled').length,
      completed: appointments.filter(a => a.status === 'Completed').length,
    };

  // 工具函数
  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'primary';
      case 'Completed': return 'success';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatTime = (dateTime) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 渲染患者头像
  const renderPatientAvatar = (appointment) => {
    if (appointment.patient?.avatar) {
      return (
        <Avatar 
          src={`data:image/jpeg;base64,${appointment.patient.avatar}`} 
          sx={{ width: 32, height: 32 }}
        />
      );
    } else {
      return (
        <Avatar sx={{ width: 32, height: 32 }}>
          <PersonIcon />
        </Avatar>
      );
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

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // 加载状态
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* 页面头部 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              Appointment Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your appointments and availability for {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              {!isToday(selectedDate) && (
                <Chip 
                  label={selectedDate > new Date() ? "Future Date" : "Past Date"} 
                  size="small" 
                  color={selectedDate > new Date() ? "info" : "warning"} 
                  sx={{ ml: 1, fontSize: '0.75rem' }}
                />
              )}
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  size="small" 
                  sx={{
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              )}
              minDate={new Date(2020, 0, 1)}
              maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
              format="dd/MM/yyyy"
            />
            <Button
              variant="outlined"
              onClick={() => setSelectedDate(new Date())}
              sx={{
                minWidth: 120,
                textTransform: 'uppercase',
                fontWeight: 600,
                borderColor: '#3b82f6',
                color: '#3b82f6',
                py: 1.5,
                px: 2,
                '&:hover': {
                  borderColor: '#2563eb',
                  bgcolor: 'rgba(59, 130, 246, 0.04)',
                }
              }}
            >
              Today
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateAppointment(true)}
              sx={{ minWidth: 150 }}
            >
              New Appointment
            </Button>
          </Box>
        </Box>

        {/* 统计卡片 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Pending Accept */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box flex={1}>
                    <Typography color="textSecondary" gutterBottom>
                      Pending Accept
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {stats.pending}
                    </Typography>
                  </Box>
                  <PendingIcon color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Today's Sessions */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box flex={1}>
                    <Typography color="textSecondary" gutterBottom>
                      Today's Sessions
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {stats.todaySessions}
                    </Typography>
                  </Box>
                  <TodayIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Scheduled */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box flex={1}>
                    <Typography color="textSecondary" gutterBottom>
                      Scheduled
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {stats.scheduled}
                    </Typography>
                  </Box>
                  <ScheduleIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Completed */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Box flex={1}>
                    <Typography color="textSecondary" gutterBottom>
                      Completed
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {stats.completed}
                    </Typography>
                  </Box>
                  <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 搜索和过滤 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status Filter"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="Scheduled">Scheduled</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>View Mode</InputLabel>
                  <Select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    label="View Mode"
                  >
                    <MenuItem value="list">List View</MenuItem>
                    <MenuItem value="grid">Grid View</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchData}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      px: 3,
                      borderColor: '#3b82f6',
                      color: '#3b82f6',
                      '&:hover': {
                        borderColor: '#2563eb',
                        bgcolor: 'rgba(59, 130, 246, 0.04)',
                      }
                    }}
                  >
                    Refresh
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 标签页 */}
        <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'uppercase',
                fontWeight: 600,
                fontSize: '0.875rem',
                px: 3,
                py: 2
              }
            }}
          >
            <Tab 
              label={`Today Appointments (${filteredAppointments.length})`} 
              value={0}
              icon={<CalendarMonthIcon />}
              iconPosition="start"
            />
            <Tab 
              label={`Scheduled Appointments (${appointments.filter(a => a.status === 'Scheduled').length})`} 
              value={1}
              icon={<CheckCircleIcon />}
              iconPosition="start"
            />
            <Tab 
              label={`Pending Appointments (${pendingAppointments.length})`} 
              value={2}
              icon={<PendingIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Card>

        {/* 主要内容区域 - 标签页内容 */}
        {tabValue === 0 ? (
          /* Today Appointments 标签页 - 包含预约列表和可用时间 */
          <Grid container spacing={3}>
            {/* 预约列表 */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      {tabValue === 0 ? `Today Appointments (${filteredAppointments.length})` : 
                       tabValue === 1 ? `Scheduled Appointments (${appointments.filter(a => a.status === 'Scheduled').length})` : 
                       `Pending Appointments (${pendingAppointments.length})`}
                    </Typography>
                    <Box display="flex" gap={1}>
                      <IconButton
                        onClick={() => setViewMode('list')}
                        color={viewMode === 'list' ? 'primary' : 'default'}
                      >
                        <ViewListIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => setViewMode('grid')}
                        color={viewMode === 'grid' ? 'primary' : 'default'}
                      >
                        <ViewModuleIcon />
                      </IconButton>
                    </Box>
                  </Box>

                {(tabValue === 0 ? filteredAppointments : 
                  tabValue === 1 ? appointments.filter(a => a.status === 'Scheduled') : 
                  pendingAppointments).length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <CalendarMonthIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No appointments found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try adjusting your search or filter criteria'
                        : 'Create your first appointment to get started'
                      }
                    </Typography>
                  </Box>
                ) : viewMode === 'list' ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Patient</TableCell>
                          <TableCell>Duration</TableCell>
                          <TableCell>Mode</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(tabValue === 0 ? filteredAppointments : 
                          tabValue === 1 ? appointments.filter(a => a.status === 'Scheduled') : 
                          pendingAppointments).map((appointment) => (
                          <TableRow key={appointment.id} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(appointment.start_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatTime(appointment.start_at)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                {renderPatientAvatar(appointment)}
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {appointment.patient?.username || appointment.contact_name || 'Unknown'}
                                  </Typography>
                                  {appointment.contact_name && (
                                    <Chip label="New Patient" size="small" color="warning" />
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{appointment.duration_min} min</TableCell>
                            <TableCell>
                              <Chip label={appointment.mode} size="small" color="default" />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={appointment.status}
                                size="small"
                                color={getStatusColor(appointment.status)}
                              />
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setSelectedAppointment(appointment);
                                      setShowAppointmentDetails(true);
                                    }}
                                  >
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                                {tabValue === 1 && appointment.status === 'Pending' ? (
                                  <>
                                    <Tooltip title="Accept Appointment">
                                      <IconButton
                                        size="small"
                                        color="success"
                                        onClick={() => respondToAppointment(appointment.appointment_code, 'accept')}
                                      >
                                        <CheckCircleIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reject Appointment">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => respondToAppointment(appointment.appointment_code, 'reject')}
                                      >
                                        <CancelIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                ) : appointment.status === 'Scheduled' && (
                                  <>
                                    <Tooltip title="Complete Appointment">
                                      <IconButton
                                        size="small"
                                        color="success"
                                        onClick={() => handleCompleteAppointment(appointment)}
                                      >
                                        <CheckCircleIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Cancel Appointment">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleCancelAppointment(appointment)}
                                      >
                                        <CancelIcon />
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
                ) : (
                  <Grid container spacing={2}>
                    {(tabValue === 0 ? filteredAppointments : 
                      tabValue === 1 ? appointments.filter(a => a.status === 'Scheduled') : 
                      pendingAppointments).map((appointment) => (
                      <Grid item xs={12} sm={6} md={4} key={appointment.id}>
                        <Card 
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { boxShadow: 4 }
                          }}
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowAppointmentDetails(true);
                          }}
                        >
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <AccessTimeIcon color="action" />
                                <Typography variant="h6">
                                  {formatTime(appointment.start_at)}
                                </Typography>
                              </Box>
                              <Chip
                                label={appointment.status}
                                size="small"
                                color={getStatusColor(appointment.status)}
                              />
                            </Box>
                            
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              {renderPatientAvatar(appointment)}
                              <Typography variant="body1">
                                {appointment.patient?.username || appointment.contact_name || 'Unknown'}
                              </Typography>
                              {appointment.contact_name && (
                                <Chip label="New" size="small" color="warning" />
                              )}
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" mb={1}>
                              {appointment.duration_min} min • {appointment.mode}
                            </Typography>
                            
                            {appointment.notes && (
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {appointment.notes}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 侧边栏 - 可用时间槽 */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Available Time Slots
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setShowCreateSlot(true)}
                  >
                    Manage Availability
                  </Button>
                </Box>
                
                {(() => {
                  // 生成当天的小时状态显示 (9-5)
                  const hours = [];
                  for (let h = 9; h < 17; h++) {
                    const timeStr = `${String(h).padStart(2, '0')}:00`;
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const hourStart = new Date(`${year}-${month}-${day}T${timeStr}:00`);
                    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000); // +1 hour
                    
                    // 检查是否有不可用时间段覆盖这个小时
                    const isUnavailable = availabilitySlots.some(slot => {
                      const slotStart = new Date(slot.start_at);
                      const slotEnd = new Date(slot.end_at);
                      return slotStart < hourEnd && slotEnd > hourStart;
                    });
                    
                    // 检查是否有活跃预约在这个小时（排除Cancelled状态）
                    const hasAppointment = appointments.some(appointment => {
                      // 只考虑活跃状态的预约，Cancelled预约不占用时间段
                      if (!['Pending', 'Scheduled', 'Completed'].includes(appointment.status)) {
                        return false;
                      }
                      
                      const appointmentStart = new Date(appointment.start_at);
                      const appointmentEnd = new Date(appointment.end_at);
                      return appointmentStart < hourEnd && appointmentEnd > hourStart;
                    });
                    
                    // 确定状态和颜色
                    let status, color, bgColor, borderColor;
                    if (isUnavailable && hasAppointment) {
                      status = 'Booked & Unavailable';
                      color = 'error.dark';
                      bgColor = 'error.light';
                      borderColor = 'error.main';
                    } else if (hasAppointment) {
                      status = 'Booked';
                      color = 'primary.dark';
                      bgColor = 'primary.light';
                      borderColor = 'primary.main';
                    } else if (isUnavailable) {
                      status = 'Unavailable';
                      color = 'error.dark';
                      bgColor = 'error.light';
                      borderColor = 'error.main';
                    } else {
                      status = 'Available';
                      color = 'success.dark';
                      bgColor = 'success.light';
                      borderColor = 'success.main';
                    }
                    
                    hours.push({ 
                      time: timeStr, 
                      status,
                      color,
                      bgColor,
                      borderColor
                    });
                  }
                  
                  return (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                        Hourly Availability Status
                      </Typography>
                      <Grid container spacing={1}>
                        {hours.map((hour) => (
                          <Grid item xs={6} sm={4} md={3} key={hour.time}>
                            <Box
                              sx={{
                                p: 1.5,
                                textAlign: 'center',
                                borderRadius: 1,
                                border: '2px solid',
                                borderColor: hour.borderColor,
                                bgcolor: hour.bgColor,
                                color: hour.color,
                                fontWeight: 600,
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: 2,
                                },
                              }}
                            >
                              <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                {hour.time}
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                {hour.status}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          <Box component="span" sx={{ display: 'inline-block', width: 12, height: 12, bgcolor: 'success.light', border: '1px solid', borderColor: 'success.main', borderRadius: 0.5, mr: 1 }}></Box>
                          Available &nbsp;&nbsp;
                          <Box component="span" sx={{ display: 'inline-block', width: 12, height: 12, bgcolor: 'primary.light', border: '1px solid', borderColor: 'primary.main', borderRadius: 0.5, mr: 1 }}></Box>
                          Booked &nbsp;&nbsp;
                          <Box component="span" sx={{ display: 'inline-block', width: 12, height: 12, bgcolor: 'error.light', border: '1px solid', borderColor: 'error.main', borderRadius: 0.5, mr: 1 }}></Box>
                          Unavailable
                        </Typography>
                      </Box>
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        ) : tabValue === 1 ? (
          /* Scheduled Appointments 标签页 - 只包含已确认的预约 */
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Scheduled Appointments ({appointments.filter(a => a.status === 'Scheduled').length})
                </Typography>
                <Box display="flex" gap={1}>
                  <IconButton
                    onClick={() => setViewMode('list')}
                    color={viewMode === 'list' ? 'primary' : 'default'}
                  >
                    <ViewListIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => setViewMode('grid')}
                    color={viewMode === 'grid' ? 'primary' : 'default'}
                  >
                    <ViewModuleIcon />
                  </IconButton>
                </Box>
              </Box>

              {appointments.filter(a => a.status === 'Scheduled').length === 0 ? (
                <Box textAlign="center" py={4}>
                  <CalendarMonthIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No active appointments found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create your first appointment to get started
                  </Typography>
                </Box>
              ) : viewMode === 'list' ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Mode</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {appointments.filter(a => a.status === 'Scheduled').map((appointment) => (
                        <TableRow key={appointment.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(appointment.start_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatTime(appointment.start_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {renderPatientAvatar(appointment)}
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {appointment.patient?.username || appointment.contact_name || 'Unknown'}
                                </Typography>
                                {appointment.contact_name && (
                                  <Chip label="New Patient" size="small" color="warning" />
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{appointment.duration_min} min</TableCell>
                          <TableCell>
                            <Chip label={appointment.mode} size="small" color="default" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={appointment.status}
                              size="small"
                              color={getStatusColor(appointment.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setShowAppointmentDetails(true);
                                  }}
                                >
                                    <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                              {appointment.status === 'Scheduled' && (
                                <>
                                  <Tooltip title="Complete">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => updateAppointmentStatus(appointment.appointment_code, 'complete')}
                                    >
                                      <CheckCircleIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancel">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => updateAppointmentStatus(appointment.appointment_code, 'cancel')}
                                    >
                                      <CancelIcon />
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
              ) : (
                <Grid container spacing={2}>
                  {appointments.filter(a => a.status === 'Scheduled').map((appointment) => (
                    <Grid item xs={12} sm={6} md={4} key={appointment.id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 4 }
                        }}
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowAppointmentDetails(true);
                        }}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box>
                              <Typography variant="h6">
                                {formatTime(appointment.start_at)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(appointment.start_at).toLocaleDateString('en-GB')}
                              </Typography>
                            </Box>
                            <Chip
                              label={appointment.status}
                              size="small"
                              color={getStatusColor(appointment.status)}
                            />
                          </Box>
                          
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PersonIcon color="action" />
                            <Typography variant="body1">
                              {appointment.patient?.username || appointment.contact_name || 'Unknown'}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {appointment.duration_min} min • {appointment.mode}
                            </Typography>
                            <Box display="flex" gap={0.5}>
                              {appointment.status === 'Pending' ? (
                                <>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      respondToAppointment(appointment.appointment_code, 'accept');
                                    }}
                                  >
                                    <CheckCircleIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      respondToAppointment(appointment.appointment_code, 'reject');
                                    }}
                                  >
                                    <CancelIcon />
                                  </IconButton>
                                </>
                              ) : appointment.status === 'Scheduled' && (
                                <>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateAppointmentStatus(appointment.appointment_code, 'complete');
                                    }}
                                  >
                                    <CheckCircleIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateAppointmentStatus(appointment.appointment_code, 'cancel');
                                    }}
                                  >
                                    <CancelIcon />
                                  </IconButton>
                                </>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Pending Appointments 标签页 - 只包含待确认的预约 */
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Pending Appointments ({pendingAppointments.length})
                </Typography>
                <Box display="flex" gap={1}>
                  <IconButton
                    onClick={() => setViewMode('list')}
                    color={viewMode === 'list' ? 'primary' : 'default'}
                  >
                    <ViewListIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => setViewMode('grid')}
                    color={viewMode === 'grid' ? 'primary' : 'default'}
                  >
                    <ViewModuleIcon />
                  </IconButton>
                </Box>
              </Box>

              {pendingAppointments.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <AccessTimeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No pending appointments found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All appointment requests have been processed
                  </Typography>
                </Box>
              ) : viewMode === 'list' ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Patient</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Mode</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingAppointments.map((appointment) => (
                        <TableRow key={appointment.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(appointment.start_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatTime(appointment.start_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {renderPatientAvatar(appointment)}
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {appointment.patient?.username || appointment.contact_name || 'Unknown'}
                                </Typography>
                                {appointment.contact_name && (
                                  <Chip label="New Patient" size="small" color="warning" />
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{appointment.duration_min} min</TableCell>
                          <TableCell>
                            <Chip label={appointment.mode} size="small" color="default" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={appointment.status}
                              size="small"
                              color={getStatusColor(appointment.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setShowAppointmentDetails(true);
                                  }}
                                >
                                    <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Accept Appointment">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => respondToAppointment(appointment.appointment_code, 'accept')}
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject Appointment">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => respondToAppointment(appointment.appointment_code, 'reject')}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Grid container spacing={2}>
                  {pendingAppointments.map((appointment) => (
                    <Grid item xs={12} sm={6} md={4} key={appointment.id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 4 }
                        }}
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowAppointmentDetails(true);
                        }}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box>
                              <Typography variant="h6">
                                {formatTime(appointment.start_at)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(appointment.start_at).toLocaleDateString('en-GB')}
                              </Typography>
                            </Box>
                            <Chip
                              label={appointment.status}
                              size="small"
                              color={getStatusColor(appointment.status)}
                            />
                          </Box>
                          
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PersonIcon color="action" />
                            <Typography variant="body1">
                              {appointment.patient?.username || appointment.contact_name || 'Unknown'}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {appointment.duration_min} min • {appointment.mode}
                            </Typography>
                            <Box display="flex" gap={0.5}>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  respondToAppointment(appointment.appointment_code, 'accept');
                                }}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  respondToAppointment(appointment.appointment_code, 'reject');
                                }}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {/* 创建预约对话框 */}
        <CreateAppointmentDialog
          open={showCreateAppointment}
          onClose={() => setShowCreateAppointment(false)}
          onSuccess={() => {
            fetchData();
            setShowCreateAppointment(false);
          }}
          initialDate={selectedDate}
        />

        {/* 预约详情对话框 */}
        <Dialog open={showAppointmentDetails} onClose={() => setShowAppointmentDetails(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Appointment Details</Typography>
              <IconButton onClick={() => setShowAppointmentDetails(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedAppointment && (
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Patient Information</Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Stack spacing={1}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Name:</Typography>
                          <Typography variant="body2">
                            {selectedAppointment.patient?.username || selectedAppointment.contact_name || 'N/A'}
                          </Typography>
                        </Box>
                        {selectedAppointment.contact_name ? (
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Phone:</Typography>
                            <Typography variant="body2">
                              {selectedAppointment.contact_phone || 'N/A'}
                            </Typography>
                          </Box>
                        ) : (
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Email:</Typography>
                            <Typography variant="body2">
                              {selectedAppointment.patient?.email || 'N/A'}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Appointment Information</Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Stack spacing={1}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Code:</Typography>
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
                          <Typography variant="body2" color="text.secondary">Status:</Typography>
                          <Chip
                            label={selectedAppointment.status}
                            size="small"
                            color={getStatusColor(selectedAppointment.status)}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                  
                  {selectedAppointment.patient_message && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>Patient Message</Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          {selectedAppointment.patient_message}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  
                  {selectedAppointment.notes && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>Notes</Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          {selectedAppointment.notes}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  
                  {selectedAppointment.session_notes && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>Session Notes</Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          {selectedAppointment.session_notes}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                  
                  {selectedAppointment.cancel_reason && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>Cancellation Reason</Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          {selectedAppointment.cancel_reason}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* 管理可用时间对话框 */}
        <Dialog open={showCreateSlot} onClose={() => setShowCreateSlot(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <ScheduleIcon color="primary" />
              <Typography variant="h6">
                Manage Availability - {selectedDate.toLocaleDateString()}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              
              {/* 说明文字 */}
              <Box mb={3}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click on time slots below to toggle availability. Booked slots cannot be changed.
                </Typography>
              </Box>

              {/* 时间格子 */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>Time Slots (09:00 - 17:00)</Typography>
                <Box sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, p: 2, bgcolor: 'grey.50' }}>
                  {timeSlots.map((slot) => {
                    // 检查这个时间段是否有活跃预约（排除Cancelled状态）
                    const hasAppointment = appointments.some(appointment => {
                      // 只考虑活跃状态的预约，Cancelled预约不占用时间段
                      if (!['Pending', 'Scheduled', 'Completed'].includes(appointment.status)) {
                        return false;
                      }
                      
                      const appointmentStart = new Date(appointment.start_at);
                      const appointmentEnd = new Date(appointment.end_at);
                      const year = selectedDate.getFullYear();
                      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const day = String(selectedDate.getDate()).padStart(2, '0');
                      const slotStart = new Date(`${year}-${month}-${day}T${slot.time}:00`);
                      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // +1 hour
                      return appointmentStart < slotEnd && appointmentEnd > slotStart;
                    });
                    
                    const isBooked = hasAppointment;
                    const isUnavailable = slot.status === 'unavailable';
                    
                    let status, color, bgColor, borderColor;
                    if (isBooked && isUnavailable) {
                      status = 'Booked & Unavailable';
                      color = 'error.dark';
                      bgColor = 'error.light';
                      borderColor = 'error.main';
                    } else if (isBooked) {
                      status = 'Booked';
                      color = 'primary.dark';
                      bgColor = 'primary.light';
                      borderColor = 'primary.main';
                    } else if (isUnavailable) {
                      status = 'Unavailable';
                      color = 'error.dark';
                      bgColor = 'error.light';
                      borderColor = 'error.main';
                    } else {
                      status = 'Available';
                      color = 'success.dark';
                      bgColor = 'success.light';
                      borderColor = 'success.main';
                    }
                    
                    return (
                      <Box
                        key={slot.time}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          py: 1.5,
                          px: 2,
                          mb: 1,
                          borderRadius: 1,
                          bgcolor: bgColor,
                          border: '2px solid',
                          borderColor: borderColor,
                          cursor: isBooked ? 'not-allowed' : 'pointer',
                          opacity: isBooked ? 0.7 : 1,
                          '&:hover': { 
                            opacity: isBooked ? 0.7 : 0.9,
                            transform: isBooked ? 'none' : 'translateY(-1px)',
                            boxShadow: isBooked ? 'none' : 2
                          },
                        }}
                        onClick={() => !isBooked && toggleTimeSlot(slot.time)}
                      >
                        <Box sx={{ width: 80, fontWeight: 'bold', fontSize: '1.1rem' }}>{slot.time}</Box>
                        <Box sx={{ flex: 1, ml: 2 }}>
                          <Typography variant="body1" sx={{ color: color, fontWeight: 600 }}>
                            {status}
                          </Typography>
                        </Box>
                        <Chip 
                          label={status} 
                          size="small" 
                          sx={{ 
                            color: color,
                            bgcolor: bgColor,
                            border: `1px solid ${borderColor}`,
                            fontWeight: 600
                          }} 
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* 图例 */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>Legend:</Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'success.light', border: '1px solid', borderColor: 'success.main', borderRadius: 0.5 }} />
                    <Typography variant="body2">Available</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'primary.light', border: '1px solid', borderColor: 'primary.main', borderRadius: 0.5 }} />
                    <Typography variant="body2">Booked</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'error.light', border: '1px solid', borderColor: 'error.main', borderRadius: 0.5 }} />
                    <Typography variant="body2">Unavailable</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Box display="flex" justifyContent="space-between" width="100%">
              <Typography variant="body2" color="text.secondary">
                Click on available slots to toggle availability
              </Typography>
              <Box display="flex" gap={1}>
                <Button 
                  onClick={() => setShowCreateSlot(false)} 
                  variant="outlined"
                >
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  onClick={saveAvailability}
                >
                  Save Changes
                </Button>
              </Box>
            </Box>
          </DialogActions>
        </Dialog>

        {/* 完成预约对话框 */}
        <Dialog open={showCompleteDialog} onClose={() => setShowCompleteDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6">Complete Appointment</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box py={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Please enter session notes for this appointment:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Enter session notes..."
                variant="outlined"
                required
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setShowCompleteDialog(false)} 
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="success"
              onClick={completeAppointment}
              disabled={!sessionNotes.trim()}
            >
              Complete Appointment
            </Button>
          </DialogActions>
        </Dialog>

        {/* 取消预约对话框 */}
        <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <CancelIcon color="error" />
              <Typography variant="h6">Cancel Appointment</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box py={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Please provide a reason for cancelling this appointment:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancel reason..."
                variant="outlined"
                required
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setShowCancelDialog(false)} 
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={cancelAppointment}
              disabled={!cancelReason.trim()}
            >
              Cancel Appointment
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default TherapistAppointmentPage;
