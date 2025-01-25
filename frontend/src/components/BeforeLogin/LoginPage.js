import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, IconButton, InputAdornment, Typography, Box } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import logo from '../../static/images/logo.png';

function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    showPassword: false,
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Clear any errors on input change
  };

  // Toggle password visibility
  const toggleShowPassword = () => {
    setFormData((prev) => ({
      ...prev,
      showPassword: !prev.showPassword,
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Client-side validation
    if (!formData.username || !formData.password) {
      setError('Both username and password are required.');
      return;
    }

    // Call backend API for login
    fetch('http://127.0.0.1:8000/api/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: formData.username,
        password: formData.password,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Save user data in localStorage
          localStorage.setItem('userId', data.id);
          localStorage.setItem('username', data.username);
          localStorage.setItem('role', data.role);

          // Navigate to the appropriate dashboard
          navigate('/Home');
        } else {
          setError(data.error || 'Invalid username or password.');
        }
      })
      .catch(() => {
        setError('An error occurred. Please try again later.');
      });
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="#f4f4f9"
      p={2}
    >
      <img
        src={logo}
        alt="Logo"
        style={{ marginBottom: '20px', height: '80px' }}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: 'white',
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
        <Typography variant="h4" component="h1" mb={2} align="center">
          Login
        </Typography>

        {error && (
          <Typography color="error" mb={2} textAlign="center">
            {error}
          </Typography>
        )}

        <TextField
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Password"
          name="password"
          type={formData.showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          fullWidth
          margin="normal"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={toggleShowPassword} edge="end">
                  {formData.showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Typography align="right" mb={2}>
          <a href="/forgot-password" style={{ textDecoration: 'none', color: '#007bff' }}>
            Forgot Password?
          </a>
        </Typography>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mt: 2, '&:hover': { bgcolor: '#0056b3' } }}
        >
          Login
        </Button>
      </Box>
    </Box>
  );
}

export default LoginPage;
