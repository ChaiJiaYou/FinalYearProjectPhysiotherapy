import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
    // Filter out inactive patients first
    const activePatients = patients.filter(patient => {
      const user = patient.user;
      return user.is_active !== false; // Only show active patients
    });

    if (!searchTerm.trim()) {
      setFilteredPatients(activePatients);
      return;
    }

    const filtered = activePatients.filter(patient => {
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

  // Get current page data
  const paginatedPatients = filteredPatients.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Section */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
            Patient Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage active patients in the system
          </Typography>
        </Box>
        
        {/* Search Section */}
        <TextField
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
          sx={{ 
            width: 900,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
        />
      </Box>

      {/* Patients Table */}
      {filteredPatients.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {patients.length === 0 
            ? "No patients found in the system."
            : "No active patients match your search criteria."
          }
        </Alert>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "grey.200",
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>Patient</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>Gender</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>Age</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>Medical Records</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedPatients.map((patient) => {
                  const user = patient.user;
                  const avatarUrl = user.avatar ? convertBinaryToUrl(user.avatar) : null;
                  
                  return (
                    <TableRow 
                      key={patient.id}
                      sx={{ 
                        '&:hover': { 
                          bgcolor: 'grey.50' 
                        } 
                      }}
                    >
                      {/* Patient Info */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            src={avatarUrl || "/static/images/defaultAvatar.png"}
                            sx={{
                              width: 40,
                              height: 40,
                              border: "2px solid",
                              borderColor: alpha(getGenderColor(user.gender), 0.3),
                            }}
                          >
                            <PersonIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight="600" color="text.primary">
                              {user.username}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Patient ID */}
                      <TableCell>
                        <Typography variant="body2" color="text.primary" fontWeight="500">
                          {user.id}
                        </Typography>
                      </TableCell>

                      {/* Gender */}
                      <TableCell>
                        {user.gender && (
                          <Chip
                            label={user.gender}
                            size="small"
                            sx={{
                              bgcolor: alpha(getGenderColor(user.gender), 0.1),
                              color: getGenderColor(user.gender),
                              fontWeight: "600",
                              height: 32,
                              borderRadius: 2,
                            }}
                          />
                        )}
                      </TableCell>

                      {/* Age */}
                      <TableCell>
                        {user.dob && (
                          <Typography variant="body2" color="text.secondary">
                            {calculateAge(user.dob)} years
                          </Typography>
                        )}
                      </TableCell>

                      {/* Contact Info */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
                        </Box>
                      </TableCell>

                      {/* Medical Records */}
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {patient.medical_histories ? patient.medical_histories.length : 0} records
                        </Typography>
                        {patient.medical_histories && patient.medical_histories.length > 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Last: {patient.medical_histories[0].session_date}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Button
                          variant="contained"
                          startIcon={<ViewIcon />}
                          onClick={() => handleViewPatient(patient.user.id)}
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
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredPatients.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: 1,
              borderColor: 'grey.200',
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default PatientListPage; 