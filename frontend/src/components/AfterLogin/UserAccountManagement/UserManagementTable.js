import { useTheme, Button, Chip, Stack, SvgIcon, Box, Paper, TableContainer, Table, TableHead, TableBody, TableCell, Typography, TableRow, Avatar } from "@mui/material";
import { Visibility, CheckCircle, Block, Edit, PersonRemove, Person as PersonIcon } from "@mui/icons-material";
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

  const getRoleLabel = (role) => {
    const roleLabels = {
      admin: "Admin",
      patient: "Patient",
      therapist: "Therapist",
    };
    return roleLabels[role] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : "");
  };

  const getInitials = (username) => {
    if (!username) return "U";
    return username.charAt(0).toUpperCase();
  };

  return (
    <TableContainer>
      <Table sx={{ width: "100%" }}>
        {/* Header */}
        <TableHead>
          <TableRow sx={{ 
            backgroundColor: alpha("#3b82f6", 0.05),
            borderBottom: "2px solid",
            borderColor: alpha("#3b82f6", 0.1),
          }}>
            <TableCell sx={{ 
              fontWeight: 700, 
              color: "text.primary", 
              py: 3,
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              width: "30%"
            }}>
              User Information
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 700, 
              color: "text.primary", 
              py: 3,
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              width: "15%"
            }}>
              Contact
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 700, 
              color: "text.primary", 
              py: 3,
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              width: "10%"
            }}>
              Role
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 700, 
              color: "text.primary", 
              py: 3,
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              width: "10%"
            }}>
              Status
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 700, 
              color: "text.primary", 
              py: 3,
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              width: "15%"
            }}>
              Created By
            </TableCell>
            <TableCell sx={{ 
              fontWeight: 700, 
              color: "text.primary", 
              py: 3,
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              width: "20%"
            }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>

        {/* Body */}
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              sx={{
                "&:hover": {
                  backgroundColor: alpha("#3b82f6", 0.02),
                },
                borderBottom: "1px solid",
                borderColor: "grey.100",
              }}
            >
              {/* User Information */}
              <TableCell sx={{ py: 1.5 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: alpha(getRoleColor(user.role), 0.1),
                      color: getRoleColor(user.role),
                      fontWeight: 600,
                      fontSize: "1.1rem",
                      border: `2px solid ${alpha(getRoleColor(user.role), 0.2)}`,
                    }}
                  >
                    {user.avatar ? (
                      <img
                        src={`data:image/jpeg;base64,${user.avatar}`}
                        alt={user.username}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    {!user.avatar && (
                      <span style={{ display: user.avatar ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getInitials(user.username)}
                      </span>
                    )}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                      {displayValue(user.username)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {displayValue(user.email)}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>

              {/* Contact */}
              <TableCell sx={{ py: 1.5 }}>
                <Typography variant="body2" color="text.primary" fontWeight="500">
                  {displayValue(user.contact_number)}
                </Typography>
              </TableCell>

              {/* Role */}
              <TableCell sx={{ py: 1.5 }}>
                <Chip
                  label={getRoleLabel(user.role)}
                  sx={{
                    backgroundColor: alpha(getRoleColor(user.role), 0.1),
                    color: getRoleColor(user.role),
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    height: 28,
                    borderRadius: 2,
                  }}
                />
              </TableCell>

              {/* Status */}
              <TableCell sx={{ py: 1.5 }}>
                <Chip
                  label={user.status ? "Active" : "Inactive"}
                  sx={{
                    backgroundColor: user.status 
                      ? alpha("#22c55e", 0.1) 
                      : alpha("#ef4444", 0.1),
                    color: user.status ? "#22c55e" : "#ef4444",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                    height: 28,
                    borderRadius: 2,
                  }}
                />
              </TableCell>

              {/* Created By */}
              <TableCell sx={{ py: 1.5 }}>
                <Typography variant="body2" color="text.primary" fontWeight="500">
                  {displayValue(user.created_by || "System")}
                </Typography>
              </TableCell>

              {/* Actions */}
              <TableCell sx={{ py: 1.5 }}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => onViewProfile(user.id)}
                    sx={{
                      textTransform: "uppercase",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      borderRadius: 2,
                      px: 2,
                      py: 0.5,
                      borderColor: alpha("#3b82f6", 0.3),
                      color: "#3b82f6",
                      "&:hover": {
                        borderColor: "#3b82f6",
                        backgroundColor: alpha("#3b82f6", 0.05),
                      },
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={user.status ? <Block /> : <CheckCircle />}
                    onClick={() => handleToggleStatus(user.id, user.status)}
                    sx={{
                      textTransform: "uppercase",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      borderRadius: 2,
                      px: 2,
                      py: 0.5,
                      borderColor: user.status 
                        ? alpha("#ef4444", 0.3) 
                        : alpha("#22c55e", 0.3),
                      color: user.status ? "#ef4444" : "#22c55e",
                      "&:hover": {
                        borderColor: user.status ? "#ef4444" : "#22c55e",
                        backgroundColor: user.status 
                          ? alpha("#ef4444", 0.05) 
                          : alpha("#22c55e", 0.05),
                      },
                    }}
                  >
                    {user.status ? "Disable" : "Enable"}
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UserManagementTable;