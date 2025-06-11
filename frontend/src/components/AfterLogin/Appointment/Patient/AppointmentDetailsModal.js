import React from 'react';
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
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Event as EventIcon,
} from '@mui/icons-material';

const AppointmentDetailsModal = ({ open, appointment, onClose }) => {
  if (!appointment) return null;

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-MY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const InfoItem = ({ icon, label, value }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      {React.cloneElement(icon, { sx: { color: 'text.secondary' } })}
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" fontWeight="500">
          {value || 'N/A'}
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
          minHeight: '60vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" fontWeight="bold">
          Appointment Details
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'grey.200',
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
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentDetailsModal; 