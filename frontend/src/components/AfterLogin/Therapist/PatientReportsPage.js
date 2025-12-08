import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Paper,
  Alert,
  Chip,
  Stack,
  OutlinedInput,
  InputAdornment
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useNavigate } from "react-router-dom";

const PatientReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "-";
    
    // Format: DD/MM/YYYY HH:MM AM/PM
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = String(hours).padStart(2, "0");
    
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  const renderStatusChip = (status) => {
    const state = status?.state || "unknown";

    const configMap = {
      completed: {
        label: "Completed",
        color: "success",
        icon: CheckCircleOutlineIcon
      },
      pending: {
        label: "Not completed",
        color: "warning",
        icon: CancelOutlinedIcon
      },
      "no-treatment": {
        label: "No active treatment",
        color: "default",
        icon: RemoveCircleOutlineIcon
      },
      "no-exercises": {
        label: "No exercises assigned",
        color: "default",
        icon: RemoveCircleOutlineIcon
      },
      error: {
        label: "Status unavailable",
        color: "default",
        icon: ErrorOutlineIcon
      },
      unknown: {
        label: "Checking...",
        color: "default",
        icon: ErrorOutlineIcon
      }
    };

    const config = configMap[state] || configMap.unknown;
    const IconComponent = config.icon;

    const chip = (
      <Chip
        size="small"
        variant={config.color === "default" ? "outlined" : "filled"}
        color={config.color}
        icon={IconComponent ? <IconComponent fontSize="small" /> : undefined}
        label={config.label}
      />
    );

    if (status?.message) {
      return <Tooltip title={status.message}>{chip}</Tooltip>;
    }

    return chip;
  };

  const fetchPatientsAndSummaries = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("http://127.0.0.1:8000/api/patient-report-summary/");
      if (!response.ok) {
        throw new Error("Failed to load patient report summary");
      }

      const data = await response.json();
      const normalized = (Array.isArray(data) ? data : []).map((item) => ({
        patientId: item.patient_id,
        name: item.patient_name || "-",
        email: item.email || "-",
        phone: item.phone || "-",
        todayStatus: item.today_status || { state: "unknown" },
        lastRecordedAt: item.last_recorded_at || null,
        treatmentInfo: {
          hasTreatment: item.treatment?.has_treatment || false,
          treatmentId: item.treatment?.treatment_id || null,
          treatmentName: item.treatment?.name || "-",
          completionRate: item.treatment?.completion_rate ?? null,
          completionDays: item.treatment?.completed_days ?? 0,
          avgRepDuration: item.treatment?.avg_rep_duration ?? null,
          consistencyScore: item.treatment?.consistency_score ?? null
        }
      }));

      setPatients(normalized);
    } catch (err) {
      console.error("Failed to load patient reports:", err);
      setError(err.message || "Failed to load information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientsAndSummaries();
  }, []);

  const hasData = useMemo(() => patients.length > 0, [patients]);
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const term = searchTerm.trim().toLowerCase();
    return patients.filter((patient) => {
      const values = [
        patient.name,
        patient.patientId,
        patient.phone
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return values.some((value) => value.includes(term));
    });
  }, [searchTerm, patients]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        spacing={2}
        sx={{ mb: 3 }}
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Patient Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View current treatment progress and exercise completion overview.
          </Typography>
        </Box>
        <OutlinedInput
          sx={{
            width: { xs: "100%", sm: 420 },
            backgroundColor: "background.paper",
            borderRadius: 2
          }}
          placeholder="Search by name, ID, phone, treatment or exercise..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          }
        />
      </Stack>

      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : !hasData ? (
            <Alert severity="info">No patients found or no exercise records yet.</Alert>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Patient</TableCell>
                    <TableCell align="center">Today Status</TableCell>
                    <TableCell align="center">Complete Days</TableCell>
                    <TableCell align="center">Treatment Avg Rep Duration</TableCell>
                    <TableCell align="center">Treatment Consistency Score</TableCell>
                    <TableCell align="center">Overall Completion Rate</TableCell>
                    <TableCell>Last Exercise Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.patientId} hover>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography fontWeight={600} noWrap>
                          {patient.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {patient.patientId}
                        </Typography>
                        {patient.phone && (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {patient.phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">{renderStatusChip(patient.todayStatus)}</TableCell>
                      <TableCell align="center">
                        {patient.treatmentInfo?.hasTreatment ? patient.treatmentInfo.completionDays : "-"}
                      </TableCell>
                      <TableCell align="center">
                        {patient.treatmentInfo?.hasTreatment && patient.treatmentInfo.avgRepDuration !== null
                          ? `${patient.treatmentInfo.avgRepDuration}s`
                          : "-"}
                      </TableCell>
                      <TableCell align="center">
                        {patient.treatmentInfo?.hasTreatment && patient.treatmentInfo.consistencyScore !== null
                          ? patient.treatmentInfo.consistencyScore.toFixed(3)
                          : "-"}
                      </TableCell>
                      <TableCell align="center">
                        {patient.treatmentInfo?.hasTreatment && patient.treatmentInfo.completionRate !== null
                          ? `${patient.treatmentInfo.completionRate}%`
                          : "-"}
                      </TableCell>
                      <TableCell>{formatDateTime(patient.lastRecordedAt)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <span>
                            <IconButton
                              color="primary"
                              onClick={() => {
                                navigate(`/home/patient-reports/${patient.patientId}`);
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PatientReportsPage;


