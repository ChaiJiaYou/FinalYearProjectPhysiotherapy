import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Grid,
  Chip,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Autocomplete,
  Card,
  CardContent,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Helper function to get CSRF token
const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

const AdminTherapistAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  
  // 分页状态
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // 日期范围状态 - 默认过去一周
  const getDefaultDateRange = () => {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    return {
      startDate: oneWeekAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };
  
  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  // Fetch therapists
  const fetchTherapists = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/list-therapists/");
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setTherapists(data);
      } else {
        console.error("Expected array but got:", typeof data);
        setTherapists([]);
      }
    } catch (error) {
      console.error("Error fetching therapists:", error);
      setTherapists([]);
    }
  };

  // Fetch all appointments and therapists
  useEffect(() => {
    fetchTherapists();
    fetch("http://127.0.0.1:8000/api/list-appointments/")
      .then((response) => response.json())
      .then((data) => {
        // 确保data是数组
        if (Array.isArray(data)) {
          setAppointments(data);
        } else {
          console.error("API returned non-array data:", data);
          setAppointments([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching appointments:", error);
        setAppointments([]);
        setLoading(false);
      });
  }, []);

  const formatAppointmentDateTime = (dateTimeString) => {
    if (!dateTimeString) return "N/A";

    const dateObj = new Date(dateTimeString);
    return `${dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })} | ${dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  };

  // Handle view details
  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setViewDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setViewDetailsOpen(false);
    setSelectedAppointment(null);
  };

  // Handle status update
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      let endpoint;
      if (newStatus === 'Completed') {
        endpoint = `http://127.0.0.1:8000/api/appointments/${appointmentId}/admin-complete/`;
      } else if (newStatus === 'Cancelled') {
        endpoint = `http://127.0.0.1:8000/api/appointments/${appointmentId}/admin-reject/`;
      } else {
        endpoint = `http://127.0.0.1:8000/api/update-appointment-status/${appointmentId}/`;
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Appointment status updated!");
        setAppointments((prev) =>
          prev.map((appt) =>
            appt.appointmentId === appointmentId ? { ...appt, status: newStatus } : appt
          )
        );
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // 日期过滤按钮处理函数
  const handleTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateRange({
      startDate: today,
      endDate: today
    });
  };

  const handleResetFilter = () => {
    setDateRange(getDefaultDateRange());
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 分页处理函数
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filtered Appointments
  const filteredAppointments = Array.isArray(appointments) 
    ? appointments.filter((appt) => {
        // 状态过滤
        const statusMatch = statusFilter === "all" || appt.status === statusFilter;
        
        // 日期范围过滤
        const appointmentDate = new Date(appt.appointmentDateTime).toISOString().split('T')[0];
        const dateMatch = appointmentDate >= dateRange.startDate && appointmentDate <= dateRange.endDate;
        
        // 治疗师过滤
        const therapistMatch = !therapistFilter || appt.therapist.username === therapistFilter.username;
        
        return statusMatch && dateMatch && therapistMatch;
      })
    : [];

  // 分页后的数据
  const paginatedAppointments = filteredAppointments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        {/* 页面头部 - 遵循User Management设计系统 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              Appointments Management
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              disabled={loading}
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3,
                borderColor: '#3b82f6',
                color: '#3b82f6',
                '&:hover': {
                  borderColor: '#2563eb',
                  bgcolor: 'rgba(59, 130, 246, 0.04)',
                }
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* 搜索和过滤 - 遵循User Management设计系统 */}
        <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Search & Filter Appointments
              </Typography>
              <Button
                size="small"
                onClick={handleResetFilter}
                variant="outlined"
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  px: 3,
                  borderColor: '#3b82f6',
                  color: '#3b82f6',
                  '&:hover': {
                    borderColor: '#2563eb',
                    bgcolor: 'rgba(59, 130, 246, 0.04)',
                  }
                }}
              >
                Reset Filters
              </Button>
            </Box>
        <Grid container spacing={2} alignItems="center">
          {/* Date Range Filter */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ 
                color: "text.primary", 
                minWidth: 90,
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                Date Range:
              </Typography>
              <TextField
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  flex: 1,
                  minWidth: 160,
                  maxWidth: 180,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'grey.50',
                    '& fieldset': {
                      borderColor: 'grey.300'
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                      borderWidth: 2
                    }
                  },
                  '& input': {
                    fontSize: '0.9rem',
                    padding: '8.5px 14px'
                  }
                }}
              />
              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: '0.9rem', fontWeight: 500, mx: 0.5 }}>
                to
              </Typography>
              <TextField
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  flex: 1,
                  minWidth: 160,
                  maxWidth: 180,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'grey.50',
                    '& fieldset': {
                      borderColor: 'grey.300'
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                      borderWidth: 2
                    }
                  },
                  '& input': {
                    fontSize: '0.9rem',
                    padding: '8.5px 14px'
                  }
                }}
              />
            </Box>
          </Grid>

          {/* Filter Buttons */}
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="contained"
                onClick={handleTodayFilter}
                size="small"
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2,
                  py: 0.8,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: 'primary.main',
                  boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    boxShadow: '0 4px 8px rgba(25, 118, 210, 0.3)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Today
              </Button>
              <Button
                variant="outlined"
                onClick={handleResetFilter}
                size="small"
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2,
                  py: 0.8,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderColor: 'grey.400',
                  color: 'text.secondary',
                  backgroundColor: 'white',
                  '&:hover': {
                    borderColor: 'grey.600',
                    backgroundColor: 'grey.50',
                    color: 'text.primary'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Reset
              </Button>
            </Box>
          </Grid>

          {/* Status Filter */}
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ 
                color: "text.primary", 
                minWidth: 60,
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                Status:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ 
                    borderRadius: 2,
                    backgroundColor: 'grey.50',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'grey.300'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                      borderWidth: 2
                    }
                  }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Scheduled">Scheduled</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>

          {/* Therapist Filter */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ 
                color: "text.primary", 
                minWidth: 80,
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                Therapist:
              </Typography>
              <Autocomplete
                size="small"
                options={therapists}
                getOptionLabel={(option) => option.username || ''}
                value={therapistFilter}
                onChange={(event, newValue) => {
                  setTherapistFilter(newValue);
                }}
                isOptionEqualToValue={(option, value) => option.username === value?.username}
                sx={{ flex: 1, minWidth: 200 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search therapist..."
                    sx={{
                      width: '100%',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'grey.50',
                        '& fieldset': {
                          borderColor: 'grey.300'
                        },
                        '&:hover fieldset': {
                          borderColor: 'primary.main'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'primary.main',
                          borderWidth: 2
                        }
                      }
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: '#8b5cf6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: 'white'
                        }}
                      >
                        {option.username ? option.username.charAt(0).toUpperCase() : 'T'}
                      </Box>
                      {option.username}
                    </Box>
                  </Box>
                )}
                clearOnEscape
                selectOnFocus
                handleHomeEndKeys
              />
            </Box>
          </Grid>

        </Grid>
          </CardContent>
        </Card>

        {/* Appointments Table - 遵循User Management设计系统 */}
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
          <TableContainer sx={{ overflowX: 'hidden', width: '100%' }}>
        <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow sx={{ 
              backgroundColor: 'grey.50',
              '& .MuiTableCell-root': {
                borderBottom: '2px solid',
                borderColor: 'grey.300'
              }
            }}>
              <TableCell sx={{ 
                fontWeight: 700, 
                fontSize: "0.9rem", 
                py: 2, 
                color: 'text.primary',
                width: '10%' 
              }}>Date</TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                fontSize: "0.9rem", 
                py: 2, 
                color: 'text.primary',
                width: '10%' 
              }}>Time</TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                fontSize: "0.9rem", 
                py: 2, 
                color: 'text.primary',
                width: '15%' 
              }}>Patient</TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                fontSize: "0.9rem", 
                py: 2, 
                color: 'text.primary',
                width: '15%' 
              }}>Therapist</TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                fontSize: "0.9rem", 
                py: 2, 
                color: 'text.primary',
                width: '8%' 
              }}>Duration</TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                fontSize: "0.9rem", 
                py: 2, 
                color: 'text.primary',
                width: '8%' 
              }}>Mode</TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                fontSize: "0.9rem", 
                py: 2, 
                color: 'text.primary',
                width: '10%' 
              }}>Status</TableCell>
              <TableCell sx={{ 
                fontWeight: 700, 
                fontSize: "0.9rem", 
                py: 2, 
                color: 'text.primary',
                width: '24%' 
              }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>Loading...</TableCell>
              </TableRow>
            ) : paginatedAppointments.length > 0 ? (
              paginatedAppointments.map((appointment) => {
                const appointmentDate = new Date(appointment.appointmentDateTime);
                const dateStr = appointmentDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                const timeStr = appointmentDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });
                
                return (
                  <TableRow 
                    key={appointment.appointmentId} 
                    hover
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: 'primary.50',
                        transform: 'scale(1.001)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      },
                      '&:nth-of-type(even)': { backgroundColor: 'grey.25' },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    <TableCell sx={{ 
                      py: 1.5, 
                      fontSize: "0.9rem", 
                      width: '10%',
                      fontWeight: 500,
                      color: 'text.primary'
                    }}>{dateStr}</TableCell>
                    <TableCell sx={{ 
                      py: 1.5, 
                      fontSize: "0.9rem", 
                      width: '10%',
                      fontWeight: 500,
                      color: 'text.primary'
                    }}>{timeStr}</TableCell>
                    <TableCell sx={{ 
                      py: 1.5, 
                      fontSize: "0.9rem", 
                      width: '15%',
                      fontWeight: 500,
                      color: 'text.primary'
                    }}>
                      {appointment.patient.username || 'New Patient'}
                    </TableCell>
                    <TableCell sx={{ 
                      py: 1.5, 
                      fontSize: "0.9rem", 
                      width: '15%',
                      fontWeight: 500,
                      color: 'text.primary'
                    }}>
                      {appointment.therapist?.username || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ 
                      py: 1.5, 
                      fontSize: "0.9rem", 
                      width: '8%',
                      fontWeight: 500,
                      color: 'text.primary'
                    }}>60 min</TableCell>
                    <TableCell sx={{ py: 1.5, width: '8%' }}>
                      <Chip 
                        label="onsite" 
                        size="small" 
                        sx={{ 
                          backgroundColor: 'grey.100',
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          height: 20,
                          fontWeight: 600,
                          borderRadius: 2
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5, width: '10%' }}>
                      <Chip 
                        label={appointment.status} 
                        size="small"
                        sx={{
                          backgroundColor: appointment.status === 'Pending' ? 'warning.50' : 
                                          appointment.status === 'Scheduled' ? 'primary.50' :
                                          appointment.status === 'Completed' ? 'success.50' : 'error.50',
                          color: appointment.status === 'Pending' ? 'warning.main' :
                                 appointment.status === 'Scheduled' ? 'primary.main' :
                                 appointment.status === 'Completed' ? 'success.main' : 'error.main',
                          fontSize: '0.7rem',
                          height: 20,
                          fontWeight: 600,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: appointment.status === 'Pending' ? 'warning.200' : 
                                      appointment.status === 'Scheduled' ? 'primary.200' :
                                      appointment.status === 'Completed' ? 'success.200' : 'error.200'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5, width: '24%' }}>
                      <Box sx={{ display: 'flex', gap: 0.3, alignItems: 'center', flexWrap: 'nowrap' }}>
                        {/* View Details button - always visible */}
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(appointment)}
                          sx={{ 
                            color: 'primary.main',
                            backgroundColor: 'primary.50',
                            border: '1px solid',
                            borderColor: 'primary.200',
                            minWidth: 28,
                            height: 28,
                            '&:hover': {
                              backgroundColor: 'primary.100',
                              transform: 'scale(1.05)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          <VisibilityIcon sx={{ fontSize: '0.8rem' }} />
                        </IconButton>
                        
                        {/* Complete button - always visible but disabled for non-Scheduled */}
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleUpdateStatus(appointment.appointmentId, "Completed")}
                          disabled={appointment.status !== "Scheduled"}
                          sx={{ 
                            minWidth: 'auto',
                            px: 0.8,
                            py: 0.3,
                            fontSize: '0.65rem',
                            textTransform: 'none',
                            borderRadius: 1.5,
                            borderColor: appointment.status === "Scheduled" ? 'success.main' : 'grey.300',
                            color: appointment.status === "Scheduled" ? 'success.main' : 'grey.500',
                            backgroundColor: appointment.status === "Scheduled" ? 'success.50' : 'grey.50',
                            '&:hover': appointment.status === "Scheduled" ? {
                              backgroundColor: 'success.100',
                              borderColor: 'success.main',
                              transform: 'scale(1.02)'
                            } : {},
                            '&:disabled': {
                              borderColor: 'grey.300',
                              color: 'grey.500',
                              backgroundColor: 'grey.50'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          Complete
                        </Button>
                        
                        {/* Cancel/Reject button - always visible but disabled for Completed/Cancelled */}
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleUpdateStatus(appointment.appointmentId, "Cancelled")}
                          disabled={appointment.status === "Completed" || appointment.status === "Cancelled"}
                          sx={{ 
                            minWidth: 'auto',
                            px: 0.8,
                            py: 0.3,
                            fontSize: '0.65rem',
                            textTransform: 'none',
                            borderRadius: 1.5,
                            borderColor: (appointment.status === "Completed" || appointment.status === "Cancelled") ? 'grey.300' : 'error.main',
                            color: (appointment.status === "Completed" || appointment.status === "Cancelled") ? 'grey.500' : 'error.main',
                            backgroundColor: (appointment.status === "Completed" || appointment.status === "Cancelled") ? 'grey.50' : 'error.50',
                            '&:hover': (appointment.status !== "Completed" && appointment.status !== "Cancelled") ? {
                              backgroundColor: 'error.100',
                              borderColor: 'error.main',
                              transform: 'scale(1.02)'
                            } : {},
                            '&:disabled': {
                              borderColor: 'grey.300',
                              color: 'grey.500',
                              backgroundColor: 'grey.50'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          {appointment.status === "Pending" ? "Reject" : "Cancel"}
                        </Button>
                      </Box>
                    </TableCell>
                </TableRow>
              );
            })
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No appointments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
          </TableContainer>
        </Card>
        
        {/* 分页组件 - 遵循User Management设计系统 */}
        <Card sx={{ 
          mt: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'grey.200',
          elevation: 0
        }}>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredAppointments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
          sx={{
            backgroundColor: 'grey.50',
            borderTop: '1px solid',
            borderColor: 'grey.200',
            '& .MuiTablePagination-toolbar': {
              paddingLeft: 3,
              paddingRight: 3,
              paddingTop: 2,
              paddingBottom: 2,
            },
            '& .MuiTablePagination-selectLabel': {
              marginBottom: 0,
              fontSize: '0.9rem',
              fontWeight: 500,
              color: 'text.secondary'
            },
            '& .MuiTablePagination-displayedRows': {
              marginBottom: 0,
              fontSize: '0.9rem',
              fontWeight: 500,
              color: 'text.primary'
            },
            '& .MuiTablePagination-select': {
              fontSize: '0.9rem',
              fontWeight: 500,
              backgroundColor: 'white',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.300',
              '&:hover': {
                borderColor: 'primary.main'
              }
            },
            '& .MuiIconButton-root': {
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.50'
              },
              '&:disabled': {
                color: 'grey.400'
              }
            }
          }}
        />
        </Card>

        {/* View Details Dialog */}
        <Dialog 
          open={viewDetailsOpen} 
          onClose={handleCloseDetails}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Appointment Details
          </Typography>
          <IconButton onClick={handleCloseDetails} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedAppointment && (
            <Box>
              {/* Basic Information */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                      Appointment ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedAppointment.appointmentId}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                      Status
                    </Typography>
                    <Chip 
                      label={selectedAppointment.status} 
                      size="small"
                      sx={{
                        backgroundColor: selectedAppointment.status === 'Pending' ? '#fff3e0' : 
                                        selectedAppointment.status === 'Scheduled' ? '#e3f2fd' :
                                        selectedAppointment.status === 'Completed' ? '#e8f5e8' : '#ffebee',
                        color: selectedAppointment.status === 'Pending' ? '#f57c00' :
                               selectedAppointment.status === 'Scheduled' ? '#1976d2' :
                               selectedAppointment.status === 'Completed' ? '#2e7d32' : '#d32f2f',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                      Date & Time
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatAppointmentDateTime(selectedAppointment.appointmentDateTime)}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                      Duration
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      60 minutes
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                      Patient
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#e3f2fd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#1976d2'
                        }}
                      >
                        {selectedAppointment.patient.username ? selectedAppointment.patient.username.charAt(0).toUpperCase() : 'P'}
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedAppointment.patient.username || 'New Patient'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                      Therapist
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedAppointment.therapist.username}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                      Mode
                    </Typography>
                    <Chip 
                      label="onsite" 
                      size="small" 
                      sx={{ 
                        backgroundColor: '#f5f5f5',
                        color: '#666',
                        fontWeight: 600
                      }} 
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Additional Information */}
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Additional Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                      Patient Message
                    </Typography>
                    <Paper sx={{ 
                      p: 2, 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: 1,
                      minHeight: 60,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                        {selectedAppointment.patient_message || 'No message from patient'}
                      </Typography>
                    </Paper>
                  </Box>
                </Grid>
                
                {selectedAppointment.status === 'Cancelled' && selectedAppointment.cancel_reason && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                        Cancellation Reason
                      </Typography>
                      <Paper sx={{ 
                        p: 2, 
                        backgroundColor: '#ffebee', 
                        borderRadius: 1,
                        minHeight: 60,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 500 }}>
                          {selectedAppointment.cancel_reason}
                        </Typography>
                      </Paper>
                    </Box>
                  </Grid>
                )}
                
                {selectedAppointment.session_notes && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
                        Session Notes
                      </Typography>
                      <Paper sx={{ 
                        p: 2, 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: 1,
                        minHeight: 60,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {selectedAppointment.session_notes}
                        </Typography>
                      </Paper>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Button 
            onClick={handleCloseDetails} 
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AdminTherapistAppointments;