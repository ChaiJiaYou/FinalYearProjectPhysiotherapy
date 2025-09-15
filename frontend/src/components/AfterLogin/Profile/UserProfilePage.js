import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  Grid,
  Paper,
  Chip,
  IconButton,
  Button,
  Divider,
  Card,
  CardContent,
  Stack,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WorkIcon from "@mui/icons-material/Work";
import ContactEmergencyIcon from "@mui/icons-material/ContactEmergency";
import SecurityIcon from "@mui/icons-material/Security";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { formatLastLogin } from "../../../utils/dateUtils";
import ChangePasswordDialog from "../../CustomComponents/ChangePasswordDialog";


const UserProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const navigate = useNavigate();

  const getRoleColor = (role) => {
    const roleColors = {
      admin: "#ef4444",
      patient: "#3b82f6",
      therapist: "#8b5cf6",
    };
    return roleColors[role] || "#6b7280";
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <AdminPanelSettingsIcon />;
      case "therapist":
        return <MedicalServicesIcon />;
      case "patient":
        return <LocalHospitalIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      admin: "Administrator",
      patient: "Patient",
      therapist: "Therapist",
    };
    return roleLabels[role] || role;
  };

  // 转换二进制头像数据为URL
  const convertBinaryToUrl = (binaryData) => {
    if (!binaryData) return null;
    
    const binaryString = atob(binaryData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('id'); // Get user ID from localStorage
        if (!userId) {
          toast.error("User ID not found. Please login again.");
          navigate('/');
          return;
        }
        const response = await fetch(`http://127.0.0.1:8000/api/get-user/${userId}/`);
        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Session expired. Please login again.");
            navigate('/');
            return;
          }
          throw new Error("Failed to fetch user profile");
        }
        const data = await response.json();
        setUser(data);
        
        if (data.avatar) {
          const url = convertBinaryToUrl(data.avatar);
          setAvatarUrl(url);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();

    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [navigate]);

  const renderInfoItem = (icon, label, value, color = "text.primary") => (
    <Box sx={{ 
      display: "flex", 
      alignItems: "center", 
      gap: 2, 
      p: 2, 
      borderRadius: 2, 
      bgcolor: "grey.50", 
      mb: 2 
    }}>
      <Box
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {React.cloneElement(icon, { sx: { color: getRoleColor(user?.role), fontSize: 20 } })}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body1" color={color} fontWeight="600">
          {value || "N/A"}
        </Typography>
      </Box>
    </Box>
  );

  const handlePasswordChangeSuccess = (message) => {
    toast.success(message);
    setChangePasswordOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ 
        p: { xs: 2, md: 4 }, 
        backgroundColor: "#f8fafc", 
        minHeight: "100vh",
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center" 
      }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress size={40} />
          <Typography variant="h6" color="text.secondary">Loading profile...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Section with User Profile */}
      <Card
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "grey.200",
          overflow: "hidden",
        }}>
        {/* Header Bar */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${getRoleColor(user?.role)} 0%, ${alpha(getRoleColor(user?.role), 0.8)} 100%)`,
            p: 3,
            color: "white",
          }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha("#ffffff", 0.2),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PersonIcon sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  My Profile
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Manage your personal information and account settings
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<SecurityIcon />}
                onClick={() => setChangePasswordOpen(true)}
                sx={{
                  borderColor: "white",
                  color: "white",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  "&:hover": {
                    borderColor: "white",
                    bgcolor: alpha("#ffffff", 0.1),
                  },
                }}>
                Change Password
              </Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/home/users/edit/${user?.id}`)}
                sx={{
                  bgcolor: "white",
                  color: getRoleColor(user?.role),
                  textTransform: "uppercase",
                  fontWeight: 600,
                  "&:hover": { 
                    bgcolor: alpha("#ffffff", 0.9),
                  },
                }}>
                Edit Profile
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* User Profile Info */}
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={4}>
            <Avatar
              src={avatarUrl || "/static/images/defaultAvatar.png"}
              sx={{
                width: 120,
                height: 120,
                border: "4px solid",
                borderColor: alpha(getRoleColor(user?.role), 0.2),
                boxShadow: `0 8px 32px ${alpha(getRoleColor(user?.role), 0.3)}`,
              }}>
              {getRoleIcon(user?.role)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h3" fontWeight="bold" color="text.primary" sx={{ mb: 1 }}>
                {user?.username}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Chip
                  icon={getRoleIcon(user?.role)}
                  label={getRoleLabel(user?.role)}
                  sx={{
                    bgcolor: alpha(getRoleColor(user?.role), 0.1),
                    color: getRoleColor(user?.role),
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    height: 32,
                    borderRadius: 2,
                  }}
                />
                <Chip
                  icon={<BadgeIcon />}
                  label={`A${user?.id.toString().padStart(4, '0')}`}
                  sx={{
                    bgcolor: alpha("#00796b", 0.1),
                    color: "#00796b",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    height: 32,
                    borderRadius: 2,
                  }}
                />
              </Stack>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <EmailIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                      {user?.email || "No email provided"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PhoneIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                      {user?.contact_number || "No contact provided"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <BadgeIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                      IC: {user?.ic || "Not provided"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* System Information */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.200",
              height: "fit-content",
            }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(getRoleColor(user?.role), 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AccessTimeIcon sx={{ color: getRoleColor(user?.role), fontSize: 24 }} />
                </Box>
                <Typography variant="h6" fontWeight="600" color="text.primary">
                  System Information
                </Typography>
              </Box>
              {renderInfoItem(<CalendarTodayIcon />, "Created Date", user?.create_date)}
              {renderInfoItem(<AccessTimeIcon />, "Last Login", user?.last_login ? formatLastLogin(user?.last_login) : "Never")}
              {renderInfoItem(<PersonIcon />, "Created By", user?.created_by)}
              {renderInfoItem(<PersonIcon />, "Modified By", user?.modified_by)}
            </CardContent>
          </Card>
        </Grid>

        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.200",
              height: "fit-content",
            }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(getRoleColor(user?.role), 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BadgeIcon sx={{ color: getRoleColor(user?.role), fontSize: 24 }} />
                </Box>
                <Typography variant="h6" fontWeight="600" color="text.primary">
                  Basic Information
                </Typography>
              </Box>
              {renderInfoItem(<BadgeIcon />, "User ID", `A${user?.id.toString().padStart(4, '0')}`)}
              {renderInfoItem(<PersonIcon />, "IC Number", user?.ic)}
              {renderInfoItem(<EmailIcon />, "Email", user?.email)}
              {renderInfoItem(<PhoneIcon />, "Contact", user?.contact_number)}
            </CardContent>
          </Card>
        </Grid>

        {/* Role-Specific Information */}
        <Grid item xs={12}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.200",
            }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(getRoleColor(user?.role), 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {getRoleIcon(user?.role)}
                </Box>
                <Typography variant="h6" fontWeight="600" color="text.primary">
                  {getRoleLabel(user?.role)} Details
                </Typography>
              </Box>

              {user?.role === "admin" && (
                renderInfoItem(<AdminPanelSettingsIcon />, "Admin Role", user?.admin_profile?.admin_role || "System Administrator")
              )}

              {user?.role === "therapist" && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    {renderInfoItem(<MedicalServicesIcon />, "Specialization", user?.therapist_profile?.specialization)}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {renderInfoItem(<WorkIcon />, "Employment Date", user?.therapist_profile?.employment_date)}
                  </Grid>
                </Grid>
              )}

              {user?.role === "patient" && (
                renderInfoItem(<ContactEmergencyIcon />, "Emergency Contact", user?.patient_profile?.emergency_contact)
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </Box>
  );
};

export default UserProfilePage; 