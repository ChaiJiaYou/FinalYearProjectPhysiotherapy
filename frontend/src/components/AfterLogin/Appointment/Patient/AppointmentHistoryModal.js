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
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Event as EventIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

const AppointmentHistoryModal = ({ open, onClose, appointments }) => {
  const [historyAppointments, setHistoryAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    if (open) {
      // Filter past appointments
      const pastAppointments = appointments.filter((appointment) => {
        const appointmentDate = new Date(appointment.appointmentDateTime);
        return appointmentDate <= new Date() || appointment.status !== "Scheduled";
      });
      setHistoryAppointments(pastAppointments);
      setFilteredAppointments(pastAppointments);
    }
  }, [open, appointments]);

  useEffect(() => {
    let filtered = [...historyAppointments];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (appointment) =>
          appointment.therapist?.username?.toLowerCase().includes(searchLower) ||
          appointment.notes?.toLowerCase().includes(searchLower)
      );
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
        const appointmentDate = new Date(appointment.appointmentDateTime);
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

    setFilteredAppointments(filtered);
  }, [searchTerm, statusFilter, dateFilter, historyAppointments]);

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString("en-MY", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const InfoItem = ({ icon, label, value }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
      {React.cloneElement(icon, { sx: { color: "text.secondary" } })}
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight="500">
          {value || "N/A"}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: "60vh",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" fontWeight="bold">
          Appointment History
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by therapist name or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField
              select
              label="Date Range"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
            </TextField>
          </Box>
        </Stack>

        {filteredAppointments.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: "center",
              bgcolor: "grey.50",
              borderRadius: 2,
              border: "2px dashed",
              borderColor: "grey.300",
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No appointment history found
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredAppointments.map((appointment) => (
              <Grid item xs={12} key={appointment.appointmentId}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    bgcolor: "grey.50",
                    border: "1px solid",
                    borderColor: "grey.200",
                  }}
                >
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Appointment Information
                  </Typography>
                  <InfoItem
                    icon={<EventIcon />}
                    label="Date & Time"
                    value={formatDateTime(appointment.appointmentDateTime)}
                  />
                  <InfoItem
                    icon={<PersonIcon />}
                    label="Therapist"
                    value={appointment.therapist?.username}
                  />
                  <InfoItem
                    icon={<AccessTimeIcon />}
                    label="Status"
                    value={appointment.status}
                  />
                  {appointment.notes && (
                    <InfoItem
                      icon={<NotesIcon />}
                      label="Notes"
                      value={appointment.notes}
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentHistoryModal;
