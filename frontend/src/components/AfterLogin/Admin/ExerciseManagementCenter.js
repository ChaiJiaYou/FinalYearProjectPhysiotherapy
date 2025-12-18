import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  CardActions,
  InputAdornment,
  Avatar,
} from "@mui/material";
import {
  FitnessCenter as ExerciseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SmartToy as AIIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  VideocamOff as VideocamOffIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import ConfirmationDialog from "../../CustomComponents/ConfirmationDialog";

const ExerciseManagementCenter = () => {
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [filters, setFilters] = useState({
    search: ''
  });
  const initialFormState = {
    name: '',
    instructions: '',
    activity_name: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  
  // Demo video states
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState(null);
  const [demoVideoLoading, setDemoVideoLoading] = useState(false);
  const [demoVideoExerciseName, setDemoVideoExerciseName] = useState('');
  
  // Delete confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);

  // 获取所有运动记录
  const fetchExercises = async () => {
    try {
      setLoading(true);
      console.log('Fetching exercises from API...');
      const response = await fetch('http://127.0.0.1:8000/api/exercises/');
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);
        setExercises(data);
        setFilteredExercises(data);
      } else {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        toast.error("Failed to load exercises");
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Something went wrong while fetching exercises");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  // 过滤exercises
  useEffect(() => {
    let filtered = exercises;

    // 按搜索关键词过滤
    if (filters.search) {
      filtered = filtered.filter(exercise => 
        exercise.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        exercise.instructions.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredExercises(filtered);
  }, [exercises, filters]);

  const handleCreateExercise = async () => {
    if (!formData.instructions || formData.instructions.trim() === '') {
      toast.error('Please fill in required field');
      return;
    }
    if (!formData.activity_name || formData.activity_name.trim() === '') {
      toast.error('Activity name is required');
      return;
    }

    try {
      const currentUserId = localStorage.getItem('userId');
      const formDataWithUser = {
        ...formData,
        activity_name: formData.activity_name?.trim() || '',
        created_by: currentUserId
      };

      const response = await fetch('http://127.0.0.1:8000/api/create-exercise/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formDataWithUser)
      });

      if (response.ok) {
        toast.success('Exercise created successfully!');
        setCreateDialogOpen(false);
        setFormData(initialFormState);
        fetchExercises();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create exercise');
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast.error('Something went wrong while creating exercise');
    }
  };

  const handleEditExercise = async () => {
    if (!formData.instructions || formData.instructions.trim() === '') {
      toast.error('Please fill in required field');
      return;
    }
    if (!formData.activity_name || formData.activity_name.trim() === '') {
      toast.error('Activity name is required');
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/exercises/${selectedExercise.exercise_id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          activity_name: formData.activity_name?.trim() || ''
        })
      });

      if (response.ok) {
        toast.success('Exercise updated successfully!');
        setEditDialogOpen(false);
        setSelectedExercise(null);
        setFormData(initialFormState);
        fetchExercises();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update exercise');
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      toast.error('Something went wrong while updating exercise');
    }
  };

  const handleDeleteExercise = (exerciseId, exerciseName) => {
    setExerciseToDelete({ id: exerciseId, name: exerciseName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/exercises/${exerciseToDelete.id}/`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Exercise deleted successfully!');
        fetchExercises();
      } else {
        toast.error('Failed to delete exercise');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast.error('Something went wrong while deleting exercise');
    } finally {
      setDeleteConfirmOpen(false);
      setExerciseToDelete(null);
    }
  };

  const cancelDeleteExercise = () => {
    setDeleteConfirmOpen(false);
    setExerciseToDelete(null);
  };

  const openCreateDialog = () => {
    setFormData(initialFormState);
    setCreateDialogOpen(true);
  };

  const openEditDialog = (exercise) => {
    setSelectedExercise(exercise);
    setFormData({
      name: exercise.name,
      instructions: exercise.instructions,
      activity_name: exercise.activity_name || ''
    });
    setEditDialogOpen(true);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: ''
    });
  };

  // View demo video function
  const viewDemoVideo = async (exercise) => {
    setDemoVideoLoading(true);
    setDemoVideoExerciseName(exercise.name);
    setShowDemoVideo(true);
    
    try {
      // Check if exercise has demo_video_url
      if (exercise.demo_video_url) {
        // Build full video URL
        const videoUrl = exercise.demo_video_url.startsWith('http')
          ? exercise.demo_video_url
          : `http://127.0.0.1:8000${exercise.demo_video_url}`;
        setDemoVideoUrl(videoUrl);
      } else {
        setDemoVideoUrl(null);
        toast.info('No demo video available for this exercise');
      }
    } catch (error) {
      console.error('Error loading demo video:', error);
      toast.error('Failed to load demo video');
      setDemoVideoUrl(null);
    } finally {
      setDemoVideoLoading(false);
    }
  };


  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              Exercise Management
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
            {/* Search and Action Buttons */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <TextField
                    placeholder="Search exercises..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    size="small"
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
                        height: '40px',
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="outlined"
                    onClick={clearFilters}
                    size="small"
                    sx={{ 
                      width: '100%',
                      borderRadius: 2,
                      textTransform: 'uppercase',
                      fontWeight: 600,
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
                </Grid>
                <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateDialog}
                    size="small"
                    sx={{
                      borderRadius: 2,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      height: '40px',
                      px: 3,
                      bgcolor: '#3b82f6',
                      '&:hover': {
                        bgcolor: '#2563eb',
                      }
                    }}
                  >
                    Create Exercise
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Exercises List */}
            <Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredExercises.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {exercises.length === 0 
                    ? "No exercises found in the system."
                    : "No exercises match your search criteria."
                  }
                </Alert>
              ) : (
                <Grid container spacing={3}>
                  {filteredExercises.map((exercise) => (
                    <Grid item xs={12} md={6} lg={4} key={exercise.exercise_id}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 3,
                          borderColor: 'grey.200',
                          transition: 'all 0.25s ease',
                          '&:hover': {
                            boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                            transform: 'translateY(-4px)',
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                <ExerciseIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="h6" fontWeight="600">
                                  {exercise.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {exercise.exercise_id}
                                </Typography>
                              </Box>
                            </Box>
                            {/* Legacy AI training badges removed */}
                          </Box>

                          {exercise.created_by_name && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2, mb: 2 }}>
                              <Chip
                                label={`Created By: ${exercise.created_by_name}`}
                                size="small"
                                variant="outlined"
                                color="info"
                              />
                            {exercise.activity_name && (
                              <Chip
                                label={`Activity: ${exercise.activity_name}`}
                                size="small"
                                variant="outlined"
                                color="secondary"
                              />
                            )}
                            </Box>
                          )}

                          {exercise.instructions && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 2,
                                mb: 1,
                                lineHeight: 1.6,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {exercise.instructions}
                            </Typography>
                          )}
                        </CardContent>

                        <CardActions sx={{ justifyContent: 'flex-start', px: 2, pb: 2 }}>
                          <Tooltip title="View Demo Video">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewDemoVideo(exercise);
                              }}
                            >
                              <PlayCircleOutlineIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Exercise">
                            <IconButton size="small" onClick={() => openEditDialog(exercise)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Exercise">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteExercise(exercise.exercise_id, exercise.name)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Create Exercise Dialog */}
      <Dialog open={createDialogOpen} onClose={() => {
        setCreateDialogOpen(false);
        setFormData({ name: '', instructions: '' });
      }} maxWidth="md" fullWidth>
        <DialogTitle>Create New Exercise</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Exercise Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Instructions"
                multiline
                rows={4}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Activity Name (Rehab Engine)"
                value={formData.activity_name}
                onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                helperText="Must match one of the supported Rehab Engine activities (e.g. squats, run, standing_shoulder_abduction)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setFormData(initialFormState);
          }}>Cancel</Button>
          <Button onClick={handleCreateExercise} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Exercise Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Exercise</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Exercise Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Instructions"
                multiline
                rows={4}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Activity Name (Rehab Engine)"
                value={formData.activity_name}
                onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                helperText="Must match a known Rehab Engine activity label"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditExercise} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>

      {/* Demo Video Dialog */}
      <Dialog 
        open={showDemoVideo} 
        onClose={() => {
          setShowDemoVideo(false);
          setDemoVideoUrl(null);
          setDemoVideoExerciseName('');
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Demo Video {demoVideoExerciseName ? `- ${demoVideoExerciseName}` : ''}
            </Typography>
            <IconButton 
              onClick={() => {
                setShowDemoVideo(false);
                setDemoVideoUrl(null);
                setDemoVideoExerciseName('');
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {demoVideoLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>Loading demo video...</Typography>
            </Box>
          ) : demoVideoUrl ? (
            <Box sx={{ 
              position: 'relative', 
              paddingTop: '56.25%', // 16:9 aspect ratio
              backgroundColor: '#000',
              borderRadius: 1,
              overflow: 'hidden'
            }}>
              <video
                key={demoVideoUrl}
                controls
                autoPlay
                loop
                preload="metadata"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              >
                <source src={demoVideoUrl} type="video/mp4" />
                <source src={demoVideoUrl} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: 300,
              backgroundColor: 'grey.100',
              borderRadius: 1,
              p: 3
            }}>
              <VideocamOffIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Demo Video Available
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                This exercise doesn't have a demonstration video yet.
                <br />
                Please upload a demo video to the exercise_videos folder and update the database.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        title="Delete Exercise"
        message={exerciseToDelete 
          ? `Are you sure you want to delete "${exerciseToDelete.name}"? This action cannot be undone.`
          : "Are you sure you want to delete this exercise? This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteExercise}
        onCancel={cancelDeleteExercise}
      />

    </Box>
  );
};

export default ExerciseManagementCenter;
