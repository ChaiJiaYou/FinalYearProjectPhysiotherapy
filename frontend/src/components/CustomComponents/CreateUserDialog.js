import React, { useState } from "react";
import { toast } from "react-toastify";
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, Button, TextField, FormControl, InputLabel, MenuItem, Select, Paper, Avatar, IconButton, Chip, Tooltip, useTheme, CircularProgress, Grid } from "@mui/material";

// Icons
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import WorkIcon from "@mui/icons-material/Work";
import PhotoIcon from "@mui/icons-material/Photo";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import { alpha } from "@mui/material/styles";

const CreateUserDialog = ({ open, onClose, onSubmit, isSubmitting = false }) => {
  const initialUserState = {
    username: "",
    email: "",
    role: "",
    contact_number: "",
    password: "",
    ic: "",
    gender: "",
    dob: "",
    avatar: null, //Avatar file
    specialization: "", // for therapist
    employment_date: "", // for therapist
    emergency_contact: "", // for patient
    admin_role: "CenterAdmin", // for admin - default to CenterAdmin
  };

  const [newUser, setNewUser] = useState(initialUserState);
  const [errors, setErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUserAdminRole, setCurrentUserAdminRole] = useState(null); // Store current user's admin role

  // Fetch current user's admin role
  React.useEffect(() => {
    const fetchCurrentUserRole = async () => {
      try {
        const userId = localStorage.getItem("id");
        const userRole = localStorage.getItem("role");
        
        if (userId && userRole === "admin") {
          const response = await fetch(`http://127.0.0.1:8000/api/get-user/${userId}/`);
          if (response.ok) {
            const data = await response.json();
            // Access admin_role from nested admin_profile object
            const adminRole = data.admin_profile?.admin_role || "CenterAdmin";
            setCurrentUserAdminRole(adminRole);
          }
        }
      } catch (error) {
        console.error("Error fetching current user role:", error);
        setCurrentUserAdminRole("CenterAdmin"); // Default to CenterAdmin if error
      }
    };

    fetchCurrentUserRole();
  }, []);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      resetForm();
    }
  }, [open]);

  // Function to reset form to initial state
  const resetForm = () => {
    setNewUser(initialUserState);
    setErrors({});
    setAvatarPreview(null);
    setAvatarFile(null);
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Apply length limits based on field type
    let processedValue = value;
    switch (name) {
      case 'username':
        // No length limit for username
        processedValue = value;
        break;
      case 'email':
        processedValue = value.slice(0, 100);
        break;
      case 'ic':
        // Only allow numbers and limit to 12 digits
        processedValue = value.replace(/\D/g, '').slice(0, 12);
        break;
      case 'contact_number':
        // Only allow numbers and limit to 11 digits
        processedValue = value.replace(/\D/g, '').slice(0, 11);
        break;
      case 'emergency_contact':
        // Only allow numbers and limit to 11 digits
        processedValue = value.replace(/\D/g, '').slice(0, 11);
        break;
      case 'password':
        processedValue = value.slice(0, 128);
        break;
      default:
        processedValue = value;
    }
    
    setNewUser((prevUser) => ({
      ...prevUser,
      [name]: processedValue,
    }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: ''
      }));
    }
  };

  const handleRoleSpecificChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prevUser) => ({
      ...prevUser,
      [name]: value,
    }));
  };

  const validateForm = () => {
    let tempErrors = {};

    // Username validation - only required
    if (!newUser.username.trim()) {
      tempErrors.username = "Username is required";
    }

    // Email validation
    if (!newUser.email.trim()) {
      tempErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
        tempErrors.email = "Please enter a valid email address (e.g., user@example.com)";
    }

    // IC Number validation
    if (!newUser.ic.trim()) {
      tempErrors.ic = "IC Number is required";
    } else if (!/^\d{12}$/.test(newUser.ic)) {
      tempErrors.ic = "IC Number is not valid";
    }

    // Contact Number validation
    if (!newUser.contact_number.trim()) {
      tempErrors.contact_number = "Contact Number is required";
    } else if (!/^\d{10,11}$/.test(newUser.contact_number)) {
      tempErrors.contact_number = "Contact Number must be 10-11 digits";
    }

    // Password validation
    if (!newUser.password.trim()) {
      tempErrors.password = "Password is required";
    } else if (newUser.password.length < 8) {
      tempErrors.password = "Password must be at least 8 characters";
    }

    // Gender validation
    if (!newUser.gender) {
      tempErrors.gender = "Gender is required";
    }

    // Role validation
    if (!newUser.role) {
      tempErrors.role = "Role is required";
    }

    // Date of Birth validation
    if (!newUser.dob) {
      tempErrors.dob = "Date of Birth is required";
    } else {
      const dobDate = new Date(newUser.dob);
      const today = new Date();
      const age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      
      if (age < 1) {
        tempErrors.dob = "Age must be at least 1 year";
      } else if (age > 120) {
        tempErrors.dob = "Please enter a valid date of birth";
      }
      
      // Check for future dates
      if (dobDate > today) {
        tempErrors.dob = "Date of birth cannot be in the future";
      }
    }

    // Role-specific validations
    if (newUser.role === "admin") {
      if (!newUser.admin_role) {
        tempErrors.admin_role = "Admin Role is required";
      }
    }
    
    if (newUser.role === "patient") {
      if (!newUser.emergency_contact.trim()) {
        tempErrors.emergency_contact = "Emergency Contact is required";
      } else if (!/^\d{10,11}$/.test(newUser.emergency_contact)) {
        tempErrors.emergency_contact = "Emergency Contact must be 10-11 digits";
      }
    }

    // IC and DOB matching validation
    if (newUser.ic && newUser.dob && !tempErrors.ic && !tempErrors.dob) {
      const dobDate = new Date(newUser.dob);
      const year = dobDate.getFullYear().toString().slice(-2);
      const month = (dobDate.getMonth() + 1).toString().padStart(2, "0");
      const day = dobDate.getDate().toString().padStart(2, "0");

      const icYear = newUser.ic.slice(0, 2);
      const icMonth = newUser.ic.slice(2, 4);
      const icDay = newUser.ic.slice(4, 6);

      if (icYear !== year || icMonth !== month || icDay !== day) {
        tempErrors.ic = `IC Number does not match Date of Birth (Expected: ${year}${month}${day}...)`;
      }
    }

    // IC Gender validation - check if last digit matches selected gender
    if (newUser.ic && newUser.gender && !tempErrors.ic) {
      const lastDigit = parseInt(newUser.ic.slice(-1));
      const isOdd = lastDigit % 2 === 1;
      
      if (newUser.gender === 'male' && !isOdd) {
        tempErrors.gender = "Gender does not match IC number (Last digit should be odd for male)";
      } else if (newUser.gender === 'female' && isOdd) {
        tempErrors.gender = "Gender does not match IC number (Last digit should be even for female)";
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };
  const theme = useTheme();

  const handleRemoveAvatar = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    
    // Reset the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Clean up old preview URL if exists
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      
      // Create new preview URL and update state
      const newPreviewUrl = URL.createObjectURL(file);
      setAvatarFile(file);
      setAvatarPreview(newPreviewUrl);
    }
  };

  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split("; ");
      for (let cookie of cookies) {
        const [cookieName, cookieVal] = cookie.split("=");
        if (cookieName === name) {
          cookieValue = decodeURIComponent(cookieVal);
          break;
        }
      }
    }
    return cookieValue;
  };

  // Craete User API Call
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields.", {
        autoClose: 3000,
        closeOnClick: true,
      });
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      for (const [key, value] of Object.entries(newUser)) {
        if (value) formData.append(key, value);
      }

      if (newUser.role === "patient") {
        formData.append("emergency_contact", newUser.emergency_contact || "");
      } else if (newUser.role === "therapist") {
        formData.append("specialization", newUser.specialization || "General");
        if (newUser.employment_date) {
          formData.append("employment_date", newUser.employment_date);
        }
      } else if (newUser.role === "admin") {
        formData.append("admin_role", newUser.admin_role || "General Admin");
      }

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      // ⚡️ NEW: Attach creator_id from localStorage
      const creatorId = localStorage.getItem("userId");
      if (creatorId) {
        formData.append("creator_id", creatorId);
      } else {
        toast.error("Creator ID missing. Please login again.", {
          autoClose: 3000,
          closeOnClick: true,
        });
        return;
      }

      // ✅ Get CSRF token from cookies
      const csrfToken = getCookie("csrftoken");

      const response = await fetch("http://127.0.0.1:8000/api/create-user/", {
        method: "POST",
        body: formData,
        headers: {
          "X-CSRFToken": csrfToken,
        },
        credentials: "include", // Even if session not used, still good practice
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("User created successfully!", {
          autoClose: 2000,
          closeOnClick: true,
        });
        // Reset form after successful creation
        resetForm();
        if (typeof onClose === "function") onClose();
        if (typeof onSubmit === "function") onSubmit(data);
      } else {
        toast.error(`Error: ${JSON.stringify(data.error)}`, {
          autoClose: 3500,
          closeOnClick: true,
        });
      }
    } catch (error) {
      console.error("Create user error:", error);
      toast.error("Something went wrong. Please try again.", {
        autoClose: 3500,
        closeOnClick: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: theme.palette.background.default, borderRadius: 2, width: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <BadgeIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="500">
          Basic Information
        </Typography>
      </Box>
      <Grid item container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Username"
            name="username"
            value={newUser.username}
            onChange={handleInputChange}
            error={!!errors.username}
            helperText={errors.username || "Enter user's full name"}
            autoComplete="off"
            inputProps={{
              maxLength: 150
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField 
            fullWidth 
            label="Email" 
            name="email" 
            type="email" 
            value={newUser.email} 
            onChange={handleInputChange} 
            error={!!errors.email} 
            helperText={errors.email || "Enter valid email address"} 
            autoComplete="off"
            inputProps={{
              maxLength: 100
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField 
            fullWidth 
            label="Password" 
            name="password" 
            type="password" 
            value={newUser.password} 
            onChange={handleInputChange} 
            error={!!errors.password} 
            helperText={errors.password || "Minimum 8 characters"} 
            autoComplete="new-password"
            inputProps={{
              maxLength: 128
            }}
          />
        </Grid>
      </Grid>
    </Paper>
  );

  const renderPersonalDetails = () => (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: theme.palette.background.default, borderRadius: 2, width: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <PersonIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="500">
          Personal Details
        </Typography>
      </Box>
      <Grid item container spacing={3} sx={{ flexWrap: "wrap" }}>
        {/* Row 1 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="IC Number (without -)"
            name="ic"
            type="text"
            value={newUser.ic}
            onChange={handleInputChange}
            error={!!errors.ic}
            helperText={errors.ic || (newUser.dob ? (() => {
              const dobDate = new Date(newUser.dob);
              const year = dobDate.getFullYear().toString().slice(-2);
              const month = (dobDate.getMonth() + 1).toString().padStart(2, '0');
              const day = dobDate.getDate().toString().padStart(2, '0');
              return `Expected format: ${year}${month}${day}XXXXXX`;
            })() : "Enter 12 digits (YYMMDDXXXXXX)")}
            autoComplete="off"
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
              maxLength: 12
            }}
            sx={{
              '& .MuiFormHelperText-root': {
                fontSize: '0.75rem',
                fontFamily: 'monospace'
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.gender}>
            <InputLabel>Gender</InputLabel>
            <Select name="gender" value={newUser.gender} onChange={handleInputChange} label="Gender">
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
            </Select>
            {errors.gender && (
              <Typography variant="caption" color="error">
                {errors.gender}
              </Typography>
            )}
          </FormControl>
        </Grid>

        {/* Row 2 */}
        <Grid item xs={12} sm={6}>
          <TextField 
            fullWidth 
            label="Date of Birth" 
            name="dob" 
            type="date" 
            value={newUser.dob} 
            onChange={handleInputChange} 
            InputLabelProps={{ shrink: true }} 
            error={!!errors.dob} 
            helperText={errors.dob || "Select your date of birth"}
            autoComplete="off"
            inputProps={{
              max: new Date().toISOString().split('T')[0], // Prevent future dates
              pattern: "\\d{4}-\\d{2}-\\d{2}"
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '1rem',
              },
              '& .MuiFormLabel-root': {
                fontSize: '1rem',
              }
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Contact Number"
            name="contact_number"
            type="text"
            value={newUser.contact_number}
            onChange={handleInputChange}
            error={!!errors.contact_number}
            helperText={errors.contact_number || "Enter 10-11 digits without '-'"}
            autoComplete="off"
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
              maxLength: 11,
            }}
            sx={{
              '& .MuiFormHelperText-root': {
                fontSize: '0.75rem'
              }
            }}
          />
        </Grid>
      </Grid>
    </Paper>
  );

  const renderRoleInfo = () => (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: theme.palette.background.default, borderRadius: 2, mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <WorkIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="500">
          Role Information
        </Typography>
      </Box>
      <Grid item container spacing={3}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.role}>
            <InputLabel>Role</InputLabel>
            <Select name="role" value={newUser.role} onChange={handleInputChange} label="Role" MenuProps={{ PaperProps: { sx: { maxHeight: 200 } } }}>
              <MenuItem value="admin">
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Chip size="small" label="Admin" color="primary" sx={{ mr: 1, backgroundColor: "primary.dark" }} />
                  System Administrator
                </Box>
              </MenuItem>
              <MenuItem value="patient">
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Chip size="small" label="Patient" color="info" sx={{ mr: 1 }} />
                  Patient Account
                </Box>
              </MenuItem>
              <MenuItem value="therapist">
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Chip size="small" label="Therapist" color="secondary" sx={{ mr: 1 }} />
                  Therapist Account
                </Box>
              </MenuItem>
            </Select>
            {errors.role && (
              <Typography variant="caption" color="error">
                {errors.role}
              </Typography>
            )}
          </FormControl>
        </Grid>

        {newUser.role && (
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: "rgba(0, 0, 0, 0.03)",
                borderRadius: 1,
                height: "100%",
                display: "flex",
                alignItems: "center",
              }}>
              <Typography variant="body2" color="text.secondary">
                {newUser.role === "admin" && "Administrative access to system settings and user management."}
                {newUser.role === "patient" && "Standard patient account with access to appointments and medical records."}
                {newUser.role === "therapist" && "Professional account with calendar access and patient management."}
              </Typography>
            </Paper>
          </Grid>
        )}

        {newUser.role === "admin" && (
          <Grid item xs={12}>
            {currentUserAdminRole === "SuperAdmin" ? (
              // Super Admin can choose between CenterAdmin and SuperAdmin
              <FormControl fullWidth error={!!errors.admin_role}>
                <InputLabel>Admin Role</InputLabel>
                <Select 
                  name="admin_role" 
                  value={newUser.admin_role} 
                  onChange={handleRoleSpecificChange} 
                  label="Admin Role"
                >
                  <MenuItem value="CenterAdmin">Center Admin</MenuItem>
                  <MenuItem value="SuperAdmin">Super Admin</MenuItem>
                </Select>
                {errors.admin_role && (
                  <Typography variant="caption" color="error">
                    {errors.admin_role}
                  </Typography>
                )}
              </FormControl>
            ) : (
              // Center Admin can only create Center Admin
              <TextField 
                fullWidth 
                label="Admin Role" 
                name="admin_role" 
                value="Center Admin"
                disabled
                helperText="Center Admin can only create Center Admin users"
                InputProps={{
                  readOnly: true,
                }}
              />
            )}
          </Grid>
        )}

        {newUser.role === "therapist" && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Specialization" name="specialization" value={newUser.specialization} onChange={handleRoleSpecificChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Employment Date" 
                name="employment_date" 
                type="date" 
                value={newUser.employment_date} 
                onChange={handleRoleSpecificChange} 
                InputLabelProps={{ shrink: true }}
                helperText="Select the employment start date"
                inputProps={{
                  pattern: "\\d{4}-\\d{2}-\\d{2}"
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '1rem',
                  },
                  '& .MuiFormLabel-root': {
                    fontSize: '1rem',
                  }
                }}
              />
            </Grid>
          </>
        )}

        {newUser.role === "patient" && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Emergency Contact Number"
              name="emergency_contact"
              type="text"
              value={newUser.emergency_contact}
              onChange={handleRoleSpecificChange}
              error={!!errors.emergency_contact}
              helperText={errors.emergency_contact || "Enter 10-11 digits (e.g., 0123456789)"}
              autoComplete="off"
              inputProps={{
                inputMode: "numeric",
                pattern: "[0-9]*",
                maxLength: 11,
                placeholder: "e.g., 0123456789"
              }}
            />
          </Grid>
        )}
      </Grid>
    </Paper>
  );

  const renderAvatarUpload = () => (
    <Paper elevation={0} sx={{ p: 3, backgroundColor: theme.palette.background.default, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <PhotoIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="500">
          Profile Avatar
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column">
        <Box
          sx={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            border: "2px dashed",
            borderColor: "primary.main",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            mb: 2,
            p: 1,
            backgroundColor: "rgba(0, 0, 0, 0.02)",
          }}>
          {avatarPreview ? (
            <>
              <Avatar src={avatarPreview} alt="Avatar Preview" sx={{ width: "100%", height: "100%" }} />
              <IconButton
                size="small"
                sx={{
                  position: "absolute",
                  bottom: 5,
                  right: 5,
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                  },
                }}
                onClick={handleRemoveAvatar}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          ) : (
            <Box sx={{ textAlign: "center" }}>
              <PhotoIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No avatar selected
              </Typography>
            </Box>
          )}
        </Box>

        <Box display="flex" gap={1}>
          <Button
            component="label"
            variant="contained"
            startIcon={<PhotoCamera />}
            sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: "primary.dark" } }}>
            Upload Photo
            <input 
              type="file" 
              hidden 
              accept="image/*" 
              onChange={handleAvatarChange}
              key={avatarFile ? undefined : 'reset'} // Reset the input when avatar is removed
            />
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
          Recommended: Square image, at least 300×300 pixels
        </Typography>
      </Box>
    </Paper>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          width: 900,
          maxWidth: "95vw",
          borderRadius: 2,
          overflow: "hidden",
        },
      }}>
      <DialogTitle
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: "white",
          py: 2,
        }}>
        <Typography variant="h5" component="span" fontWeight="500">
          Create New Account
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 3, backgroundColor: "rgba(0, 0, 0, 0.01)" }}>
        <Box sx={{ my: 1, width: "100%" }}>
          <Grid container spacing={3}>
            {/* Basic Info */}
            <Grid item xs={12}>
              {renderBasicInfo()}
            </Grid>

            {/* Personal Details */}
            <Grid item xs={12}>
              {renderPersonalDetails()}
            </Grid>

            {/* Role + Avatar */}
            <Grid item xs={12}>
              {renderRoleInfo()}
              {renderAvatarUpload()}
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: "space-between" }}>
        <Button 
          onClick={() => {
            resetForm();
            onClose();
          }} 
          variant="outlined" 
          sx={{ minWidth: 100 }} 
          disabled={loading}
        >
          Cancel
        </Button>

        <Button onClick={handleSubmit} variant="contained" color="primary" sx={{ minWidth: 100 }} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}>
          {loading ? "Creating..." : "Create Account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateUserDialog;
