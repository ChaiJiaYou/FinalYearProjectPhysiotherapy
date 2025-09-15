import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
  Paper,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FitnessCenter as ExerciseIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import CreateExerciseDialog from "./CreateExerciseDialog";

const ExerciseManagement = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bodyPartFilter, setBodyPartFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/api/exercises/");
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      } else {
        toast.error("Failed to load exercises");
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Something went wrong while fetching exercises");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExercise = () => {
    setEditingExercise(null);
    setDialogOpen(true);
  };

  const handleEditExercise = (exercise) => {
    setEditingExercise(exercise);
    setDialogOpen(true);
  };

  const handleDeleteExercise = async (exerciseId) => {
    if (window.confirm("Are you sure you want to delete this exercise?")) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/exercises/${exerciseId}/`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          toast.success("Exercise deleted successfully");
          fetchExercises();
        } else {
          toast.error("Failed to delete exercise");
        }
      } catch (error) {
        console.error("Error deleting exercise:", error);
        toast.error("Something went wrong while deleting exercise");
      }
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingExercise(null);
  };

  const handleDialogSuccess = () => {
    fetchExercises();
    handleDialogClose();
  };

  // Filter exercises
  const filteredExercises = exercises.filter(exercise => {
    const name = (exercise?.exercise_name || '').toString().toLowerCase();
    const description = (exercise?.description || '').toString().toLowerCase();
    const instructions = (exercise?.instructions || '').toString().toLowerCase();
    const query = (searchTerm || '').toString().toLowerCase();

    const matchesSearch = name.includes(query) || description.includes(query) || instructions.includes(query);
    const matchesBodyPart = !bodyPartFilter || exercise.body_part === bodyPartFilter;
    const matchesCategory = !categoryFilter || exercise.category === categoryFilter;
    return matchesSearch && matchesBodyPart && matchesCategory;
  });

  // Get unique values for filters
  const uniqueBodyParts = [...new Set(exercises.map(ex => ex.body_part).filter(Boolean))];
  const uniqueCategories = [...new Set(exercises.map(ex => ex.category).filter(Boolean))];

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
          Exercise Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateExercise}
          sx={{
            background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
          }}
        >
          Create Exercise
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search exercises by name, description, or instructions..."
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
          
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Body Part</InputLabel>
            <Select
              value={bodyPartFilter}
              onChange={(e) => setBodyPartFilter(e.target.value)}
              label="Body Part"
            >
              <MenuItem value="">All Body Parts</MenuItem>
              {uniqueBodyParts.map((bodyPart) => (
                <MenuItem key={bodyPart} value={bodyPart}>
                  {bodyPart.replace('_', ' ').toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {uniqueCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Results Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredExercises.length} of {exercises.length} exercises
          {bodyPartFilter && (
            <Chip 
              label={`Body Part: ${bodyPartFilter.replace('_', ' ')}`} 
              size="small" 
              sx={{ ml: 1 }} 
              onDelete={() => setBodyPartFilter('')}
            />
          )}
          {categoryFilter && (
            <Chip 
              label={`Category: ${categoryFilter}`} 
              size="small" 
              sx={{ ml: 1 }} 
              onDelete={() => setCategoryFilter('')}
            />
          )}
        </Typography>
      </Box>

      {/* Exercises Grid */}
      {filteredExercises.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {exercises.length === 0 
            ? "No exercises found. Create your first exercise to get started!"
            : "No exercises match your search criteria."
          }
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredExercises.map((exercise) => (
            <Grid item xs={12} md={6} lg={4} key={exercise.exercise_id}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <ExerciseIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {exercise.exercise_name}
                    </Typography>
                  </Box>
                  
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {exercise.description || 'No description available'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={exercise.body_part?.replace('_', ' ') || 'General'} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={exercise.category || 'Uncategorized'} 
                      size="small" 
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Default Sets:</strong> {exercise.default_sets || 'Not specified'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Default Reps:</strong> {exercise.default_repetitions || 'Not specified'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Pain Threshold:</strong> {exercise.default_pain_threshold || 'Not specified'}
                  </Typography>
                  
                  {exercise.instructions && (
                    <Typography variant="body2" sx={{ 
                      fontStyle: 'italic', 
                      bgcolor: 'grey.50', 
                      p: 1, 
                      borderRadius: 1,
                      mt: 1
                    }}>
                      "{exercise.instructions}"
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <Chip 
                      label={exercise.is_active ? 'Active' : 'Inactive'} 
                      size="small"
                      color={exercise.is_active ? 'success' : 'default'}
                    />
                  </Box>
                  <Box>
                    <Tooltip title="View Details">
                      <IconButton size="small" color="info">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Exercise">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditExercise(exercise)}
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
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <CreateExerciseDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
        editingExercise={editingExercise}
      />
    </Box>
  );
};

export default ExerciseManagement; 