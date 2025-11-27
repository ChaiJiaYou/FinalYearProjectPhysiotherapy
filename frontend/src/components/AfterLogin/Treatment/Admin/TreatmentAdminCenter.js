import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Avatar,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Grid,
  TableSortLabel,
} from "@mui/material";
import {
  List as TreatmentIcon,
  Assignment as AssignmentIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import TreatmentList from "./TreatmentList";

const TreatmentAdminCenter = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');
  const [patientFilter, setPatientFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const navigate = useNavigate();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    if (activeTab === 1) {
      fetchTreatments();
    }
  }, [activeTab]);

  const fetchTreatments = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/treatments/');
      if (response.ok) {
        const data = await response.json();
        setTreatments(data || []);
      } else {
        toast.error('Failed to fetch treatments');
      }
    } catch (error) {
      console.error('Error fetching treatments:', error);
      toast.error('Error fetching treatments');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTreatment = (treatmentId, patientId) => {
    navigate(`/home/treatment/${patientId}?from=admin`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };


  const handleRequestSort = (property) => {
    if (orderBy === property) {
      // If clicking the same column, cycle through: asc -> desc -> no sort
      if (order === 'asc') {
        setOrder('desc');
      } else if (order === 'desc') {
        setOrderBy('');
        setOrder('asc');
      }
    } else {
      // If clicking a different column, start with asc
      setOrderBy(property);
      setOrder('asc');
    }
  };

  const filteredTreatments = treatments.filter(treatment => {
    const matchesPatient = !patientFilter || 
      treatment.patient_name?.toLowerCase().includes(patientFilter.toLowerCase()) ||
      treatment.patient_id?.toLowerCase().includes(patientFilter.toLowerCase());
    
    const matchesDate = (!dateFilter.start || new Date(treatment.start_date) >= new Date(dateFilter.start)) &&
                       (!dateFilter.end || new Date(treatment.start_date) <= new Date(dateFilter.end));
    
    return matchesPatient && matchesDate;
  }).sort((a, b) => {
    if (!orderBy) return 0;
    
    let aValue = a[orderBy];
    let bValue = b[orderBy];
    
    if (orderBy === 'start_date' || orderBy === 'end_date') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (orderBy === 'is_active') {
      // For boolean sorting: false (deleted) comes before true (active)
      aValue = a.is_active === false ? 0 : 1;
      bValue = b.is_active === false ? 0 : 1;
    }
    
    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedTreatments = filteredTreatments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const tabs = [
    { label: "Patients", icon: <TreatmentIcon />, component: <TreatmentList /> },
    { 
      label: "All Treatments", 
      icon: <AssignmentIcon />, 
      component: (
        <Box>
          {/* Filter Section */}
          <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <TextField
                  value={patientFilter}
                  onChange={(e) => setPatientFilter(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    flex: 1,
                    minWidth: { xs: "100%", sm: 300 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchTreatments}
                  disabled={loading}
                  size="small"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    px: 3,
                    height: '40px',
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
                <Button
                  variant="outlined"
                  onClick={() => {
                    setPatientFilter('');
                    setDateFilter({ start: '', end: '' });
                  }}
                  size="small"
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    px: 3,
                    height: '40px',
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
              </Box>
            </CardContent>
          </Card>

          {/* Treatments Table */}
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
                    <TableCell 
                      sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '25%' }}
                    >
                      <TableSortLabel
                        active={orderBy === 'name'}
                        direction={orderBy === 'name' ? order : 'asc'}
                        onClick={() => handleRequestSort('name')}
                        sx={{ fontWeight: 700, fontSize: "0.9rem" }}
                      >
                        Treatment Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell 
                      sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '18%' }}
                    >
                      <TableSortLabel
                        active={orderBy === 'patient_name'}
                        direction={orderBy === 'patient_name' ? order : 'asc'}
                        onClick={() => handleRequestSort('patient_name')}
                        sx={{ fontWeight: 700, fontSize: "0.9rem" }}
                      >
                        Patient
                      </TableSortLabel>
                    </TableCell>
                    <TableCell 
                      sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '18%' }}
                    >
                      <TableSortLabel
                        active={orderBy === 'therapist_name'}
                        direction={orderBy === 'therapist_name' ? order : 'asc'}
                        onClick={() => handleRequestSort('therapist_name')}
                        sx={{ fontWeight: 700, fontSize: "0.9rem" }}
                      >
                        Therapist
                      </TableSortLabel>
                    </TableCell>
                    <TableCell 
                      sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '12%' }}
                    >
                      <TableSortLabel
                        active={orderBy === 'start_date'}
                        direction={orderBy === 'start_date' ? order : 'asc'}
                        onClick={() => handleRequestSort('start_date')}
                        sx={{ fontWeight: 700, fontSize: "0.9rem" }}
                      >
                        Start Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell 
                      sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '12%' }}
                    >
                      <TableSortLabel
                        active={orderBy === 'end_date'}
                        direction={orderBy === 'end_date' ? order : 'asc'}
                        onClick={() => handleRequestSort('end_date')}
                        sx={{ fontWeight: 700, fontSize: "0.9rem" }}
                      >
                        End Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell 
                      sx={{ fontWeight: 700, fontSize: "0.9rem", py: 2, color: 'text.primary', width: '10%' }}
                    >
                      <TableSortLabel
                        active={orderBy === 'is_active'}
                        direction={orderBy === 'is_active' ? order : 'asc'}
                        onClick={() => handleRequestSort('is_active')}
                        sx={{ fontWeight: 700, fontSize: "0.9rem" }}
                      >
                        Status
                      </TableSortLabel>
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
                  ) : paginatedTreatments.length > 0 ? (
                    paginatedTreatments.map((treatment) => (
                      <TableRow 
                        key={treatment.treatment_id} 
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
                        <TableCell sx={{ py: 1.5, fontSize: "0.9rem", fontWeight: 500, color: 'text.primary', width: '25%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {treatment.name || 'Unnamed Treatment'}
                        </TableCell>
                        <TableCell sx={{ py: 1.5, width: '18%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                backgroundColor: 'primary.100',
                                color: 'primary.main',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                flexShrink: 0
                              }}
                            >
                              {treatment.patient_name ? treatment.patient_name.charAt(0).toUpperCase() : 'P'}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {treatment.patient_name || treatment.patient_id || 'Unknown Patient'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5, width: '18%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                backgroundColor: 'secondary.100',
                                color: 'secondary.main',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                flexShrink: 0
                              }}
                            >
                              {treatment.therapist_name ? treatment.therapist_name.charAt(0).toUpperCase() : 'T'}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {treatment.therapist_name || 'Unknown Therapist'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5, fontSize: "0.9rem", fontWeight: 500, color: 'text.primary', width: '12%' }}>
                          {formatDate(treatment.start_date)}
                        </TableCell>
                        <TableCell sx={{ py: 1.5, fontSize: "0.9rem", fontWeight: 500, color: 'text.primary', width: '12%' }}>
                          {formatDate(treatment.end_date)}
                        </TableCell>
                        <TableCell sx={{ py: 1.5, width: '10%' }}>
                          <Chip 
                            label={treatment.is_active === false ? 'Deleted' : 'Active'} 
                            size="small"
                            color={treatment.is_active === false ? 'error' : 'success'}
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              fontWeight: 600,
                              borderRadius: 2
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.5, width: '15%' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewTreatment(treatment.treatment_id, treatment.patient_id)}
                            sx={{ 
                              color: 'primary.main',
                              backgroundColor: 'primary.50',
                              border: '1px solid',
                              borderColor: 'primary.200',
                              minWidth: 28,
                              height: 28,
                              '&:hover': {
                                backgroundColor: 'primary.100',
                                transform: 'scale(1.05)'
                              },
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            <VisibilityIcon sx={{ fontSize: '0.8rem' }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No treatments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Pagination - 移除Rows per page显示 */}
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
              count={filteredTreatments.length}
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
        </Box>
      )
    },
  ];

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        {/* 页面头部 - 遵循User Management设计系统 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              Treatment Administration
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
        {/* Tab Navigation */}
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'grey.200',
          bgcolor: 'grey.50'
        }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                bgcolor: 'primary.main',
              },
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '0.95rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'text.secondary',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: 'rgba(59, 130, 246, 0.04)',
                },
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 700,
                },
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ 
                  gap: 1.5,
                  py: 2,
                  px: 3,
                }}
              />
            ))}
          </Tabs>
        </Box>
        
        {/* Tab Content */}
        <Box sx={{ 
          bgcolor: 'white',
          minHeight: 600,
          p: 3,
        }}>
          {tabs[activeTab].component}
        </Box>
      </Paper>
      </Box>
    </Box>
  );
};

export default TreatmentAdminCenter; 