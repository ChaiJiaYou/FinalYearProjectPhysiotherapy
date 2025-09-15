import React from 'react';
import { Typography, Box } from '@mui/material';

const TestComponent = () => {
  console.log('TestComponent rendered');
  
  return (
    <Box sx={{ p: 4, backgroundColor: 'red', color: 'white' }}>
      <Typography variant="h2">
        TEST COMPONENT - IF YOU SEE THIS, ROUTING WORKS!
      </Typography>
    </Box>
  );
};

export default TestComponent;
