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
  Skeleton,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from "@mui/material";

const UserAccountManagementHome = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    role: "",
    contact_number: "",
    password: "",
  });

  // Fetch users from the API
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

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle role and status filters
  const filteredUsers = users.filter((user) => {
    const matchesSearchTerm =
      (user?.username?.toLowerCase?.() || "").includes(searchTerm.toLowerCase()) ||
      (user?.email?.toLowerCase?.() || "").includes(searchTerm.toLowerCase()) ||
      (user?.contact_number?.toString?.() || "").includes(searchTerm) ||
      (user?.id?.toString?.().toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.status) ||
      (statusFilter === "inactive" && !user.status);

    return matchesSearchTerm && matchesRole && matchesStatus;
  });

  // Paginate users
  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle toggle user status (Active/Inactive)
  const handleToggleStatus = (user) => {
    const updatedUsers = users.map((u) =>
      u.id === user.id ? { ...u, status: !u.status } : u
    );
    setUsers(updatedUsers);

    // Update the user status in the backend
    fetch(`http://127.0.0.1:8000/api/update-user-status/${user.id}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: !user.status }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("User status updated:", data);
      })
      .catch((error) => {
        console.error("Error updating user status:", error);
      });
  };

  // Helper functions
  const capitalizeRole = (role) => {
    if (!role) return "N/A";
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const displayValue = (value) => (value ? value : "N/A");

  // Loading skeleton
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={50} />
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  const handleNewUserChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setNewUser({
      username: "",
      email: "",
      role: "",
      contact_number: "",
      password: "",
    });
  };

  return (
    <Box sx={{ p: 3, borderRadius: "8px" }}>
      {/* Header and Search Bar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#333" }}>
          User Account Management
        </Typography>
        <TextField
          variant="outlined"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ bgcolor: "white", borderRadius: "6px", width: 500 }}
        />
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl variant="outlined" sx={{ minWidth: 120 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              label="Role"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="patient">Patient</MenuItem>
              <MenuItem value="therapist">Therapist</MenuItem>
            </Select>
          </FormControl>
          <FormControl variant="outlined" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenCreateDialog}
            sx={{ boxShadow: 2, p: 2 }}
          >
            Create Account
          </Button>
        </Box>
      </Box>

      {/* User Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 0 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#fafafa" }}>
              <TableCell sx={{ fontWeight: "600", pt: "20px", width: "5%" }}>User ID</TableCell>
              <TableCell sx={{ fontWeight: "600", pt: "20px", width: "20%" }}>Username</TableCell>
              <TableCell sx={{ fontWeight: "600", pt: "20px", width: "10%" }}>Role</TableCell>
              <TableCell sx={{ fontWeight: "600", pt: "20px", width: "10%" }}>Create Date</TableCell>
              <TableCell sx={{ fontWeight: "600", pt: "20px", width: "5%" }}>Status</TableCell>
              <TableCell sx={{ fontWeight: "600", pt: "20px", width: "20%" }}>Email</TableCell>
              <TableCell sx={{ fontWeight: "600", pt: "20px", width: "15%" }}>Contact No</TableCell>
              <TableCell align="center" sx={{ fontWeight: "600", width: "25%" }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <TableRow
                  key={user.id}
                  hover
                  sx={{ height: "69px", "&:hover": { backgroundColor: "#f5f5f5" } }}
                >
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{displayValue(user.username)}</TableCell>
                  <TableCell>{capitalizeRole(user.role)}</TableCell>
                  <TableCell>{displayValue(user.create_date)}</TableCell>
                  <TableCell>{user.status ? "Active" : "Inactive"}</TableCell>
                  <TableCell>{displayValue(user.email)}</TableCell>
                  <TableCell>{displayValue(user.contact_number)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View user details">
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() =>
                          navigate(`/user-account-management/${user.id}`)
                        }
                        sx={{ boxShadow: 2, mr: 1 }}
                      >
                        View
                      </Button>
                    </Tooltip>
                    <Tooltip title={user.status ? "Deactivate" : "Activate"}>
                      <Button
                        variant="contained"
                        color={user.status ? "error" : "primary"}
                        onClick={() => handleToggleStatus(user)}
                        sx={{ boxShadow: 2 }}
                      >
                        {user.status ? "Deactivate" : "Activate"}
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow sx={{ height: "69px" }}>
                <TableCell colSpan={8} align="center" sx={{ py: 2 }}>
                  <Typography variant="body1" color="textSecondary">
                    No users found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredUsers.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          mt: 2,
          display: "flex",
          justifyContent: "flex-start",
          width: "100%",
          "& .MuiTablePagination-toolbar": {
            width: "100%",
            display: "flex",
            justifyContent: "flex-start",
          },
          "& .MuiTablePagination-spacer": {
            flex: 0,
          },
          "& .MuiTablePagination-displayedRows": {
            position: "relative",
            marginLeft: "35%",
          },
        }}
      />

      {/* Create Account Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog}>
        <DialogTitle>Create New Account</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            name="username"
            value={newUser.username}
            onChange={handleNewUserChange}
            margin="normal"
            inputProps={{
              autocomplete: "new-username",
              form: {
                autocomplete: "off",
              },
            }}
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            value={newUser.email}
            onChange={handleNewUserChange}
            margin="normal"
            inputProps={{
              autocomplete: "new-email",
              form: {
                autocomplete: "off",
              },
            }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={newUser.role}
              onChange={handleNewUserChange}
              label="Role"
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="patient">Patient</MenuItem>
              <MenuItem value="therapist">Therapist</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Contact Number"
            name="contact_number"
            value={newUser.contact_number}
            onChange={handleNewUserChange}
            margin="normal"
            inputProps={{
              autocomplete: "new-contact",
              form: {
                autocomplete: "off",
              },
            }}
          />
          <TextField
            fullWidth
            type="password"
            label="Password"
            name="password"
            value={newUser.password}
            onChange={handleNewUserChange}
            margin="normal"
            inputProps={{
              autocomplete: "new-password",
              form: {
                autocomplete: "off",
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserAccountManagementHome;