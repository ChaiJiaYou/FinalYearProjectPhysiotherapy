import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  InputAdornment,
  Alert,
  CircularProgress,
  TablePagination,
  Avatar,
  Stack,
  Container,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
} from "@mui/material";
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  MedicalServices as MedicalServicesIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const TreatmentList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/list-patients/');
      if (response.ok) {
        const data = await response.json();
        setPatients(data || []);
      } else {
        toast.error('Failed to fetch patients');
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Error fetching patients');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatient = (patientId) => {
    // Check if we're in admin context by checking current path
    const currentPath = window.location.pathname;
    const isAdminContext = currentPath.includes('/admin-treatment');
    
    if (isAdminContext) {
      navigate(`/home/treatment/${patientId}?from=admin`);
    } else {
      navigate(`/home/treatment/${patientId}`);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedPatients = filteredPatients.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getStatusColor = (status) => {
    return status ? 'success' : 'error';
  };

  const getStatusText = (status) => {
    return status ? 'Active' : 'Inactive';
  };

  return (
    <Box>
      {/* 搜索和过滤 - 遵循User Management设计系统 */}
      <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Search & Filter Patients
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

          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <TextField
              placeholder="Search patients by name or email..."
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
                minWidth: { xs: "100%", sm: 400 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                }
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Patients Table - 遵循User Management设计系统 */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell sx={{ fontWeight: "bold", py: 2 }}>Patient</TableCell>
                <TableCell sx={{ fontWeight: "bold", py: 2 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: "bold", py: 2 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: "bold", py: 2 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: "center", py: 6 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                      <MedicalServicesIcon sx={{ fontSize: 48, color: "text.secondary" }} />
                      <Typography variant="h6" color="text.secondary">
                        No patients found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm ? "Try adjusting your search terms" : "No patients available"}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPatients.map((patient) => (
                  <TableRow 
                    key={patient.id} 
                    hover
                    sx={{ 
                      "&:hover": { 
                        bgcolor: "grey.50" 
                      } 
                    }}
                  >
                    <TableCell sx={{ py: 2 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                            {patient.username}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {patient.first_name && patient.last_name 
                              ? `${patient.first_name} ${patient.last_name}` 
                              : patient.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2">{patient.email}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2">{patient.contact_number || "N/A"}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewPatient(patient.id)}
                        sx={{ 
                          borderRadius: 2, 
                          textTransform: "uppercase",
                          fontWeight: 600,
                          px: 3,
                          "&:hover": {
                            bgcolor: "primary.50",
                            borderColor: "primary.main"
                          }
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Card>
        
        {/* 分页组件 - 遵循User Management设计系统 */}
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
              '& .MuiTablePagination-displayedRows': {
                marginBottom: 0,
                fontSize: '0.9rem',
                fontWeight: 500,
                color: 'text.primary'
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
    </Box>
  );
};

export default TreatmentList;