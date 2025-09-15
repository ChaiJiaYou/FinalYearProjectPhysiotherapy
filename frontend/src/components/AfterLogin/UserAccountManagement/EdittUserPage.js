import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import ChangeUserPasswordDialog from "../../CustomComponents/ChangeUserPasswordDialog";
import { alpha } from "@mui/material/styles";

const EditUserPage = () => {
  const { id: userId } = useParams();
  const navigate = useNavigate();
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
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

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

    fetchUserDetails();
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
  };

  const handlePatientDetailsChange = (field, value) => {
    setPatientDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();
      
      // Add basic information
      Object.keys(formValues).forEach(key => {
        formData.append(key, formValues[key]);
      });

      // Add patient details if user is a patient
      if (user.role === 'patient') {
        Object.keys(patientDetails).forEach(key => {
          formData.append(key, patientDetails[key]);
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
        toast.success("User updated successfully");
        navigate(`/home/users/view/${userId}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(true);
  };

  const confirmCancel = () => {
    navigate(`/home/users/view/${userId}`);
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
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${getRoleColor(user?.role)} 0%, ${alpha(getRoleColor(user?.role), 0.8)} 100%)`,
          p: 3,
          color: "white",
        }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              onClick={() => navigate(-1)}
              sx={{
                color: "white",
                backgroundColor: alpha("#ffffff", 0.2),
                "&:hover": {
                  backgroundColor: alpha("#ffffff", 0.3),
                },
              }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              Edit User Profile
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                borderColor: "white",
                color: "white",
                textTransform: "uppercase",
                fontWeight: 600,
                px: 3,
                borderRadius: 2,
                "&:hover": {
                  borderColor: "white",
                  bgcolor: alpha("#ffffff", 0.1),
                },
                "&:disabled": {
                  borderColor: alpha("#ffffff", 0.5),
                  color: alpha("#ffffff", 0.5),
                },
              }}>
              Save Changes
            </Button>
            <Button
              variant="outlined"
              startIcon={<SecurityIcon />}
              onClick={() => setChangePasswordOpen(true)}
              sx={{
                borderColor: "white",
                color: "white",
                textTransform: "uppercase",
                fontWeight: 600,
                px: 3,
                borderRadius: 2,
                "&:hover": {
                  borderColor: "white",
                  bgcolor: alpha("#ffffff", 0.1),
                },
              }}>
              Change Password
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              sx={{
                borderColor: "white",
                color: "white",
                textTransform: "uppercase",
                fontWeight: 600,
                px: 3,
                borderRadius: 2,
                "&:hover": {
                  borderColor: "white",
                  bgcolor: alpha("#ffffff", 0.1),
                },
              }}>
              Cancel
            </Button>
          </Stack>
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
                onChange={(e) => handleInputChange('username', e.target.value)}
                fullWidth
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
                onChange={(e) => handleInputChange('email', e.target.value)}
                fullWidth
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
                onChange={(e) => handleInputChange('ic', e.target.value)}
                fullWidth
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
                }}
              />
              <TextField
                label="Contact Number"
                value={formValues.contact_number}
                onChange={(e) => handleInputChange('contact_number', e.target.value)}
                fullWidth
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
                  onChange={(e) => handlePatientDetailsChange('emergency_contact', e.target.value)}
                  fullWidth
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
                  value=""
                  fullWidth
                  disabled
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
                <TextField
                  label="Admin Level"
                  value="Super Admin"
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

      {/* Change Password Dialog */}
      <ChangeUserPasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        userId={userId}
      />
    </Box>
  );
};

export default EditUserPage;