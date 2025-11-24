import React, { useState, useEffect } from 'react';
import {
  Badge, IconButton, Popover, Typography, Box,
  Divider, Button, Stack, Tooltip, Card, CardContent, Chip, Avatar
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import EventIcon from '@mui/icons-material/Event';
import InfoIcon from '@mui/icons-material/Info';
import MessageIcon from '@mui/icons-material/Message';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
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

  // Helper function to get notification icon and color
  const getNotificationStyle = (notification) => {
    const { notification_type, title } = notification;
    
    // Check for specific appointment actions based on title
    if (title.includes('Completed')) {
      return { 
        icon: <CheckCircleIcon />, 
        color: 'success.main',
        bgColor: 'success.light',
        lightBg: 'rgba(46, 125, 50, 0.08)'
      };
    } else if (title.includes('Cancelled') || title.includes('Rejected')) {
      return { 
        icon: <CancelIcon />, 
        color: 'error.main',
        bgColor: 'error.light',
        lightBg: 'rgba(211, 47, 47, 0.08)'
      };
    } else if (notification_type === 'appointment') {
      return { 
        icon: <EventIcon />, 
        color: 'primary.main',
        bgColor: 'primary.light',
        lightBg: 'rgba(25, 118, 210, 0.08)'
      };
    } else if (notification_type === 'message') {
      return { 
        icon: <MessageIcon />, 
        color: 'info.main',
        bgColor: 'info.light',
        lightBg: 'rgba(2, 136, 209, 0.08)'
      };
    } else {
      return { 
        icon: <InfoIcon />, 
        color: 'warning.main',
        bgColor: 'warning.light',
        lightBg: 'rgba(237, 108, 2, 0.08)'
      };
    }
  };

  // Helper function to format relative time
  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
          sx: { 
            width: 420, 
            maxHeight: 600, 
            p: 0, 
            borderRadius: 3, 
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 2.5, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon sx={{ fontSize: 24 }} />
            <Typography variant="h6" fontWeight={700}>Notifications</Typography>
          </Box>
          {unreadCount > 0 && (
            <Chip 
              label={`${unreadCount} new`} 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.25)', 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem'
              }} 
            />
          )}
        </Box>

        {/* Mark All Button */}
        {unreadCount > 0 && (
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              startIcon={<MarkEmailReadIcon />}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              Mark all as read
            </Button>
          </Box>
        )}

        {/* Notifications List */}
        <Box sx={{ maxHeight: 480, overflowY: 'auto', p: 1.5 }}>
          {notifications.length === 0 ? (
            <Box sx={{ 
              py: 8, 
              textAlign: 'center', 
              color: 'text.secondary' 
            }}>
              <NotificationsNoneIcon sx={{ 
                fontSize: 64, 
                mb: 2, 
                opacity: 0.3,
                color: 'primary.main'
              }} />
              <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ mb: 0.5 }}>
                No Notifications
              </Typography>
              <Typography variant="body2">
                You're all caught up!
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {/* Unread Notifications */}
              {unread.length > 0 && (
                <>
                  <Typography 
                    variant="caption" 
                    fontWeight={700} 
                    color="text.secondary" 
                    sx={{ px: 1, pt: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Unread
                  </Typography>
                  {unread.map((notification) => {
                    const style = getNotificationStyle(notification);
                    return (
                      <Card
                        key={notification.id}
                        elevation={0}
                        sx={{
                          bgcolor: style.lightBg,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="flex-start">
                            <Avatar sx={{ 
                              bgcolor: style.color, 
                              width: 40, 
                              height: 40,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                              {style.icon}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="subtitle2" 
                                fontWeight={700} 
                                sx={{ mb: 0.5, color: 'text.primary' }}
                              >
                                {notification.title}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ 
                                  mb: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {notification.message}
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                  {getRelativeTime(notification.created_at)}
                                </Typography>
                                <Button
                                  size="small"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  sx={{ 
                                    minWidth: 'auto',
                                    px: 1.5,
                                    py: 0.5,
                                    textTransform: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                  }}
                                >
                                  Mark read
                                </Button>
                              </Box>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}

              {/* Read Notifications */}
              {read.length > 0 && (
                <>
                  {unread.length > 0 && <Divider sx={{ my: 1 }} />}
                  <Typography 
                    variant="caption" 
                    fontWeight={700} 
                    color="text.secondary" 
                    sx={{ px: 1, pt: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Earlier
                  </Typography>
                  {read.slice(0, 5).map((notification) => {
                    const style = getNotificationStyle(notification);
                    return (
                      <Card
                        key={notification.id}
                        elevation={0}
                        sx={{
                          bgcolor: 'grey.50',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          opacity: 0.75,
                          transition: 'opacity 0.2s ease',
                          '&:hover': {
                            opacity: 1
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="flex-start">
                            <Avatar sx={{ 
                              bgcolor: 'grey.300', 
                              width: 36, 
                              height: 36,
                              color: 'grey.600'
                            }}>
                              {style.icon}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="subtitle2" 
                                fontWeight={600} 
                                sx={{ mb: 0.5, color: 'text.secondary' }}
                              >
                                {notification.title}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ 
                                  mb: 0.5,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  fontSize: '0.8125rem'
                                }}
                              >
                                {notification.message}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                {getRelativeTime(notification.created_at)}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </Stack>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationIcon;