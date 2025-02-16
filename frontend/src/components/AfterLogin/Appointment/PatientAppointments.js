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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [therapists, setTherapists] = useState([]);
  const [newAppointment, setNewAppointment] = useState({
    therapistId: "",
    appointmentDateTime: "",
  });

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/patient-appointments/")
      .then((response) => response.json())
      .then((data) => {
        setAppointments(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching appointments:", error);
        setLoading(false);
      });

    // Fetch available therapists
    fetch("http://127.0.0.1:8000/api/list-therapists/")
      .then((response) => response.json())
      .then((data) => setTherapists(data))
      .catch((error) => console.error("Error fetching therapists:", error));
  }, []);

  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setNewAppointment({ therapistId: "", appointmentDateTime: "" });
  };

  const handleCreateAppointment = async () => {
    if (!newAppointment.therapistId || !newAppointment.appointmentDateTime) {
      toast.error("Please fill all fields.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/create-appointment/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAppointment),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Appointment created successfully!");
        setAppointments((prev) => [...prev, data]);
        handleCloseCreateDialog();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <Box sx={{ p: 3, borderRadius: "8px" }}>
      <ToastContainer />
      <Button variant="contained" color="primary" onClick={handleOpenCreateDialog}>
        Create Appointment
      </Button>

      {/* Create Appointment Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog}>
        <DialogTitle>Create New Appointment</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Therapist</InputLabel>
            <Select name="therapistId" value={newAppointment.therapistId} onChange={(e) => setNewAppointment({ ...newAppointment, therapistId: e.target.value })}>
              {therapists.map((therapist) => (
                <MenuItem key={therapist.id} value={therapist.id}>
                  {therapist.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button onClick={handleCreateAppointment} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PatientAppointments;
