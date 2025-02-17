import React, { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, Avatar} from '@mui/material';
import {
  AccountCircle,
  Dashboard,
  FitnessCenter,
  Event,
  Assignment,
  Group,
  HistoryEdu,
  Assessment,
  Logout,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
// Page Import Section
import UserAccountManagementHome from './UserAccountManagement/UserAccountManagementHome';
import TherapistAppointments from './Appointment/TherapistAppointments';
import PatientAppointments from './Appointment/PatientAppointments';
import TherapistSchedule from './TherapistTemp/TherapistSchedule';


function HomePage() {
  const [selectedPage, setSelectedPage] = useState('User Management'); // Default page is "Profile"
  const [role, setRole] = useState(null); // Store the role of the logged-in user
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();

  // Fetch role from localStorage or API
  useEffect(() => {
    const userName = localStorage.getItem('username');
    const userRole = localStorage.getItem('role');
    setUsername(userName);
    setRole(userRole);
  }, []);

  // Define menu items for each role
const getMenuItems = (role) => {
  switch (role) {
    case 'admin':
      return [
        { text: 'Dashboard', icon: <Dashboard/>},
        { text: 'Profile', icon: <AccountCircle /> },
        { text: 'User Management', icon: <Group /> },
        { text: 'Appointment Overview', icon: <Event /> },
        { text: 'Reports & Analytics', icon: <Assignment /> },
        { text: 'Patient Information', icon: <HistoryEdu /> },
      ];
    case 'patient':
      return [
        { text: 'Dashboard', icon: <Dashboard/>},
        { text: 'Profile', icon: <AccountCircle /> },
        { text: 'Exercise', icon: <FitnessCenter /> },
        { text: 'Appointment', icon: <Event /> },
      ];
    case 'therapist':
      return [
        { text: 'Dashboard', icon: <Dashboard/>},
        { text: 'Time Table', icon: <Event/>},
        { text: 'Profile', icon: <AccountCircle /> },
        { text: 'Exercise Monitoring', icon: <FitnessCenter /> },
        { text: 'Treatment', icon: <Assignment /> },
        { text: 'Appointment', icon: <Event /> },
        { text: 'Patient Information', icon: <HistoryEdu /> },
        { text: 'Patient Reports', icon: <Assessment /> },
      ];
    default:
      return [];
  }
};

  // Get menu items based on the role
  const menuItems = getMenuItems(role);

  // Sidebar navigation
  const handlePageChange = (page) => {
    setSelectedPage(page);
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Right-side content based on the selected page
  const renderContent = () => {
    switch (selectedPage) {
      case 'Appointment': {    
        return (
            <>
                {role === "therapist" && (
                    <TherapistAppointments/>
                )}
                {role === "patient" && (
                    <PatientAppointments/>
                )}
                {role === "admin" && (
                    <Typography variant="h4">Admin Appointment Overview</Typography>
                )}
            </>
        );
    }
      case 'Appointment Overview':
        return <Typography variant="h4">This is Appointment Overview Page</Typography>;
      case 'Exercise':
        return <Typography variant="h4">This is exercise Page</Typography>      
      case 'Exercise Monitoring':
        return <Typography variant="h4">This is the Exercise Monitoring page content.</Typography>;
      case 'Patient Information':
        return <Typography variant="h4">Patient Information</Typography>
      case 'Patient Reports':
        return <Typography variant="h4">This is the Reports page content.</Typography>;
      case 'Profile':
        return <Typography variant="h4">This is the Profile page content.</Typography>;
      case 'Reports & Analytics':
        return <Typography variant="h4">This is Report Page</Typography>
      case 'Treatment':
        return <Typography variant="h4">This is the Treatment page content.</Typography>;
      case 'User Management':
        return <UserAccountManagementHome/>;
      case 'Time Table':
        return <TherapistSchedule/>
      default:
        return <Typography variant="h4">Welcome to the dashboard!</Typography>;
    }
  };


  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
        }}
      >
        <Box>
          <Box display="flex" flexDirection="column" alignItems="center" p={2}>
            <Avatar
              src="https://via.placeholder.com/150"
              alt="User Avatar"
              sx={{ width: 100, height: 100, mb: 2 }}
            />
            <Typography variant="h6">{username || 'Error'}</Typography>
            <Typography variant="body2" color="textSecondary">
              {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Error'}
            </Typography>
          </Box>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                selected={selectedPage === item.text}
                onClick={() => handlePageChange(item.text)}
                sx={{ 
                  cursor: 'default',
                  backgroundColor: selectedPage === item.text ? '#e0e0e0' : 'inherit', // Change background color if selected
                  '&:hover': {
                    backgroundColor: selectedPage === item.text ? '#e0e0e0' : '#f5f5f5' //hover effect
                  }
                 }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
        <Box>
          <ListItem button onClick={handleLogout}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {renderContent()}
      </Box>
    </Box>
  );
}

export default HomePage;
