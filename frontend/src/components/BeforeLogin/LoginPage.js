import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, IconButton, InputAdornment, Typography, Box } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import logo from '../../static/images/logo.png';

function LoginPage() {
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    showPassword: false,
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Ref to the password input field
  const passwordInputRef = useRef(null);

  // Fetch CSRF token and prefill username from cookies
  useEffect(() => {
    const getCookie = (name) => {
      const cookies = document.cookie.split('; ');
      for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=');
        if (cookieName === name) {
          return decodeURIComponent(cookieValue);
        }
      }
      return '';
    };

    setFormData((prev) => ({
      ...prev,
      id : getCookie('id') || ''
    }));
  }, []);

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
    if (!formData.id || !formData.password) {
      setError('Both user id and password are required.');
      return;
    }

    // Call backend API for login
    fetch('http://127.0.0.1:8000/api/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: formData.id,
        password: formData.password,
      }),
      credentials: 'include', // Include cookies from the backend
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
      p={0}
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
        <Typography
          variant="h4"
          component="h1"
          mb={2}
          align="center"
          sx={{
            '&:hover': {
              cursor: 'default',
            },
          }}
        >
          Login
        </Typography>

        {error && (
          <Typography color="error" mb={2} textAlign="center">
            {error}
          </Typography>
        )}

        {/* UserId Field */}
        <TextField
          label="User ID"
          name="id"
          value={formData.id}
          onChange={handleChange}
          fullWidth
          margin="normal"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              passwordInputRef.current.focus(); // Focus on password field
            }
          }}
        />

        {/* Password Field */}
        <TextField
          label="Password"
          name="password"
          type={formData.showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          fullWidth
          paddingRight
          margin="normal"
          inputRef={passwordInputRef} // Attach the ref to the password field
          inputProps={{
            style: {
              paddingRight: '47px'
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment sx={{
                position:'absolute',
                right: '0',
              }}>
                <IconButton onClick={toggleShowPassword} edge="end" sx={{ mr: 1 }}>
                  {formData.showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
            sx: { paddingRight: '0'},
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
