import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Button,
  Divider,
  Stack,
  IconButton,
} from "@mui/material";
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Assignment as TreatmentIcon,
  FitnessCenter as ExerciseIcon,
  LocalHospital as MedicalIcon,
  ArrowBack as BackIcon,
  HealthAndSafety as EmergencyIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { alpha } from "@mui/material/styles";
import { formatLastLogin } from "../../../utils/dateUtils";

const PatientDetailPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [exerciseRecords, setExerciseRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPatientDetail(),
        fetchPatientTreatments(),
        fetchPatientAppointments(),
      ]);
    } catch (error) {
      console.error("Error fetching patient data:", error);
      toast.error("Failed to fetch patient information");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDetail = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/get-patient-detail/${patientId}/`);
      if (response.ok) {
        const data = await response.json();
        setPatient(data);
        
        if (data.user.avatar) {
          const url = convertBinaryToUrl(data.user.avatar);
          setAvatarUrl(url);
        }
      } else {
        toast.error("Failed to fetch patient details");
      }
    } catch (error) {
      console.error("Error fetching patient detail:", error);
    }
  };

  const fetchPatientTreatments = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/treatments/");
      if (response.ok) {
        const data = await response.json();
        // Filter treatments for this patient
        const patientTreatments = data.filter(treatment => treatment.patient_id === patientId);
        setTreatments(patientTreatments);
      }
    } catch (error) {
      console.error("Error fetching treatments:", error);
    }
  };

  const fetchPatientAppointments = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/patient-appointments/?patient_id=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const convertBinaryToUrl = (binaryData) => {
    if (!binaryData) return null;
    
    try {
      const binaryString = atob(binaryData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error converting avatar:", error);
      return null;
    }
  };

  const getGenderColor = (gender) => {
    return gender === 'Male' ? '#2196f3' : gender === 'Female' ? '#e91e63' : '#9e9e9e';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'Scheduled':
        return 'success';
      case 'paused':
      case 'Cancelled':
        return 'warning';
      case 'completed':
      case 'Completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Patient information not found</Alert>
      </Box>
    );
  }

  const user = patient.user;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          bgcolor: "white",
          border: "1px solid",
          borderColor: "grey.200",
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate('/home/patients')} color="primary">
              <BackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                Patient Details
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View complete information for {user.username}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column - Patient Basic Info */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
              mb: 3,
            }}
          >
            <Box display="flex" flexDirection="column" alignItems="center">
              <Avatar
                src={avatarUrl || "/static/images/defaultAvatar.png"}
                sx={{
                  width: 120,
                  height: 120,
                  mb: 2,
                  border: "4px solid",
                  borderColor: alpha(getGenderColor(user.gender), 0.1),
                }}
              >
                <PersonIcon sx={{ fontSize: 60 }} />
              </Avatar>
              <Typography variant="h5" fontWeight="600" color="text.primary" gutterBottom>
                {user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" mb={2}>
                Patient ID: {user.id}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center">
                {user.gender && (
                  <Chip
                    label={user.gender}
                    size="small"
                    sx={{
                      bgcolor: alpha(getGenderColor(user.gender), 0.1),
                      color: getGenderColor(user.gender),
                      fontWeight: "600",
                    }}
                  />
                )}
                {user.dob && (
                  <Chip
                    label={`Age ${calculateAge(user.dob)}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Contact Information */}
            <Typography variant="h6" fontWeight="600" color="text.primary" mb={2}>
              Contact Information
            </Typography>
            
            <Stack spacing={2}>
              {user.ic && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <BadgeIcon sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">IC Number</Typography>
                    <Typography variant="body1" fontWeight="500">{user.ic}</Typography>
                  </Box>
                </Box>
              )}
              
              {user.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EmailIcon sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography variant="body1" fontWeight="500">{user.email}</Typography>
                  </Box>
                </Box>
              )}
              
              {user.contact_number && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PhoneIcon sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Phone Number</Typography>
                    <Typography variant="body1" fontWeight="500">{user.contact_number}</Typography>
                  </Box>
                </Box>
              )}
              
              {patient.emergency_contact && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EmergencyIcon sx={{ color: 'error.main' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Emergency Contact</Typography>
                    <Typography variant="body1" fontWeight="500" color="error.main">
                      {patient.emergency_contact}
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {user.dob && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CalendarIcon sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                    <Typography variant="body1" fontWeight="500">{formatDate(user.dob)}</Typography>
                  </Box>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Quick Stats */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <Typography variant="h6" fontWeight="600" color="text.primary" mb={2}>
              Quick Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {patient.medical_histories?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Medical Records</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="secondary.main" fontWeight="bold">
                    {treatments.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Treatment Plans</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {appointments.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Appointments</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {treatments.filter(t => t.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Active Treatments</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Right Column - Detailed Information */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab 
                  icon={<MedicalIcon />} 
                  label="Medical History" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<TreatmentIcon />} 
                  label="Treatment Records" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<CalendarIcon />} 
                  label="Appointment History" 
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            {/* Medical History Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Medical History Records</Typography>
                {patient.medical_histories && patient.medical_histories.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Session Date</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Objective Findings</TableCell>
                          <TableCell>Treatment</TableCell>
                          <TableCell>Remarks</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {patient.medical_histories.map((history, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(history.session_date)}</TableCell>
                            <TableCell>{history.description || 'N/A'}</TableCell>
                            <TableCell>{history.objective_findings || 'N/A'}</TableCell>
                            <TableCell>{history.treatment || 'N/A'}</TableCell>
                            <TableCell>{history.remarks || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">No medical history records found</Alert>
                )}
              </Box>
            </TabPanel>

            {/* Treatment Records Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Treatment Plan Records</Typography>
                {treatments.length > 0 ? (
                  <Grid container spacing={2}>
                    {treatments.map((treatment) => (
                      <Grid item xs={12} key={treatment.treatment_id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                              <Typography variant="h6" color="primary">
                                {treatment.name}
                              </Typography>
                              <Chip 
                                label={treatment.status} 
                                color={getStatusColor(treatment.status)}
                                size="small"
                              />
                            </Box>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Treatment Type:</strong> {treatment.treatment_type?.replace('_', ' ')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Therapist:</strong> {treatment.therapist_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Frequency:</strong> {treatment.frequency || 'N/A'}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Start Date:</strong> {formatDate(treatment.start_date)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>End Date:</strong> {formatDate(treatment.end_date)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Exercise Count:</strong> {treatment.exercise_count || 0} exercises
                                </Typography>
                              </Grid>
                            </Grid>
                            {treatment.condition && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                <strong>Condition:</strong> {treatment.condition}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Alert severity="info">No treatment plan records found</Alert>
                )}
              </Box>
            </TabPanel>

            {/* Appointment History Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Appointment History Records</Typography>
                {appointments.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Appointment ID</TableCell>
                          <TableCell>Date & Time</TableCell>
                          <TableCell>Therapist</TableCell>
                          <TableCell>Duration</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {appointments.map((appointment) => (
                          <TableRow key={appointment.appointmentId}>
                            <TableCell>{appointment.appointmentId}</TableCell>
                            <TableCell>{formatDateTime(appointment.appointmentDateTime)}</TableCell>
                            <TableCell>{appointment.therapist?.username || 'N/A'}</TableCell>
                            <TableCell>{appointment.duration} minutes</TableCell>
                            <TableCell>
                              <Chip 
                                label={appointment.status} 
                                color={getStatusColor(appointment.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{appointment.notes || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">No appointment records found</Alert>
                )}
              </Box>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatientDetailPage; 