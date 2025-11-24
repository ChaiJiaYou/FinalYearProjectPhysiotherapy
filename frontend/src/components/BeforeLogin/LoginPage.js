import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, IconButton, InputAdornment, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import logo from '../../static/images/logo.png';
import api from '../../utils/axiosConfig';

function LoginPage() {
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    showPassword: false,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.id || !formData.password) {
      setError('Both user id and password are required.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/login/', {
        id: formData.id,
        password: formData.password
      });

      const data = response.data;
      if (data.success) {
        // Note: Backend already checks user status before returning success
        // No need to check is_active here as backend handles it

        localStorage.setItem('id', data.id);
        localStorage.setItem('userId', data.userId || data.id);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('role', data.role);
        navigate('/home');
      } else {
        setError(data.error || 'Invalid username or password.');
        setLoading(false);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="#f8fafc"
      p={0}
    >
      <img
        src={logo}
        alt="Physiotherapy System"
        style={{ 
          marginBottom: '24px', 
          height: '80px',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
        }}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 420,
          bgcolor: 'white',
          p: 4,
          borderRadius: 3,
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          '&:hover': {
            boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          mb={1}
          align="center"
          sx={{
            fontWeight: 600,
            color: '#1e293b',
            '&:hover': {
              cursor: 'default',
            },
          }}
        >
          Physiotherapy System
        </Typography>
        
        <Typography
          variant="body2"
          align="center"
          mb={3}
          sx={{ color: '#64748b' }}
        >
          Please sign in to your account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* UserId Field */}
        <TextField
          label="User ID"
          name="id"
          value={formData.id}
          onChange={handleChange}
          fullWidth
          margin="normal"
          disabled={loading}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              passwordInputRef.current.focus();
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
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
          margin="normal"
          disabled={loading}
          autoComplete="off"
          inputRef={passwordInputRef}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={toggleShowPassword} 
                  edge="end"
                  disabled={loading}
                >
                  {formData.showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
            sx: { borderRadius: 2 }
          }}
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
          sx={{ 
            mt: 1,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'uppercase',
            fontWeight: 600,
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            '&:hover': { 
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            },
            '&:disabled': {
              background: '#e5e7eb',
              color: '#9ca3af'
            }
          }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </Box>
    </Box>
  );
}

export default LoginPage;