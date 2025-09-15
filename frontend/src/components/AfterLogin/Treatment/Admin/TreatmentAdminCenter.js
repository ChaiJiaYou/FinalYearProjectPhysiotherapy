import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Container,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Assignment as TemplateIcon,
  List as TreatmentIcon,
  TrendingUp as StatsIcon,
} from "@mui/icons-material";
import TemplateManagement from "./TemplateManagement";
import TreatmentList from "./TreatmentList";

const TreatmentAdminCenter = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { label: "Treatments", icon: <TreatmentIcon />, component: <TreatmentList /> },
    { label: "Templates", icon: <TemplateIcon />, component: <TemplateManagement /> },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <DashboardIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Treatment Administration
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Manage treatments and templates
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 72,
                fontSize: '1rem',
                fontWeight: 'medium',
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ gap: 1 }}
              />
            ))}
          </Tabs>
        </Box>
        
        <Box sx={{ p: 3 }}>
          {tabs[activeTab].component}
        </Box>
      </Paper>
    </Container>
  );
};

export default TreatmentAdminCenter; 