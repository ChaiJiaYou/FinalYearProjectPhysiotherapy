import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, Stack, Alert, Button } from "@mui/material";
import UpcomingAppointments from "./UpcomingAppointments";
import AppointmentHistoryModal from "./AppointmentHistoryModal.js";
import AppointmentDetailsModal from "./AppointmentDetailsModal.js";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchAppointments = async () => {
    try {
      const userId = localStorage.getItem("id");
      if (!userId) {
        setError("User ID not found. Please login again.");
        toast.error("User ID not found. Please login again.");
        navigate("/login");
        return;
      }

      const res = await fetch(
        `http://127.0.0.1:8000/api/patient-appointments/?patient_id=${userId}`
      );
      
      if (!res.ok) {
        throw new Error("Failed to fetch appointments");
      }
      
      const data = await res.json();
      setAllAppointments(data);
      
      // Filter future appointments
      const futureAppointments = data.filter(appointment => {
        const appointmentDate = new Date(appointment.appointmentDateTime);
        return appointmentDate > new Date() && appointment.status === "Scheduled";
      });
      setAppointments(futureAppointments);
      setError(null);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setError("Failed to load appointments. Please try again.");
      toast.error("Failed to load appointments. Please try again.");
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
  };

  return (
    <Box sx={{ p: 3, height: "calc(100vh - 48px)", bgcolor: "#f8fafc" }}>
      <Paper elevation={1} sx={{ p: 3, height: "100%", bgcolor: "white" }}>
        <Stack spacing={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              My Appointments
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => setShowHistory(true)}
              sx={{ minWidth: 120 }}
            >
              View History
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <UpcomingAppointments
              appointments={appointments}
              onViewDetails={handleViewDetails}
            />
          </Box>
        </Stack>
      </Paper>

      <AppointmentHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        appointments={allAppointments}
      />

      <AppointmentDetailsModal
        open={showDetails}
        appointment={selectedAppointment}
        onClose={() => {
          setShowDetails(false);
          setSelectedAppointment(null);
        }}
      />
    </Box>
  );
};

export default PatientAppointments;
