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
} from "@mui/material";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdminTherapistAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch all appointments
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/list-appointments/")
      .then((response) => response.json())
      .then((data) => {
        setAppointments(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching appointments:", error);
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

  // Handle status update
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/update-appointment-status/${appointmentId}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

  // Filtered Appointments
  const filteredAppointments = appointments.filter(
    (appt) => statusFilter === "all" || appt.status === statusFilter
  );

  return (
    <Box sx={{ p: 3, borderRadius: "8px" }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", color: "#333", mb: 3 }}>
        All Appointments
      </Typography>

      {/* Status Filter */}
      <FormControl sx={{ minWidth: 200, mb: 2 }}>
        <InputLabel>Status Filter</InputLabel>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="Scheduled">Scheduled</MenuItem>
          <MenuItem value="Cancelled">Cancelled</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
        </Select>
      </FormControl>

      {/* Appointments Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#fafafa" }}>
              <TableCell sx={{ fontWeight: "600" }}>Appointment ID</TableCell>
              <TableCell sx={{ fontWeight: "600" }}>Patient</TableCell>
              <TableCell sx={{ fontWeight: "600" }}>Therapist</TableCell>
              <TableCell sx={{ fontWeight: "600" }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: "600" }}>Status</TableCell>
              <TableCell sx={{ fontWeight: "600" }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment) => (
                <TableRow key={appointment.appointmentId} hover>
                  <TableCell>{appointment.appointmentId}</TableCell>
                  <TableCell>{appointment.patient.username}</TableCell>
                  <TableCell>{appointment.therapist.username}</TableCell>
                  <TableCell>{formatAppointmentDateTime(appointment.appointmentDateTime)}</TableCell>
                  <TableCell>{appointment.status}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleUpdateStatus(appointment.appointmentId, "Completed")}
                      disabled={appointment.status !== "Scheduled"}
                      sx={{ mr: 1 }}
                    >
                      Complete
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => handleUpdateStatus(appointment.appointmentId, "Cancelled")}
                      disabled={appointment.status !== "Scheduled"}
                    >
                      Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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
    </Box>
  );
};

export default AdminTherapistAppointments;