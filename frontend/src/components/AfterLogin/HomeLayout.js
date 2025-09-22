import React, { useState, useEffect, useRef } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  Avatar, 
  Divider,
  useMediaQuery, 
  useTheme, 
  CssBaseline 
} from "@mui/material";
import { 
  AccountCircle, 
  Dashboard, 
  FitnessCenter, 
  Event, 
  Assignment, 
  Group, 
  Assessment,
  HistoryEdu, 
  Logout,
  MedicalServices,
  AdminPanelSettings 
} from "@mui/icons-material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import NotificationIcon from "./NotificationIcon";
import { formatLastLogin } from '../../utils/dateUtils';

// formatLastLogin is now imported from dateUtils

function HomeLayout() {
  console.log('HomeLayout component rendered');
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [notificationsCount, setNotificationsCount] = useState(3);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState(null);
  
  const FULL_WIDTH = 250;
  const COLLAPSED_WIDTH = 65;
  
  const navigate = useNavigate();
  const location = useLocation();
  const primaryColor = theme.palette.primary.main;

  // 转换二进制头像数据为URL
  const convertBinaryToUrl = (binaryData) => {
    if (!binaryData) return null;
    
    const binaryString = atob(binaryData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem("id");
        if (!userId) {
          setError("User ID not found. Please login again.");
          navigate("/login");
          return;
        }
        const response = await fetch(`http://127.0.0.1:8000/api/get-user/${userId}/`);
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const data = await response.json();
        setUsername(data.username || "Patient");
        setRole(data.role || "patient");
        
        if (data.avatar) {
          const url = convertBinaryToUrl(data.avatar);
          setAvatarUrl(url);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load user data. Please try again.");
      }
    };

    fetchUserData();

    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [navigate]);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleExpandDrawer = () => {
    if (!drawerOpen && !isMobile) {
      setDrawerOpen(true);
    }
  };

  const handleCollapseDrawer = (e) => {
    // 阻止事件冒泡，这样点击折叠区域不会触发展开
    e.stopPropagation();
    if (drawerOpen && !isMobile) {
      setDrawerOpen(false);
    }
  };

  const handlePageChange = (path) => {
    if (isMobile) setDrawerOpen(false);
    navigate(`/home${path}`);
  };

  const handleLogout = (e) => {
    e.stopPropagation();
    localStorage.clear();
    navigate("/");
  };

  const getMenuItems = (role) => {
    switch (role) {
      case "admin":
        return [
          { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
          { text: "User Management", icon: <Group />, path: "/users" },
          { text: "Appointment Overview", icon: <Event />, path: "/admin-appointments" },
          { text: "Treatment Admin", icon: <AdminPanelSettings />, path: "/admin-treatment" },
          { text: "Exercise Management", icon: <FitnessCenter />, path: "/exercise-admin" },
          { text: "Reports & Analytics", icon: <Assignment />, path: "/reports" },
          { text: "Patient Information", icon: <HistoryEdu />, path : "/patients" },
          { text: "Profile", icon: <AccountCircle />, path: "/profile" },
        ];
      case "patient":
        return [
          { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
          { text: "My Appointments", icon: <Event />, path: "/appointments" },
          { text: "Exercise", icon: <FitnessCenter />, path: "/exercise" },
          { text: "Profile", icon: <AccountCircle />, path: "/profile" },
        ];
      case "therapist":
        return [
          { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
          { text: "My Schedule", icon: <Event />, path: "/schedule" },
          { text: "Appointment", icon: <Event />, path: "/therapist-appointments" },
          { text: "Treatment Management", icon: <MedicalServices />, path: "/treatment" },
          { text: "Patient Information", icon: <HistoryEdu />, path : "/patients" },
          { text: "Patient Reports", icon: <Assessment />, path: "/patient-reports" },
          { text: "Profile", icon: <AccountCircle />, path: "/profile" },
        ];
      default:
        return [];
    }
  };
  
  const menuItems = getMenuItems(role);
  
  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f8fafc" }}>
      <CssBaseline />
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={false}
        pauseOnHover={true}
      />
      
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? drawerOpen : true}
        onClose={isMobile ? () => setDrawerOpen(false) : undefined}
        sx={{
          width: isMobile ? FULL_WIDTH : (drawerOpen ? FULL_WIDTH : COLLAPSED_WIDTH),
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile ? FULL_WIDTH : (drawerOpen ? FULL_WIDTH : COLLAPSED_WIDTH),
            boxSizing: "border-box",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
            overflowX: "hidden",
            backgroundColor: "#ffffff",
            color: "#333",
            borderRight: "1px solid #eee",
          },
        }}
      >
        <Box 
          onClick={isMobile ? null : handleExpandDrawer}
          sx={{ 
            display: "flex",
            flexDirection: "column",
            height: "100%",
            cursor: isMobile ? "default" : "pointer" 
          }}
        >
          <Box 
            onClick={(e) => e.stopPropagation()}  // 阻止事件冒泡，使头像区域不触发展开
            display="flex" 
            alignItems="center"
            justifyContent="space-between"
            sx={{
              height: 82,
              p: 2,
              borderBottom: "1px solid #eee",
              overflow: "hidden"
            }}
          >
            <Box display="flex" alignItems="center">
              <Avatar 
                src={avatarUrl || undefined}
                sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: "#3498db",
                  minWidth: 40,
                  flexShrink: 0
                }}
              >
                {username ? username.charAt(0).toUpperCase() : "P"}
              </Avatar>
              
              {drawerOpen && !isMobile && (
                <Box 
                  sx={{
                    ml: 1.5,
                    overflow: "hidden",
                    opacity: 1,
                    transition: theme.transitions.create('opacity', {
                      easing: theme.transitions.easing.sharp,
                      duration: theme.transitions.duration.standard,
                    }),
                    flex: "1 1 auto",
                    whiteSpace: "nowrap"
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {username}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#777", textTransform: "capitalize" }}>
                    {role}
                  </Typography>
                </Box>
              )}
              
              {isMobile && (
                <Box 
                  sx={{
                    ml: 1.5,
                    overflow: "hidden",
                    flex: "1 1 auto",
                    whiteSpace: "nowrap"
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {username}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#777", textTransform: "capitalize" }}>
                    {role}
                  </Typography>
                </Box>
              )}
            </Box>

            {(drawerOpen || isMobile) && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <NotificationIcon />
              </Box>
            )}
          </Box>

          <List 
            component="nav" 
            sx={{ flex: 1, pt: 1 }}
            onClick={drawerOpen && !isMobile ? handleCollapseDrawer : undefined}
          >
            {menuItems.map((item) => {
              const isActive = location.pathname === `/home${item.path}` || 
                              (item.path === "/dashboard" && location.pathname === "/home");
              
              return (
                <ListItem
                  button
                  key={item.text}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePageChange(item.path);
                  }}
                  sx={{
                    py: 1.5,
                    px: drawerOpen ? 2 : 0,
                    height: 56,
                    mb: 0.5,
                    justifyContent: "center",
                    backgroundColor: isActive ? primaryColor : "transparent",
                    color: isActive ? "#fff" : "#333",
                    borderRadius: 0,
                    "&:hover": {
                      backgroundColor: isActive ? primaryColor : "#f5f5f5",
                    },
                    transition: theme.transitions.create(['padding', 'background-color'], {
                      easing: theme.transitions.easing.sharp,
                      duration: theme.transitions.duration.standard,
                    }),
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: drawerOpen ? 40 : 0,
                      color: isActive ? "#fff" : "#666",
                      display: "flex",
                      justifyContent: "center",
                      width: drawerOpen ? "auto" : "100%",
                      margin: 0,
                      transition: theme.transitions.create(['width', 'min-width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.standard,
                      }),
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  
                  {drawerOpen && !isMobile && (
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                        sx: {
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }
                      }}
                      sx={{
                        margin: 0,
                        ml: 1,
                        overflow: "hidden"
                      }}
                    />
                  )}
                  
                  {isMobile && (
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                        sx: {
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }
                      }}
                      sx={{
                        margin: 0,
                        ml: 1,
                        overflow: "hidden"
                      }}
                    />
                  )}
                </ListItem>
              );
            })}
          </List>

          <Box onClick={(e) => e.stopPropagation()}>  
            <Divider />
            <List>
              <ListItem 
                button 
                onClick={handleLogout}
                sx={{ 
                  py: 1.5,
                  px: drawerOpen ? 2 : 0,
                  justifyContent: "center",
                  transition: theme.transitions.create('padding', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.standard,
                  }),
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: "#666",
                    minWidth: drawerOpen ? 40 : 0,
                    width: drawerOpen ? "auto" : "100%",
                    display: "flex",
                    justifyContent: "center",
                    margin: 0,
                    transition: theme.transitions.create(['width', 'min-width'], {
                      easing: theme.transitions.easing.sharp,
                      duration: theme.transitions.duration.standard,
                    }),
                  }}
                >
                  <Logout />
                </ListItemIcon>
                
                {drawerOpen && !isMobile && (
                  <ListItemText 
                    primary="Logout"
                    sx={{
                      margin: 0,
                      ml: 1,
                      overflow: "hidden"
                    }}
                  />
                )}
                
                {isMobile && (
                  <ListItemText 
                    primary="Logout"
                    sx={{
                      margin: 0,
                      ml: 1,
                      overflow: "hidden"
                    }}
                  />
                )}
              </ListItem>
            </List>
          </Box>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          transition: theme.transitions.create('margin-left', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
          width: isMobile ? '100%' : `calc(100% - ${drawerOpen ? FULL_WIDTH : COLLAPSED_WIDTH}px)`,
          height: "100vh",
          overflowY: "auto",
          bgcolor: "#f8fafc",
        }}
      >
        <Box>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default HomeLayout;