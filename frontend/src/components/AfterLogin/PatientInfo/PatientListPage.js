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
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Grid,
  IconButton,
} from "@mui/material";
import {
  Search as SearchIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Refresh as RefreshIcon,
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
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              Patient Management
            </Typography>
          </Box>
        </Box>

        {/* Main Content */}
        <Paper 
          elevation={1} 
          sx={{ 
            borderRadius: 2, 
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'grey.200',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <Box sx={{ 
            bgcolor: 'white',
            minHeight: 300,
            p: 3,
          }}>
            {/* Header with Refresh Button */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                All Patients
              </Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchPatients}
                disabled={loading}
                sx={{
                  borderRadius: 2,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  px: 3,
                  borderColor: '#3b82f6',
                  color: '#3b82f6',
                  '&:hover': {
                    borderColor: '#2563eb',
                    bgcolor: 'rgba(59, 130, 246, 0.04)',
                  }
                }}
              >
                Refresh
              </Button>
            </Box>

            {/* Filter Section */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={10}>
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
                      width: '100%',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="outlined"
                    onClick={() => setSearchTerm('')}
                    sx={{ 
                      width: '100%',
                      borderRadius: 2,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      borderColor: '#3b82f6',
                      color: '#3b82f6',
                      '&:hover': {
                        borderColor: '#2563eb',
                        bgcolor: 'rgba(59, 130, 246, 0.04)',
                      }
                    }}
                  >
                    Clear
                  </Button>
                </Grid>
              </Grid>
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
              <>
                <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
                  <TableContainer sx={{ overflowX: 'hidden', width: '100%' }}>
                    <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
                      <TableHead>
                        <TableRow sx={{ 
                          backgroundColor: 'grey.50',
                          '& .MuiTableCell-root': {
                            borderBottom: '2px solid',
                            borderColor: 'grey.300'
                          }
                        }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '20%' }}>
                            Patient
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '12%' }}>
                            ID
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '10%' }}>
                            Gender
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '8%' }}>
                            Age
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '20%' }}>
                            Contact
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '15%' }}>
                            Medical Records
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '15%' }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 3 }}>Loading...</TableCell>
                          </TableRow>
                        ) : paginatedPatients.length > 0 ? (
                          paginatedPatients.map((patient) => {
                            const user = patient.user;
                            const avatarUrl = user.avatar ? convertBinaryToUrl(user.avatar) : null;
                            
                            return (
                              <TableRow 
                                key={patient.id}
                                hover
                                sx={{ 
                                  '&:hover': { 
                                    backgroundColor: 'primary.50',
                                    transform: 'scale(1.001)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                  },
                                  '&:nth-of-type(even)': { backgroundColor: 'grey.25' },
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                {/* Patient Info */}
                                <TableCell sx={{ py: 1.5, width: '20%' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar
                                      src={avatarUrl || "/static/images/defaultAvatar.png"}
                                      sx={{
                                        width: 32,
                                        height: 32,
                                        border: "2px solid",
                                        borderColor: alpha(getGenderColor(user.gender), 0.3),
                                        flexShrink: 0
                                      }}
                                    >
                                      <PersonIcon sx={{ fontSize: '1rem' }} />
                                    </Avatar>
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {user.username}
                                    </Typography>
                                  </Box>
                                </TableCell>

                                {/* Patient ID */}
                                <TableCell sx={{ py: 1.5, fontSize: "0.9rem", fontWeight: 500, color: 'text.primary', width: '12%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {user.id}
                                </TableCell>

                                {/* Gender */}
                                <TableCell sx={{ py: 1.5, width: '10%' }}>
                                  {user.gender && (
                                    <Chip
                                      label={user.gender}
                                      size="small"
                                      sx={{
                                        bgcolor: alpha(getGenderColor(user.gender), 0.1),
                                        color: getGenderColor(user.gender),
                                        fontWeight: "600",
                                        fontSize: '0.7rem',
                                        height: 24,
                                        borderRadius: 2,
                                      }}
                                    />
                                  )}
                                </TableCell>

                                {/* Age */}
                                <TableCell sx={{ py: 1.5, fontSize: "0.9rem", fontWeight: 500, color: 'text.primary', width: '8%' }}>
                                  {user.dob ? `${calculateAge(user.dob)} years` : 'N/A'}
                                </TableCell>

                                {/* Contact Info */}
                                <TableCell sx={{ py: 1.5, width: '20%' }}>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    {user.email && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <EmailIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {user.email}
                                        </Typography>
                                      </Box>
                                    )}
                                    {user.contact_number && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                          {user.contact_number}
                                        </Typography>
                                      </Box>
                                    )}
                                  </Box>
                                </TableCell>

                                {/* Medical Records */}
                                <TableCell sx={{ py: 1.5, width: '15%' }}>
                                  <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                    {patient.medical_histories ? patient.medical_histories.length : 0} records
                                  </Typography>
                                  {patient.medical_histories && patient.medical_histories.length > 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                      Last: {patient.medical_histories[0].session_date}
                                    </Typography>
                                  )}
                                </TableCell>

                                {/* Actions */}
                                <TableCell sx={{ py: 1.5, width: '15%' }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewPatient(patient.user.id)}
                                    sx={{ 
                                      color: 'primary.main',
                                      backgroundColor: 'primary.50',
                                      border: '1px solid',
                                      borderColor: 'primary.200',
                                      minWidth: 32,
                                      height: 32,
                                      '&:hover': {
                                        backgroundColor: 'primary.100',
                                        transform: 'scale(1.05)'
                                      },
                                      transition: 'all 0.2s ease-in-out'
                                    }}
                                  >
                                    <ViewIcon sx={{ fontSize: '0.9rem' }} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                              No patients found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>

                {/* Pagination */}
                <Card sx={{ 
                  mt: 2,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  elevation: 0
                }}>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredPatients.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelDisplayedRows={({ from, to, count }) => 
                      `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                    }
                    sx={{
                      backgroundColor: 'grey.50',
                      borderTop: '1px solid',
                      borderColor: 'grey.200',
                      '& .MuiTablePagination-toolbar': {
                        paddingLeft: 3,
                        paddingRight: 3,
                        paddingTop: 2,
                        paddingBottom: 2,
                      },
                      '& .MuiTablePagination-selectLabel': {
                        marginBottom: 0,
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: 'text.secondary'
                      },
                      '& .MuiTablePagination-select': {
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        backgroundColor: 'white',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'grey.300',
                        '&:hover': {
                          borderColor: 'primary.main'
                        }
                      },
                      '& .MuiTablePagination-displayedRows': {
                        marginBottom: 0,
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: 'text.primary'
                      },
                      '& .MuiIconButton-root': {
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.50'
                        },
                        '&:disabled': {
                          color: 'grey.400'
                        }
                      }
                    }}
                  />
                </Card>
              </>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default PatientListPage; 