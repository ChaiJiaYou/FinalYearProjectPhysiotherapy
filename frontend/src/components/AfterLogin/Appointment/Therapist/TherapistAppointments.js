import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Error as ErrorIcon,
  Today as TodayIcon,
  Add as AddIcon,
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CreateAppointmentDialog from "./CreateAppointmentDialog";
import AppointmentCalendarModal from "./AppointmentCalendarModal";
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const TherapistAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // 初始化为当前日期，不进行时区调整
    const now = new Date();
    // 只保留年月日，去掉时间部分
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const therapistId = localStorage.getItem("id");
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    if (!therapistId) {
      setError("Therapist ID not found. Please login again.");
      setLoading(false);
      return;
    }
    fetchAppointments();
  }, [therapistId, selectedDate]);

  const fetchAppointments = async () => {
    try {
      // 确保使用本地时区的日期
      const dateStr = selectedDate.toLocaleDateString('en-CA'); // 使用 en-CA 格式获取 YYYY-MM-DD 格式
      const response = await fetch(
        `http://127.0.0.1:8000/api/therapist-today-appointments/?therapist_id=${therapistId}&date=${dateStr}`
      );
      const data = await response.json();
      setAppointments(data);
      setLoading(false);
    } catch (error) {
      setError("Failed to fetch appointments");
      setLoading(false);
    }
  };


  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/update-appointment-status/${appointmentId}/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            status: newStatus,
            sessionNotes: selectedAppointment.sessionNotes 
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Appointment ${newStatus.toLowerCase()} successfully`);
        setAppointments((prev) =>
          prev.map((appt) =>
            appt.appointmentId === appointmentId
              ? { ...appt, status: newStatus, sessionNotes: selectedAppointment.sessionNotes }
              : appt
          )
        );
        if (selectedAppointment?.appointmentId === appointmentId) {
          setSelectedAppointment((prev) => ({ 
            ...prev, 
            status: newStatus,
            sessionNotes: selectedAppointment.sessionNotes
          }));
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update appointment status");
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("An error occurred while updating the status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Scheduled":
        return "primary";
      case "Completed":
        return "success";
      case "Cancelled":
        return "error";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" icon={<ErrorIcon />}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ height: "100vh", py: isSmallScreen ? 1 : 3 }}>
      <Box
        display="flex"
        flexDirection={isSmallScreen ? "column" : "row"}
        gap={isSmallScreen ? 1 : 3}
        height="100%"
      >
        {/* Left Panel - Fixed Header and Scrollable Cards */}
        <Box
          flexBasis={isSmallScreen ? "auto" : "40%"}
          maxWidth={isSmallScreen ? "100%" : 550}
          width="100%"
          minWidth={isSmallScreen ? "0" : 350}
          height={isSmallScreen ? "auto" : "100%"}
          display="flex"
          flexDirection="column"
          sx={{
            borderRadius: 1,
            backgroundColor: "background.paper",
            boxShadow: 1,
            mb: isSmallScreen ? 2 : 0,
          }}
        >
          {/* Fixed Header */}
          <Box
            p={isSmallScreen ? 2 : 3}
            bgcolor="background.paper"
            sx={{
              borderBottom: "1px solid",
              borderColor: "grey.200",
              flexWrap: "wrap",
              display: "flex",
              flexDirection: isSmallScreen ? "column" : "row",
              gap: isSmallScreen ? 1 : 2,
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems={isSmallScreen ? "flex-start" : "center"}
              flexDirection={isSmallScreen ? "column" : "row"}
              mb={isSmallScreen ? 1 : 2}
              gap={isSmallScreen ? 1 : 0}
              width="100%"
            >
              <Typography variant={isSmallScreen ? "h5" : "h4"} fontWeight="bold">
                Appointment
              </Typography>
              <Box
                display="flex"
                gap={1}
                flexWrap="wrap"
                sx={{
                  mt: isSmallScreen ? 1 : 0,
                  justifyContent: "flex-end",
                  width: isSmallScreen ? "100%" : "auto",
                }}
              >
                <Button
                  variant="outlined"
                  size={isSmallScreen ? "small" : "medium"}
                  startIcon={<CalendarMonthIcon />}
                  onClick={() => setShowCalendarModal(true)}
                  sx={{ minWidth: 100 }}
                >
                  Calendar
                </Button>
                <Button
                  variant="contained"
                  size={isSmallScreen ? "small" : "medium"}
                  startIcon={<AddIcon />}
                  onClick={() => setShowCreateDialog(true)}
                  sx={{ minWidth: 100 }}
                >
                  New
                </Button>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Select Date"
                  value={selectedDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setSelectedDate(newValue);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size={isSmallScreen ? "small" : "medium"}
                      sx={{ width: isSmallScreen ? 140 : 200 }}
                    />
                  )}
                />
              </LocalizationProvider>
              <Typography variant="subtitle2" color="text.secondary">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </Box>
          </Box>

          {/* Scrollable Cards Section */}
          <Box
            flex={1}
            overflow={isSmallScreen ? "visible" : "auto"}
            px={isSmallScreen ? 1 : 3}
            pb={isSmallScreen ? 1 : 3}
            sx={{
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "background.paper",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "grey.300",
                borderRadius: "4px",
              },
            }}
          >
            <Stack spacing={isSmallScreen ? 1 : 2}>
              {appointments.length === 0 ? (
                <Paper
                  sx={{
                    p: 4,
                    textAlign: "center",
                    backgroundColor: "grey.50",
                    border: "2px dashed grey.300",
                  }}
                >
                  <TodayIcon
                    sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
                  />
                  <Typography variant="h6" color="text.secondary">
                    No appointments scheduled for today
                  </Typography>
                </Paper>
              ) : (
                appointments.map((appointment) => (
                  <Card
                    key={appointment.appointmentId}
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        boxShadow: 6,
                        transform: "translateY(-2px)",
                        transition: "all 0.2s",
                      },
                      bgcolor:
                        selectedAppointment?.appointmentId ===
                        appointment.appointmentId
                          ? "action.selected"
                          : "background.paper",
                    }}
                    onClick={() => setSelectedAppointment(appointment)}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon color="action" />
                          <Typography variant="h6">
                            {appointment.patient?.username || "No patient name"}
                          </Typography>
                        </Box>
                        <Chip
                          label={appointment.status}
                          color={getStatusColor(appointment.status)}
                          size="small"
                        />
                      </Box>

                      <Stack spacing={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {new Date(
                              appointment.appointmentDateTime
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Typography>
                        </Box>

                        {appointment.notes && (
                          <Box display="flex" alignItems="start" gap={1}>
                            <NotesIcon fontSize="small" color="action" />
                            <Typography variant="body2" noWrap>
                              {appointment.notes}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              )}
            </Stack>
          </Box>
        </Box>

        {/* Right Panel - Appointment Details & Upcoming Appointments */}
        <Box
          flex={1}
          width="100%"
          bgcolor="grey.50"
          borderRadius={1}
          p={isSmallScreen ? 2 : 4}
          sx={{
            boxShadow: 1,
            overflowY: isSmallScreen ? "visible" : "auto",
            minHeight: isSmallScreen ? "300px" : "auto",
          }}
        >
          {selectedAppointment ? (
            <Stack spacing={3}>
              <Typography variant="h5" fontWeight="bold">
                Appointment Details
              </Typography>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Patient Information
                </Typography>
                <Typography>
                  Name: {selectedAppointment.patient?.username || "N/A"}
                </Typography>
                <Typography>
                  Gender: {selectedAppointment.patient?.gender || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Appointment Information
                </Typography>
                <Typography>
                  Time:{" "}
                  {new Date(
                    selectedAppointment.appointmentDateTime
                  ).toLocaleTimeString()}
                </Typography>
                <Typography>Status: {selectedAppointment.status}</Typography>
                <Typography sx={{ mt: 1 }}>
                  <strong>Appointment Notes:</strong>{" "}
                  {selectedAppointment.notes || "-"}
                </Typography>
              </Box>

              {selectedAppointment.status === "Scheduled" ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Session Notes"
                      variant="outlined"
                      value={selectedAppointment.sessionNotes || ""}
                      onChange={(e) => {
                        setSelectedAppointment({
                          ...selectedAppointment,
                          sessionNotes: e.target.value
                        });
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => updateAppointmentStatus(selectedAppointment.appointmentId, "Completed")}
                      >
                        Complete
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => updateAppointmentStatus(selectedAppointment.appointmentId, "Cancelled")}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ) : selectedAppointment.status === "Completed" ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Session Notes
                  </Typography>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      minHeight: '100px'
                    }}
                  >
                    <Typography>
                      {selectedAppointment.sessionNotes || "No session notes recorded."}
                    </Typography>
                  </Paper>
                </Box>
              ) : selectedAppointment.status === "Cancelled" ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Notes
                  </Typography>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      minHeight: '100px'
                    }}
                  >
                    <Typography>
                      {selectedAppointment.sessionNotes || "No cancellation note recorded."}
                    </Typography>
                  </Paper>
                </Box>
              ) : null}

              <Box>
                <Typography variant="h6" gutterBottom>
                  Latest Medical History
                </Typography>
                {selectedAppointment.latest_medical_history ? (
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>Date:</strong>{" "}
                      {selectedAppointment.latest_medical_history.session_date}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Description:</strong>{" "}
                      {selectedAppointment.latest_medical_history.description}
                    </Typography>
                    {selectedAppointment.latest_medical_history
                      .objective_findings && (
                      <Typography variant="body2">
                        <strong>Findings:</strong>{" "}
                        {
                          selectedAppointment.latest_medical_history
                            .objective_findings
                        }
                      </Typography>
                    )}
                    {selectedAppointment.latest_medical_history.treatment && (
                      <Typography variant="body2">
                        <strong>Treatment:</strong>{" "}
                        {selectedAppointment.latest_medical_history.treatment}
                      </Typography>
                    )}
                    {selectedAppointment.latest_medical_history.remarks && (
                      <Typography variant="body2">
                        <strong>Remarks:</strong>{" "}
                        {selectedAppointment.latest_medical_history.remarks}
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No medical history found.
                  </Typography>
                )}
              </Box>
            </Stack>
          ) : (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="40%"
            >
              <TodayIcon
                sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                Select an appointment to view details
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <CreateAppointmentDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={fetchAppointments}
      />
      
      <AppointmentCalendarModal
        open={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        therapistId={therapistId}
      />
    </Container>
  );
};

export default TherapistAppointments;
