import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon,
  FitnessCenter as FitnessCenterIcon,
  Event as EventIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { formatDate } from "../../../../utils/dateUtils";
import CreateTreatmentPlanDialog from "./CreateTreatmentPlanDialog";
import AssignTreatmentDialog from "./AssignTreatmentDialog";
import AdjustTreatmentDialog from "./AdjustTreatmentDialog";
import TreatmentDetailsDialog from "./TreatmentDetailsDialog";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`treatment-tabpanel-${index}`}
      aria-labelledby={`treatment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TreatmentManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const therapistId = localStorage.getItem("id");

  useEffect(() => {
    fetchTreatments();
  }, []);

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://127.0.0.1:8000/api/therapist-treatments/${therapistId}/`);
      if (response.ok) {
        const data = await response.json();
        setTreatments(data);
      } else {
        toast.error("Failed to fetch treatments");
      }
    } catch (error) {
      console.error("Error fetching treatments:", error);
      toast.error("Something went wrong while fetching treatments");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCreateSuccess = () => {
    fetchTreatments();
    setCreateDialogOpen(false);
  };

  const handleAssignSuccess = () => {
    fetchTreatments();
    setAssignDialogOpen(false);
  };

  const handleAdjustSuccess = () => {
    fetchTreatments();
    setAdjustDialogOpen(false);
  };

  const handleViewDetails = (treatment) => {
    setSelectedTreatment(treatment);
    setDetailsDialogOpen(true);
  };

  const handleAdjustTreatment = (treatment) => {
    setSelectedTreatment(treatment);
    setAdjustDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'joint_specific':
        return 'primary';
      case 'functional':
        return 'secondary';
      case 'symmetry':
        return 'info';
      case 'pain_adapted':
        return 'warning';
      default:
        return 'default';
    }
  };

  // formatDate is now imported from dateUtils

  const activeTreatments = treatments.filter(t => t.status === 'active');
  const pausedTreatments = treatments.filter(t => t.status === 'paused');
  const completedTreatments = treatments.filter(t => t.status === 'completed');

  const TreatmentCard = ({ treatment }) => (
    <Card sx={{ mb: 2, '&:hover': { boxShadow: 6 } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="div">
            {treatment.patient_name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={treatment.status.charAt(0).toUpperCase() + treatment.status.slice(1)}
              color={getStatusColor(treatment.status)}
              size="small"
            />
            <Chip 
              label={treatment.treatment_type.replace('_', ' ').charAt(0).toUpperCase() + treatment.treatment_type.replace('_', ' ').slice(1)}
              color={getTypeColor(treatment.treatment_type)}
              size="small"
            />
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>Patient ID:</strong> {treatment.patient_id}
        </Typography>
        
        {treatment.treatment_subtype && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Subtype:</strong> {treatment.treatment_subtype}
          </Typography>
        )}
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>Start Date:</strong> {formatDate(treatment.start_date)}
        </Typography>
        
        {treatment.frequency && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Frequency:</strong> {treatment.frequency}
          </Typography>
        )}
        
        <Typography variant="body2" color="text.secondary">
          <strong>Exercises:</strong> {treatment.exercise_count || 0} exercises assigned
        </Typography>
      </CardContent>
      
      <CardActions>
        <Tooltip title="View Details">
          <IconButton 
            size="small" 
            onClick={() => handleViewDetails(treatment)}
            color="primary"
          >
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
        
        {treatment.status !== 'completed' && (
          <Tooltip title="Adjust Treatment">
            <IconButton 
              size="small" 
              onClick={() => handleAdjustTreatment(treatment)}
              color="secondary"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
        
        <Button
          size="small"
          startIcon={<EventIcon />}
          onClick={() => {
            setSelectedTreatment(treatment);
            setAssignDialogOpen(true);
          }}
        >
          Assign Appointment
        </Button>
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Treatment Management
      </Typography>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          size="large"
        >
          Create Treatment Plan
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<EventIcon />}
          onClick={() => setAssignDialogOpen(true)}
          size="large"
        >
          Assign Appointment
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FitnessCenterIcon />
                Active Treatments ({activeTreatments.length})
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon />
                Paused Treatments ({pausedTreatments.length})
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon />
                Completed Treatments ({completedTreatments.length})
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Active Treatments
        </Typography>
        {activeTreatments.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No active treatments found. Create a new treatment plan to get started.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {activeTreatments.map((treatment) => (
              <Grid item xs={12} md={6} lg={4} key={treatment.treatment_id}>
                <TreatmentCard treatment={treatment} />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Paused Treatments
        </Typography>
        {pausedTreatments.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No paused treatments found.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {pausedTreatments.map((treatment) => (
              <Grid item xs={12} md={6} lg={4} key={treatment.treatment_id}>
                <TreatmentCard treatment={treatment} />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Completed Treatments
        </Typography>
        {completedTreatments.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No completed treatments found.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {completedTreatments.map((treatment) => (
              <Grid item xs={12} md={6} lg={4} key={treatment.treatment_id}>
                <TreatmentCard treatment={treatment} />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Dialogs */}
      <CreateTreatmentPlanDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <AssignTreatmentDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        onSuccess={handleAssignSuccess}
        selectedTreatment={selectedTreatment}
      />

      <AdjustTreatmentDialog
        open={adjustDialogOpen}
        onClose={() => setAdjustDialogOpen(false)}
        onSuccess={handleAdjustSuccess}
        treatment={selectedTreatment}
      />

      <TreatmentDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        treatment={selectedTreatment}
      />
    </Box>
  );
};

export default TreatmentManagement; 