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
  CircularProgress,
} from "@mui/material";

const PatientBookAppointment = ({ therapistId }) => {
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch available slots when date is selected
  useEffect(() => {
    if (!selectedDate) return;

    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/available-slots/${therapistId}/${selectedDate}`)
      .then((response) => response.json())
      .then((data) => {
        setAvailableSlots(data.available_slots);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching available slots:", error);
        setLoading(false);
      });
  }, [selectedDate]);

  return (
    <Box sx={{ p: 3, borderRadius: "8px" }}>
      {/* Header */}
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
        Book Appointment
      </Typography>

      {/* Date Selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Date</InputLabel>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </FormControl>

      {/* Available Slots Table */}
      {loading ? (
        <CircularProgress />
      ) : availableSlots.length > 0 ? (
        <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#fafafa" }}>
                <TableCell sx={{ fontWeight: "600" }}>Start Time</TableCell>
                <TableCell sx={{ fontWeight: "600" }}>End Time</TableCell>
                <TableCell sx={{ fontWeight: "600" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableSlots.map((slot, index) => (
                <TableRow key={index} hover>
                  <TableCell>{slot.start}</TableCell>
                  <TableCell>{slot.end}</TableCell>
                  <TableCell>
                    <Button variant="contained" color="primary">
                      Book Slot
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>No available slots for this date.</Typography>
      )}
    </Box>
  );
};

export default PatientBookAppointment;
