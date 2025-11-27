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
  Alert,
  CircularProgress,
  Button,
  Divider,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
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
  Edit as EditIcon,
  Schedule,
  Notes,
  HealthAndSafety as EmergencyIcon,
  Add as AddIcon,
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
  
  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editingHistory, setEditingHistory] = useState(null);
  const [editFormData, setEditFormData] = useState({
    past_medical_history: '',
    surgical_history: '',
    family_history: '',
    medications: '',
    allergies: '',
    notes: ''
  });
  

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      console.log("DEBUG - Starting to fetch patient data for patientId:", patientId);
      setLoading(true);
      await Promise.all([
        fetchPatientDetail(),
        fetchPatientTreatments(),
        fetchPatientAppointments(),
      ]);
      console.log("DEBUG - Finished fetching all patient data");
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
        // Filter treatments for this patient and only get active ones
        const patientTreatments = data.filter(treatment => 
          treatment.patient_id === patientId && treatment.is_active === true
        );
        setTreatments(patientTreatments);
      }
    } catch (error) {
      console.error("Error fetching treatments:", error);
    }
  };

  const fetchPatientAppointments = async () => {
    try {
      console.log("DEBUG - Fetching appointments for patientId:", patientId);
      const url = `http://127.0.0.1:8000/api/appointments/list/?scope=patient&user_id=${patientId}`;
      console.log("DEBUG - API URL:", url);
      
      const response = await fetch(url);
      console.log("DEBUG - Response status:", response.status);
      console.log("DEBUG - Response ok:", response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log("DEBUG - Response data:", data);
        console.log("DEBUG - Appointments array:", data.appointments);
        console.log("DEBUG - Appointments length:", data.appointments?.length || 0);
        setAppointments(data.appointments || []);
      } else {
        const errorText = await response.text();
        console.error("DEBUG - Response not ok:", response.status, errorText);
      }
    } catch (error) {
      console.error("DEBUG - Error fetching appointments:", error);
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

  const handleAddMedicalHistory = () => {
    navigate(`/home/patients/${patientId}/add-medical-history`);
  };

  const handleEditMedicalHistory = (history) => {
    setEditingHistory(history);
    setEditFormData({
      past_medical_history: history.past_medical_history || '',
      surgical_history: history.surgical_history || '',
      family_history: history.family_history || '',
      medications: history.medications || '',
      allergies: history.allergies || '',
      notes: history.notes || ''
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingHistory(null);
    setEditFormData({
      past_medical_history: '',
      surgical_history: '',
      family_history: '',
      medications: '',
      allergies: '',
      notes: ''
    });
  };

  const handleEditInputChange = (field) => (event) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmitEditMedicalHistory = async () => {
    try {
      setEditModalLoading(true);
      
      // Check if at least one field is filled
      const hasData = Object.values(editFormData).some(value => value.trim() !== '');
      if (!hasData) {
        toast.error('Please fill in at least one field');
        return;
      }

      const response = await fetch(`http://127.0.0.1:8000/api/update-medical-history/${editingHistory.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        toast.success('Medical history updated successfully');
        handleCloseEditModal();
        // Refresh patient data to show updated medical history
        fetchPatientData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update medical history');
      }
    } catch (error) {
      console.error('Error updating medical history:', error);
      toast.error('Something went wrong while updating medical history');
    } finally {
      setEditModalLoading(false);
    }
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
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
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
                    {appointments.filter(apt => apt.status === 'Completed' || apt.status === 'Scheduled').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Appointments</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {treatments.filter(t => t.is_active === true).length}
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">Medical History Records</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddMedicalHistory}
                    sx={{
                      bgcolor: "#3b82f6",
                      color: "white",
                      borderRadius: 2,
                      textTransform: "uppercase",
                      fontWeight: 600,
                      px: 3,
                      "&:hover": { 
                        bgcolor: "#2563eb" 
                      },
                    }}
                  >
                    Add Medical History
                  </Button>
                </Box>
                {patient.medical_histories && patient.medical_histories.length > 0 ? (
                  <Grid container spacing={3}>
                        {patient.medical_histories.map((history, index) => (
                      <Grid item xs={12} key={index}>
                        <Card 
                          sx={{ 
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'grey.200',
                            boxShadow: 0,
                            overflow: 'hidden'
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h6" fontWeight="bold" color="text.primary">
                                Medical History Record #{index + 1}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(history.created_at)}
                                </Typography>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditMedicalHistory(history)}
                                  sx={{ 
                                    color: 'primary.main',
                                    '&:hover': { 
                                      bgcolor: 'primary.50' 
                                    }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                            
                            <Grid container spacing={2}>
                              {history.past_medical_history && (
                                <Grid item xs={12}>
                                  <Box sx={{ 
                                    bgcolor: 'grey.50', 
                                    p: 3, 
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                  }}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary" gutterBottom>
                                      Past Medical History
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      {history.past_medical_history}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                              
                              {history.surgical_history && (
                                <Grid item xs={12}>
                                  <Box sx={{ 
                                    bgcolor: 'grey.50', 
                                    p: 3, 
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                  }}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary" gutterBottom>
                                      Surgical History
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      {history.surgical_history}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                              
                              {history.family_history && (
                                <Grid item xs={12}>
                                  <Box sx={{ 
                                    bgcolor: 'grey.50', 
                                    p: 3, 
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                  }}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary" gutterBottom>
                                      Family History
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      {history.family_history}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                              
                              {history.medications && (
                                <Grid item xs={12}>
                                  <Box sx={{ 
                                    bgcolor: 'grey.50', 
                                    p: 3, 
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                  }}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary" gutterBottom>
                                      Medications
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      {history.medications}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                              
                              {history.allergies && (
                                <Grid item xs={12}>
                                  <Box sx={{ 
                                    bgcolor: 'grey.50', 
                                    p: 3, 
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                  }}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary" gutterBottom>
                                      Allergies
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      {history.allergies}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                              
                              {history.notes && (
                                <Grid item xs={12}>
                                  <Box sx={{ 
                                    bgcolor: 'grey.50', 
                                    p: 3, 
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                  }}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary" gutterBottom>
                                      Additional Notes
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                      {history.notes}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
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
                {(() => {
                  const filteredAppointments = appointments.filter(appointment => 
                    appointment.status === 'Completed' || 
                    appointment.status === 'Scheduled'
                  );
                  
                  
                  return filteredAppointments.length > 0 ? (
                    <Box sx={{ bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'grey.200', bgcolor: 'grey.50' }}>
                        <Grid container spacing={2} sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                          <Grid item xs={3}>
                            <Typography variant="subtitle2" fontWeight="bold">Date & Time</Typography>
                          </Grid>
                          <Grid item xs={2}>
                            <Typography variant="subtitle2" fontWeight="bold">Therapist</Typography>
                          </Grid>
                          <Grid item xs={2}>
                            <Typography variant="subtitle2" fontWeight="bold">Duration</Typography>
                          </Grid>
                          <Grid item xs={2}>
                            <Typography variant="subtitle2" fontWeight="bold">Mode</Typography>
                          </Grid>
                          <Grid item xs={2}>
                            <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                          </Grid>
                          <Grid item xs={1}>
                            <Typography variant="subtitle2" fontWeight="bold">Notes</Typography>
                          </Grid>
                        </Grid>
                      </Box>
                      {filteredAppointments.map((appointment, index) => (
                        <Box 
                          key={appointment.appointment_code}
                          sx={{ 
                            p: 2, 
                            borderBottom: index < filteredAppointments.length - 1 ? '1px solid' : 'none',
                            borderColor: 'grey.200',
                            '&:hover': { bgcolor: 'grey.50' }
                          }}
                        >
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={3}>
                              <Typography variant="body2" color="text.primary">
                                {formatDateTime(appointment.start_at)}
                              </Typography>
                            </Grid>
                            <Grid item xs={2}>
                              <Typography variant="body2" color="text.secondary">
                                {appointment.therapist?.username || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={2}>
                              <Typography variant="body2" color="text.secondary">
                                {appointment.duration_min} min
                              </Typography>
                            </Grid>
                            <Grid item xs={2}>
                              <Typography variant="body2" color="text.secondary">
                                {appointment.mode?.replace('_', ' ').toUpperCase() || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={2}>
                              <Chip 
                                label={appointment.status} 
                                color={getStatusColor(appointment.status)}
                                size="small"
                                sx={{ borderRadius: 2, fontWeight: 600 }}
                              />
                            </Grid>
                            <Grid item xs={1}>
                              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                {(appointment.session_notes && appointment.session_notes.trim()) ? (
                                  <Tooltip 
                                    title={appointment.session_notes} 
                                    arrow
                                    placement="top"
                                    sx={{ maxWidth: 300 }}
                                  >
                                    <Notes sx={{ color: 'primary.main', fontSize: 18, cursor: 'pointer' }} />
                                  </Tooltip>
                                ) : null}
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Alert severity="info">No completed or scheduled appointments found</Alert>
                  );
                })()}
              </Box>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Medical History Modal */}
      <Dialog 
        open={editModalOpen} 
        onClose={handleCloseEditModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h5" fontWeight="bold" color="text.primary">
            Edit Medical History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update medical record for {patient?.user?.username}
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Grid container spacing={2}>
            {/* Past Medical History */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
                  Past Medical History
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={editFormData.past_medical_history}
                  onChange={handleEditInputChange('past_medical_history')}
                  placeholder="Details of any diagnosed medical conditions, including chronic illnesses and past significant illnesses..."
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'grey.50',
                      '&:hover': {
                        backgroundColor: 'grey.100',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      }
                    }
                  }}
                />
              </Box>
            </Grid>

            {/* Surgical History */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
                  Surgical History
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={editFormData.surgical_history}
                  onChange={handleEditInputChange('surgical_history')}
                  placeholder="List of past surgeries with procedures and dates..."
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'grey.50',
                      '&:hover': {
                        backgroundColor: 'grey.100',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      }
                    }
                  }}
                />
              </Box>
            </Grid>

            {/* Family History */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
                  Family History
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={editFormData.family_history}
                  onChange={handleEditInputChange('family_history')}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'grey.50',
                      '&:hover': {
                        backgroundColor: 'grey.100',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      }
                    }
                  }}
                />
              </Box>
            </Grid>

            {/* Medications */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
                  Medications
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={editFormData.medications}
                  onChange={handleEditInputChange('medications')}
                  placeholder="Comprehensive list of current and past medications, including dosage and frequency..."
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'grey.50',
                      '&:hover': {
                        backgroundColor: 'grey.100',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      }
                    }
                  }}
                />
              </Box>
            </Grid>

            {/* Allergies */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
                  Allergies
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={editFormData.allergies}
                  onChange={handleEditInputChange('allergies')}
                  placeholder="Known allergies to medications, food, or environmental factors..."
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'grey.50',
                      '&:hover': {
                        backgroundColor: 'grey.100',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      }
                    }
                  }}
                />
              </Box>
            </Grid>

            {/* Additional Notes */}
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
                  Additional Notes
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={editFormData.notes}
                  onChange={handleEditInputChange('notes')}
                  placeholder="Any additional notes or observations..."
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'grey.50',
                      '&:hover': {
                        backgroundColor: 'grey.100',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      }
                    }
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1, gap: 2 }}>
          <Button 
            onClick={handleCloseEditModal} 
            disabled={editModalLoading}
            variant="outlined"
            sx={{
              borderRadius: 2,
              textTransform: 'uppercase',
              fontWeight: 600,
              px: 3,
              minWidth: 100
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitEditMedicalHistory} 
            variant="contained" 
            disabled={editModalLoading}
            sx={{
              borderRadius: 2,
              textTransform: 'uppercase',
              fontWeight: 600,
              px: 3,
              minWidth: 100
            }}
          >
            {editModalLoading ? "Updating..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default PatientDetailPage; 