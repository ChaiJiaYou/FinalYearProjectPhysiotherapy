import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Stack,
  Paper,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

const UpcomingAppointments = ({ appointments, onViewDetails }) => {
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

  if (appointments.length === 0) {
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: "center",
          backgroundColor: "grey.50",
          border: "2px dashed grey.300",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No upcoming appointments
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {appointments.map((appointment) => (
        <Card
          key={appointment.appointmentId}
          sx={{
            cursor: "pointer",
            "&:hover": {
              boxShadow: 6,
              transform: "translateY(-2px)",
              transition: "all 0.2s",
            },
          }}
          onClick={() => onViewDetails(appointment)}
        >
          <CardContent>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon color="action" />
                <Typography variant="h6">
                  {appointment.therapist?.username || "No therapist name"}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={appointment.status}
                  color={getStatusColor(appointment.status)}
                  size="small"
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(appointment);
                  }}
                >
                  <VisibilityIcon />
                </IconButton>
              </Box>
            </Box>

            <Stack spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTimeIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {new Date(appointment.appointmentDateTime).toLocaleString([], {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
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
      ))}
    </Stack>
  );
};

export default UpcomingAppointments;
