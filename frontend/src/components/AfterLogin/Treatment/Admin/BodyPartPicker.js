import React from "react";
import { Box, Typography, Chip } from "@mui/material";

// Simple clickable body map using SVG regions.
// Emits values like 'left_shoulder', 'right_elbow', 'spine', 'core', etc.
// Props: value (string), onChange (fn), height (number)
const BodyPartPicker = ({ value, onChange, height = 420 }) => {
  const handleSelect = (part) => {
    if (typeof onChange === 'function') onChange(part);
  };

  const isSelected = (part) => value === part;

  // Colors
  const baseFill = "#E0E0E0";
  const hoverFill = "#BDBDBD";
  const selectedFill = "#90CAF9";
  const stroke = "#616161";

  // Keep aspect ratio approximately 240x480
  const width = Math.round((height / 2));

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
        Select Body Part
      </Typography>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 1,
          display: 'inline-block',
          bgcolor: 'white',
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox="0 0 240 480"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          {/* Head/Neck */}
          <circle cx="120" cy="40" r="22" fill={baseFill} stroke={stroke} />
          <rect
            x="108" y="64" width="24" height="24"
            fill={isSelected('neck') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('neck')}
          />

          {/* Torso (core / spine) */}
          <rect
            x="90" y="90" width="60" height="100"
            fill={isSelected('core') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('core')}
          />
          <rect
            x="118" y="95" width="4" height="90"
            fill={isSelected('spine') ? selectedFill : hoverFill}
            stroke={stroke}
            onClick={() => handleSelect('spine')}
          />

          {/* Hips */}
          <rect
            x="90" y="190" width="60" height="28"
            fill={hoverFill}
            stroke={stroke}
          />
          <rect
            x="90" y="190" width="30" height="28"
            fill={isSelected('left_hip') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('left_hip')}
          />
          <rect
            x="120" y="190" width="30" height="28"
            fill={isSelected('right_hip') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('right_hip')}
          />

          {/* Arms - Shoulders */}
          <rect
            x="60" y="95" width="28" height="24"
            fill={isSelected('left_shoulder') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('left_shoulder')}
          />
          <rect
            x="152" y="95" width="28" height="24"
            fill={isSelected('right_shoulder') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('right_shoulder')}
          />

          {/* Arms - Upper (elbows area) */}
          <rect
            x="48" y="120" width="24" height="46"
            fill={isSelected('left_elbow') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('left_elbow')}
          />
          <rect
            x="168" y="120" width="24" height="46"
            fill={isSelected('right_elbow') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('right_elbow')}
          />

          {/* Arms - Lower (wrists area) */}
          <rect
            x="46" y="166" width="24" height="46"
            fill={isSelected('left_wrist') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('left_wrist')}
          />
          <rect
            x="170" y="166" width="24" height="46"
            fill={isSelected('right_wrist') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('right_wrist')}
          />

          {/* Legs - Thighs (knees area) */}
          <rect
            x="96" y="220" width="20" height="70"
            fill={isSelected('left_knee') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('left_knee')}
          />
          <rect
            x="124" y="220" width="20" height="70"
            fill={isSelected('right_knee') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('right_knee')}
          />

          {/* Legs - Calves (ankles area) */}
          <rect
            x="96" y="290" width="20" height="80"
            fill={isSelected('left_ankle') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('left_ankle')}
          />
          <rect
            x="124" y="290" width="20" height="80"
            fill={isSelected('right_ankle') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('right_ankle')}
          />

          {/* Full body fallback */}
          <rect
            x="20" y="20" width="36" height="24"
            rx="6"
            fill={isSelected('full_body') ? selectedFill : baseFill}
            stroke={stroke}
            onClick={() => handleSelect('full_body')}
          />
          <text x="23" y="36" fontSize="10" fill="#37474F">FULL</text>
        </svg>
      </Box>

      <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          Selected:
        </Typography>
        {value ? (
          <Chip label={value.replace('_', ' ')} size="small" color="primary" />
        ) : (
          <Chip label="None" size="small" />
        )}
      </Box>
    </Box>
  );
};

export default BodyPartPicker;


