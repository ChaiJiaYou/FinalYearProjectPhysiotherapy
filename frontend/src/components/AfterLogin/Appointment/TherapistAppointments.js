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
  Skeleton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TherapistAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isEmergencyLeave, setIsEmergencyLeave] = useState(false);

  // Fetch appointments and availability from API
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/therapist-appointments/")
      .then((response) => response.json())
      .then((data) => {
        setAppointments(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching appointments:", error);
        setLoading(false);
      });

    fetch("http://127.0.0.1:8000/api/therapist-availability/")
      .then((response) => response.json())
      .then((data) => setAvailability(data))
      .catch((error) => console.error("Error fetching availability:", error));
  }, []);

  // Handle Tab Change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle Adding Availability Slot
  const handleSaveAvailability = async () => {
    const availabilityData = {
      date: selectedDate,
      startTime,
      endTime,
      notes: isEmergencyLeave ? "Emergency Leave" : "",
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/api/set-availability/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(availabilityData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Availability updated successfully!");
        setAvailability((prev) => [...prev, data]); // Update UI
        setOpenDialog(false);
      } else {
        toast.error(`Error: ${JSON.stringify(data.error)}`);
      }
    } catch (error) {
      console.error("Error updating availability:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Box sx={{ p: 3, borderRadius: "8px" }}>
      <ToastContainer />

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#333" }}>
          Therapist Appointments & Availability
        </Typography>
      </Box>

      {/* Tabs for Appointments & Availability */}
      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label="Appointments" />
        <Tab label="Manage Availability" />
      </Tabs>

      {/* 1️⃣ Appointments Table */}
      {tabValue === 0 && (
        <TableContainer component={Paper} sx={{ boxShadow: 1, mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#fafafa" }}>
                <TableCell sx={{ fontWeight: "600" }}>Appointment ID</TableCell>
                <TableCell sx={{ fontWeight: "600" }}>Patient</TableCell>
                <TableCell sx={{ fontWeight: "600" }}>Date & Time</TableCell>
                <TableCell sx={{ fontWeight: "600" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton variant="rectangular" width="100%" height={50} />
                  </TableCell>
                </TableRow>
              ) : appointments.length > 0 ? (
                appointments.map((appointment) => (
                  <TableRow key={appointment.appointmentId} hover>
                    <TableCell>{appointment.appointmentId}</TableCell>
                    <TableCell>{appointment.patient}</TableCell>
                    <TableCell>{appointment.appointmentDateTime}</TableCell>
                    <TableCell>{appointment.status}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No appointments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 2️⃣ Availability Management */}
      {tabValue === 1 && (
        <Box mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpenDialog(true)}
            sx={{ mb: 2 }}
          >
            Set Availability / Emergency Leave
          </Button>

          <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#fafafa" }}>
                  <TableCell sx={{ fontWeight: "600" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: "600" }}>Start Time</TableCell>
                  <TableCell sx={{ fontWeight: "600" }}>End Time</TableCell>
                  <TableCell sx={{ fontWeight: "600" }}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availability.map((slot) => (
                  <TableRow key={slot.id} hover>
                    <TableCell>{slot.date}</TableCell>
                    <TableCell>{slot.startTime}</TableCell>
                    <TableCell>{slot.endTime}</TableCell>
                    <TableCell>{slot.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Dialog for Adding Availability */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Set Availability</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Date" type="date" onChange={(e) => setSelectedDate(e.target.value)} />
          <TextField fullWidth label="Start Time" type="time" onChange={(e) => setStartTime(e.target.value)} />
          <TextField fullWidth label="End Time" type="time" onChange={(e) => setEndTime(e.target.value)} />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Emergency Leave</InputLabel>
            <Select value={isEmergencyLeave} onChange={(e) => setIsEmergencyLeave(e.target.value)}>
              <MenuItem value={false}>No</MenuItem>
              <MenuItem value={true}>Yes</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveAvailability} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TherapistAppointments;
