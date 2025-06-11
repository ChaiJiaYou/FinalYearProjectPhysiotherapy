import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Skeleton,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import CreateUserDialog from "../../CustomComponents/CreateUserDialog";
import UserManagementTable from "./UserManagementTable";
import "react-toastify/dist/ReactToastify.css";
import { alpha } from "@mui/material/styles";

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
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/api/list-users/");
      const data = await response.json();
      setUsers(data);
      setTotalUsers(data.length);
      setActiveUsers(data.filter(user => user.status).length);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    fetchUsers();
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearchTerm =
      (user?.username?.toLowerCase?.() || "").includes(searchTerm.toLowerCase()) ||
      (user?.email?.toLowerCase?.() || "").includes(searchTerm.toLowerCase()) ||
      (user?.contact_number?.toString?.() || "").includes(searchTerm) ||
      (user?.id?.toString?.().toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" && user.status) || (statusFilter === "inactive" && !user.status);

    return matchesSearchTerm && matchesRole && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleToggleStatus = async (user) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/update-user-status/${user.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: !user.status }),
      });

      if (response.ok) {
        fetchUsers(); // Refresh the user list
      } else {
        console.error("Failed to update user status");
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const handleViewProfile = (id) => {
    navigate(`/home/users/view/${id}`);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Statistics Cards */}
      <Box sx={{ mb: 4, display: "flex", gap: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            flex: 1,
            borderRadius: 2,
            bgcolor: "white",
            border: "1px solid",
            borderColor: "grey.200",
          }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Total Users
          </Typography>
          <Typography variant="h3" color="text.primary">
            {totalUsers}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Registered accounts
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            flex: 1,
            borderRadius: 2,
            bgcolor: "white",
            border: "1px solid",
            borderColor: "grey.200",
          }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Active Users
          </Typography>
          <Typography variant="h3" color="success.main">
            {activeUsers}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Currently active
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            flex: 1,
            borderRadius: 2,
            bgcolor: "white",
            border: "1px solid",
            borderColor: "grey.200",
          }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Inactive Users
          </Typography>
          <Typography variant="h3" color="error.main">
            {totalUsers - activeUsers}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Currently inactive
          </Typography>
        </Paper>
      </Box>

      {/* Main Content */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: "white",
          border: "1px solid",
          borderColor: "grey.200",
        }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              User Management
            </Typography>
            <Box display="flex" gap={1}>
              <Tooltip title="Refresh list">
                <IconButton onClick={handleRefresh} sx={{ bgcolor: "grey.100" }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenCreateDialog(true)}
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                }}>
                Create User
              </Button>
            </Box>
          </Box>

          {/* Search and Filters */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                borderColor: "grey.300",
                color: "text.secondary",
                "&:hover": {
                  bgcolor: "grey.50",
                },
              }}>
              Filters
            </Button>
          </Box>

          {/* Filter Options */}
          {showFilters && (
            <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Role</InputLabel>
                <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} label="Role">
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="patient">Patient</MenuItem>
                  <MenuItem value="therapist">Therapist</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>

              {(roleFilter !== "all" || statusFilter !== "all") && (
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Active filters:
                  </Typography>
                  {roleFilter !== "all" && (
                    <Chip
                      label={`Role: ${roleFilter}`}
                      onDelete={() => setRoleFilter("all")}
                      size="small"
                      sx={{ bgcolor: alpha("#2196f3", 0.1) }}
                    />
                  )}
                  {statusFilter !== "all" && (
                    <Chip
                      label={`Status: ${statusFilter}`}
                      onDelete={() => setStatusFilter("all")}
                      size="small"
                      sx={{ bgcolor: alpha("#2196f3", 0.1) }}
                    />
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* User Table */}
        <UserManagementTable users={paginatedUsers} handleToggleStatus={handleToggleStatus} onViewProfile={handleViewProfile} />

        {/* Pagination */}
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <TablePagination
            component="div"
            count={filteredUsers.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Box>
      </Paper>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onSuccess={(newUser) => {
          setUsers([newUser, ...users]);
          setOpenCreateDialog(false);
        }}
      />
    </Box>
  );
};

export default UserAccountManagementHome;
