import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Grid, 
  Avatar, 
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WorkIcon from "@mui/icons-material/Work";
import ContactEmergencyIcon from "@mui/icons-material/ContactEmergency";
import SecurityIcon from "@mui/icons-material/Security";
import AddIcon from "@mui/icons-material/Add";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ConfirmationDialog from "../../CustomComponents/ConfirmationDialog";
import { alpha } from "@mui/material/styles";

const EditUserPage = () => {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [formValues, setFormValues] = useState({
    username: "",
    email: "",
    ic: "",
    contact_number: "",
  });
  const [patientDetails, setPatientDetails] = useState({
    emergency_contact: "",
  });
  const [therapistDetails, setTherapistDetails] = useState({
    specialization: "",
  });
  const [adminDetails, setAdminDetails] = useState({
    admin_role: "",
  });
  const [currentUserAdminRole, setCurrentUserAdminRole] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const getRoleColor = (role) => {
    const roleColors = {
      admin: "#ef4444",
      patient: "#3b82f6",
      therapist: "#8b5cf6",
    };
    return roleColors[role] || "#6b7280";
  };

  const getRoleIcon = (role) => {
    const roleIcons = {
      admin: <AdminPanelSettingsIcon />,
      therapist: <MedicalServicesIcon />,
      patient: <LocalHospitalIcon />,
    };
    return roleIcons[role] || <PersonIcon />;
  };

  // Check if we came from profile page
  const isFromProfile = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('from') === 'profile';
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8000/api/get-user/${userId}/`);
        if (!response.ok) {
          throw new Error("Failed to fetch user details");
        }
        const data = await response.json();
        setUser(data);
        
        setFormValues({
          username: data.username || "",
          email: data.email || "",
          ic: data.ic || "",
          contact_number: data.contact_number || "",
        });

        if (data.patient_profile) {
          setPatientDetails({
            emergency_contact: data.patient_profile.emergency_contact || "",
          });
        }

        if (data.therapist_profile) {
          setTherapistDetails({
            specialization: data.therapist_profile.specialization || "",
          });
        }

        if (data.admin_profile) {
          setAdminDetails({
            admin_role: data.admin_profile.admin_role || "",
          });
        }

        if (data.avatar) {
          const avatarUrl = convertBinaryToUrl(data.avatar);
          setAvatarPreview(avatarUrl);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        toast.error("Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    const fetchCurrentUserRole = async () => {
      try {
        const currentUserId = localStorage.getItem("id");
        const userRole = localStorage.getItem("role");
        
        if (currentUserId && userRole === "admin") {
          const response = await fetch(`http://127.0.0.1:8000/api/get-user/${currentUserId}/`);
          if (response.ok) {
            const data = await response.json();
            const adminRole = data.admin_profile?.admin_role || "CenterAdmin";
            setCurrentUserAdminRole(adminRole);
          }
        }
      } catch (error) {
        console.error("Error fetching current user role:", error);
        setCurrentUserAdminRole("CenterAdmin");
      }
    };

    fetchUserDetails();
    fetchCurrentUserRole();
  }, [userId]);

  const convertBinaryToUrl = (binaryData) => {
    if (!binaryData) return "";
    try {
      const blob = new Blob([Uint8Array.from(atob(binaryData), c => c.charCodeAt(0))], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error converting binary to URL:", error);
      return "";
    }
  };

  const handleInputChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handlePatientDetailsChange = (field, value) => {
    console.log('Patient details change:', field, value);
    setPatientDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleTherapistDetailsChange = (field, value) => {
    console.log('Therapist details change:', field, value);
    setTherapistDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAdminDetailsChange = (field, value) => {
    setAdminDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  // Validation functions
  const validateField = (field, value) => {
    const errors = {};
    
    switch (field) {
      case 'username':
        if (!value.trim()) {
          errors[field] = 'Username is required';
        }
        break;
      case 'email':
        if (!value.trim()) {
          errors[field] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[field] = 'Please enter a valid email address (e.g., user@example.com)';
        }
        break;
      case 'ic':
        // IC number validation removed as it's read-only
        break;
      case 'contact_number':
        if (!value.trim()) {
          errors[field] = 'Contact number is required';
        } else if (!/^\d{10,11}$/.test(value.replace(/\D/g, ''))) {
          errors[field] = 'Contact number must be 10-11 digits';
        }
        break;
      case 'emergency_contact':
        if (!value.trim()) {
          errors[field] = 'Emergency contact is required';
        } else if (!/^\d{10,11}$/.test(value.replace(/\D/g, ''))) {
          errors[field] = 'Emergency contact must be 10-11 digits';
        }
        break;
      case 'specialization':
        if (!value.trim()) {
          errors[field] = 'Specialization is required';
        }
        break;
    }
    
    return errors;
  };

  const validateAllFields = () => {
    const errors = {};
    
    // Validate basic information
    Object.keys(formValues).forEach(key => {
      const fieldErrors = validateField(key, formValues[key]);
      Object.assign(errors, fieldErrors);
    });
    
    // Validate patient details if user is a patient
    if (user.role === 'patient') {
      Object.keys(patientDetails).forEach(key => {
        const fieldErrors = validateField(key, patientDetails[key]);
        Object.assign(errors, fieldErrors);
      });
    }

    // Validate therapist details if user is a therapist
    if (user.role === 'therapist') {
      Object.keys(therapistDetails).forEach(key => {
        const fieldErrors = validateField(key, therapistDetails[key]);
        Object.assign(errors, fieldErrors);
      });
    }
    
    return errors;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setValidationErrors({});
      setFieldErrors({});
      
      // Validate all fields
      const validationErrors = validateAllFields();
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        toast.error("Please fill in all required fields");
        return;
      }
      
      const formData = new FormData();
      
      // Add basic information (exclude IC number as it cannot be modified)
      Object.keys(formValues).forEach(key => {
        if (key !== 'ic') {  // Exclude IC number from updates
          formData.append(key, formValues[key]);
        }
      });

      // Add patient details if user is a patient
      if (user.role === 'patient') {
        console.log('Adding patient details:', patientDetails);
        Object.keys(patientDetails).forEach(key => {
          formData.append(`patient_profile.${key}`, patientDetails[key]);
        });
      }

      // Add therapist details if user is a therapist
      if (user.role === 'therapist') {
        console.log('Adding therapist details:', therapistDetails);
        Object.keys(therapistDetails).forEach(key => {
          formData.append(`therapist_profile.${key}`, therapistDetails[key]);
        });
      }

      // Add admin details if user is an admin and current user is SuperAdmin
      if (user.role === 'admin' && currentUserAdminRole === 'SuperAdmin') {
        console.log('Adding admin details:', adminDetails);
        Object.keys(adminDetails).forEach(key => {
          formData.append(`admin_profile.${key}`, adminDetails[key]);
        });
      }

      // Add avatar if changed
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await fetch(`http://127.0.0.1:8000/api/update-user/${userId}/`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        toast.success("User profile updated successfully!");
        if (isFromProfile()) {
          navigate('/home/profile');
        } else {
          navigate(`/home/users/view/${userId}`);
        }
      } else {
        const errorData = await response.json();
        
        // Handle field-specific errors from backend
        if (errorData.errors) {
          setFieldErrors(errorData.errors);
          toast.error("Please fix the validation errors");
        } else {
          throw new Error(errorData.error || "Failed to update user profile");
        }
      }
    } catch (error) {
      console.error("Error updating user:", error);
      if (error.message.includes("Failed to fetch")) {
        toast.error("Cannot connect to server. Please check your connection and try again.");
      } else {
        toast.error(error.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(true);
  };

  const confirmCancel = () => {
    if (isFromProfile()) {
      navigate('/home/profile');
    } else {
      navigate(`/home/users/view/${userId}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Typography variant="h6" color="error">
          User not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        {/* 页面头部 - 遵循设计系统 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              onClick={() => {
                if (isFromProfile()) {
                  navigate('/home/profile');
                } else {
                  navigate(`/home/users/view/${userId}`);
                }
              }}
              sx={{
                color: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                },
              }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
                Edit User Profile
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Update user account information and settings
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3,
                borderColor: '#3b82f6',
                color: '#3b82f6',
                '&:hover': {
                  borderColor: '#2563eb',
                  bgcolor: 'rgba(59, 130, 246, 0.04)',
                },
                '&:disabled': {
                  borderColor: 'grey.300',
                  color: 'grey.500',
                },
              }}>
              Save Changes
            </Button>
            <Button
              variant="contained"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3,
                bgcolor: '#6b7280',
                '&:hover': {
                  bgcolor: '#4b5563',
                }
              }}>
              Cancel
            </Button>
          </Box>
        </Box>

      {/* User Profile Header Section */}
      <Box sx={{ p: 3, backgroundColor: "white", mb: 2 }}>
        <Box display="flex" alignItems="center" gap={3}>
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={avatarPreview || "/static/images/defaultAvatar.png"}
              sx={{
                width: 120,
                height: 120,
                border: "4px solid",
                borderColor: alpha(getRoleColor(user?.role), 0.2),
                backgroundColor: "grey.100",
              }}>
              {!avatarPreview && <AddIcon sx={{ fontSize: 40, color: "grey.400" }} />}
            </Avatar>
            <IconButton
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: getRoleColor(user?.role),
                color: "white",
                "&:hover": {
                  backgroundColor: alpha(getRoleColor(user?.role), 0.8),
                },
              }}
              component="label">
              <PhotoCameraIcon />
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: "bold", color: "text.primary", mb: 2 }}>
              {user?.username}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                icon={getRoleIcon(user?.role)}
                label={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                sx={{
                  height: 32,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  backgroundColor: alpha(getRoleColor(user?.role), 0.1),
                  color: getRoleColor(user?.role),
                  borderRadius: 2,
                }}
              />
              <Chip
                icon={<WorkIcon />}
                label={user?.id}
                sx={{
                  height: 32,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  backgroundColor: alpha(getRoleColor(user?.role), 0.1),
                  color: getRoleColor(user?.role),
                  borderRadius: 2,
                }}
              />
            </Stack>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              Update user information and role-specific details
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Form Sections */}
      <Grid container spacing={3} sx={{ p: 3 }}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              backgroundColor: "white",
              border: "1px solid",
              borderColor: "grey.200",
              borderRadius: 3,
              p: 3,
            }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 3,
                pb: 2,
                borderBottom: "1px solid",
                borderColor: "grey.200",
              }}>
              <PersonIcon sx={{ fontSize: 20, color: "text.secondary" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
                Basic Information
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField
                label="Username"
                value={formValues.username}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 50) {
                    handleInputChange('username', value);
                  }
                }}
                fullWidth
                error={!!fieldErrors.username}
                helperText={fieldErrors.username || "Enter user's full name (max 50 characters)"}
                inputProps={{
                  maxLength: 50
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="Email"
                type="email"
                value={formValues.email}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 100) {
                    handleInputChange('email', value);
                  }
                }}
                fullWidth
                error={!!fieldErrors.email}
                helperText={fieldErrors.email || "Enter valid email address"}
                inputProps={{
                  maxLength: 100
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="IC Number"
                value={formValues.ic}
                fullWidth
                disabled
                helperText="IC Number cannot be modified"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                  "& .MuiInputBase-input.Mui-disabled": {
                    color: "text.primary",
                    fontWeight: 500,
                  },
                }}
              />
              <TextField
                label="Contact Number"
                value={formValues.contact_number}
                onChange={(e) => {
                  // Only allow numbers and limit to 11 digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                  handleInputChange('contact_number', value);
                }}
                fullWidth
                error={!!fieldErrors.contact_number}
                helperText={fieldErrors.contact_number || "Enter 10-11 digit phone number"}
                inputProps={{
                  maxLength: 11
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            </Box>
          </Box>
        </Grid>

        {/* Role-specific Details */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              backgroundColor: "white",
              border: "1px solid",
              borderColor: "grey.200",
              borderRadius: 3,
              p: 3,
            }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 3,
                pb: 2,
                borderBottom: "1px solid",
                borderColor: "grey.200",
              }}>
              {getRoleIcon(user?.role)}
              <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} Details
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {user?.role === 'patient' && (
                <TextField
                  label="Emergency Contact"
                  value={patientDetails.emergency_contact}
                  onChange={(e) => {
                    // Only allow numbers and limit to 11 digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                    handlePatientDetailsChange('emergency_contact', value);
                  }}
                  fullWidth
                  error={!!fieldErrors.emergency_contact}
                  helperText={fieldErrors.emergency_contact || "Enter 10-11 digit phone number"}
                  inputProps={{
                    maxLength: 11
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ContactEmergencyIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
              )}
              {user?.role === 'therapist' && (
                <TextField
                  label="Specialization"
                  value={therapistDetails.specialization}
                  onChange={(e) => handleTherapistDetailsChange('specialization', e.target.value)}
                  fullWidth
                  error={!!fieldErrors.specialization}
                  helperText={fieldErrors.specialization || "Enter specialization area"}
                  inputProps={{
                    maxLength: 100
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MedicalServicesIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />
              )}
              {user?.role === 'admin' && (
                currentUserAdminRole === 'SuperAdmin' ? (
                  <TextField
                    select
                    label="Admin Level"
                    value={adminDetails.admin_role}
                    onChange={(e) => handleAdminDetailsChange('admin_role', e.target.value)}
                    fullWidth
                    SelectProps={{
                      native: false,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AdminPanelSettingsIcon sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  >
                    <MenuItem value="SuperAdmin">Super Admin</MenuItem>
                    <MenuItem value="CenterAdmin">Center Admin</MenuItem>
                  </TextField>
                ) : (
                  <TextField
                    label="Admin Level"
                    value={adminDetails.admin_role === "SuperAdmin" ? "Super Admin" : adminDetails.admin_role === "CenterAdmin" ? "Center Admin" : adminDetails.admin_role || "Not specified"}
                    fullWidth
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AdminPanelSettingsIcon sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                )
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          open={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={confirmCancel}
          title="Discard Changes"
          message="Are you sure you want to discard all changes? This action cannot be undone."
        />
      </Box>
    </Box>
  );
};

export default EditUserPage;