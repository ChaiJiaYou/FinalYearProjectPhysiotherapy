import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Grid,
  Paper,
  Alert,
  TextField,
  MenuItem,
  Stack,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Collapse,
  Tooltip,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Event as EventIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarToday as CalendarTodayIcon,
  Schedule as ScheduleIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from "@mui/icons-material";

const AppointmentHistoryModal = ({ open, onClose, appointments }) => {
  const [historyAppointments, setHistoryAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" or "desc"

  useEffect(() => {
    if (open) {
      // Filter past appointments
      const pastAppointments = appointments.filter((appointment) => {
        const appointmentDate = new Date(appointment.start_at);
        return appointmentDate <= new Date() || appointment.status !== "Scheduled";
      });
      setHistoryAppointments(pastAppointments);
      setFilteredAppointments(pastAppointments);
    }
  }, [open, appointments]);

  useEffect(() => {
    let filtered = [...historyAppointments];

    // Apply comprehensive search filter - search all fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((appointment) => {
        // Search in therapist name
        const therapistName = appointment.therapist?.username?.toLowerCase() || "";
        // Search in notes
        const notes = appointment.notes?.toLowerCase() || "";
        // Search in patient message
        const patientMessage = appointment.patient_message?.toLowerCase() || "";
        // Search in session notes
        const sessionNotes = appointment.session_notes?.toLowerCase() || "";
        // Search in cancel reason
        const cancelReason = appointment.cancel_reason?.toLowerCase() || "";
        // Search in appointment code
        const appointmentCode = appointment.appointment_code?.toLowerCase() || "";
        // Search in status
        const status = appointment.status?.toLowerCase() || "";
        // Search in mode
        const mode = appointment.mode?.toLowerCase() || "";
        // Search in date (formatted)
        const dateStr = formatDate(appointment.start_at).toLowerCase();
        // Search in time (formatted)
        const timeStr = formatTime(appointment.start_at).toLowerCase();
        // Search in full datetime (formatted)
        const dateTimeStr = formatDateTime(appointment.start_at).toLowerCase();
        // Search in duration
        const duration = `${appointment.duration_min || 60} min`.toLowerCase();

        return (
          therapistName.includes(searchLower) ||
          notes.includes(searchLower) ||
          patientMessage.includes(searchLower) ||
          sessionNotes.includes(searchLower) ||
          cancelReason.includes(searchLower) ||
          appointmentCode.includes(searchLower) ||
          status.includes(searchLower) ||
          mode.includes(searchLower) ||
          dateStr.includes(searchLower) ||
          timeStr.includes(searchLower) ||
          dateTimeStr.includes(searchLower) ||
          duration.includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (appointment) => appointment.status === statusFilter
      );
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      filtered = filtered.filter((appointment) => {
        const appointmentDate = new Date(appointment.start_at);
        switch (dateFilter) {
          case "today":
            return appointmentDate >= today;
          case "week":
            return appointmentDate >= lastWeek;
          case "month":
            return appointmentDate >= lastMonth;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case "date":
          aValue = new Date(a.start_at).getTime();
          bValue = new Date(b.start_at).getTime();
          break;
        case "therapist":
          aValue = (a.therapist?.username || "").toLowerCase();
          bValue = (b.therapist?.username || "").toLowerCase();
          break;
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        case "duration":
          aValue = a.duration_min || 60;
          bValue = b.duration_min || 60;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });

    setFilteredAppointments(filtered);
  }, [searchTerm, statusFilter, dateFilter, historyAppointments, sortField, sortDirection]);

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString("en-MY", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return { color: "success", icon: <CheckCircleIcon /> };
      case "Cancelled":
        return { color: "error", icon: <CancelIcon /> };
        return { color: "warning", icon: <ScheduleIcon /> };
      default:
        return { color: "default", icon: <EventIcon /> };
    }
  };

  const toggleExpand = (appointmentId) => {
    setExpandedAppointment(expandedAppointment === appointmentId ? null : appointmentId);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortableHeader = ({ field, children }) => {
    const isActive = sortField === field;
    return (
      <TableCell
        sx={{
          fontWeight: 600,
          cursor: "pointer",
          userSelect: "none",
          "&:hover": { bgcolor: "action.hover" },
        }}
        onClick={() => handleSort(field)}
      >
        <Box display="flex" alignItems="center" gap={0.5}>
          {children}
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
            ) : (
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
            )
          ) : (
            <Box sx={{ width: 16 }} /> // Placeholder to maintain alignment
          )}
        </Box>
      </TableCell>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: "divider" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">
            Appointment History
          </Typography>
          <Chip 
            label={`${filteredAppointments.length} appointment${filteredAppointments.length !== 1 ? 's' : ''}`}
            color="primary"
            variant="outlined"
          />
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3, pt: 2 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by date, time, status, therapist name, notes, appointment code, etc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: "background.paper", flex: 1 }}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150, bgcolor: "background.paper" }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Date Range"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              sx={{ minWidth: 150, bgcolor: "background.paper" }}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
            </TextField>
          </Box>
        </Box>

        {filteredAppointments.length === 0 ? (
          <Box
            sx={{
              p: 6,
              textAlign: "center",
              bgcolor: "grey.50",
              borderRadius: 2,
              border: "2px dashed",
              borderColor: "grey.300",
            }}
          >
            <EventIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No appointment history found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your filters or search terms
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <SortableHeader field="date">Date & Time</SortableHeader>
                  <SortableHeader field="therapist">Therapist</SortableHeader>
                  <SortableHeader field="status">Status</SortableHeader>
                  <SortableHeader field="duration">Duration</SortableHeader>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAppointments.map((appointment) => {
                  const statusInfo = getStatusColor(appointment.status);
                  const isExpanded = expandedAppointment === appointment.id;
                  
                  return (
                    <React.Fragment key={appointment.id}>
                      <TableRow
                        hover
                        sx={{
                          "&:hover": { bgcolor: "action.hover" },
                          cursor: "pointer",
                        }}
                        onClick={() => toggleExpand(appointment.id)}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {formatDate(appointment.start_at)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTime(appointment.start_at)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar
                              sx={{ width: 32, height: 32, bgcolor: "primary.main" }}
                            >
                              {appointment.therapist?.username?.charAt(0)?.toUpperCase() || "T"}
                            </Avatar>
                            <Typography variant="body2">
                              {appointment.therapist?.username || "N/A"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={statusInfo.icon}
                            label={appointment.status}
                            color={statusInfo.color}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {appointment.duration_min || 60} min
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small">
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: "grey.50", borderTop: 1, borderColor: "divider" }}>
                              <Grid container spacing={2}>
                                {appointment.notes && (
                                  <Grid item xs={12}>
                                    <Box display="flex" gap={1} alignItems="flex-start">
                                      <NotesIcon sx={{ color: "text.secondary", mt: 0.5 }} />
                                      <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          Notes
                                        </Typography>
                                        <Typography variant="body2">
                                          {appointment.notes}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Grid>
                                )}
                                {appointment.patient_message && (
                                  <Grid item xs={12}>
                                    <Box display="flex" gap={1} alignItems="flex-start">
                                      <NotesIcon sx={{ color: "text.secondary", mt: 0.5 }} />
                                      <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          Your Message
                                        </Typography>
                                        <Typography variant="body2">
                                          {appointment.patient_message}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Grid>
                                )}
                                {appointment.session_notes && (
                                  <Grid item xs={12}>
                                    <Box display="flex" gap={1} alignItems="flex-start">
                                      <NotesIcon sx={{ color: "success.main", mt: 0.5 }} />
                                      <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          Session Notes
                                        </Typography>
                                        <Typography variant="body2">
                                          {appointment.session_notes}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Grid>
                                )}
                                {appointment.cancel_reason && (
                                  <Grid item xs={12}>
                                    <Box display="flex" gap={1} alignItems="flex-start">
                                      <CancelIcon sx={{ color: "error.main", mt: 0.5 }} />
                                      <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          Cancellation Reason
                                        </Typography>
                                        <Typography variant="body2" color="error.main">
                                          {appointment.cancel_reason}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Grid>
                                )}
                                <Grid item xs={12} sm={6}>
                                  <Box display="flex" gap={1} alignItems="center">
                                    <CalendarTodayIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                    <Box>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Appointment Code
                                      </Typography>
                                      <Typography variant="body2" fontWeight={500}>
                                        {appointment.appointment_code}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Box display="flex" gap={1} alignItems="center">
                                    <AccessTimeIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                    <Box>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Mode
                                      </Typography>
                                      <Typography variant="body2" fontWeight={500}>
                                        {appointment.mode || "onsite"}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} variant="contained" size="large">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentHistoryModal;
