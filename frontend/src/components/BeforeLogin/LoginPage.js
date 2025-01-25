import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TextField, Button, IconButton, InputAdornment, Typography, Box } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import logo from '../../static/images/logo.png';

function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    showPassword: false,
  });

  const [error, setError] = useState({
    username: '',
    password: '',
    credentials: '',
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError({
      ...error,
      [e.target.name]: '',
      credentials: '',
    });
  };

  const toggleShowPassword = () => {
    setFormData({
      ...formData,
      showPassword: !formData.showPassword,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setError({
        username: formData.username ? '' : 'Username is required',
        password: formData.password ? '' : 'Password is required',
        credentials: '',
      });
      return;
    }

    console.log('Form submitted:', formData);
    // Call backend API logic
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
      overflow="hidden"
      padding="0"
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
          transition: 'box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: 6,
          },
        }}
      >
              <Typography variant="h4" component="h1" mb={2}>
        Login
      </Typography>
        <TextField
          label="User ID"
          name="username"
          value={formData.username}
          onChange={handleChange}
          fullWidth
          margin="normal"
          error={!!error.username}
          helperText={error.username}
        />
        <TextField
          label="Password"
          name="password"
          type={formData.showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          fullWidth
          margin="normal"
          error={!!error.password}
          helperText={error.password}
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
          <Link to="/forgot-password" style={{ textDecoration: 'none', color: '#007bff' }}>
            Forgot Password?
          </Link>
        </Typography>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mt: 0, '&:hover': { bgcolor: '#0056b3' } }}
        >
          Login
        </Button>
      </Box>
    </Box>
  );
}

export default LoginPage;
