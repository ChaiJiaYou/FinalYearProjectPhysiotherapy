import React, { useState, useEffect, useMemo } from "react";
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
  const [orderBy, setOrderBy] = useState('create_date');
  const [order, setOrder] = useState('desc');

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

  // Sort filtered users before pagination
  const sortedUsers = useMemo(() => {
    const comparator = (a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Special handling for date fields
      if (orderBy === 'create_date') {
        const aDate = aValue ? new Date(aValue).getTime() : 0;
        const bDate = bValue ? new Date(bValue).getTime() : 0;
        if (aDate < bDate) {
          return order === 'asc' ? -1 : 1;
        }
        if (aDate > bDate) {
          return order === 'asc' ? 1 : -1;
        }
        return 0;
      }

      // Handle different data types
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    };

    return [...filteredUsers].sort(comparator);
  }, [filteredUsers, order, orderBy]);

  // Paginate sorted users
  const paginatedUsers = sortedUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Handle sort request
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sorting changes
  };

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
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 'xl', mx: 'auto' }}>
        {/* 页面头部 - 遵循设计系统 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#000000', fontWeight: 600 }}>
              User Management
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
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
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
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
              Create User
            </Button>
          </Box>
        </Box>


        {/* 搜索和过滤 - 遵循设计系统 */}
        <Card sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Search & Filter Users
              </Typography>
              <Button
                size="small"
                onClick={clearFilters}
                startIcon={<ClearIcon />}
                variant="outlined"
                disabled={roleFilter === "all" && statusFilter === "all" && searchTerm === ""}
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
                  },
                  '&:disabled': {
                    borderColor: 'grey.200',
                    color: 'grey.400',
                  }
                }}
              >
                Clear Filters
              </Button>
            </Box>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <TextField
                placeholder="Search by username, email, or contact..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 2, 
                      bgcolor: 'grey.50', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mr: 1
                    }}>
                      <SearchIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                    </Box>
                  ),
                }}
                sx={{ 
                  flexGrow: 1, 
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
          
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>User Role</InputLabel>
                <Select 
                  value={roleFilter} 
                  onChange={handleRoleFilter} 
                  label="User Role"
                  sx={{
                    borderRadius: 2,
                  }}
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
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* 用户表格 - 遵循设计系统 */}
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', elevation: 0 }}>
          <UserManagementTable 
            users={paginatedUsers} 
            handleToggleStatus={handleToggleStatus} 
            onViewProfile={handleViewProfile}
            orderBy={orderBy}
            order={order}
            onRequestSort={handleRequestSort}
          />
          
          {/* Pagination */}
          <Box sx={{ p: 3, borderTop: "1px solid", borderColor: "grey.200" }}>
            <TablePagination
              component="div"
              count={sortedUsers.length}
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
                },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                  fontWeight: 500,
                },
              }}
            />
          </Box>
        </Card>

        {/* Create User Dialog */}
        <CreateUserDialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          onSubmit={(newUser) => {
            // Add new user to both allUsers and users lists
            setAllUsers(prev => [newUser, ...prev]);
            setUsers(prev => [newUser, ...prev]);
            setOpenCreateDialog(false);
            // Toast is already shown in CreateUserDialog component
          }}
        />
      </Box>
    </Box>
  );
};

export default UserAccountManagementHome;