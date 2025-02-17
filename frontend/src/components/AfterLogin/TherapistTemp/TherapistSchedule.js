import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Box, Typography } from "@mui/material";

const TherapistSchedule = () => {
  const [events, setEvents] = useState([]);
  const therapistId = localStorage.getItem("userId"); // Assuming therapist logs in

  // Fetch therapist's weekly schedule
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/therapist-weekly-schedule/?therapistId=${therapistId}`)
      .then((response) => response.json())
      .then((data) => {
        // Convert backend response to FullCalendar event format
        const formattedEvents = data.map((appointment) => ({
          title: appointment.status === "Scheduled" ? "Booked" : "Available",
          start: appointment.appointmentDateTime,
          end: appointment.appointmentDateTime, // Assuming 1-hour appointments
          color: appointment.status === "Scheduled" ? "red" : "green",
        }));
        setEvents(formattedEvents);
      })
      .catch((error) => console.error("Error fetching schedule:", error));
  }, [therapistId]);

  return (
    <Box sx={{ p: 3, borderRadius: "8px" }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", color: "#333", mb: 3 }}>
        My Weekly Schedule
      </Typography>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        events={events}
        height="auto"
        slotMinTime="08:00:00"
        slotMaxTime="18:00:00"
        allDaySlot={false}
      />
    </Box>
  );
};

export default TherapistSchedule;
