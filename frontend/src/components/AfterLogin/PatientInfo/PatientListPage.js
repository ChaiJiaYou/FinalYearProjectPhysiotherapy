import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Paper,
  Stack,
} from "@mui/material";
import {
  Search as SearchIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { alpha } from "@mui/material/styles";

const PatientListPage = () => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/api/get-patient-history/");
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      } else {
        toast.error("Failed to load patients");
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Something went wrong while fetching patients");
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient => {
      const user = patient.user;
      return (
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.ic && user.ic.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    setFilteredPatients(filtered);
  };

  const handleViewPatient = (patientId) => {
    navigate(`/home/patients/${patientId}`);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

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
        <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          Patient Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Search and view detailed information about patients
        </Typography>
      </Paper>

      {/* Search Section */}
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
        <TextField
          fullWidth
          placeholder="Search by name, ID, IC number, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500 }}
        />
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredPatients.length} of {patients.length} patients
          </Typography>
        </Box>
      </Paper>

      {/* Patients Grid */}
      {filteredPatients.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {patients.length === 0 
            ? "No patients found in the system."
            : "No patients match your search criteria."
          }
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredPatients.map((patient) => {
            const user = patient.user;
            const avatarUrl = user.avatar ? convertBinaryToUrl(user.avatar) : null;
            
            return (
              <Grid item xs={12} md={6} lg={4} key={patient.id}>
                <Card 
                  elevation={2}
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    {/* Avatar and Basic Info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar
                        src={avatarUrl || "/static/images/defaultAvatar.png"}
                        sx={{
                          width: 60,
                          height: 60,
                          border: "2px solid",
                          borderColor: alpha(getGenderColor(user.gender), 0.3),
                        }}
                      >
                        <PersonIcon />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight="600" color="text.primary">
                          {user.username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {user.id}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
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
                    </Box>

                    {/* Contact Information */}
                    <Stack spacing={1}>
                      {user.ic && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BadgeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            IC: {user.ic}
                          </Typography>
                        </Box>
                      )}
                      
                      {user.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {user.email}
                          </Typography>
                        </Box>
                      )}
                      
                      {user.contact_number && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {user.contact_number}
                          </Typography>
                        </Box>
                      )}
                      
                      {patient.emergency_contact && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon sx={{ fontSize: 16, color: 'error.main' }} />
                          <Typography variant="body2" color="error.main">
                            Emergency: {patient.emergency_contact}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {/* Medical History Count */}
                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.200' }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Medical Records:</strong> {patient.medical_histories ? patient.medical_histories.length : 0}
                      </Typography>
                      {patient.medical_histories && patient.medical_histories.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Last Visit:</strong> {patient.medical_histories[0].session_date}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewPatient(patient.id)}
                      sx={{
                        bgcolor: "primary.main",
                        "&:hover": { bgcolor: "primary.dark" },
                      }}
                    >
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default PatientListPage; 