import { useTheme,Button, Chip, Stack,SvgIcon, Box, Paper, TableContainer, Table, TableHead,TableBody,TableCell,Typography,TableRow } from "@mui/material";
import { Visibility, CheckCircle,Block } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { formatDate } from '../../../utils/dateUtils';

const UserManagementTable = ({ users, handleToggleStatus, onViewProfile }) => {
  const displayValue = (value) => value || "-";
  const capitalizeRole = (role) => (role ? role.charAt(0).toUpperCase() + role.slice(1) : "-");
  const theme = useTheme();

  const getRoleColor = (role) => {
    const roleColors = {
      admin: "#ef4444",
      patient: "#3b82f6",
      therapist: "#8b5cf6",
    };
    return roleColors[role] || "#6b7280";
  };

  // formatDate is now imported from dateUtils

  return (
    <Box
      component={Paper}
      elevation={1}
      sx={{
        width: "100%",
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: 1,
        border: "1px solid",
        borderColor: "grey.300",
      }}>
      <TableContainer>
        <Table sx={{ width: "100%" }}>
          {/* Header and Body */}
          <TableHead>
            <TableRow sx={{ backgroundColor: "grey.900" }}>
              <TableCell align="center">
                <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                  </svg>
                  <Typography variant="subtitle2" color="white" sx={{ textTransform: "uppercase" }}>
                    ID
                  </Typography>
                </Box>
              </TableCell>

              <TableCell sx={{ width: 210, minWidth: 210 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <Typography variant="subtitle2" color="white" sx={{ textTransform: "uppercase" }}>
                    Username
                  </Typography>
                </Box>
              </TableCell>

              <TableCell align="center">
                <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 5.19 1.15 7 3-1.81 1.85-4.3 3-7 3s-5.19-1.15-7-3c1.81-1.85 4.3-3 7-3zm0-2c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-10C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0z" />
                  </svg>
                  <Typography variant="subtitle2" color="white" sx={{ textTransform: "uppercase" }}>
                    Role
                  </Typography>
                </Box>
              </TableCell>

              <TableCell sx={{ pl: 5 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 20 20">
                    <path d="M6 2a1 1 0 00-1 1v1h10V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM3 7a1 1 0 000 2v7a2 2 0 002 2h10a2 2 0 002-2V9a1 1 0 000-2H3zm3 3a1 1 0 012 0v4a1 1 0 11-2 0v-4z" />
                  </svg>
                  <Typography variant="subtitle2" color="white" sx={{ textTransform: "uppercase" }}>
                    Create Date
                  </Typography>
                </Box>
              </TableCell>

              <TableCell align="center" sx={{ width: 150, minWidth: 150 }}>
                <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 00-2 0v5a1 1 0 00.553.894l4 2a1 1 0 10.894-1.788L11 10.382V5z" />
                  </svg>
                  <Typography variant="subtitle2" color="white" sx={{ textTransform: "uppercase" }}>
                    Status
                  </Typography>
                </Box>
              </TableCell>

              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <Typography variant="subtitle2" color="white" sx={{ textTransform: "uppercase" }}>
                    Email
                  </Typography>
                </Box>
              </TableCell>

              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <Typography variant="subtitle2" color="white" sx={{ textTransform: "uppercase" }}>
                    Contact
                  </Typography>
                </Box>
              </TableCell>

              <TableCell align="center">
                <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="white" viewBox="0 0 24 24">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                  <Typography variant="subtitle2" color="white" sx={{ textTransform: "uppercase" }}>
                    Actions
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {users.length > 0 ? (
              users.map((user, index) => (
                <TableRow
                  key={user.id}
                  hover
                  sx={{
                    backgroundColor: index % 2 === 0 ? "background.paper" : "grey.50",
                    transition: "all 0.2s",
                    "&:hover": {
                      backgroundColor: "blue.50",
                      boxShadow: 1,
                    },
                  }}>
                  <TableCell align="center">
                    <Typography fontWeight="600" color="text.primary">
                      {user.id}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ width: 210, minWidth: 210 }}>
                    <Typography fontWeight="500" color="text.primary">
                      {displayValue(user.username)}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={capitalizeRole(user.role)}
                      size="small"
                      sx={{
                        px: 1,
                        fontWeight: 600,
                        backgroundColor: alpha(getRoleColor(user.role), 0.1),
                        color: getRoleColor(user.role),
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {formatDate(user.create_date)}
                    </Typography>
                  </TableCell>

                  <TableCell align="center" sx={{ width: 150, minWidth: 150 }}>
                    <Chip
                      label={user.status ? "Active" : "Inactive"}
                      size="small"
                      icon={user.status ? <CheckCircle fontSize="small" sx={{ color: "#2E7D32", mr: 0.5 }} /> : <Block fontSize="small" sx={{ color: "#6B7280", mr: 0.5 }} />}
                      sx={{
                        backgroundColor: user.status ? "#E6F4EA" : "#F3F4F6",
                        color: user.status ? "#2E7D32" : "#6B7280",
                        fontWeight: 600,
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography color="text.secondary">{displayValue(user.email)}</Typography>
                  </TableCell>

                  <TableCell>
                    <Typography color="text.secondary">{displayValue(user.contact_number)}</Typography>
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button variant="contained" size="small" color="success" onClick={() => onViewProfile(user.id)} startIcon={<Visibility fontSize="small" />}>
                        View
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        color={user.status ? "error" : "primary"}
                        onClick={() => handleToggleStatus(user)}
                        sx={{ minWidth: 128 }}
                        startIcon={
                          <SvgIcon fontSize="small">
                            <path
                              d={
                                user.status
                                  ? "M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 008.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                                  : "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              }
                            />
                          </SvgIcon>
                        }>
                        {user.status ? "Deactivate" : "Activate"}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <SvgIcon fontSize="large" sx={{ color: "grey.400" }}>
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </SvgIcon>
                    <Typography variant="h6" fontWeight="600">
                      No users found
                    </Typography>
                    <Typography color="text.secondary">Try adjusting your filters or add new users</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UserManagementTable;
