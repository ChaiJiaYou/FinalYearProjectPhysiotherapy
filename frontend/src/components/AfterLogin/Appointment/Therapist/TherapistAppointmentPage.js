import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Stack,
  TextField,
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
  Avatar,
  Tooltip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Person as PersonIcon,
  Today as TodayIcon,
  Add as AddIcon,
  CalendarMonth as CalendarMonthIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  EditCalendar,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CreateAppointmentDialog from './CreateAppointmentDialog';
import RescheduleAppointmentDialog from './RescheduleAppointmentDialog';

const TherapistAppointmentPage = () => {
  // 状态管理
  const [appointments, setAppointments] = useState([]);
  const [scheduledAppointments, setScheduledAppointments] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [statsFromAPI, setStatsFromAPI] = useState(null); // 从 API 获取的统计信息
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false); // 用于数据刷新时的加载状态
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tabValue, setTabValue] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // 对话框状态
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  const [showCreateSlot, setShowCreateSlot] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [unavailabilityReason, setUnavailabilityReason] = useState('');
  
  // 其他状态
  const [therapistId] = useState(localStorage.getItem('id'));
  const [sessionNotes, setSessionNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [currentAppointment, setCurrentAppointment] = useState(null);
  
  // 可用时间管理状态
  const [timeSlots, setTimeSlots] = useState([]);
  const [availabilityDate, setAvailabilityDate] = useState(new Date()); // 单日期模式选择的日期
  const [availabilityDateRange, setAvailabilityDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  }); // 日期范围模式选择的日期范围
  const [availabilityMode, setAvailabilityMode] = useState('single'); // 'single' 或 'range'
  
  // 用于跟踪是否是初始加载，避免重复 API 调用
  const isInitialMount = useRef(true);

  // 获取预约数据
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
      // 如果 API 返回了统计信息，保存它
      if (data.stats) {
        setStatsFromAPI(data.stats);
      }
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


  const fetchScheduledAppointments = async () => {
    try {
      // 获取所有 Scheduled 状态的预约（不限制日期）
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/list/?scope=therapist&user_id=${therapistId}&status=Scheduled`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching scheduled appointments:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setScheduledAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching scheduled appointments:', error);
      throw error;
    }
  };

  // 初始数据获取
  useEffect(() => {
    if (!therapistId) {
      setError('Therapist ID not found. Please login again.');
      setLoading(false);
      return;
    }
    const initialFetch = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAppointments(),
          fetchScheduledAppointments(),
          fetchAvailabilitySlots()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
        isInitialMount.current = false; // 标记初始加载完成
      }
    };
    initialFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [therapistId]);

  // 日期变化时只刷新依赖日期的数据，不显示全屏加载
  useEffect(() => {
    if (!therapistId || isInitialMount.current) return; // 初始加载时跳过
    
    const refreshData = async () => {
      setDataLoading(true);
      try {
        // 使用本地时区获取日期字符串
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // 只获取依赖日期的数据
        // 1. 获取选中日期的预约（Today Appointments 需要）
        const appointmentsResponse = await fetch(
          `http://127.0.0.1:8000/api/appointments/list/?scope=therapist&user_id=${therapistId}&from=${dateStr}&to=${dateStr}`
        );
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json();
          setAppointments(appointmentsData.appointments || []);
        }
        
        // 2. 获取可用时间段（Today Appointments 需要）
        const availabilityResponse = await fetch(
          `http://127.0.0.1:8000/api/availability/?therapist_id=${therapistId}&date=${dateStr}`
        );
        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          setAvailabilitySlots(availabilityData.slots || []);
        }
        
        // 注意：scheduledAppointments 不依赖日期
        // 所以不需要重新获取，它保持不变
        
      } catch (error) {
        console.error('Error refreshing data:', error);
        toast.error('Failed to refresh data');
      } finally {
        setDataLoading(false);
      }
    };
    refreshData();
  }, [selectedDate, therapistId]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        fetchAppointments(),
        fetchScheduledAppointments(),
        fetchAvailabilitySlots()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setDataLoading(false);
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

  // 辅助函数：将分钟数转换为时间字符串
  const minutesToTimeString = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };



  // 打开时间管理对话框时，初始化
  useEffect(() => {
    if (showCreateSlot) {
      // 初始化单日期模式为当前选中的日期
      setAvailabilityDate(new Date(selectedDate));
      // 初始化日期范围模式为当前选中的日期（单天）
      const today = new Date(selectedDate);
      setAvailabilityDateRange({
        startDate: today,
        endDate: today
      });
      // 默认使用单日期模式
      setAvailabilityMode('single');
      // 加载单日期的时间段
      loadUnavailableSlots();
      // 重置日期范围模式的状态
      setUnavailabilityReason('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateSlot]);
  
  
  // 当单日期模式的日期改变时，重新加载时间段
  useEffect(() => {
    if (showCreateSlot && availabilityMode === 'single') {
      loadUnavailableSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityDate, availabilityMode]);

  // 加载已保存的unavailable时间段（单日期模式）
  const loadUnavailableSlots = async () => {
    try {
      // 先生成基础时间格子
      const baseSlots = generateTimeSlots('09:00', '17:00');
      
      // 加载已保存的unavailable时间段
      // 使用单日期模式选择的日期
      const year = availabilityDate.getFullYear();
      const month = String(availabilityDate.getMonth() + 1).padStart(2, '0');
      const day = String(availabilityDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // 同时获取该日期的预约和不可用时间段
      const [availabilityResponse, appointmentsData] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/availability/?therapist_id=${therapistId}&date=${dateStr}`),
        fetchAppointmentsForDate(availabilityDate)
      ]);
      
      let unavailableSlots = [];
      if (availabilityResponse.ok) {
        const data = await availabilityResponse.json();
        unavailableSlots = data.slots || [];
      }
      
      // 将已保存的unavailable时间段和预约信息标记到时间格子中
        const updatedSlots = baseSlots.map(slot => {
          const slotStart = new Date(`${dateStr}T${slot.time}:00`);
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // +1 hour
          
          // 检查是否有unavailable时间段覆盖这个时间
          const isUnavailable = unavailableSlots.some(unavailableSlot => {
            const unavailableStart = new Date(unavailableSlot.start_at);
            const unavailableEnd = new Date(unavailableSlot.end_at);
            return unavailableStart < slotEnd && unavailableEnd > slotStart;
          });
        
        // 检查是否有预约在这个时间段（区分 Scheduled 和 Completed）
        const hasScheduledAppointment = appointmentsData.some(appointment => {
          if (appointment.status !== 'Scheduled') {
            return false;
          }
          const appointmentStart = new Date(appointment.start_at);
          const appointmentEnd = new Date(appointment.end_at);
          return appointmentStart < slotEnd && appointmentEnd > slotStart;
        });
        
        const hasCompletedAppointment = appointmentsData.some(appointment => {
          if (appointment.status !== 'Completed') {
            return false;
          }
          const appointmentStart = new Date(appointment.start_at);
          const appointmentEnd = new Date(appointment.end_at);
          return appointmentStart < slotEnd && appointmentEnd > slotStart;
        });
        
        const hasAppointment = hasScheduledAppointment || hasCompletedAppointment;
          
          return {
            ...slot,
            status: isUnavailable ? 'unavailable' : 'available',
            slotId: isUnavailable ? unavailableSlots.find(s => {
              const sStart = new Date(s.start_at);
              const sEnd = new Date(s.end_at);
              return sStart < slotEnd && sEnd > slotStart;
          })?.id : null,
          hasAppointment: hasAppointment,
          hasScheduledAppointment: hasScheduledAppointment,
          hasCompletedAppointment: hasCompletedAppointment
          };
        });
        
        setTimeSlots(updatedSlots);
    } catch (error) {
      console.error('Error loading unavailable slots:', error);
      // 如果出错，使用基础时间格子
      setTimeSlots(generateTimeSlots('09:00', '17:00'));
    }
  };

  // 保存单日期模式的可用性设置
  const saveAvailability = async () => {
    try {
      // 使用单日期模式选择的日期
      const year = availabilityDate.getFullYear();
      const month = String(availabilityDate.getMonth() + 1).padStart(2, '0');
      const day = String(availabilityDate.getDate()).padStart(2, '0');
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
      }

      toast.success('Availability updated successfully');
      // 如果保存的日期是当前选中的日期，刷新可用时间段显示
      const savedDateStr = dateStr;
      const currentDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      if (savedDateStr === currentDateStr) {
      await fetchAvailabilitySlots();
      }
      // 关闭对话框
      setShowCreateSlot(false);
    } catch (e) {
      console.error('Save error:', e);
      toast.error('Failed to save availability: ' + e.message);
    }
  };

  // 生成日期范围内的所有日期
  const generateDateRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };


  // 获取指定日期的预约 - 使用 useCallback 避免每次渲染都创建新函数
  const fetchAppointmentsForDate = useCallback(async (date) => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const response = await fetch(
        `http://127.0.0.1:8000/api/appointments/list/?scope=therapist&user_id=${therapistId}&from=${dateStr}&to=${dateStr}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.appointments || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching appointments for date:', error);
      return [];
    }
  }, [therapistId]);

  // 日期列表显示组件 - 显示将要设置为 unavailable 的日期
  const DateListDisplay = ({ startDate, endDate, fetchAppointmentsForDate }) => {
    const [datesWithAppointments, setDatesWithAppointments] = useState({});
    const [loading, setLoading] = useState(false);
    const lastDateRangeKeyRef = useRef(null);
    
    // 使用 useMemo 记忆化日期数组，避免每次渲染都重新生成
    const dates = useMemo(() => {
      if (!startDate || !endDate) return [];
      return generateDateRange(startDate, endDate);
    }, [startDate, endDate]);

    // 使用 useMemo 创建日期范围的 key，用于判断是否需要重新加载
    const dateRangeKey = useMemo(() => {
      if (!startDate || !endDate) return '';
      return `${startDate.getTime()}-${endDate.getTime()}`;
    }, [startDate, endDate]);

    useEffect(() => {
      // 只在日期范围真正改变时重新加载预约数据
      if (!dateRangeKey || dates.length === 0) {
        return;
      }
      
      // 如果日期范围没有改变，不重新加载
      if (lastDateRangeKeyRef.current === dateRangeKey) {
        return;
      }
      
      // 检查是否是首次加载（在更新 ref 之前检查）
      const isFirstLoad = lastDateRangeKeyRef.current === null;
      
      // 更新 ref
      lastDateRangeKeyRef.current = dateRangeKey;
      
      console.log('🔄 Date range changed, checking appointments for:', dateRangeKey);
      
      let isMounted = true;
      let cancelled = false;
      
      const checkAppointments = async () => {
        // 只在非首次加载时显示 loading
        if (!isFirstLoad) {
          setLoading(true);
        }
        const appointmentsMap = {};
        console.log('📅 Checking appointments for', dates.length, 'dates');
        
        for (const date of dates) {
          if (cancelled || !isMounted) break;
          try {
            const appointments = await fetchAppointmentsForDate(date);
            const hasAppointment = appointments.some(appointment => {
              return ['Scheduled', 'Completed'].includes(appointment.status);
            });
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;
            appointmentsMap[dateKey] = hasAppointment;
            if (hasAppointment) {
              console.log('✅ Date has appointment:', dateKey);
            }
          } catch (error) {
            console.error('Error checking appointments for date:', date, error);
          }

        }
        const appointmentDates = Object.keys(appointmentsMap).filter(key => appointmentsMap[key]);
        console.log('📊 Dates with appointments:', appointmentDates);
        console.log('📊 Count:', appointmentDates.length);
        
        if (!cancelled && isMounted) {
          setDatesWithAppointments(appointmentsMap);
          console.log('✅ State updated with', appointmentDates.length, 'dates');
          if (!isFirstLoad) {
            setLoading(false);
          }
        }
      };
      
      checkAppointments();
      
      return () => {
        cancelled = true;
        isMounted = false;
      };
      // 只依赖 dateRangeKey，确保只在日期范围改变时运行
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRangeKey]);

    if (loading) {
      return (
        <Box mb={3} display="flex" justifyContent="center" py={3}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    return (
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          The following dates will be set as unavailable:
        </Typography>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            bgcolor: 'grey.50',
            maxHeight: 300,
            overflow: 'auto'
          }}
        >
          <Stack spacing={1}>
            {dates.map((date) => {
              // 使用一致的日期 key 格式：YYYY-MM-DD
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateKey = `${year}-${month}-${day}`;
              const hasAppointment = Boolean(datesWithAppointments[dateKey]);
              
              return (
                <Box
                  key={dateKey}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    py: 1,
                    px: 1.5,
                    borderRadius: 1,
                    bgcolor: 'transparent',
                  }}
                >
                  <Typography variant="body2">
                    {date.toLocaleDateString('en-GB', { 
                      weekday: 'long', 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </Typography>
                  {hasAppointment && (
                    <Chip 
                      label="Has Appointment" 
                      size="small" 
                      color="warning"
                      variant="outlined"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>
          {dates.length === 0 && (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
              No dates in selected range
            </Typography>
          )}
        </Paper>
        {Object.values(datesWithAppointments).some(Boolean) && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> {Object.values(datesWithAppointments).filter(Boolean).length} day(s) in the selected range have existing appointments. 
              These dates will still be marked as unavailable.
            </Typography>
          </Alert>
        )}
      </Box>
    );
  };


  // 保存日期范围内的所有日期为 unavailable
  const saveSelectedDatesAsUnavailable = async () => {
    if (!unavailabilityReason.trim()) {
      toast.error('Please enter a reason for unavailability');
      return;
    }

    try {
      const dates = generateDateRange(availabilityDateRange.startDate, availabilityDateRange.endDate);
      let processed = 0;
      let datesWithAppointments = 0;
      const totalDates = dates.length;
      
      // 为日期范围内的所有日期设置不可用
      for (const date of dates) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // 获取该日期的预约
        const dateAppointments = await fetchAppointmentsForDate(date);
        
        // 检查是否有预约（用于统计）
        const hasAnyAppointment = dateAppointments.some(appointment => {
          return ['Scheduled', 'Completed'].includes(appointment.status);
        });
        
        if (hasAnyAppointment) {
          datesWithAppointments++;
        }
        
        // 取消该日期上所有 Scheduled 状态的预约（Completed 已完成，不需要取消）
        const appointmentsToCancel = dateAppointments.filter(appointment => {
          return appointment.status === 'Scheduled';
        });
        
        for (const appointment of appointmentsToCancel) {
          try {
            const cancelResponse = await fetch(
              `http://127.0.0.1:8000/api/appointments/${appointment.appointment_code}/cancel/`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '',
                },
                credentials: 'include',
                body: JSON.stringify({ 
                  cancel_reason: unavailabilityReason.trim(),
                  user_id: therapistId 
                }),
              }
            );
            
            if (!cancelResponse.ok) {
              console.error(`Failed to cancel appointment ${appointment.appointment_code}`);
            }
          } catch (error) {
            console.error(`Error cancelling appointment ${appointment.appointment_code}:`, error);
          }
        }
        
        // 获取该日期现有的不可用时间段并删除
        const availabilityResponse = await fetch(
          `http://127.0.0.1:8000/api/availability/?therapist_id=${therapistId}&date=${dateStr}`
        );
        
        if (availabilityResponse.ok) {
          const data = await availabilityResponse.json();
          const existingSlots = data.slots || [];
          
          // 删除所有现有的不可用时间段
          for (const existingSlot of existingSlots) {
            await fetch(
              `http://127.0.0.1:8000/api/availability/${existingSlot.id}/`,
              { method: 'DELETE' }
            );
          }
        }
        
        // 创建整天不可用时间段（09:00 - 17:00）
        const start_at = new Date(`${dateStr}T09:00:00`).toISOString();
        const end_at = new Date(`${dateStr}T17:00:00`).toISOString();
        
        await fetch('http://127.0.0.1:8000/api/availability/create/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            therapist_id: therapistId,
            start_at,
            end_at,
            description: unavailabilityReason.trim(),
          }),
        });
        
        processed++;
        if (processed % 5 === 0 || processed === totalDates) {
          toast.info(`Processing... ${processed}/${totalDates} days`);
        }
      }
      
      const successMessage = datesWithAppointments > 0 
        ? `Successfully set ${totalDates} day(s) as unavailable. ${datesWithAppointments} day(s) have existing appointments.`
        : `Successfully set ${totalDates} day(s) as unavailable`;
      toast.success(successMessage);
      
      // 重置状态
      setUnavailabilityReason('');
      
      // 如果当前选中的日期在范围内，刷新可用时间段显示
      const currentDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      const isInRange = dates.some(d => {
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return dStr === currentDateStr;
      });
      if (isInRange) {
        await fetchAvailabilitySlots();
      }
      
      // 刷新预约数据，以反映取消的预约
      await fetchAppointments();
      await fetchScheduledAppointments();
      
      // 关闭对话框
      setShowCreateSlot(false);
      setUnavailabilityReason('');
    } catch (error) {
      console.error('Error setting dates as unavailable:', error);
      toast.error('Failed to set availability: ' + error.message);
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
        await fetchData();
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
        
        // 乐观更新：根据 action 更新状态
        const newStatus = action === 'accept' ? 'Scheduled' : 'Cancelled';
        
        // 更新统计数据
        setStatsFromAPI((prevStats) => {
          if (!prevStats) return null;
          if (action === 'accept') {
            return {
              ...prevStats,
              scheduled: (prevStats.scheduled || 0) + 1,
            };
          }
          // reject 不需要更新统计，因为不再有 pending 状态
          return prevStats;
        });
        
        // 如果接受，添加到 scheduledAppointments
        if (action === 'accept') {
          // 需要从 appointments 中找到这个预约
          const appointment = appointments.find(appt => appt.appointment_code === appointmentId);
          if (appointment) {
            const appointmentToMove = { ...appointment, status: newStatus };
            setScheduledAppointments((prevScheduled) => {
              const exists = prevScheduled.some(appt => appt.appointment_code === appointmentId);
              if (exists) {
                return prevScheduled.map((appt) =>
                  appt.appointment_code === appointmentId 
                    ? { ...appt, status: newStatus }
                    : appt
                );
              } else {
                return [...prevScheduled, appointmentToMove];
              }
            });
          }
          } else if (action === 'reject') {
            // 如果拒绝，从 scheduledAppointments 中移除（如果存在）
            setScheduledAppointments((prevScheduled) =>
              prevScheduled.filter((appt) => appt.appointment_code !== appointmentId)
            );
        }
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

  const handleRescheduleAppointment = (appointment) => {
    setRescheduleAppointment(appointment);
    setShowRescheduleDialog(true);
  };

  const handleRescheduleSuccess = (updatedAppointment) => {
    // 更新预约列表
    setAppointments(prev => prev.map(apt => 
      apt.appointment_code === updatedAppointment.appointment_code 
        ? updatedAppointment 
        : apt
    ));
    setScheduledAppointments(prev => prev.map(apt => 
      apt.appointment_code === updatedAppointment.appointment_code 
        ? updatedAppointment 
        : apt
    ));
    // 刷新数据
    fetchAppointments();
    fetchScheduledAppointments();
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
        
        // 乐观更新：直接更新状态，而不是重新获取所有数据
        const updatedAppointment = { 
          ...currentAppointment, 
          status: 'Completed', 
          session_notes: sessionNotes 
        };
        
        // 更新 appointments（Today Appointments 标签页）
        setAppointments((prev) =>
          prev.map((appt) =>
            appt.appointment_code === currentAppointment.appointment_code 
              ? updatedAppointment 
              : appt
          )
        );
        
        // 从 scheduledAppointments 中移除（因为不再是 Scheduled 状态）
        setScheduledAppointments((prev) =>
          prev.filter((appt) => appt.appointment_code !== currentAppointment.appointment_code)
        );
        
        // 更新统计数据
        setStatsFromAPI((prev) => {
          if (!prev) return null;
          // 检查是否是 scheduled 状态（在移除之前检查）
          const wasScheduled = scheduledAppointments.some(
            appt => appt.appointment_code === currentAppointment.appointment_code
          );
          
          return {
            ...prev,
            scheduled: wasScheduled ? Math.max(0, (prev.scheduled || 0) - 1) : prev.scheduled,
            // todaySessions 保持不变，因为完成预约不会减少今天的会话数
          };
        });
        
        setCurrentAppointment(null);
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
        
        // 乐观更新：直接更新状态，而不是重新获取所有数据
        const updatedAppointment = { 
          ...currentAppointment, 
          status: 'Cancelled', 
          cancel_reason: cancelReason 
        };
        
        // 更新 appointments（Today Appointments 标签页）- 由于 filteredAppointments 会过滤掉 Cancelled，这里实际上会从列表中移除
        setAppointments((prev) =>
          prev.map((appt) =>
            appt.appointment_code === currentAppointment.appointment_code 
              ? updatedAppointment 
              : appt
          )
        );
        
        // 从 scheduledAppointments 中移除（因为不再是 Scheduled 状态）
        setScheduledAppointments((prev) =>
          prev.filter((appt) => appt.appointment_code !== currentAppointment.appointment_code)
        );
        
        // 更新统计数据
        setStatsFromAPI((prev) => {
          if (!prev) return null;
          // 检查是否是今天的预约
          const appointmentDate = new Date(currentAppointment.start_at);
          const today = new Date();
          const isToday = appointmentDate.toDateString() === today.toDateString();
          
          // 检查是否是 scheduled 状态（在移除之前检查）
          const wasScheduled = scheduledAppointments.some(
            appt => appt.appointment_code === currentAppointment.appointment_code
          );
          
          return {
            ...prev,
            todaySessions: isToday ? Math.max(0, (prev.todaySessions || 0) - 1) : prev.todaySessions,
            scheduled: wasScheduled ? Math.max(0, (prev.scheduled || 0) - 1) : prev.scheduled,
          };
        });
        
        setCurrentAppointment(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('An error occurred while cancelling the appointment');
    }
  };

  // 过滤预约列表 - 只显示Scheduled和Completed状态的预约，不显示Cancelled
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      return ['Scheduled', 'Completed'].includes(appointment.status);
    });
  }, [appointments]);

  // scheduledAppointments 现在直接从 API 获取，不需要再过滤

  // 统计数据 - 优先使用从 API 获取的统计信息，如果没有则使用计算的值
  const stats = useMemo(() => {
    // 如果 API 返回了统计信息，直接使用
    if (statsFromAPI) {
      return statsFromAPI;
    }
    
    // 否则使用计算的值（fallback）
    return {
      todaySessions: appointments.filter(a => {
        const appointmentDate = new Date(a.start_at);
        const today = new Date();
        return appointmentDate.toDateString() === today.toDateString() && 
               a.status !== 'Cancelled';
      }).length,
      scheduled: scheduledAppointments.length,
      completed: appointments.filter(a => a.status === 'Completed').length,
    };
  }, [appointments, scheduledAppointments, statsFromAPI]);

  // 移除 currentTabAppointments 和 currentTabTitle，每个标签页直接使用自己的数据
  // 这样可以避免切换标签页时不必要的重新计算和渲染

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
      <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
          {/* 页面头部 - 遵循User Management设计系统 */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              Appointment Management
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            <DatePicker
              label="Date"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              inputFormat="dd/MM/yyyy"
              mask="__/__/____"
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      height: '40px',
                      '& .MuiOutlinedInput-input': {
                        padding: '12px 14px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              )}
              minDate={new Date(2020, 0, 1)}
              maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
            />
            <Button
              variant="outlined"
              onClick={() => setSelectedDate(new Date())}
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                borderColor: '#3b82f6',
                color: '#3b82f6',
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
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                bgcolor: '#3b82f6',
                '&:hover': {
                  bgcolor: '#2563eb',
                }
              }}
            >
              New Appointment
            </Button>
          </Box>
        </Box>

        {/* 统计卡片 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Today's Sessions */}
          <Grid item xs={12} sm={6} md={4}>
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
          <Grid item xs={12} sm={6} md={4}>
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
        </Grid>


        {/* 标签页和内容区域 */}
        <Paper 
          elevation={1} 
          sx={{ 
            mb: 3,
            borderRadius: 2, 
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'grey.200',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          {/* Tab Navigation */}
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'grey.200',
            bgcolor: 'grey.50'
          }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              variant="fullWidth"
              sx={{
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  bgcolor: 'primary.main',
                },
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'text.secondary',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: 'rgba(59, 130, 246, 0.04)',
                  },
                  '&.Mui-selected': {
                    color: 'primary.main',
                    fontWeight: 700,
                  },
                },
              }}
            >
              <Tab 
                label={`Today Appointments (${filteredAppointments.length})`} 
                value={0}
                icon={<TodayIcon />}
                iconPosition="start"
                sx={{ 
                  gap: 1.5,
                  py: 2,
                  px: 3,
                }}
              />
              <Tab 
                label={`Scheduled Appointments (${scheduledAppointments.length})`} 
                value={1}
                icon={<CheckCircleIcon />}
                iconPosition="start"
                sx={{ 
                  gap: 1.5,
                  py: 2,
                  px: 3,
                }}
              />
            </Tabs>
          </Box>
          
          {/* Tab Content */}
          <Box sx={{ 
            bgcolor: 'white',
            minHeight: 300,
            p: 3,
          }}>
          {/* Today Appointments 标签页 - 使用 display 控制显示，保持组件挂载 */}
          <Box sx={{ display: tabValue === 0 ? 'block' : 'none' }}>
            <Grid container spacing={3}>
            {/* 预约列表 */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Today Appointments ({filteredAppointments.length})
                    </Typography>
                  </Box>

                {dataLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={40} />
                  </Box>
                ) : filteredAppointments.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <CalendarMonthIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No appointments found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create your first appointment to get started
                    </Typography>
                  </Box>
                ) : (
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
                        {filteredAppointments.map((appointment) => (
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
                                    <Tooltip title="Reschedule Appointment">
                                      <IconButton
                                        size="small"
                                        color="warning"
                                        onClick={() => handleRescheduleAppointment(appointment)}
                                      >
                                        <EditCalendar />
                                      </IconButton>
                                    </Tooltip>
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
                    
                    // 检查是否有活跃预约在这个小时（区分 Scheduled 和 Completed）
                    const hasScheduledAppointment = appointments.some(appointment => {
                      if (appointment.status !== 'Scheduled') {
                        return false;
                      }
                      const appointmentStart = new Date(appointment.start_at);
                      const appointmentEnd = new Date(appointment.end_at);
                      return appointmentStart < hourEnd && appointmentEnd > hourStart;
                    });
                      
                    const hasCompletedAppointment = appointments.some(appointment => {
                      if (appointment.status !== 'Completed') {
                        return false;
                      }
                      const appointmentStart = new Date(appointment.start_at);
                      const appointmentEnd = new Date(appointment.end_at);
                      return appointmentStart < hourEnd && appointmentEnd > hourStart;
                    });
                    
                    const hasAppointment = hasScheduledAppointment || hasCompletedAppointment;
                    
                    // 确定状态和颜色
                    // Scheduled 预约不会同时有 unavailable，所以如果有预约 → "Booked"
                    // 如果只有 Completed 预约且 unavailable → "Booked"（Completed 已完成，不应显示为 unavailable）
                    let status, color, bgColor, borderColor;
                    if (hasAppointment) {
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
          </Box>

          {/* Scheduled Appointments 标签页 - 使用 display 控制显示，保持组件挂载 */}
          <Box sx={{ display: tabValue === 1 ? 'block' : 'none' }}>
            <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Scheduled Appointments ({scheduledAppointments.length})
                </Typography>
              </Box>

              {dataLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={40} />
                </Box>
              ) : scheduledAppointments.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <CalendarMonthIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No active appointments found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create your first appointment to get started
                  </Typography>
                </Box>
              ) : (
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
                      {scheduledAppointments.map((appointment) => (
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
                                  <Tooltip title="Reschedule Appointment">
                                    <IconButton
                                      size="small"
                                      color="warning"
                                      onClick={() => handleRescheduleAppointment(appointment)}
                                    >
                                      <EditCalendar />
                                    </IconButton>
                                  </Tooltip>
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
              )}
            </CardContent>
          </Card>
          </Box>

          </Box>
        </Paper>

        {/* 创建预约对话框 */}
        <CreateAppointmentDialog
          open={showCreateAppointment}
          onClose={() => setShowCreateAppointment(false)}
          onSuccess={(newAppointment) => {
            if (newAppointment) {
              // 乐观更新：直接添加新预约到状态，而不是重新获取所有数据
              const appointmentDate = new Date(newAppointment.start_at);
              const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
              const appointmentDateStr = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`;
              const isToday = appointmentDateStr === selectedDateStr;
              
              // 如果新预约是选中日期的，添加到 appointments
              if (isToday) {
                setAppointments((prev) => [...prev, newAppointment]);
              }
              
              // 根据状态添加到相应的列表
              if (newAppointment.status === 'Scheduled') {
                setScheduledAppointments((prev) => [...prev, newAppointment]);
              }
              
              // 更新统计数据
              setStatsFromAPI((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  scheduled: newAppointment.status === 'Scheduled' ? (prev.scheduled || 0) + 1 : prev.scheduled,
                  todaySessions: isToday ? (prev.todaySessions || 0) + 1 : prev.todaySessions,
                };
              });
              
              // 更新可用时间段（标记为已预订）
              setAvailabilitySlots((prev) => {
                // 这里不需要更新，因为 availabilitySlots 是从 API 获取的不可用时间段
                // 新预约不会影响不可用时间段，只影响已预订的时间段显示
                return prev;
              });
            }
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
                Manage Availability
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              {/* 模式切换标签页 */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs 
                  value={availabilityMode} 
                  onChange={(e, newValue) => setAvailabilityMode(newValue)}
                  sx={{
                    '& .MuiTabs-indicator': {
                      height: 3,
                      borderRadius: '3px 3px 0 0',
                    },
                  }}
                >
                  <Tab 
                    label="Single Day" 
                    value="single"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  />
                  <Tab 
                    label="Date Range" 
                    value="range"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  />
                </Tabs>
              </Box>

              {/* 单日期模式 */}
              {availabilityMode === 'single' && (
                <>
                  {/* 日期选择器 */}
                  <Box mb={3}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>
                      Select Date
                    </Typography>
                    <DatePicker
                      label="Date"
                      value={availabilityDate}
                      onChange={(newValue) => setAvailabilityDate(newValue)}
                      inputFormat="dd/MM/yyyy"
                      mask="__/__/____"
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                      )}
                      minDate={new Date(2020, 0, 1)}
                      maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
                    />
                  </Box>
              
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
                        // 使用已加载的预约信息
                        const isBooked = slot.hasAppointment || false;
                    const isUnavailable = slot.status === 'unavailable';
                    
                    let status, color, bgColor, borderColor;
                    // Scheduled 预约不会同时有 unavailable，所以如果有 Scheduled 预约 → "Booked"
                    // 如果只有 Completed 预约且 unavailable → "Booked"（Completed 已完成，不应显示为 unavailable）
                    // 如果只有 Completed 预约且不是 unavailable → "Booked"
                    if (isBooked) {
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
                  <Box mb={2}>
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
                </>
              )}

              {/* 日期范围模式 */}
              {availabilityMode === 'range' && (
                <>
                  {/* 日期范围选择器 */}
                  <Box mb={3}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                      Select Date Range
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <DatePicker
                          label="Start Date"
                          value={availabilityDateRange.startDate}
                          onChange={(newValue) => {
                            if (newValue) {
                              setAvailabilityDateRange(prev => ({
                                ...prev,
                                startDate: newValue,
                                // 如果开始日期晚于结束日期，自动调整结束日期
                                endDate: newValue > prev.endDate ? newValue : prev.endDate
                              }));
                            }
                          }}
                          inputFormat="dd/MM/yyyy"
                          mask="__/__/____"
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                },
                              }}
                            />
                          )}
                          minDate={new Date(2020, 0, 1)}
                          maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <DatePicker
                          label="End Date"
                          value={availabilityDateRange.endDate}
                          onChange={(newValue) => {
                            if (newValue) {
                              setAvailabilityDateRange(prev => ({
                                ...prev,
                                endDate: newValue,
                                // 如果结束日期早于开始日期，自动调整开始日期
                                startDate: newValue < prev.startDate ? newValue : prev.startDate
                              }));
                            }
                          }}
                          inputFormat="dd/MM/yyyy"
                          mask="__/__/____"
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              fullWidth
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                },
                              }}
                            />
                          )}
                          minDate={availabilityDateRange.startDate}
                          maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                  
                  {/* 日期列表显示 */}
                  {availabilityDateRange.startDate && availabilityDateRange.endDate && (
                    <DateListDisplay
                      startDate={availabilityDateRange.startDate}
                      endDate={availabilityDateRange.endDate}
                      fetchAppointmentsForDate={fetchAppointmentsForDate}
                    />
                  )}
                  
                  {/* Reason 输入框 */}
                  <Box mb={3}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                      Reason for Unavailability
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={unavailabilityReason}
                      onChange={(e) => setUnavailabilityReason(e.target.value)}
                      placeholder="Enter reason (e.g., Medical Leave, Annual Leave, Personal Leave)..."
                      variant="outlined"
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      This reason will be saved for all selected dates.
                    </Typography>
                  </Box>
                  
                  {/* 说明文字 */}
                  <Box mb={2}>
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      <Typography variant="body2">
                        <strong>How to use:</strong> Select a date range, then check the dates you want to set as unavailable. 
                        Enter a reason and click "Save" to apply the changes. Days with existing appointments will be automatically disabled.
                      </Typography>
                    </Alert>
                  </Box>
                </>
              )}

            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Box display="flex" justifyContent="space-between" width="100%">
              <Typography variant="body2" color="text.secondary">
                {availabilityMode === 'single' 
                  ? 'Click on time slots to toggle availability' 
                  : 'Enter a reason and click Save to set all dates in the range as unavailable'}
              </Typography>
              <Box display="flex" gap={1}>
                <Button 
                  onClick={() => {
                    setShowCreateSlot(false);
                    setUnavailabilityReason('');
                  }} 
                  variant="outlined"
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Close
                </Button>
                {availabilityMode === 'single' && (
                <Button 
                  variant="contained" 
                  onClick={saveAvailability}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Save Changes
                </Button>
                )}
                {availabilityMode === 'range' && (
                  <Button 
                    variant="contained" 
                    color="error"
                    onClick={saveSelectedDatesAsUnavailable}
                    disabled={!unavailabilityReason.trim()}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    startIcon={<CancelIcon />}
                  >
                    Save
                  </Button>
                )}
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

        {/* Reschedule Appointment Dialog */}
        <RescheduleAppointmentDialog
          open={showRescheduleDialog}
          onClose={() => {
            setShowRescheduleDialog(false);
            setRescheduleAppointment(null);
          }}
          onSuccess={handleRescheduleSuccess}
          appointment={rescheduleAppointment}
        />

        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default TherapistAppointmentPage;

