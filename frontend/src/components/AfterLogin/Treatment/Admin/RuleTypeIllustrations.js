import React from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";

const SvgCard = ({ title, children }) => (
  <Paper sx={{ p: 2 }} variant="outlined">
    <Typography variant="subtitle2" sx={{ mb: 1 }}>{title}</Typography>
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      {children}
    </Box>
  </Paper>
);

const RuleTypeIllustrations = () => {
  const stroke = "#455A64";
  const green = "#43A047";
  const blue = "#1E88E5";
  const orange = "#FB8C00";
  const grey = "#CFD8DC";

  return (
    <Grid container spacing={2}>
      {/* Angle */}
      <Grid item xs={12} sm={6} md={3}>
        <SvgCard title="Angle">
          <svg width="160" height="120" viewBox="0 0 160 120">
            <circle cx="40" cy="80" r="5" fill={blue} />
            <circle cx="80" cy="60" r="5" fill={blue} />
            <circle cx="120" cy="80" r="5" fill={blue} />
            <line x1="80" y1="60" x2="40" y2="80" stroke={stroke} strokeWidth="3" />
            <line x1="80" y1="60" x2="120" y2="80" stroke={stroke} strokeWidth="3" />
            <path d="M80 60 A30 30 0 0 1 101 73" fill="none" stroke={green} strokeWidth="3" />
            <text x="82" y="55" fontSize="10" fill={stroke}>B</text>
          </svg>
        </SvgCard>
      </Grid>

      {/* Distance */}
      <Grid item xs={12} sm={6} md={3}>
        <SvgCard title="Distance">
          <svg width="160" height="120" viewBox="0 0 160 120">
            <circle cx="50" cy="60" r="6" fill={blue} />
            <circle cx="110" cy="60" r="6" fill={blue} />
            <line x1="50" y1="60" x2="110" y2="60" stroke={green} strokeWidth="4" />
            <text x="72" y="55" fontSize="10" fill={stroke}>normalized</text>
          </svg>
        </SvgCard>
      </Grid>

      {/* Direction */}
      <Grid item xs={12} sm={6} md={3}>
        <SvgCard title="Direction">
          <svg width="160" height="120" viewBox="0 0 160 120">
            <line x1="80" y1="20" x2="80" y2="100" stroke={grey} strokeWidth="2" />
            <polygon points="80,26 74,38 86,38" fill={grey} />
            <circle cx="80" cy="90" r="6" fill={blue} />
            <path d="M80 90 Q 80 70 80 50" stroke={orange} strokeWidth="4" fill="none" />
            <polygon points="80,44 74,56 86,56" fill={orange} />
            <text x="92" y="55" fontSize="10" fill={stroke}>move ↑</text>
          </svg>
        </SvgCard>
      </Grid>

      {/* Position */}
      <Grid item xs={12} sm={6} md={3}>
        <SvgCard title="Position">
          <svg width="160" height="120" viewBox="0 0 160 120">
            <rect x="30" y="20" width="100" height="80" fill="none" stroke={grey} />
            <rect x="30" y="20" width="100" height="24" fill="rgba(30,136,229,0.15)" stroke={blue} />
            <circle cx="70" cy="30" r="6" fill={blue} />
            <text x="36" y="16" fontSize="10" fill={stroke}>Y in [0.0, 0.3]</text>
          </svg>
        </SvgCard>
      </Grid>
    </Grid>
  );
};

export default RuleTypeIllustrations;


