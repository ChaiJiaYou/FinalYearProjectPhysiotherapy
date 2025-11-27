import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Chip,
  Tooltip,
  CardActions,
  TextField,
} from "@mui/material";
import {
  Add as AddIcon,
  SmartToy as SmartToyIcon,
  VideoLibrary as VideoIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  VideocamOff as VideocamOffIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

// 导入我们之前创建的组件
import NewActionWizard from '../Exercise/NewActionWizard';
import RealTimeTest from '../Exercise/RealTimeTest';

const ActionLearningCenter = () => {
  const [showNewActionWizard, setShowNewActionWizard] = useState(false);
  const [showRealTimeTest, setShowRealTimeTest] = useState(false);
  const [actions, setActions] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionToDelete, setActionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Demo video states
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState(null);
  const [demoVideoLoading, setDemoVideoLoading] = useState(false);
  
  // Edit description states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [actionToEdit, setActionToEdit] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  // 获取所有动作列表
  const fetchActions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/actions/');
      if (response.ok) {
        const data = await response.json();
        setActions(data.actions || []);
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
    }
  };

  React.useEffect(() => {
    fetchActions();
  }, []);

  const handleCreateActionSuccess = (actionData) => {
    toast.success(`Action "${actionData.name}" created successfully!`);
    fetchActions(); // 刷新列表
    setShowNewActionWizard(false);
  };

  // 打开删除确认对话框
  const handleDeleteClick = (action) => {
    setActionToDelete(action);
    setDeleteDialogOpen(true);
  };

  // 执行删除
  const handleConfirmDelete = async () => {
    if (!actionToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/actions/${actionToDelete.id}/delete/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Action deleted successfully!');
        
        // 显示删除详情
        if (data.details) {
          const { templates_deleted, samples_deleted, videos_deleted, exercises_unlinked } = data.details;
          const details = [];
          if (templates_deleted > 0) details.push(`${templates_deleted} templates`);
          if (samples_deleted > 0) details.push(`${samples_deleted} samples`);
          if (videos_deleted > 0) details.push(`${videos_deleted} videos`);
          if (exercises_unlinked > 0) details.push(`${exercises_unlinked} exercises unlinked`);
          
          if (details.length > 0) {
            toast.info(`Deleted: ${details.join(', ')}`);
          }
        }
        
        fetchActions(); // 刷新列表
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete action');
      }
    } catch (error) {
      console.error('Error deleting action:', error);
      toast.error('Something went wrong while deleting action');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setActionToDelete(null);
    }
  };

  // Open edit description dialog
  const handleEditDescription = (action) => {
    setActionToEdit(action);
    setEditDescription(action.description || '');
    setEditDialogOpen(true);
  };

  // Update action description
  const handleUpdateDescription = async () => {
    if (!actionToEdit) return;

    setUpdating(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/actions/${actionToEdit.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: editDescription
        })
      });

      if (response.ok) {
        toast.success('Action description updated successfully!');
        setEditDialogOpen(false);
        setActionToEdit(null);
        setEditDescription('');
        fetchActions(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update description');
      }
    } catch (error) {
      console.error('Error updating description:', error);
      toast.error('Something went wrong while updating description');
    } finally {
      setUpdating(false);
    }
  };

  // View demo video function
  const viewDemoVideo = async (actionId) => {
    setDemoVideoLoading(true);
    setShowDemoVideo(true);
    
    try {
      // Fetch action samples to get demo video
      const response = await fetch(`http://127.0.0.1:8000/api/actions/${actionId}/`);
      
      if (response.ok) {
        const actionData = await response.json();
        
        // Check if action has samples with video
        if (actionData.samples && actionData.samples.length > 0) {
          const sampleWithVideo = actionData.samples.find(sample => sample.video_url);
          
          if (sampleWithVideo) {
            // Construct full URL for video
            const videoUrl = sampleWithVideo.video_url.startsWith('http')
              ? sampleWithVideo.video_url
              : `http://127.0.0.1:8000${sampleWithVideo.video_url}`;
            setDemoVideoUrl(videoUrl);
          } else {
            setDemoVideoUrl(null);
            toast.info('No demo video available for this action');
          }
        } else {
          setDemoVideoUrl(null);
          toast.info('No demo video available for this action');
        }
      } else {
        throw new Error('Failed to fetch action details');
      }
    } catch (error) {
      console.error('Error fetching demo video:', error);
      toast.error('Failed to load demo video');
      setDemoVideoUrl(null);
    } finally {
      setDemoVideoLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        {/* 页面头部 - 遵循User Management设计系统 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              Action Learning
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchActions}
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
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowNewActionWizard(true)}
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3,
                bgcolor: '#3b82f6',
                '&:hover': {
                  bgcolor: '#2563eb',
                }
              }}
            >
              Create Action
            </Button>
          </Box>
        </Box>

        {/* Quick Actions */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: '100%',
                border: '1px solid',
                borderColor: 'grey.200',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  borderColor: '#3b82f6',
                }
              }}
              onClick={() => setShowNewActionWizard(true)}
            >
              <CardContent sx={{ textAlign: 'center', py: 5, px: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <AddIcon sx={{ fontSize: 48, color: '#3b82f6' }} />
                </Box>
                <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#1e293b' }}>
                  Create New Action
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Record demo video and create AI-powered action recognition
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: '100%',
                border: '1px solid',
                borderColor: 'grey.200',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  borderColor: '#8b5cf6',
                }
              }}
              onClick={() => setShowRealTimeTest(true)}
            >
              <CardContent sx={{ textAlign: 'center', py: 5, px: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'rgba(139, 92, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 48, color: '#8b5cf6' }} />
                </Box>
                <Typography variant="h5" fontWeight="600" gutterBottom sx={{ color: '#1e293b' }}>
                  Real-time Testing
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Test action recognition and counting in real-time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions List */}
        <Paper 
          elevation={1} 
          sx={{ 
            borderRadius: 2, 
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'grey.200',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            p: 3 
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Existing Actions ({actions.length})
            </Typography>
          </Box>

        {actions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                bgcolor: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <VideoIcon sx={{ fontSize: 56, color: '#3b82f6' }} />
            </Box>
            <Typography variant="h5" fontWeight="600" sx={{ color: '#1e293b', mb: 1 }}>
              No actions created yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              Start by creating your first AI-powered action recognition
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowNewActionWizard(true)}
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                bgcolor: '#3b82f6',
                '&:hover': {
                  bgcolor: '#2563eb',
                }
              }}
            >
              Create First Action
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {actions.map((action) => (
              <Grid item xs={12} md={6} lg={4} key={action.id}>
                <Card 
                  variant="outlined"
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                      transform: 'translateY(-4px)',
                      borderColor: '#3b82f6',
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" fontWeight="600" sx={{ flexGrow: 1 }}>
                        {action.name}
                      </Typography>
                      <Chip 
                        label={action.mode.toUpperCase()} 
                        size="small" 
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                      {action.description || 'No description provided'}
                    </Typography>
                    
                    {/* Statistics */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                      <Tooltip title="Number of templates">
                        <Chip 
                          icon={<SmartToyIcon />}
                          label={`${action.template_count || 0} Templates`} 
                          size="small" 
                          variant="outlined"
                          color="secondary"
                        />
                      </Tooltip>
                      <Tooltip title="Number of demo samples">
                        <Chip 
                          icon={<VideoIcon />}
                          label={`${action.sample_count || 0} Samples`} 
                          size="small" 
                          variant="outlined"
                          color="info"
                        />
                      </Tooltip>
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Created: {new Date(action.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    <Tooltip title="Edit description">
                      <IconButton 
                        size="small" 
                        color="default"
                        onClick={() => handleEditDescription(action)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View demo video">
                      <IconButton 
                        size="small" 
                        color="secondary"
                        onClick={() => viewDemoVideo(action.id)}
                      >
                        <PlayCircleOutlineIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Test this action">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => setShowRealTimeTest(true)}
                      >
                        <PlayIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete action and all associated data">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteClick(action)}
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
      </Paper>


      {/* New Action Wizard */}
      <NewActionWizard
        open={showNewActionWizard}
        onClose={() => setShowNewActionWizard(false)}
        onSuccess={handleCreateActionSuccess}
      />

      {/* Real-time Test Dialog */}
      <Dialog 
        open={showRealTimeTest} 
        onClose={() => setShowRealTimeTest(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            width: '95vw',
            height: '90vh',
            maxWidth: '1400px',
            maxHeight: '90vh',
            margin: 'auto'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6">Real-time Action Testing</Typography>
          <Button onClick={() => setShowRealTimeTest(false)}>Close</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 2, height: '100%', overflow: 'auto' }}>
          <RealTimeTest />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          Confirm Delete Action
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the action <strong>"{actionToDelete?.name}"</strong>?
          </DialogContentText>
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
            <Typography variant="subtitle2" color="error" gutterBottom sx={{ fontWeight: 600 }}>
              ⚠️ This action cannot be undone. The following will be deleted:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              <li>
                <Typography variant="body2">
                  <strong>{actionToDelete?.template_count || 0} template(s)</strong> - AI recognition patterns
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>{actionToDelete?.sample_count || 0} sample(s)</strong> - Demo recordings and keypoints
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>All video files</strong> associated with this action
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Exercise links</strong> will be removed (exercises won't be deleted, but their AI link will be cleared)
                </Typography>
              </li>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? null : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Demo Video Dialog */}
      <Dialog 
        open={showDemoVideo} 
        onClose={() => {
          setShowDemoVideo(false);
          setDemoVideoUrl(null);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Demo Video</Typography>
            <IconButton 
              onClick={() => {
                setShowDemoVideo(false);
                setDemoVideoUrl(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {demoVideoLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Loading demo video...
                </Typography>
              </Box>
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
                controls
                autoPlay
                loop
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
                This action doesn't have a demonstration video yet. 
                <br />
                Demo videos are recorded during action creation.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Description Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => !updating && setEditDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Edit Action Description</Typography>
            <IconButton 
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {actionToEdit && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Action: <strong>{actionToEdit.name}</strong>
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter action description..."
                sx={{ mt: 2 }}
                disabled={updating}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => {
              setEditDialogOpen(false);
              setActionToEdit(null);
              setEditDescription('');
            }}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateDescription} 
            variant="contained"
            disabled={updating}
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': {
                bgcolor: '#2563eb',
              }
            }}
          >
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
};

export default ActionLearningCenter;
