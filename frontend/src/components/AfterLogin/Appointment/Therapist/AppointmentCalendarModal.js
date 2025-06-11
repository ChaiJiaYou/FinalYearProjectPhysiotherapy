import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Paper,
  Typography,
  Grid,
  Badge,
  styled,
} from '@mui/material';
import {
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

// 自定义样式的日历单元格
const CalendarCell = styled(Paper)(({ theme, isSelected, isToday, hasAppointments }) => ({
  padding: theme.spacing(1),
  height: '150px',  // 增加高度
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  backgroundColor: isSelected 
    ? theme.palette.primary.light 
    : isToday 
    ? theme.palette.grey[100] 
    : 'white',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  border: isToday ? `1px solid ${theme.palette.primary.main}` : '1px solid #ddd',
  overflowY: 'auto',  // 添加滚动条
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '2px',
  },
}));

const AppointmentCalendarModal = ({ open, onClose, therapistId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [appointments, setAppointments] = useState({});

  // 获取当月的预约数据
  useEffect(() => {
    const fetchMonthAppointments = async () => {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/therapist-month-appointments/?therapist_id=${therapistId}&start_date=${firstDay.toISOString().split('T')[0]}&end_date=${lastDay.toISOString().split('T')[0]}`
        );
        
        if (response.ok) {
          const data = await response.json();
          // 将预约按日期分组
          const appointmentsByDate = {};
          data.forEach(appointment => {
            const date = appointment.appointmentDateTime.split('T')[0];
            if (!appointmentsByDate[date]) {
              appointmentsByDate[date] = [];
            }
            appointmentsByDate[date].push(appointment);
          });
          setAppointments(appointmentsByDate);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };

    if (open && therapistId) {
      fetchMonthAppointments();
    }
  }, [open, currentDate, therapistId]);

  // 生成日历网格
  const generateCalendarGrid = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const today = new Date();
    const weeks = [];
    let days = [];
    
    // 添加上个月的天数
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<Grid item xs key={`empty-${i}`}>
        <CalendarCell elevation={0} />
      </Grid>);
    }
    
    // 添加当月的天数
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = today.toDateString() === date.toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();
      const dayAppointments = appointments[dateStr] || [];

      days.push(
        <Grid item xs key={day}>
          <CalendarCell 
            elevation={1}
            isSelected={isSelected}
            isToday={isToday}
            hasAppointments={dayAppointments.length > 0}
            onClick={() => setSelectedDate(date)}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography>{day}</Typography>
              {dayAppointments.length > 0 && (
                <Badge 
                  badgeContent={dayAppointments.length} 
                  color="primary"
                  max={99}
                />
              )}
            </Box>
            <Box sx={{ mt: 1, overflow: 'hidden', flex: 1 }}>
              {dayAppointments.map((apt, index) => (
                <Typography 
                  key={apt.appointmentId}
                  variant="caption" 
                  noWrap 
                  sx={{ 
                    display: 'block',
                    color: 'text.secondary',
                    backgroundColor: apt.status === 'Completed' ? '#e8f5e9' : 
                                   apt.status === 'Cancelled' ? '#ffebee' : '#e3f2fd',
                    borderRadius: 0.5,
                    px: 0.5,
                    mb: 0.5,
                    fontSize: '0.7rem',
                  }}
                >
                  {new Date(apt.appointmentDateTime).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })} - {apt.patient.username}
                </Typography>
              ))}
            </Box>
          </CalendarCell>
        </Grid>
      );
      
      if ((startingDayOfWeek + day) % 7 === 0 || day === totalDays) {
        weeks.push(
          <Grid container spacing={1} key={`week-${weeks.length}`}>
            {days}
          </Grid>
        );
        days = [];
      }
    }
    
    return weeks;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"  // 改为 lg 以获得更大的宽度
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',  // 设置高度为视口高度的90%
          maxHeight: '900px'  // 设置最大高度
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6">
              {currentDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </Typography>
            <IconButton onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* 星期标题 */}
          <Grid container spacing={1} sx={{ mb: 1 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Grid item xs key={day}>
                <Typography align="center" fontWeight="bold">
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>
          
          {/* 日历网格 */}
          <Box sx={{ mt: 1 }}>
            {generateCalendarGrid()}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentCalendarModal; 