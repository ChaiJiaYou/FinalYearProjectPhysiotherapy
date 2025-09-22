import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  Security,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

const ChangePasswordDialog = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userId = localStorage.getItem('id');
      console.log('User ID from localStorage:', userId); // Debug log
      
      if (!userId) {
        setErrors({ currentPassword: "User ID not found. Please log in again." });
        setLoading(false);
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/api/change-password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId,
        },
        body: JSON.stringify({
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
        }),
      });

      console.log('Response status:', response.status); // Debug log

      if (response.ok) {
        onSuccess("Password changed successfully!");
        handleClose();
      } else {
        const errorData = await response.json();
        console.log('Error response:', errorData); // Debug log
        setErrors({ currentPassword: errorData.error || errorData.message || "Failed to change password" });
      }
    } catch (error) {
      console.error('Network error:', error); // Debug log
      setErrors({ currentPassword: `Network error: ${error.message}. Please check if the server is running.` });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setErrors({});
    setShowPasswords({
      current: false,
      new: false,
      confirm: false,
    });
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha("#3b82f6", 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Security sx={{ color: "#3b82f6", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="600" color="text.primary">
              Change Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update your account password
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Current Password */}
          <TextField
            fullWidth
            label="Current Password"
            name="currentPassword"
            type={showPasswords.current ? "text" : "password"}
            value={formData.currentPassword}
            onChange={handleInputChange("currentPassword")}
            error={!!errors.currentPassword}
            helperText={errors.currentPassword}
            InputProps={{
              startAdornment: <Lock sx={{ mr: 1, color: "text.secondary" }} />,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility("current")}
                    edge="end"
                  >
                    {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mt: 1 }}
          />

          {/* New Password */}
          <TextField
            fullWidth
            label="New Password"
            name="newPassword"
            type={showPasswords.new ? "text" : "password"}
            value={formData.newPassword}
            onChange={handleInputChange("newPassword")}
            error={!!errors.newPassword}
            helperText={errors.newPassword || "Minimum 8 characters"}
            InputProps={{
              startAdornment: <LockOpen sx={{ mr: 1, color: "text.secondary" }} />,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility("new")}
                    edge="end"
                  >
                    {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Confirm Password */}
          <TextField
            fullWidth
            label="Confirm New Password"
            name="confirmPassword"
            type={showPasswords.confirm ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleInputChange("confirmPassword")}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            InputProps={{
              startAdornment: <LockOpen sx={{ mr: 1, color: "text.secondary" }} />,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility("confirm")}
                    edge="end"
                  >
                    {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: "uppercase",
            fontWeight: 600,
            px: 3,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{
            borderRadius: 2,
            textTransform: "uppercase",
            fontWeight: 600,
            px: 3,
            bgcolor: "#3b82f6",
            "&:hover": {
              bgcolor: alpha("#3b82f6", 0.8),
            },
          }}
        >
          {loading ? "Changing..." : "Change Password"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;
