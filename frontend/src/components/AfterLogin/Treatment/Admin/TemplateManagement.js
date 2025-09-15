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
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Assignment as TemplateIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import CreateTemplateDialog from "./CreateTemplateDialog";

const TemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/api/treatment-templates/");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        toast.error("Failed to load templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Something went wrong while fetching templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/treatment-templates/${templateId}/`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          toast.success("Template deleted successfully");
          fetchTemplates();
        } else {
          toast.error("Failed to delete template");
        }
      } catch (error) {
        console.error("Error deleting template:", error);
        toast.error("Something went wrong while deleting template");
      }
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleDialogSuccess = () => {
    fetchTemplates();
    handleDialogClose();
  };

  // Filter templates based on search term
  const filteredTemplates = templates.filter(template => {
    const name = (template?.name || '').toString().toLowerCase();
    const description = (template?.description || '').toString().toLowerCase();
    const condition = (template?.condition || '').toString().toLowerCase();
    const query = (searchTerm || '').toString().toLowerCase();
    return name.includes(query) || description.includes(query) || condition.includes(query);
  });

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
          Template Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateTemplate}
          sx={{
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
          }}
        >
          Create Template
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search templates by name, description, or condition..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Results Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredTemplates.length} of {templates.length} templates
      </Typography>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {templates.length === 0 
            ? "No templates found. Create your first template to get started!"
            : "No templates match your search criteria."
          }
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.template_id}>
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
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <TemplateIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {template.name}
                    </Typography>
                  </Box>
                  
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={template.treatment_type?.replace('_', ' ')} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={template.condition} 
                      size="small" 
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Exercises:</strong> {template.exercises?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Duration:</strong> {template.estimated_duration_weeks} weeks
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Frequency:</strong> {template.default_frequency || 'Not specified'}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <Chip 
                      label={template.is_active ? 'Active' : 'Inactive'} 
                      size="small"
                      color={template.is_active ? 'success' : 'default'}
                    />
                  </Box>
                  <Box>
                    <Tooltip title="View Details">
                      <IconButton size="small" color="info">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Template">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Template">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteTemplate(template.template_id)}
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
      <CreateTemplateDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
        editingTemplate={editingTemplate}
      />
    </Box>
  );
};

export default TemplateManagement; 