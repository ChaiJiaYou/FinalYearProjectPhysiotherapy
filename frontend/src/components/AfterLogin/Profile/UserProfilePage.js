import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  Grid,
  Chip,
  Button,
  Stack,
  CircularProgress,
  Card,
  CardContent,
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
import AddIcon from "@mui/icons-material/Add";
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

  const getInitials = (username) => {
    if (!username) return "U";
    return username.charAt(0).toUpperCase();
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


  const handlePasswordChangeSuccess = (message) => {
    toast.success(message);
    setChangePasswordOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ 
        p: 2, 
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
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        {/* 页面头部 - 遵循设计系统 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              My Profile
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your personal information and settings
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<SecurityIcon />}
              onClick={() => setChangePasswordOpen(true)}
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
                }
              }}
            >
              Change Password
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/home/users/edit/${user?.id}?from=profile`)}
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3,
                bgcolor: '#3b82f6',
                '&:hover': {
                  bgcolor: '#2563eb',
                }
              }}
            >
              Edit Profile
            </Button>
          </Box>
        </Box>

        {/* 主要内容区域 - 遵循设计系统 */}
        <Grid container spacing={3}>
          {/* 用户信息卡片 */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={3}>
                  <Avatar
                    src={avatarUrl || undefined}
                    sx={{
                      width: 120,
                      height: 120,
                      border: "4px solid",
                      borderColor: alpha(getRoleColor(user?.role), 0.2),
                      backgroundColor: avatarUrl ? "transparent" : alpha(getRoleColor(user?.role), 0.1),
                      color: avatarUrl ? "inherit" : getRoleColor(user?.role),
                      fontSize: "3rem",
                      fontWeight: 600,
                    }}>
                    {!avatarUrl && getInitials(user?.username)}
                  </Avatar>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 600, color: "text.primary", mb: 2 }}>
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
                    <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
                      <Box display="flex" alignItems="center" gap={1}>
                        <EmailIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                        <Typography variant="body1" sx={{ color: "text.secondary" }}>
                          {user?.email}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PhoneIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                        <Typography variant="body1" sx={{ color: "text.secondary" }}>
                          {user?.contact_number}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* 系统信息卡片 */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <AccessTimeIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                  System Information
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Created
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                      {user?.create_date}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Last Login
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                      {formatLastLogin(user?.last_login)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Created By
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                      {user?.created_by || "System"}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 角色特定信息 */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* 基本信息 */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <PersonIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                  Basic Information
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      User ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                      {user?.id}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      IC Number
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                      {user?.ic}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Email
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                      {user?.email}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Contact
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                      {user?.contact_number}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 角色特定信息 */}
          {user?.role === 'therapist' && user?.therapist_profile && (
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <MedicalServicesIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                    Therapist Information
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Specialization
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                        {user?.therapist_profile?.specialization || "Not specified"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Employment Date
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                        {user?.therapist_profile?.employment_date || "Not specified"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {user?.role === 'patient' && user?.patient_profile && (
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <LocalHospitalIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                    Patient Information
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Emergency Contact
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                        {user?.patient_profile?.emergency_contact || "Not specified"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {user?.role === 'admin' && user?.admin_profile && (
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <AdminPanelSettingsIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                    Admin Information
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Admin Role
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                        {user?.admin_profile?.admin_role 
                          ? user.admin_profile.admin_role === "SuperAdmin" 
                            ? "Super Admin" 
                            : user.admin_profile.admin_role === "CenterAdmin"
                            ? "Center Admin"
                            : user.admin_profile.admin_role
                          : "Not specified"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

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