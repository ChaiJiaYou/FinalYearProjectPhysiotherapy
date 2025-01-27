import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Avatar,
  TextField,
  Divider,
  Grid,
  Paper,
} from "@mui/material";

const UserAccountManagementAccountPage = () => {
  const { userId } = useParams(); // Retrieve userId from URL
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user details based on userId
    const fetchUserDetails = async () => {
        try {
          setLoading(true); // Start loading
          const response = await fetch(`http://127.0.0.1:8000/api/get-user/${userId}/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
      
          if (response.ok) {
            const data = await response.json();
            setUser(data);
          } else {
            throw new Error('Failed to fetch user details.');
          }
        } catch (error) {
          console.error('Error fetching user details:', error.message);
          setError(error.message || 'Something went wrong. Please try again.');
        } finally {
          setLoading(false); // Stop loading
        }
      };
      

    fetchUserDetails();
  }, [userId]);

  if (loading) return <Typography>Loading user details...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`/api/delete-user/${userId}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"), // Include CSRF token in headers
        },
      });

      if (response.ok) {
        alert("Account deleted successfully.");
        navigate("/user-management"); // Redirect on success
      } else {
        const data = await response.json();
        console.error(data);
        alert(data.error || "Failed to delete account.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to delete account");
    }
  };

  const handleDeactivateAccount = () => {
    console.log("Account deactivated");
  };

  const goBack = () => {
    navigate(-1);
  };

  function getCookie(name) {
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
  }

  return (
    <Box sx={{ p: 4 }}>
      <Button onClick={goBack} variant="outlined" sx={{ mb: 2 }}>
        &#8592; Back
      </Button>

      <Typography variant="h4" mb={3}>
        User Account
      </Typography>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Grid container spacing={4}>
          {/* Left Section */}
          <Grid item xs={12} md={4} display="flex" flexDirection="column" alignItems="center">
            <Avatar
              src="../../static/images/defaultAvatar.png"
              alt="Profile"
              sx={{ width: 200, height: 200, mb: 2 }}
            />
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteAccount}
              sx={{ mt: 2 }}
            >
              Delete Account
            </Button>
          </Grid>

          {/* Divider */}
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

          {/* Right Section */}
          <Grid item xs={12} md={7}>
            <Box>
              {renderField("UID", user.id, true)}
              {renderField("IC", user.ic, true)}
              {renderField("Name", user.username)}
              {renderField("Contact Number", user.contact_number)}
              {renderField("Email Address", user.email)}
              {renderField(
                "Account Status",
                user.is_active ? "Active" : "Inactive",
                false,
                user.is_active ? { color: "green" } : { color: "red" }
              )}
              {renderField("Create Date", user.create_date)}
            </Box>

            <Box mt={4} display="flex" gap={2}>
              <Button variant="contained" color="primary">
                Update Profile
              </Button>
              <Button variant="contained" color="secondary" onClick={handleDeactivateAccount}>
                Deactivate Account
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

const renderField = (label, value, greyBackground = false, customStyle = {}) => (
  <Box mb={2} display="flex" alignItems="center" sx={{ width: "100%" }}>
    <Typography variant="subtitle1" sx={{ fontWeight: "bold", width: 200 }}>
      {label}:
    </Typography>
    <TextField
      value={value || "N/A"}
      InputProps={{
        readOnly: true,
        sx: {
          backgroundColor: greyBackground ? "#f1f1f1" : "white",
          ...customStyle,
        },
      }}
      fullWidth
      variant="outlined"
    />
  </Box>
);

export default UserAccountManagementAccountPage;
