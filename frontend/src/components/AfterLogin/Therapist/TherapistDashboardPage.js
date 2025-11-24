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
  Alert
} from '@mui/material';
import {
  CalendarToday as CalendarTodayIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  MedicalServices as MedicalServicesIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';

const TherapistDashboardPage = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [activeTreatments, setActiveTreatments] = useState([]);
  const therapistId = localStorage.getItem('id');

  useEffect(() => {
    if (therapistId) {
      fetchDashboardData();
    }
  }, [therapistId]);

  const fetchDashboardData = async () => {
    try {
      // Fetch therapist-specific data
      const [appointmentsResponse, treatmentsResponse] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/therapist-today-appointments/?therapist_id=${therapistId}`),
        fetch(`http://127.0.0.1:8000/api/therapist-treatments/${therapistId}/`)
      ]);

      const appointments = await appointmentsResponse.json();
      const treatments = await treatmentsResponse.json();

      // Process data for stats
      const todayAppointments = appointments.length;
      const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
      const pendingAppointments = appointments.filter(apt => apt.status === 'scheduled').length;
      const activeTreatments = treatments.filter(treatment => treatment.status === 'active').length;
      const totalPatients = new Set(appointments.map(apt => apt.patient_id)).size;

      setStats({
        todayAppointments,
        completedAppointments,
        pendingAppointments,
        activeTreatments,
        totalPatients
      });

      // Set upcoming appointments (next 3)
      setUpcomingAppointments(appointments.slice(0, 3));

      // Set active treatments (first 3)
      setActiveTreatments(treatments.filter(t => t.status === 'active').slice(0, 3));

    } catch (error) {
      console.error('Error fetching therapist dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      title: 'Today\'s Appointments',
      value: stats.todayAppointments || 0,
      icon: <CalendarTodayIcon sx={{ fontSize: 40 }} />,
      color: '#3b82f6',
      bgColor: '#dbeafe',
      trend: `${stats.completedAppointments || 0}/${stats.todayAppointments || 0} completed`,
      trendUp: true
    },
    {
      title: 'Active Patients',
      value: stats.totalPatients || 0,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      bgColor: '#e8f5e8',
      trend: 'Under your care',
      trendUp: true
    },
    {
      title: 'Active Treatments',
      value: stats.activeTreatments || 0,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: '#8b5cf6',
      bgColor: '#f3e8ff',
      trend: 'Treatment plans ongoing',
      trendUp: true
    },
    {
      title: 'Pending Tasks',
      value: stats.pendingAppointments || 0,
      icon: <ScheduleIcon sx={{ fontSize: 40 }} />,
      color: '#ef4444',
      bgColor: '#fee2e2',
      trend: 'Awaiting completion',
      trendUp: false
    }
  ];

  const quickActions = [
    { label: 'View Schedule', icon: <CalendarTodayIcon />, color: '#3b82f6', route: '/therapist-appointments' },
    { label: 'Create Treatment', icon: <AddIcon />, color: '#2e7d32', route: '/create-treatment-plan' },
    { label: 'Patient List', icon: <PeopleIcon />, color: '#8b5cf6', route: '/patients' },
    { label: 'Treatment Center', icon: <AssignmentIcon />, color: '#ef4444', route: '/treatment' },
    { label: 'Availability', icon: <AccessTimeIcon />, color: '#f59e0b', route: '/schedule' },
    { label: 'Reports', icon: <AssessmentIcon />, color: '#6b7280', route: '/therapist-reports' }
  ];

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
          Therapist Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your daily schedule and patient management
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
        {/* Upcoming Appointments */}
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
                            {appointment.patient_name || 'Patient'}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(appointment.time)} • {appointment.type || 'Consultation'}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={appointment.status}
                                size="small"
                                color={appointment.status === 'completed' ? 'success' : 'primary'}
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
              <Alert severity="info">No upcoming appointments today</Alert>
            )}
          </Paper>
        </Grid>

        {/* Active Treatments */}
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
                Active Treatments
              </Typography>
              <Button
                variant="text"
                size="small"
                endIcon={<ViewListIcon />}
                sx={{ color: '#ef4444' }}
              >
                View All
              </Button>
            </Box>
            {activeTreatments.length > 0 ? (
              <List>
                {activeTreatments.map((treatment, index) => (
                  <React.Fragment key={treatment.treatment_id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#ef444420', width: 40, height: 40 }}>
                          <AssignmentIcon sx={{ color: '#ef4444' }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {treatment.name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Patient: {treatment.patient_name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Started: {new Date(treatment.start_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < activeTreatments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">No active treatments</Alert>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
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
            <Grid container spacing={2}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} sm={6} md={2} key={index}>
                  <Button
                    variant="outlined"
                    startIcon={action.icon}
                    fullWidth
                    sx={{
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
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TherapistDashboardPage;
