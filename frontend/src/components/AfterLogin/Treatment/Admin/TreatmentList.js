import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  TablePagination,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { formatDate } from "../../../../utils/dateUtils";

const TreatmentList = () => {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchTreatments();
  }, []);

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/api/treatments/");
      if (response.ok) {
        const data = await response.json();
        setTreatments(data);
      } else {
        toast.error("Failed to load treatments");
      }
    } catch (error) {
      console.error("Error fetching treatments:", error);
      toast.error("Something went wrong while fetching treatments");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTreatment = async (treatmentId) => {
    if (window.confirm("Are you sure you want to delete this treatment?")) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/treatments/${treatmentId}/`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          toast.success("Treatment deleted successfully");
          fetchTreatments();
        } else {
          toast.error("Failed to delete treatment");
        }
      } catch (error) {
        console.error("Error deleting treatment:", error);
        toast.error("Something went wrong while deleting treatment");
      }
    }
  };

  const handleStatusChange = async (treatmentId, newStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/treatments/${treatmentId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        toast.success("Treatment status updated");
        fetchTreatments();
      } else {
        toast.error("Failed to update treatment status");
      }
    } catch (error) {
      console.error("Error updating treatment status:", error);
      toast.error("Something went wrong while updating treatment status");
    }
  };

  // Filter treatments based on search term and filters
  const filteredTreatments = treatments.filter(treatment => {
    const matchesSearch = 
      treatment.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      treatment.therapist_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || treatment.status === statusFilter;
    const matchesType = !typeFilter || treatment.treatment_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination
  const paginatedTreatments = filteredTreatments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      completed: 'info',
      paused: 'warning',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const getTypeLabel = (type) => {
    return type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Treatment Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchTreatments}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search treatments, patients, or therapists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Treatment Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="Treatment Type"
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="joint_specific">Joint Specific</MenuItem>
              <MenuItem value="functional">Functional</MenuItem>
              <MenuItem value="symmetry">Symmetry</MenuItem>
              <MenuItem value="pain_adapted">Pain Adapted</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Results Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {paginatedTreatments.length} of {filteredTreatments.length} treatments
          {statusFilter && (
            <Chip 
              label={`Status: ${statusFilter}`} 
              size="small" 
              sx={{ ml: 1 }} 
              onDelete={() => setStatusFilter('')}
            />
          )}
          {typeFilter && (
            <Chip 
              label={`Type: ${getTypeLabel(typeFilter)}`} 
              size="small" 
              sx={{ ml: 1 }} 
              onDelete={() => setTypeFilter('')}
            />
          )}
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Treatment</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Patient</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Therapist</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Exercises</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTreatments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Alert severity="info">
                    No treatments found matching your criteria.
                  </Alert>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTreatments.map((treatment) => (
                <TableRow 
                  key={treatment.treatment_id}
                  sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                >
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                      {treatment.name || 'Unnamed Treatment'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {treatment.treatment_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {treatment.patient_name || 'Unknown Patient'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {treatment.patient_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {treatment.therapist_name || 'Unknown Therapist'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getTypeLabel(treatment.treatment_type)}
                    </Typography>
                    {treatment.treatment_subtype && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {treatment.treatment_subtype.replace('_', ' ')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={treatment.status}
                      color={getStatusColor(treatment.status)}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(treatment.start_date)}
                    </Typography>
                    {treatment.frequency && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {treatment.frequency}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {treatment.exercise_count || 0} exercises
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="info">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Treatment">
                        <IconButton size="small" color="primary">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Treatment">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteTreatment(treatment.treatment_id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredTreatments.length}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Box>
  );
};

export default TreatmentList; 