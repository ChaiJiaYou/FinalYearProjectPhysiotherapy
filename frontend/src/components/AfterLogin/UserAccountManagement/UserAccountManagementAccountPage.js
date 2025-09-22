import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Avatar,
  Grid,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Card,
  CardContent,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WorkIcon from "@mui/icons-material/Work";
import ContactEmergencyIcon from "@mui/icons-material/ContactEmergency";
import AddIcon from "@mui/icons-material/Add";
import SecurityIcon from "@mui/icons-material/Security";
import { formatLastLogin } from "../../../utils/dateUtils";
import { alpha } from "@mui/material/styles";
import ChangeUserPasswordDialog from "../../CustomComponents/ChangeUserPasswordDialog";
import { toast } from "react-toastify";

const UserAccountManagementAccountPage = () => {
  const { id: userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        
        if (data.avatar) {
          setAvatarUrl(convertBinaryToUrl(data.avatar));
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        setError("Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  useEffect(() => {
    return () => {
      if (avatarUrl && avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatarUrl]);

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

  const handleToggleStatus = async () => {
    try {
      const newStatus = !user.status;
      const response = await fetch(`http://127.0.0.1:8000/api/update-user-status/${userId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setUser({ ...user, status: newStatus });
        toast.success(`User ${newStatus ? "activated" : "deactivated"} successfully`);
      } else {
        throw new Error("Failed to update user status");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update user status");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Alert severity="error" sx={{ width: "100%", maxWidth: 500 }}>
          {error}
        </Alert>
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
              onClick={() => navigate('/home/users')}
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
                User Profile
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View and manage user account details
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/home/users/edit/${userId}`)}
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
              }}>
              Edit
            </Button>
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
              }}>
              Change Password
            </Button>
            <Button
              variant="contained"
              startIcon={user?.status ? <BlockIcon /> : <CheckCircleIcon />}
              onClick={handleToggleStatus}
              sx={{
                borderRadius: 2,
                textTransform: 'uppercase',
                fontWeight: 600,
                px: 3,
                bgcolor: user?.status ? '#ef4444' : '#10b981',
                '&:hover': {
                  bgcolor: user?.status ? '#dc2626' : '#059669',
                }
              }}>
              {user?.status ? "Deactivate" : "Activate"}
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
                    src={avatarUrl || "/static/images/defaultAvatar.png"}
                    sx={{
                      width: 120,
                      height: 120,
                      border: "4px solid",
                      borderColor: alpha(getRoleColor(user?.role), 0.2),
                      backgroundColor: "grey.100",
                    }}>
                    {!avatarUrl && <AddIcon sx={{ fontSize: 40, color: "grey.400" }} />}
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
                      <Chip
                        icon={user?.status ? <CheckCircleIcon /> : <BlockIcon />}
                        label={user?.status ? "Active" : "Inactive"}
                        sx={{
                          height: 32,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          backgroundColor: user?.status ? alpha("#2e7d32", 0.1) : alpha("#d32f2f", 0.1),
                          color: user?.status ? "#2e7d32" : "#d32f2f",
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
                        {user?.admin_profile?.admin_role || "Not specified"}
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
      <ChangeUserPasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        userId={userId}
      />
    </Box>
  );
};

export default UserAccountManagementAccountPage;