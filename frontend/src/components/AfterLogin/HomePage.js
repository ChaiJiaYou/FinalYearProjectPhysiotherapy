import React, { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, Avatar } from '@mui/material';
import { AccountCircle, FitnessCenter, Event, Assignment, Chat, Group } from '@mui/icons-material';

function HomePage() {
  const [selectedPage, setSelectedPage] = useState('Profile'); // Default page is "Profile"
  const [role, setRole] = useState(null); // Store the role of the logged-in user

  // Fetch role from localStorage or API
  useEffect(() => {
    const userRole = localStorage.getItem('role'); // Replace with API call if needed
    setRole(userRole);
  }, []);

  // Define menu items for each role
  const getMenuItems = (role) => {
    switch (role) {
      case 'admin':
        return [
          { text: 'Profile', icon: <AccountCircle /> },
          { text: 'User Management', icon: <Group /> },
          { text: 'Appointment', icon: <Event /> },
          { text: 'Chat', icon: <Chat /> },
        ];
      case 'therapist':
        return [
          { text: 'Profile', icon: <AccountCircle /> },
          { text: 'Exercise', icon: <FitnessCenter /> },
          { text: 'Treatment', icon: <Assignment /> },
          { text: 'Appointment', icon: <Event /> },
        ];
      case 'patient':
        return [
          { text: 'Profile', icon: <AccountCircle /> },
          { text: 'Exercise', icon: <FitnessCenter /> },
          { text: 'Appointment', icon: <Event /> },
          { text: 'Chat', icon: <Chat /> },
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

  // Right-side content based on the selected page
  const renderContent = () => {
    switch (selectedPage) {
      case 'Profile':
        return (
          <Box>
            <Typography variant="h4">Profile</Typography>
            <Typography variant="body1">This is the Profile page content.</Typography>
          </Box>
        );
      case 'Exercise':
        return (
          <Box>
            <Typography variant="h4">Exercise</Typography>
            <Typography variant="body1">This is the Exercise page content.</Typography>
          </Box>
        );
      case 'Treatment':
        return (
          <Box>
            <Typography variant="h4">Treatment</Typography>
            <Typography variant="body1">This is the Treatment page content.</Typography>
          </Box>
        );
      case 'Appointment':
        return (
          <Box>
            <Typography variant="h4">Appointment</Typography>
            <Typography variant="body1">This is the Appointment page content.</Typography>
          </Box>
        );
      case 'Chat':
        return (
          <Box>
            <Typography variant="h4">Chat</Typography>
            <Typography variant="body1">This is the Chat page content.</Typography>
          </Box>
        );
      case 'User Management':
        return (
          <Box>
            <Typography variant="h4">User Management</Typography>
            <Typography variant="body1">This is the User Management page content.</Typography>
          </Box>
        );
      default:
        return (
          <Box>
            <Typography variant="h4">Profile</Typography>
            <Typography variant="body1">This is the Profile page content.</Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' },
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" p={2}>
          <Avatar
            src="https://via.placeholder.com/150"
            alt="User Avatar"
            sx={{ width: 100, height: 100, mb: 2 }}
          />
          <Typography variant="h6">Chai Jia You</Typography>
          <Typography variant="body2" color="textSecondary">
            {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Loading...'}
          </Typography>
        </Box>
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              selected={selectedPage === item.text}
              onClick={() => handlePageChange(item.text)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {renderContent()}
      </Box>
    </Box>
  );
}

export default HomePage;
