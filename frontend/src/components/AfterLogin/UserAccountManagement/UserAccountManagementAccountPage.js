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
import { formatLastLogin } from "../../../utils/dateUtils";
import { alpha } from "@mui/material/styles";
import { toast } from "react-toastify";

const UserAccountManagementAccountPage = () => {
  const { id: userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
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
              User Profile
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/home/users/edit/${userId}`)}
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
              Edit
            </Button>
            <Button
              variant="outlined"
              startIcon={user?.status ? <BlockIcon /> : <CheckCircleIcon />}
              onClick={handleToggleStatus}
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
              {user?.status ? "Deactivate" : "Activate"}
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Main User Information Section */}
      <Box sx={{ p: 3, backgroundColor: "white", mb: 2 }}>
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
              <Box display="flex" alignItems="center" gap={1}>
                <BadgeIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                <Typography variant="body1" sx={{ color: "text.secondary" }}>
                  {user?.ic}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Information Panels */}
      <Grid container spacing={3} sx={{ p: 3 }}>
        {/* System Information */}
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
              <AccessTimeIcon sx={{ fontSize: 20, color: "text.secondary" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
                System Information
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: "grey.100" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CalendarTodayIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    Created Date
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {user?.create_date}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: "grey.100" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    Last Login
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {formatLastLogin(user?.last_login)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: "grey.100" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    Created By
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {user?.created_by || "System"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    Modified By
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {user?.modified_by || "System"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

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
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: "grey.100" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <PersonIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    User ID
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {user?.id}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: "grey.100" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <BadgeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    IC Number
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {user?.ic}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: "grey.100" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <EmailIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    Email
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {user?.email}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <PhoneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    Contact
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {user?.contact_number}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserAccountManagementAccountPage;