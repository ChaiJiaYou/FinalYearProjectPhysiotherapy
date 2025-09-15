import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const TherapistSchedule = () => {
  const [appointments, setAppointments] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const therapistId = localStorage.getItem("userId");

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/therapist-all-appointments/?therapist_id=${therapistId}`
      );
      const data = await res.json();

      const events = data.map((appt) => ({
        id: appt.appointmentId,
        title: `${appt.patient?.username} - ${appt.status}`,
        start: new Date(appt.appointmentDateTime),
        end: new Date(
          new Date(appt.appointmentDateTime).getTime() + 30 * 60000
        ),
        extendedProps: appt,
      }));

      setAppointments(events);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    }
  }, [therapistId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return (
    <Box
      sx={{
        height: "calc(100vh - 48px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h4" fontWeight="bold" gutterBottom px={2} pt={2}>
        Therapist Schedule
      </Typography>
      <Box sx={{ flex: 1, px: 2, pb: 2 }}>
        <Calendar
          localizer={localizer}
          events={appointments}
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          views={["month", "week", "day", "agenda"]}
          defaultView="month"
          defaultDate={new Date()} // ✅ This ensures current month is anchored
          popup
          selectable={false}
          style={{ height: "100%" }}
          onSelectEvent={(event) => setSelectedEvent(event)}
        />
      </Box>

      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
        <DialogTitle>Appointment Details</DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <>
              <Typography>
                <strong>Patient:</strong>{" "}
                {selectedEvent.extendedProps.patient?.username}
              </Typography>
              <Typography>
                <strong>Status:</strong> {selectedEvent.extendedProps.status}
              </Typography>
              <Typography>
                <strong>Time:</strong>{" "}
                {moment(selectedEvent.start).format("LLLL")}
              </Typography>
              {selectedEvent.extendedProps.notes && (
                <Typography>
                  <strong>Notes:</strong> {selectedEvent.extendedProps.notes}
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TherapistSchedule;
