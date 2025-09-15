import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Container,
  Avatar,
  Grid,
  Card,
  CardContent,
  Button,
  Fab,
} from "@mui/material";
import {
  FitnessCenter as ExerciseIcon,
  Add as AddIcon,
  SmartToy as SmartToyIcon,
  VideoLibrary as VideoIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";

// 导入我们之前创建的组件
import NewActionWizard from '../Exercise/NewActionWizard';
import RealTimeTest from '../Exercise/RealTimeTest';

const ExerciseAdminCenter = () => {
  const [showNewActionWizard, setShowNewActionWizard] = useState(false);
  const [showRealTimeTest, setShowRealTimeTest] = useState(false);
  const [actions, setActions] = useState([]);

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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <ExerciseIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Exercise Management
            </Typography>
            <Typography variant="h6" color="text.secondary">
              AI-powered action recognition and exercise management
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => setShowNewActionWizard(true)}
          >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <AddIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Create New Action
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Record demo video and create AI-powered action recognition
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => setShowRealTimeTest(true)}
          >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <SmartToyIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Real-time Testing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Test action recognition and counting in real-time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <AnalyticsIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Analytics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View usage statistics and performance metrics
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actions List */}
      <Paper elevation={3} sx={{ borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="600">
            Existing Actions ({actions.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowNewActionWizard(true)}
          >
            Create Action
          </Button>
        </Box>

        {actions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <VideoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No actions created yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start by creating your first AI-powered action recognition
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowNewActionWizard(true)}
            >
              Create First Action
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {actions.map((action) => (
              <Grid item xs={12} md={6} lg={4} key={action.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" fontWeight="600" gutterBottom>
                      {action.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {action.description || 'No description provided'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Mode: {action.mode.toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Created: {new Date(action.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Floating Action Button */}
      <Fab 
        color="primary" 
        aria-label="add" 
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setShowNewActionWizard(true)}
      >
        <AddIcon />
      </Fab>

      {/* New Action Wizard */}
      <NewActionWizard
        open={showNewActionWizard}
        onClose={() => setShowNewActionWizard(false)}
        onSuccess={handleCreateActionSuccess}
      />

      {/* Real-time Test Dialog */}
      {showRealTimeTest && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}
          onClick={() => setShowRealTimeTest(false)}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              p: 2
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Real-time Action Testing</Typography>
              <Button onClick={() => setShowRealTimeTest(false)}>Close</Button>
            </Box>
            <RealTimeTest />
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default ExerciseAdminCenter;
