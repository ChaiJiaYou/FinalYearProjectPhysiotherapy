import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  LinearProgress,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CalendarToday as CalendarTodayIcon,
  Assignment as AssignmentIcon,
  FitnessCenter as FitnessCenterIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  PlayArrow as PlayArrowIcon,
  ViewList as ViewListIcon,
  Assessment as AssessmentIcon,
  Timer as TimerIcon,
  EmojiEvents as EmojiEventsIcon
} from '@mui/icons-material';

const PatientDashboardPage = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [currentTreatment, setCurrentTreatment] = useState(null);
  const [recentExercises, setRecentExercises] = useState([]);
  const patientId = localStorage.getItem('id');

  useEffect(() => {
    if (patientId) {
      fetchDashboardData();
    }
  }, [patientId]);

  const fetchDashboardData = async () => {
    try {
      // Fetch patient-specific data
      const [appointmentsResponse, treatmentsResponse] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/patient-appointments/?patient_id=${patientId}`),
        fetch(`http://127.0.0.1:8000/api/patient-treatments/${patientId}/`)
      ]);

      const appointments = await appointmentsResponse.json();
      const treatments = await treatmentsResponse.json();

      // Get active treatment
      const activeTreatment = treatments.find(treatment => treatment.status === 'active');
      
      // Process data for stats
      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
      const upcomingAppointments = appointments.filter(apt => 
        apt.status === 'scheduled' && new Date(apt.date) >= new Date()
      );
      const activeTreatmentCount = activeTreatment ? 1 : 0;

      setStats({
        totalAppointments,
        completedAppointments,
        upcomingAppointments: upcomingAppointments.length,
        activeTreatment: activeTreatmentCount,
        completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0
      });

      // Set upcoming appointments (next 3)
      setUpcomingAppointments(upcomingAppointments.slice(0, 3));

      // Set current treatment
      setCurrentTreatment(activeTreatment);

      // Mock recent exercises (you can replace with real API)
      setRecentExercises([
        { id: 1, name: 'Shoulder Flexion', completed: 15, target: 20, date: 'Today', status: 'in_progress' },
        { id: 2, name: 'Arm Raises', completed: 30, target: 30, date: 'Yesterday', status: 'completed' },
        { id: 3, name: 'Neck Stretches', completed: 25, target: 25, date: '2 days ago', status: 'completed' }
      ]);

    } catch (error) {
      console.error('Error fetching patient dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      title: 'Upcoming Appointments',
      value: stats.upcomingAppointments || 0,
      icon: <CalendarTodayIcon sx={{ fontSize: 40 }} />,
      color: '#3b82f6',
      bgColor: '#dbeafe',
      trend: 'Next appointment scheduled',
      trendUp: true
    },
    {
      title: 'Active Treatment',
      value: stats.activeTreatment || 0,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      bgColor: '#e8f5e8',
      trend: stats.activeTreatment ? 'Treatment in progress' : 'No active treatment',
      trendUp: stats.activeTreatment > 0
    },
    {
      title: 'Completion Rate',
      value: `${stats.completionRate || 0}%`,
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      color: '#8b5cf6',
      bgColor: '#f3e8ff',
      trend: `${stats.completedAppointments || 0}/${stats.totalAppointments || 0} completed`,
      trendUp: stats.completionRate >= 80
    },
    {
      title: 'Exercise Progress',
      value: recentExercises.filter(ex => ex.status === 'completed').length,
      icon: <FitnessCenterIcon sx={{ fontSize: 40 }} />,
      color: '#ef4444',
      bgColor: '#fee2e2',
      trend: `${recentExercises.length} exercises available`,
      trendUp: true
    }
  ];

  const quickActions = [
    { label: 'Start Exercise', icon: <PlayArrowIcon />, color: '#2e7d32', route: '/exercise' },
    { label: 'View Appointments', icon: <CalendarTodayIcon />, color: '#3b82f6', route: '/appointments' },
    { label: 'Treatment Progress', icon: <AssessmentIcon />, color: '#8b5cf6', route: '/treatment-progress' },
    { label: 'Schedule Appointment', icon: <ScheduleIcon />, color: '#ef4444', route: '/appointments' }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography>Loading your dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
          My Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your progress and manage your treatment
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'grey.200',
                elevation: 0,
                '&:hover': {
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                },
                transition: 'all 0.3s ease',
                height: '100%'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 2,
                      backgroundColor: card.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {React.cloneElement(card.icon, { sx: { fontSize: 40, color: card.color } })}
                  </Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: card.color, mb: 1 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {card.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {card.trendUp ? (
                    <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} />
                  ) : (
                    <TrendingUpIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {card.trend}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Current Treatment */}
        {currentTreatment && (
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'grey.200',
                elevation: 0,
                p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  Current Treatment Plan
                </Typography>
                <Chip label="Active" color="success" size="small" />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                  {currentTreatment.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Started: {formatDate(currentTreatment.start_date)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ends: {formatDate(currentTreatment.end_date)}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                fullWidth
                sx={{ mt: 2 }}
              >
                Start Exercise
              </Button>
            </Paper>
          </Grid>
        )}

        {/* Upcoming Appointments */}
        <Grid item xs={12} md={currentTreatment ? 6 : 12}>
          <Paper
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'grey.200',
              elevation: 0,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Upcoming Appointments
              </Typography>
              <Button
                variant="text"
                size="small"
                endIcon={<ViewListIcon />}
                sx={{ color: '#3b82f6' }}
              >
                View All
              </Button>
            </Box>
            {upcomingAppointments.length > 0 ? (
              <List>
                {upcomingAppointments.map((appointment, index) => (
                  <React.Fragment key={appointment.appointment_id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#3b82f620', width: 40, height: 40 }}>
                          <PersonIcon sx={{ color: '#3b82f6' }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {appointment.therapist_name || 'Therapist'}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(appointment.date)} at {formatTime(appointment.time)}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={appointment.status}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < upcomingAppointments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">No upcoming appointments</Alert>
            )}
          </Paper>
        </Grid>

        {/* Recent Exercise Progress */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'grey.200',
              elevation: 0,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>
              Recent Exercise Progress
            </Typography>
            {recentExercises.length > 0 ? (
              <List>
                {recentExercises.map((exercise, index) => (
                  <React.Fragment key={exercise.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: exercise.status === 'completed' ? '#10b98120' : '#f59e0b20', 
                          width: 40, 
                          height: 40 
                        }}>
                          {exercise.status === 'completed' ? (
                            <CheckCircleIcon sx={{ color: '#10b981' }} />
                          ) : (
                            <TimerIcon sx={{ color: '#f59e0b' }} />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {exercise.name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {exercise.completed}/{exercise.target} reps • {exercise.date}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={exercise.status}
                                size="small"
                                color={exercise.status === 'completed' ? 'success' : 'warning'}
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentExercises.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">No recent exercises</Alert>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'grey.200',
              elevation: 0,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  startIcon={action.icon}
                  sx={{
                    justifyContent: 'flex-start',
                    p: 2,
                    textTransform: 'none',
                    borderColor: `${action.color}40`,
                    color: action.color,
                    '&:hover': {
                      borderColor: action.color,
                      backgroundColor: `${action.color}10`,
                    },
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatientDashboardPage;
