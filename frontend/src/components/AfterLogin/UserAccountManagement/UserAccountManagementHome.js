import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const UserAccountManagementHome = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/list-users/")
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched Users:", data);
        setUsers(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      });
  }, []);

  const handleCreateUser = () => {
    navigate("/create-user");
  };

  const filteredUsers =
    users?.filter((user) =>
      (user?.username?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user?.contact_number || "").includes(searchTerm) ||
      (user?.id || "").toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const capitalizeRole = (role) => {
    if (!role) return "N/A";
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const displayValue = (value) => (value ? value : "N/A");

  if (loading) {
    return <Typography>Loading users...</Typography>;
  }

  return (
    <Box sx={{ p: 3, borderRadius: '8px' }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333' }}>User Account Management</Typography>
        <Box display="flex" alignItems="center">
          <TextField
            variant="outlined"
            placeholder="Search by Username, Email, or Contact No"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mr: 2, bgcolor: 'white', borderRadius: '4px' }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateUser}
            sx={{ boxShadow: 2 }}
          >
            Create Account
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: '8px', boxShadow: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>User ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Create Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Contact No</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{displayValue(user.username)}</TableCell>
                  <TableCell>{capitalizeRole(user.role)}</TableCell>
                  <TableCell>{displayValue(user.create_date)}</TableCell>
                  <TableCell>
                    {user.status ? "Active" : "Deactive"}
                  </TableCell>
                  <TableCell>{displayValue(user.email)}</TableCell>
                  <TableCell>{displayValue(user.contact_number)}</TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() =>
                        navigate(`/user-account-management/${user.id}`)
                      }
                      sx={{ boxShadow: 2 }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No users available...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UserAccountManagementHome;
