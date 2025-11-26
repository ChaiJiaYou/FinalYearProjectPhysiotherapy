import React from "react";
import {
  Box,
  Typography,
} from "@mui/material";
import TreatmentList from "../Admin/TreatmentList";

const TherapistTreatmentCenter = () => {
  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        {/* 页面头部 - 遵循User Management设计系统 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              Treatment Management
            </Typography>
          </Box>
        </Box>

        {/* TreatmentList组件 */}
        <TreatmentList />
      </Box>
    </Box>
  );
};

export default TherapistTreatmentCenter;
