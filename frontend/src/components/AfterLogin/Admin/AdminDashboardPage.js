import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  LinearProgress,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  MedicalServices as MedicalServicesIcon,
  CalendarToday as CalendarTodayIcon,
  Assignment as AssignmentIcon,
  SmartToy as SmartToyIcon,
  PersonAdd as PersonAddIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchTodayAppointments();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch users, actions, and exercises data
      const [usersResponse, actionsResponse, exercisesResponse] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/list-users/'),
        fetch('http://127.0.0.1:8000/api/actions/'),
        fetch('http://127.0.0.1:8000/api/exercises/')
      ]);
      
      if (!usersResponse.ok || !actionsResponse.ok || !exercisesResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const users = await usersResponse.json();
      const actions = await actionsResponse.json();
      const exercises = await exercisesResponse.json();

      // Process data for stats
      const totalUsers = users.length;
      const activeUsers = users.filter(user => user.status === 'active').length;
      const totalPatients = users.filter(user => user.role === 'patient').length;
      const totalTherapists = users.filter(user => user.role === 'therapist').length;
      const totalAdmins = users.filter(user => user.role === 'admin').length;
      
      // Process actions and exercises data
      const totalActions = actions.actions ? actions.actions.length : 0;
      const deployedActions = exercises.filter(exercise => exercise.action_id).length; // exercises with linked actions
      const pendingActions = exercises.filter(exercise => !exercise.action_id).length; // exercises without linked actions
      
      
      setStats({
        totalUsers,
        activeUsers,
        totalPatients,
        totalTherapists,
        totalAdmins,
        deployedActions,
        pendingActions,
        totalActions
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAppointments = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/appointments/');
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      
      const appointments = await response.json();
      
      // Filter today's appointments
      const today = new Date().toISOString().split('T')[0];
      const todayAppts = appointments.filter(apt => {
        const aptDate = apt.date.split('T')[0];
        return aptDate === today;
      });
      
      // Sort by time
      todayAppts.sort((a, b) => {
        const timeA = a.start_time || '00:00';
        const timeB = b.start_time || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      setTodayAppointments(todayAppts);
    } catch (error) {
      console.error('Error fetching today appointments:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const kpiCards = [
    {
      title: 'Total Patients',
      value: stats.totalPatients || 0,
      icon: <PersonIcon sx={{ fontSize: 32 }} />,
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      title: 'Total Therapists',
      value: stats.totalTherapists || 0,
      icon: <MedicalServicesIcon sx={{ fontSize: 32 }} />,
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      title: 'Pending Actions',
      value: stats.pendingActions || 0,
      subtitle: 'Need Training',
      icon: <SmartToyIcon sx={{ fontSize: 32 }} />,
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    {
      title: 'Completed Treatments',
      value: '0',
      subtitle: 'Today',
      icon: <AssignmentIcon sx={{ fontSize: 32 }} />,
      color: '#8b5cf6',
      bgColor: '#f3e8ff'
    }
  ];

  const quickActions = [
    { label: 'Create New User', icon: <PersonAddIcon />, color: '#3b82f6', route: '/users' },
    { label: 'Manage Appointments', icon: <CalendarTodayIcon />, color: '#8b5cf6', route: '/admin-appointments' },
    { label: 'View All Treatments', icon: <AssignmentIcon />, color: '#ef4444', route: '/admin-treatment' }
  ];

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
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          System overview and management center
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
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: 2,
                    backgroundColor: card.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                  }}
                >
                  {React.cloneElement(card.icon, { sx: { fontSize: 32, color: card.color } })}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: card.color, mb: 0.5 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                  {card.title}
                </Typography>
                {card.subtitle && (
                  <Typography variant="caption" color="text.secondary">
                    {card.subtitle}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Today's Appointments */}
        <Grid item xs={12} md={8}>
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
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Today's Appointments
              </Typography>
              <Chip 
                label={`${todayAppointments.length} Total`} 
                sx={{ 
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontWeight: 600
                }} 
              />
            </Box>
            
            {todayAppointments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CalendarTodayIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No appointments scheduled for today
                </Typography>
              </Box>
            ) : (
              <List sx={{ maxHeight: '500px', overflow: 'auto' }}>
                {todayAppointments.map((appointment, index) => (
                  <React.Fragment key={appointment.appointment_id}>
                    <ListItem 
                      sx={{ 
                        px: 2,
                        py: 2,
                        '&:hover': {
                          backgroundColor: 'grey.50',
                          borderRadius: 2
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Avatar sx={{ bgcolor: '#3b82f620', width: 48, height: 48 }}>
                          <AccessTimeIcon sx={{ color: '#3b82f6' }} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {appointment.patient_name || 'Patient'} • {appointment.therapist_name || 'Therapist'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {appointment.start_time} - {appointment.end_time}
                          </Typography>
                          {appointment.reason && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {appointment.reason}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={getStatusLabel(appointment.status)}
                          size="small"
                          sx={{
                            backgroundColor: `${getStatusColor(appointment.status)}20`,
                            color: getStatusColor(appointment.status),
                            fontWeight: 600,
                            borderRadius: 2
                          }}
                        />
                      </Box>
                    </ListItem>
                    {index < todayAppointments.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'grey.200',
              elevation: 0,
              p: 3,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  startIcon={React.cloneElement(action.icon, { sx: { fontSize: 24 } })}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    p: 2.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderWidth: 2,
                    borderColor: `${action.color}40`,
                    color: action.color,
                    '&:hover': {
                      borderWidth: 2,
                      borderColor: action.color,
                      backgroundColor: `${action.color}10`,
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    },
                    transition: 'all 0.3s ease',
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

export default AdminDashboardPage;
