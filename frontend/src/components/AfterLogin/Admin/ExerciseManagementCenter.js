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
  Collapse,
  CardHeader,
  CardActions,
  Divider,
  InputAdornment,
  Avatar,
} from "@mui/material";
import {
  FitnessCenter as ExerciseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  SmartToy as AIIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

const ExerciseManagementCenter = () => {
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    category: 'all',
    difficulty: 'all',
    search: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    category: 'upper_body',
    difficulty: 'beginner',
    instructions: '',
    action_id: ''
  });

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
    fetchActions();
  }, []);

  // 获取所有Actions
  const fetchActions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/actions/');
      if (response.ok) {
        const data = await response.json();
        // Backend returns {actions: [...]} format, extract the array
        setActions(Array.isArray(data) ? data : (data.actions || []));
      } else {
        console.error('Failed to fetch actions');
      }
    } catch (error) {
      console.error("Error fetching actions:", error);
    }
  };

  // 过滤exercises
  useEffect(() => {
    let filtered = exercises;

    // 按category过滤
    if (filters.category !== 'all') {
      filtered = filtered.filter(exercise => exercise.category === filters.category);
    }

    // 按difficulty过滤
    if (filters.difficulty !== 'all') {
      filtered = filtered.filter(exercise => exercise.difficulty === filters.difficulty);
    }

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
    if (!formData.action_id || !formData.instructions || formData.instructions.trim() === '') {
      toast.error('Please fill in required field');
      return;
    }

    try {
      const currentUserId = localStorage.getItem('userId');
      const formDataWithUser = {
        ...formData,
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
        setFormData({ name: '', category: 'upper_body', difficulty: 'beginner', instructions: '', action_id: '' });
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
    if (!formData.action_id || !formData.instructions || formData.instructions.trim() === '') {
      toast.error('Please fill in required field');
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/exercises/${selectedExercise.exercise_id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Exercise updated successfully!');
        setEditDialogOpen(false);
        setSelectedExercise(null);
        setFormData({ name: '', category: 'upper_body', difficulty: 'beginner', instructions: '', action_id: '' });
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

  const handleDeleteExercise = async (exerciseId) => {
    if (window.confirm('Are you sure you want to delete this exercise?')) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/exercises/${exerciseId}/`, {
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
      }
    }
  };

  const openCreateDialog = () => {
    setFormData({ 
      name: '', 
      category: 'upper_body', 
      difficulty: 'beginner', 
      instructions: '', 
      action_id: '' 
    });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (exercise) => {
    setSelectedExercise(exercise);
    setFormData({
      name: exercise.name,
      category: exercise.category,
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      action_id: exercise.action_id || ''
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (exercise) => {
    setSelectedExercise(exercise);
    setViewDialogOpen(true);
  };

  const toggleRowExpansion = (exerciseId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(exerciseId)) {
      newExpandedRows.delete(exerciseId);
    } else {
      newExpandedRows.add(exerciseId);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      difficulty: 'all',
      search: ''
    });
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'upper_body': return 'primary';
      case 'lower_body': return 'secondary';
      case 'full_body': return 'success';
      case 'Balance': return 'info';
      case 'Functional': return 'warning';
      case 'ROM': return 'error';
      default: return 'default';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
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
            {/* Header with Refresh Button */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Exercise Library ({filteredExercises.length} of {exercises.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchExercises}
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
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateDialog}
                  size="small"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    px: 3,
                    height: '40px',
                    bgcolor: '#3b82f6',
                    '&:hover': {
                      bgcolor: '#2563eb',
                    }
                  }}
                >
                  Create Exercise
                </Button>
              </Box>
            </Box>

            {/* Filter Section */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
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
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      label="Category"
                      sx={{ 
                        borderRadius: 2,
                        height: '40px',
                      }}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      <MenuItem value="upper_body">Upper Body</MenuItem>
                      <MenuItem value="lower_body">Lower Body</MenuItem>
                      <MenuItem value="full_body">Full Body</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Difficulty</InputLabel>
                    <Select
                      value={filters.difficulty}
                      onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                      label="Difficulty"
                      sx={{ 
                        borderRadius: 2,
                        height: '40px',
                      }}
                    >
                      <MenuItem value="all">All Levels</MenuItem>
                      <MenuItem value="beginner">Beginner</MenuItem>
                      <MenuItem value="intermediate">Intermediate</MenuItem>
                      <MenuItem value="advanced">Advanced</MenuItem>
                    </Select>
                  </FormControl>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredExercises.map((exercise) => (
                    <Card 
                      key={exercise.exercise_id} 
                      sx={{ 
                        borderRadius: 3, 
                        border: '1px solid', 
                        borderColor: 'grey.200',
                        elevation: 0,
                        '&:hover': {
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          borderColor: 'primary.main'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <ExerciseIcon />
                      </Avatar>
                    }
                    title={
                      <Typography variant="h6" fontWeight="600">
                        {exercise.name}
                      </Typography>
                    }
                    subheader={
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        <Chip 
                          label={exercise.category.replace('_', ' ').toUpperCase()} 
                          color={getCategoryColor(exercise.category)}
                          size="small"
                        />
                        <Chip 
                          label={exercise.difficulty.toUpperCase()} 
                          color={getDifficultyColor(exercise.difficulty)}
                          size="small"
                        />
                        {exercise.action_id ? (
                          <Chip 
                            icon={<AIIcon />}
                            label="AI Enabled" 
                            color="success" 
                            size="small"
                          />
                        ) : (
                          <Chip 
                            label="Manual Only" 
                            color="default" 
                            size="small"
                          />
                        )}
                      </Box>
                    }
                    action={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={() => openViewDialog(exercise)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Exercise">
                          <IconButton 
                            size="small" 
                            onClick={() => openEditDialog(exercise)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Exercise">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteExercise(exercise.exercise_id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={expandedRows.has(exercise.exercise_id) ? "Hide Details" : "Show Details"}>
                          <IconButton 
                            size="small" 
                            onClick={() => toggleRowExpansion(exercise.exercise_id)}
                          >
                            {expandedRows.has(exercise.exercise_id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  />
                  
                  <Collapse in={expandedRows.has(exercise.exercise_id)} timeout="auto" unmountOnExit>
                    <Divider />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Instructions
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                            backgroundColor: 'grey.50',
                            p: 2,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200'
                          }}>
                            {exercise.instructions || 'No instructions provided'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Exercise ID
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {exercise.exercise_id}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Created By
                          </Typography>
                          <Typography variant="body2">
                            {exercise.created_by_name || 'Unknown'}
                          </Typography>
                        </Grid>
                        {exercise.action_id && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              AI Action ID
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {exercise.action_id}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Collapse>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Create Exercise Dialog */}
      <Dialog open={createDialogOpen} onClose={() => {
        setCreateDialogOpen(false);
        setFormData({ name: '', category: 'upper_body', difficulty: 'beginner', instructions: '', action_id: '' });
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="upper_body">Upper Body</MenuItem>
                  <MenuItem value="lower_body">Lower Body</MenuItem>
                  <MenuItem value="full_body">Full Body</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  label="Difficulty"
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Link to Action</InputLabel>
                <Select
                  value={formData.action_id}
                  onChange={(e) => setFormData({ ...formData, action_id: e.target.value })}
                  label="Link to Action"
                  required
                >
                  {Array.isArray(actions) && actions.map((action) => (
                    <MenuItem key={action.id} value={action.id}>
                      {action.name} ({action.mode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setFormData({ name: '', category: 'upper_body', difficulty: 'beginner', instructions: '', action_id: '' });
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="upper_body">Upper Body</MenuItem>
                  <MenuItem value="lower_body">Lower Body</MenuItem>
                  <MenuItem value="full_body">Full Body</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  label="Difficulty"
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Link to Action</InputLabel>
                <Select
                  value={formData.action_id}
                  onChange={(e) => setFormData({ ...formData, action_id: e.target.value })}
                  label="Link to Action"
                  required
                >
                  {Array.isArray(actions) && actions.map((action) => (
                    <MenuItem key={action.id} value={action.id}>
                      {action.name} ({action.mode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditExercise} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>

      {/* View Exercise Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Exercise Details</DialogTitle>
        <DialogContent>
          {selectedExercise && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {selectedExercise.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Category
                </Typography>
                <Chip 
                  label={selectedExercise.category.replace('_', ' ').toUpperCase()} 
                  color={getCategoryColor(selectedExercise.category)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Difficulty
                </Typography>
                <Chip 
                  label={selectedExercise.difficulty.toUpperCase()} 
                  color={getDifficultyColor(selectedExercise.difficulty)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Instructions
                </Typography>
                <Typography variant="body1">
                  {selectedExercise.instructions}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  AI Recognition
                </Typography>
                {selectedExercise.action_id ? (
                  <Chip 
                    icon={<AIIcon />}
                    label="AI Enabled" 
                    color="success" 
                    size="small"
                  />
                ) : (
                  <Chip 
                    label="Manual Only" 
                    color="default" 
                    size="small"
                  />
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExerciseManagementCenter;
