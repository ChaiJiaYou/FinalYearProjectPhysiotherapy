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
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Close as CloseIcon,
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
    <Box sx={{ p: 3, borderRadius: "8px" }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", color: "#333", mb: 3 }}>
        All Appointments
      </Typography>

      {/* Filters Section */}
      <Paper sx={{ 
        p: 2, 
        mb: 3, 
        borderRadius: 2, 
        boxShadow: 2,
        backgroundColor: '#f5f5f5',
        border: '1px solid #e0e0e0'
      }}>
        <Grid container spacing={2} alignItems="center">
          {/* Date Range Filter */}
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ 
                color: "#333", 
                minWidth: 70,
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                Date Range:
              </Typography>
              <TextField
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                size="small"
                sx={{ 
                  minWidth: 130,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: 'white',
                    '& fieldset': {
                      borderColor: '#d0d0d0'
                    },
                    '&:hover fieldset': {
                      borderColor: '#1976d2'
                    }
                  }
                }}
              />
              <Typography variant="body2" sx={{ color: "#666", fontSize: '0.875rem' }}>
                to
              </Typography>
              <TextField
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                size="small"
                sx={{ 
                  minWidth: 130,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: 'white',
                    '& fieldset': {
                      borderColor: '#d0d0d0'
                    },
                    '&:hover fieldset': {
                      borderColor: '#1976d2'
                    }
                  }
                }}
              />
            </Box>
          </Grid>

          {/* Filter Buttons */}
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleTodayFilter}
                size="small"
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: '#1976d2',
                  boxShadow: 1,
                  '&:hover': {
                    backgroundColor: '#1565c0',
                    boxShadow: 2
                  }
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
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderColor: '#757575',
                  color: '#757575',
                  backgroundColor: 'white',
                  '&:hover': {
                    borderColor: '#616161',
                    backgroundColor: '#f5f5f5',
                    color: '#424242'
                  }
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
                color: "#333", 
                minWidth: 50,
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                Status:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <Select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ 
                    borderRadius: 1,
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#d0d0d0'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2'
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
                color: "#333", 
                minWidth: 70,
                fontWeight: 600,
                fontSize: '0.875rem'
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
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search therapist..."
                    sx={{
                      minWidth: 150,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        backgroundColor: 'white',
                        '& fieldset': {
                          borderColor: '#d0d0d0'
                        },
                        '&:hover fieldset': {
                          borderColor: '#1976d2'
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

          {/* Results Summary */}
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Chip 
                label={`${filteredAppointments.length} found`}
                sx={{ 
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 28,
                  borderRadius: 1,
                  border: '1px solid #bbdefb'
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Appointments Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "700", fontSize: "0.875rem", py: 1, borderBottom: "2px solid #e0e0e0", width: '120px' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: "700", fontSize: "0.875rem", py: 1, borderBottom: "2px solid #e0e0e0", width: '120px' }}>Time</TableCell>
              <TableCell sx={{ fontWeight: "700", fontSize: "0.875rem", py: 1, borderBottom: "2px solid #e0e0e0", width: '180px' }}>Patient</TableCell>
              <TableCell sx={{ fontWeight: "700", fontSize: "0.875rem", py: 1, borderBottom: "2px solid #e0e0e0", width: '100px' }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: "700", fontSize: "0.875rem", py: 1, borderBottom: "2px solid #e0e0e0", width: '100px' }}>Mode</TableCell>
              <TableCell sx={{ fontWeight: "700", fontSize: "0.875rem", py: 1, borderBottom: "2px solid #e0e0e0", width: '120px' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: "700", fontSize: "0.875rem", py: 1, borderBottom: "2px solid #e0e0e0", width: '200px' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>Loading...</TableCell>
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
                      '&:hover': { backgroundColor: '#f8f9fa' },
                      '&:nth-of-type(even)': { backgroundColor: '#fafafa' }
                    }}
                  >
                    <TableCell sx={{ py: 0.5, fontSize: "0.875rem", width: '120px' }}>{dateStr}</TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: "0.875rem", width: '120px' }}>{timeStr}</TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: "0.875rem", width: '180px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: '#e3f2fd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: '#1976d2'
                          }}
                        >
                          {appointment.patient.username ? appointment.patient.username.charAt(0).toUpperCase() : 'P'}
                        </Box>
                        {appointment.patient.username || 'New Patient'}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 0.5, fontSize: "0.875rem", width: '100px' }}>60 min</TableCell>
                    <TableCell sx={{ py: 0.5, width: '100px' }}>
                      <Chip 
                        label="onsite" 
                        size="small" 
                        sx={{ 
                          backgroundColor: '#f5f5f5',
                          color: '#666',
                          fontSize: '0.7rem',
                          height: 20
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.5, width: '120px' }}>
                      <Chip 
                        label={appointment.status} 
                        size="small"
                        sx={{
                          backgroundColor: appointment.status === 'Pending' ? '#fff3e0' : 
                                          appointment.status === 'Scheduled' ? '#e3f2fd' :
                                          appointment.status === 'Completed' ? '#e8f5e8' : '#ffebee',
                          color: appointment.status === 'Pending' ? '#f57c00' :
                                 appointment.status === 'Scheduled' ? '#1976d2' :
                                 appointment.status === 'Completed' ? '#2e7d32' : '#d32f2f',
                          fontSize: '0.7rem',
                          height: 20,
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.5, width: '200px' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        {/* View Details button - always visible */}
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(appointment)}
                          sx={{ 
                            color: '#1976d2',
                            '&:hover': {
                              backgroundColor: '#e3f2fd'
                            }
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
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
                            fontSize: '0.7rem',
                            textTransform: 'none',
                            borderColor: appointment.status === "Scheduled" ? '#4caf50' : '#d0d0d0',
                            color: appointment.status === "Scheduled" ? '#4caf50' : '#d0d0d0',
                            '&:hover': appointment.status === "Scheduled" ? {
                              backgroundColor: '#e8f5e8',
                              borderColor: '#4caf50'
                            } : {},
                            '&:disabled': {
                              borderColor: '#d0d0d0',
                              color: '#d0d0d0'
                            }
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
                            fontSize: '0.7rem',
                            textTransform: 'none',
                            borderColor: (appointment.status === "Completed" || appointment.status === "Cancelled") ? '#d0d0d0' : '#f44336',
                            color: (appointment.status === "Completed" || appointment.status === "Cancelled") ? '#d0d0d0' : '#f44336',
                            '&:hover': (appointment.status !== "Completed" && appointment.status !== "Cancelled") ? {
                              backgroundColor: '#ffebee',
                              borderColor: '#f44336'
                            } : {},
                            '&:disabled': {
                              borderColor: '#d0d0d0',
                              color: '#d0d0d0'
                            }
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
                <TableCell colSpan={6} align="center">
                  No appointments found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* 分页组件 */}
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
          borderTop: '1px solid #e0e0e0',
          '& .MuiTablePagination-toolbar': {
            paddingLeft: 2,
            paddingRight: 2,
          },
          '& .MuiTablePagination-selectLabel': {
            marginBottom: 0,
          },
          '& .MuiTablePagination-displayedRows': {
            marginBottom: 0,
          }
        }}
      />

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
  );
};

export default AdminTherapistAppointments;