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
  Divider,
  Stack,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import ClearIcon from "@mui/icons-material/Clear";
import GroupIcon from "@mui/icons-material/Group";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CreateUserDialog from "../../CustomComponents/CreateUserDialog";
import UserManagementTable from "./UserManagementTable";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { alpha } from "@mui/material/styles";

const UserAccountManagementHome = () => {
  console.log('UserAccountManagementHome component rendered');
  
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState([]); // 存储所有用户数据
  const [users, setUsers] = useState([]); // 显示的用户数据（筛选后）
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users...');
      const response = await fetch("http://127.0.0.1:8000/api/list-users/", {
        headers: {
          'X-User-ID': localStorage.getItem('userId'),
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      console.log('Users response status:', response.status);
      const data = await response.json();
      console.log('Users data:', data);
      console.log('Data type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      
      // 检查数据格式，可能是 { value: [...] } 格式
      const usersArray = Array.isArray(data) ? data : (data.value || []);
      console.log('Users array:', usersArray);
      
      setAllUsers(usersArray); // 存储所有用户数据
      // 直接使用usersArray进行筛选，不依赖allUsers状态
      let filteredUsers = [...usersArray];
      
      // Apply search filter
      if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.contact_number && user.contact_number.includes(searchTerm))
        );
      }
      
      // Apply role filter
      if (roleFilter !== "all") {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
      }
      
      // Apply status filter
      if (statusFilter !== "all") {
        const isActive = statusFilter === "active";
        filteredUsers = filteredUsers.filter(user => {
          return user.status === isActive;
        });
      }
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };


  const applyFilters = (userData = allUsers) => {
    let filteredUsers = [...userData];
    
    // Apply search filter
    if (searchTerm) {
      filteredUsers = filteredUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.contact_number && user.contact_number.includes(searchTerm))
      );
    }
    
    // Apply role filter
    if (roleFilter !== "all") {
      filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filteredUsers = filteredUsers.filter(user => {
        return user.status === isActive;
      });
    }
    
    setUsers(filteredUsers);
  };

  useEffect(() => {
    fetchUsers();
  }, []); // 只在组件挂载时获取数据

  useEffect(() => {
    if (allUsers.length > 0) {
      applyFilters(); // 筛选条件变化时应用筛选
    }
  }, [searchTerm, roleFilter, statusFilter]); // 筛选条件变化时重新筛选

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value);
    setPage(0);
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setPage(0);
  };

  const handleRefresh = () => {
    fetchUsers(); // 重新获取所有数据
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      // currentStatus is boolean from user.status, convert to opposite
      const newStatus = !currentStatus;
      
      const response = await fetch(`http://127.0.0.1:8000/api/update-user-status/${userId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": localStorage.getItem("id"),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        // 更新所有用户数据
        const updatedAllUsers = allUsers.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        );
        setAllUsers(updatedAllUsers);
        
        // 重新应用筛选
        applyFilters(updatedAllUsers);
        
        toast.success(`User ${newStatus ? "enabled" : "disabled"} successfully`);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to update user: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      if (error.message.includes("Failed to fetch")) {
        toast.error("Cannot connect to server. Please make sure the backend server is running on http://127.0.0.1:8000");
      } else {
        toast.error(`Error updating user: ${error.message}`);
      }
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/home/users/view/${userId}`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(0);
    // 筛选条件变化会自动触发useEffect重新筛选
  };

  // 筛选逻辑现在在applyFilters函数中处理
  const filteredUsers = users;

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  console.log('Loading state:', loading);
  
  if (loading) {
    console.log('Showing loading skeleton');
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={80} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={500} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }
  
  console.log('Rendering main content');

  return (
    <Box sx={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>

      {/* Page Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, #3b82f6 0%, ${alpha("#3b82f6", 0.8)} 100%)`,
          p: 1.5,
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
              <GroupIcon sx={{ fontSize: 28, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                User Management
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Manage all user accounts in the system
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2}>
            <Tooltip title="Refresh list">
              <IconButton 
                onClick={handleRefresh} 
                sx={{ 
                  bgcolor: alpha("#ffffff", 0.2),
                  color: "white",
                  "&:hover": {
                    bgcolor: alpha("#ffffff", 0.3),
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{
                bgcolor: "white",
                color: "#3b82f6",
                textTransform: "uppercase",
                fontWeight: 600,
                px: 3,
                borderRadius: 2,
                "&:hover": {
                  bgcolor: alpha("#ffffff", 0.9),
                },
              }}>
              Create User
            </Button>
          </Stack>
        </Box>
      </Box>


      {/* Search & Filter Section */}
      <Box sx={{ p: 1.5, backgroundColor: "white", borderBottom: "1px solid", borderColor: "grey.200" }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="h6" fontWeight="600" color="text.primary">
            Search & Filter Users
          </Typography>
          <Button
            size="small"
            onClick={clearFilters}
            startIcon={<ClearIcon />}
            variant="outlined"
            disabled={roleFilter === "all" && statusFilter === "all" && searchTerm === ""}
            sx={{ 
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 600,
              px: 3,
              py: 1,
              borderColor: "grey.300",
              color: "text.secondary",
              "&:hover": {
                borderColor: "grey.400",
                backgroundColor: "grey.50",
              },
              "&:disabled": {
                borderColor: "grey.200",
                color: "grey.400",
              }
            }}
          >
            Clear Filter
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            placeholder="Search by username, email, or contact..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "action.active" }} />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: 300 }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>User Role</InputLabel>
            <Select 
              value={roleFilter} 
              onChange={handleRoleFilter} 
              label="User Role"
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="therapist">Therapist</MenuItem>
              <MenuItem value="patient">Patient</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select 
              value={statusFilter} 
              onChange={handleStatusFilter} 
              label="Status"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

        </Box>


      </Box>

      {/* User Table Section */}
      <Box sx={{ backgroundColor: "white" }}>
        <UserManagementTable 
          users={paginatedUsers} 
          handleToggleStatus={handleToggleStatus} 
          onViewProfile={handleViewProfile} 
        />
        
          {/* Pagination */}
          <Box sx={{ p: 1, borderTop: "1px solid", borderColor: "grey.200" }}>
          <TablePagination
            component="div"
            count={filteredUsers.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{
              "& .MuiTablePagination-toolbar": {
                paddingLeft: 0,
                paddingRight: 0,
                minHeight: "auto",
                paddingLeft: 0,
              },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                fontWeight: 500,
              },
            }}
          />
        </Box>
      </Box>

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