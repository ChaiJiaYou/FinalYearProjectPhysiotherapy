import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Avatar,
  Grid,
  IconButton,
  Paper,
  Divider,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
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

  // Function to convert binary avatar data to URL
  const convertBinaryToUrl = (binaryData) => {
    if (!binaryData) return null;
    
    // Convert the binary string to Uint8Array
    const binaryString = atob(binaryData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob and URL
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8000/api/get-user/${userId}/`);
        if (!response.ok) throw new Error("Failed to fetch user details");
        const data = await response.json();
        setUser(data);
        
        // Convert avatar binary data to URL if exists
        if (data.avatar) {
          const url = convertBinaryToUrl(data.avatar);
          setAvatarUrl(url);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        setError(error.message || "Failed to load user details");
        toast.error("Failed to load user details");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();

    // Cleanup function to revoke object URLs
    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [userId]);

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

  const renderInfoItem = (icon, label, value, color = "text.primary") => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
      {React.cloneElement(icon, { sx: { color: "text.secondary" } })}
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1" color={color} fontWeight="500">
          {value || "N/A"}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          bgcolor: "white",
          border: "1px solid",
          borderColor: "grey.200",
        }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              onClick={() => navigate("/home/users")}
              sx={{
                bgcolor: alpha(getRoleColor(user.role), 0.1),
                color: getRoleColor(user.role),
                "&:hover": {
                  bgcolor: alpha(getRoleColor(user.role), 0.2),
                },
              }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                {user.username}
              </Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip
                  label={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                  size="small"
                  sx={{
                    bgcolor: alpha(getRoleColor(user.role), 0.1),
                    color: getRoleColor(user.role),
                    fontWeight: "600",
                  }}
                />
                <Chip
                  label={`ID: ${user.id}`}
                  size="small"
                  sx={{
                    bgcolor: alpha("#00796b", 0.1),
                    color: "#00796b",
                    fontWeight: "600",
                  }}
                />
                <Chip
                  label={user.status ? "Active" : "Inactive"}
                  size="small"
                  sx={{
                    bgcolor: user.status ? alpha("#2e7d32", 0.1) : alpha("#d32f2f", 0.1),
                    color: user.status ? "#2e7d32" : "#d32f2f",
                    fontWeight: "600",
                  }}
                />
              </Box>
            </Box>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/home/users/edit/${userId}`)}
              disabled={!user.status}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": {
                  bgcolor: "grey.300",
                  color: "grey.500",
                },
              }}>
              Edit
            </Button>
            <Button
              variant="contained"
              startIcon={<BlockIcon />}
              onClick={handleToggleStatus}
              color={user.status ? "error" : "success"}
              sx={{
                "&:hover": {
                  bgcolor: user.status ? "error.dark" : "success.dark",
                },
              }}>
              {user.status ? "Deactivate" : "Activate"}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column - User Profile */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
            }}>
            <Box display="flex" flexDirection="column" alignItems="center">
              <Avatar
                src={avatarUrl || "/static/images/defaultAvatar.png"}
                sx={{
                  width: 120,
                  height: 120,
                  mb: 2,
                  border: "4px solid",
                  borderColor: alpha(getRoleColor(user?.role), 0.1),
                }}
              />
              <Typography variant="h5" fontWeight="600" color="text.primary" gutterBottom>
                {user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" fontWeight="600" color="text.primary" mb={2}>
              System Information
            </Typography>
            {renderInfoItem(<CalendarTodayIcon />, "Created Date", user.create_date)}
            {renderInfoItem(<AccessTimeIcon />, "Last Login", user.last_login ? formatLastLogin(user.last_login) : "Never")}
            {renderInfoItem(<PersonIcon />, "Created By", user.created_by)}
            {renderInfoItem(<PersonIcon />, "Modified By", user.modified_by)}
          </Paper>
        </Grid>

        {/* Right Column - User Details */}
        <Grid item xs={12} md={8}>
          {/* Basic Information */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
              mb: 3,
            }}>
            <Typography variant="h6" fontWeight="600" color="text.primary" mb={3}>
              Basic Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                {renderInfoItem(<BadgeIcon />, "User ID", user.id)}
                {renderInfoItem(<PersonIcon />, "IC Number", user.ic)}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderInfoItem(<EmailIcon />, "Email", user.email)}
                {renderInfoItem(<PhoneIcon />, "Contact", user.contact_number)}
              </Grid>
            </Grid>
          </Paper>

          {/* Role-Specific Information */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: "white",
              border: "1px solid",
              borderColor: "grey.200",
            }}>
            <Typography variant="h6" fontWeight="600" color="text.primary" mb={3}>
              {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} Details
            </Typography>

            {user.role === "admin" && renderInfoItem(<PersonIcon />, "Admin Role", user.admin_profile?.admin_role)}

            {user.role === "therapist" && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  {renderInfoItem(<PersonIcon />, "Specialization", user.therapist_profile?.specialization)}
                </Grid>
                <Grid item xs={12} md={6}>
                  {renderInfoItem(<CalendarTodayIcon />, "Employment Date", user.therapist_profile?.employment_date)}
                </Grid>
              </Grid>
            )}

            {user.role === "patient" && renderInfoItem(<PhoneIcon />, "Emergency Contact", user.patient_profile?.emergency_contact)}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserAccountManagementAccountPage;
