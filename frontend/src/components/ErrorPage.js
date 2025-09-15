import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { Home, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ErrorPage = ({ status = 404, message = "Page Not Found" }) => {
  const navigate = useNavigate();

  const getErrorInfo = () => {
    switch (status) {
      case 404:
        return {
          title: "404 - Page Not Found",
          description: "The page you're looking for doesn't exist or has been moved.",
          color: "#ef4444"
        };
      case 403:
        return {
          title: "403 - Access Denied",
          description: "You don't have permission to access this page.",
          color: "#f59e0b"
        };
      case 500:
        return {
          title: "500 - Server Error",
          description: "Something went wrong on our end. Please try again later.",
          color: "#ef4444"
        };
      default:
        return {
          title: `${status} - Error`,
          description: message || "An unexpected error occurred.",
          color: "#6b7280"
        };
    }
  };

  const errorInfo = getErrorInfo();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          py: 4,
        }}
      >
        {/* Error Icon */}
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: `${errorInfo.color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: errorInfo.color,
            }}
          >
            {status}
          </Typography>
        </Box>

        {/* Error Title */}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 'bold',
            color: 'text.primary',
            mb: 2,
          }}
        >
          {errorInfo.title}
        </Typography>

        {/* Error Description */}
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            mb: 4,
            maxWidth: 400,
          }}
        >
          {errorInfo.description}
        </Typography>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => navigate('/home')}
            sx={{
              backgroundColor: errorInfo.color,
              '&:hover': {
                backgroundColor: errorInfo.color,
                opacity: 0.9,
              },
              px: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Go to Dashboard
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{
              borderColor: errorInfo.color,
              color: errorInfo.color,
              '&:hover': {
                borderColor: errorInfo.color,
                backgroundColor: `${errorInfo.color}10`,
              },
              px: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Go Back
          </Button>
        </Box>

        {/* Additional Help */}
        <Box sx={{ mt: 4, p: 3, backgroundColor: 'grey.50', borderRadius: 2, maxWidth: 400 }}>
          <Typography variant="body2" color="text.secondary">
            If you believe this is an error, please contact the system administrator.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default ErrorPage;

