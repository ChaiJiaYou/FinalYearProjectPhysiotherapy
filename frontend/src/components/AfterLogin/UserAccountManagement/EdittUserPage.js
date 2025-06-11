import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Grid, Avatar, Paper, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ConfirmationDialog from "../../CustomComponents/ConfirmationDialog";
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
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [role, setRole] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [employmentDate, setEmploymentDate] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  const getRoleColor = (role) => {
    const roleColors = {
      admin: "#ef4444",
      patient: "#3b82f6",
      therapist: "#8b5cf6",
    };
    return roleColors[role] || "#6b7280";
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://127.0.0.1:8000/api/get-user/${userId}/`);
        if (!res.ok) throw new Error("Failed to fetch user");

        const data = await res.json();
        setUser(data);
        setFormValues({
          username: data.username || "",
          email: data.email || "",
          ic: data.ic || "",
          contact_number: data.contact_number || "",
        });

        // Convert and set avatar if exists
        if (data.avatar) {
          const binaryString = atob(data.avatar);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          setAvatarUrl(url);
          setPreviewUrl(url);
        }

        setRole(data.role || "");

        if (data.role === "admin") {
          setAdminRole(data.admin_profile?.admin_role || "");
        } else if (data.role === "therapist") {
          setSpecialization(data.therapist_profile?.specialization || "");
          setEmploymentDate(data.therapist_profile?.employment_date || "");
        } else if (data.role === "patient") {
          setEmergencyContact(data.patient_profile?.emergency_contact || "");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Failed to fetch user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Cleanup function
    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [userId]);

  const handleInputChange = (e) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (formErrors[e.target.name]) {
      setFormErrors({ ...formErrors, [e.target.name]: "" });
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(file);
      setAvatarFile(file);
      setPreviewUrl(newPreviewUrl);
    }
  };

  const validateForm = () => {
    const errors = {};
    const { username, email, ic, contact_number } = formValues;

    if (!username.trim()) errors.username = "Username is required.";
    if (!email.trim()) {
      errors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Invalid email address.";
    }

    if (!ic.trim()) {
      errors.ic = "IC is required.";
    } else if (!/^\d{12}$/.test(ic)) {
      errors.ic = "IC must be exactly 12 digits.";
    }

    if (!contact_number.trim()) {
      errors.contact_number = "Contact number is required.";
    } else if (!/^\d+$/.test(contact_number)) {
      errors.contact_number = "Contact number must contain digits only.";
    } else if (contact_number.length < 10) {
      errors.contact_number = "Contact number must be at least 10 digits long.";
    }

    if (role === "admin" && !adminRole.trim()) {
      errors.adminRole = "Admin role is required.";
    }

    if (role === "therapist") {
      if (!specialization.trim()) errors.specialization = "Specialization is required.";
      if (!employmentDate.trim()) errors.employmentDate = "Employment date is required.";
    }

    if (role === "patient" && !emergencyContact.trim()) {
      errors.emergencyContact = "Emergency contact is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setConfirmOpen(true);
    }
  };

  const handleSubmitConfirmed = async () => {
    try {
      const formData = new FormData();
      formData.append("role", role);
      
      // Append basic user information
      for (const key in formValues) {
        formData.append(key, formValues[key]);
      }

      // Handle role-specific information
      if (role === "admin") {
        formData.append("admin_profile.admin_role", adminRole);
      } else if (role === "therapist") {
        formData.append("therapist_profile.specialization", specialization);
        formData.append("therapist_profile.employment_date", employmentDate);
      } else if (role === "patient") {
        formData.append("patient_profile.emergency_contact", emergencyContact);
      }

      // Handle avatar file
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`http://127.0.0.1:8000/api/update-user/${userId}/`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update user");
      }

      const updatedData = await res.json();
      toast.success("User updated successfully!");
      navigate(`/home/users/view/${userId}`);
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error.message || "An error occurred while updating the user");
    } finally {
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Typography variant="h6">Loading user details...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        mx: "auto",
        backgroundColor: "#fafafa",
        minHeight: "100vh",
      }}>
      {/* Header section */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          backgroundColor: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              onClick={() => navigate(-1)}
              sx={{
                backgroundColor: "#f5f5f5",
                "&:hover": { backgroundColor: "#e0e0e0" },
              }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="#333">
                Edit User: {formValues.username}
              </Typography>
              <Box display="flex" gap={1} mt={1}>
                <Box
                  sx={{
                    backgroundColor: alpha(getRoleColor(role), 0.1),
                    color: getRoleColor(role),
                    px: 2,
                    py: 0.5,
                    borderRadius: "999px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                  }}>
                  {role?.charAt(0).toUpperCase() + role?.slice(1)}
                </Box>
                <Box
                  sx={{
                    backgroundColor: "#e0f7fa",
                    color: "#00796b",
                    px: 2,
                    py: 0.5,
                    borderRadius: "999px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                  }}>
                  ID: {userId}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Section - Avatar */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}>
            <Box display="flex" flexDirection="column" alignItems="center">
              <Box sx={{ position: "relative", mb: 2 }}>
                <Avatar
                  src={previewUrl || "/static/images/defaultAvatar.png"}
                  sx={{
                    width: 120,
                    height: 120,
                    border: "4px solid",
                    borderColor: alpha(getRoleColor(role), 0.1),
                  }}
                />
                <IconButton
                  component="label"
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    backgroundColor: "primary.main",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "primary.dark",
                    },
                  }}>
                  <PhotoCameraIcon />
                  <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                </IconButton>
              </Box>
              <Typography variant="h6" fontWeight="600" mb={1}>
                {formValues.username}
              </Typography>
              <Box
                sx={{
                  backgroundColor: alpha(getRoleColor(role), 0.1),
                  color: getRoleColor(role),
                  px: 2,
                  py: 0.5,
                  borderRadius: "999px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  mb: 2,
                }}>
                {role?.charAt(0).toUpperCase() + role?.slice(1)}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Section - Forms */}
        <Grid item xs={12} md={8}>
          {/* Basic Information */}
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              mb: 3,
            }}>
            <Typography variant="h6" fontWeight="600" mb={3}>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formValues.username}
                  onChange={handleInputChange}
                  error={!!formErrors.username}
                  helperText={formErrors.username}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleInputChange}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="IC"
                  name="ic"
                  value={formValues.ic}
                  onChange={handleInputChange}
                  error={!!formErrors.ic}
                  helperText={formErrors.ic}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Number"
                  name="contact_number"
                  value={formValues.contact_number}
                  onChange={handleInputChange}
                  error={!!formErrors.contact_number}
                  helperText={formErrors.contact_number}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Role-Specific Information */}
          <Paper
            elevation={1}
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              mb: 3,
            }}>
            <Typography variant="h6" fontWeight="600" mb={3}>
              {role?.charAt(0).toUpperCase() + role?.slice(1)} Details
            </Typography>
            <Grid container spacing={2}>
              {role === "admin" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Admin Role"
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value)}
                    error={!!formErrors.adminRole}
                    helperText={formErrors.adminRole}
                  />
                </Grid>
              )}

              {role === "therapist" && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      error={!!formErrors.specialization}
                      helperText={formErrors.specialization}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Employment Date"
                      type="date"
                      value={employmentDate}
                      onChange={(e) => setEmploymentDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={!!formErrors.employmentDate}
                      helperText={formErrors.employmentDate}
                    />
                  </Grid>
                </>
              )}

              {role === "patient" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Emergency Contact"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    error={!!formErrors.emergencyContact}
                    helperText={formErrors.emergencyContact}
                  />
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Action Buttons */}
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => navigate(-1)}
              startIcon={<CancelIcon />}
              sx={{
                borderRadius: 2,
                px: 3,
              }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              startIcon={<SaveIcon />}
              sx={{
                borderRadius: 2,
                px: 3,
                boxShadow: 1,
                "&:hover": { boxShadow: 2 },
              }}>
              Save Changes
            </Button>
          </Box>
        </Grid>
      </Grid>

      <ConfirmationDialog
        open={confirmOpen}
        title="Confirm Update"
        message="Are you sure you want to update this user information?"
        onConfirm={handleSubmitConfirmed}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default EditUserPage;
