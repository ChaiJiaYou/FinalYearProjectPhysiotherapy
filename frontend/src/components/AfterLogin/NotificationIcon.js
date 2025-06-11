import React, { useState, useEffect } from 'react';
import {
  Badge, IconButton, Popover, List, ListItem, ListItemText, Typography, Box,
  Divider, Button, Stack, Tooltip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import api from '../../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';

const NotificationIcon = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications/');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleMarkAsRead = async (id) => {
    await api.patch(`/notifications/${id}/mark-read/`);
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await api.patch('/notifications/all/mark-read/');
    fetchNotifications();
  };

  // Group notifications
  const unread = notifications.filter(n => !n.is_read);
  const read = notifications.filter(n => n.is_read);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={handleClick}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { width: 400, maxHeight: 500, p: 0, borderRadius: 2, boxShadow: 6 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <Typography variant="h6">Notification Center</Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={handleMarkAllAsRead}
              startIcon={<MarkEmailReadIcon />}
              sx={{ ml: 2, fontWeight: 600 }}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <MarkEmailUnreadIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body1">No notifications</Typography>
            </Box>
          ) : (
            <>
              {unread.length > 0 && (
                <>
                  <Typography sx={{ px: 2, pt: 2, fontWeight: 700, color: 'primary.main' }}>Unread</Typography>
                  <List dense>
                    {unread.map(n => (
                      <ListItem
                        key={n.id}
                        sx={{
                          bgcolor: 'rgba(255, 0, 0, 0.05)',
                          borderLeft: '4px solid #d32f2f',
                          mb: 1,
                          borderRadius: 1,
                          flexDirection: 'column',
                          alignItems: 'flex-start'
                        }}
                      >
                        <ListItemText
                          primary={<Typography fontWeight={600}>{n.title}</Typography>}
                          secondary={
                            <Stack spacing={0.5}>
                              <Typography variant="body2">{n.message}</Typography>
                              <Typography variant="caption" color="text.secondary">{new Date(n.created_at).toLocaleString()}</Typography>
                            </Stack>
                          }
                        />
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                          <Button
                            size="small"
                            color="primary"
                            onClick={() => handleMarkAsRead(n.id)}
                            startIcon={<MarkEmailReadIcon />}
                          >
                            Mark as read
                          </Button>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
              {read.length > 0 && (
                <>
                  <Typography sx={{ px: 2, pt: 2, fontWeight: 700, color: 'text.secondary' }}>Read</Typography>
                  <List dense>
                    {read.map(n => (
                      <ListItem key={n.id} sx={{ opacity: 0.7 }}>
                        <ListItemText
                          primary={<Typography fontWeight={500}>{n.title}</Typography>}
                          secondary={
                            <Stack spacing={0.5}>
                              <Typography variant="body2">{n.message}</Typography>
                              <Typography variant="caption" color="text.secondary">{new Date(n.created_at).toLocaleString()}</Typography>
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationIcon;