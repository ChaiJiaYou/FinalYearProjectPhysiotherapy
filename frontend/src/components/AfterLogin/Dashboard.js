import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Paper } from '@mui/material';
import { 
  People, 
  CalendarToday, 
  MedicalServices, 
  Assessment,
  Person,
  AdminPanelSettings
} from '@mui/icons-material';

const Dashboard = () => {
  // Mock data - you can replace with real data from API
  const stats = [
    {
      title: 'Total Users',
      value: '156',
      icon: <People sx={{ fontSize: 40, color: '#3b82f6' }} />,
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      title: 'Active Users',
      value: '142',
      icon: <Person sx={{ fontSize: 40, color: '#2e7d32' }} />,
      color: '#2e7d32',
      bgColor: '#e8f5e8'
    },
    {
      title: 'Appointments Today',
      value: '23',
      icon: <CalendarToday sx={{ fontSize: 40, color: '#8b5cf6' }} />,
      color: '#8b5cf6',
      bgColor: '#f3e8ff'
    },
    {
      title: 'Active Treatments',
      value: '18',
      icon: <MedicalServices sx={{ fontSize: 40, color: '#ef4444' }} />,
      color: '#ef4444',
      bgColor: '#fee2e2'
    }
  ];

  const recentActivities = [
    { id: 1, action: 'New user registered', user: 'John Doe', time: '2 minutes ago', type: 'user' },
    { id: 2, action: 'Appointment scheduled', user: 'Jane Smith', time: '15 minutes ago', type: 'appointment' },
    { id: 3, action: 'Treatment completed', user: 'Mike Johnson', time: '1 hour ago', type: 'treatment' },
    { id: 4, action: 'User profile updated', user: 'Sarah Wilson', time: '2 hours ago', type: 'user' },
    { id: 5, action: 'New exercise added', user: 'Admin', time: '3 hours ago', type: 'exercise' }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user': return <People sx={{ fontSize: 20, color: '#3b82f6' }} />;
      case 'appointment': return <CalendarToday sx={{ fontSize: 20, color: '#8b5cf6' }} />;
      case 'treatment': return <MedicalServices sx={{ fontSize: 20, color: '#ef4444' }} />;
      case 'exercise': return <Assessment sx={{ fontSize: 20, color: '#2e7d32' }} />;
      default: return <AdminPanelSettings sx={{ fontSize: 20, color: '#6b7280' }} />;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to the Physiotherapy Management System
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
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
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: stat.color, mb: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 2,
                      backgroundColor: stat.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activities */}
      <Grid container spacing={3}>
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
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>
              Recent Activities
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentActivities.map((activity) => (
                <Box
                  key={activity.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    backgroundColor: 'grey.50',
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: 'grey.100',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid',
                      borderColor: 'grey.200',
                    }}
                  >
                    {getActivityIcon(activity.type)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {activity.action}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {activity.user} • {activity.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

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
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Create New User', icon: <People />, color: '#3b82f6' },
                { label: 'Schedule Appointment', icon: <CalendarToday />, color: '#8b5cf6' },
                { label: 'Add Treatment', icon: <MedicalServices />, color: '#ef4444' },
                { label: 'View Reports', icon: <Assessment />, color: '#2e7d32' },
              ].map((action, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    backgroundColor: 'grey.50',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'grey.100',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      backgroundColor: `${action.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {React.cloneElement(action.icon, { sx: { fontSize: 20, color: action.color } })}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {action.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

