import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Alert,
  Stack,
  Chip,
  Divider,
  Button,
  Grid,
  Paper,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return "-";
  const totalSeconds = Math.round(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (isoString) => {
  if (!isoString) return "-";
  // Handle both ISO string and YYYY-MM-DD format
  let date;
  if (typeof isoString === 'string' && isoString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // YYYY-MM-DD format
    const [year, month, day] = isoString.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(isoString);
  }
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  
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

const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const buildDailyStatusEvents = (records, treatments = []) => {
  const events = [];
  const completedDates = new Set();

  // Collect all dates that have exercise records
  records.forEach((record) => {
    const rawDate = record.start_time || record.recorded_at;
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const dateKey = formatDateKey(date);
    completedDates.add(dateKey);
  });

  // Build a set of dates that are within any treatment date range
  const treatmentDateRanges = new Set();
  treatments.forEach((treatment) => {
    if (!treatment.start_date) return;
    
    const startDate = new Date(treatment.start_date);
    if (Number.isNaN(startDate.getTime())) return;
    
    // If end_date exists, use it; otherwise, use today as the end date
    const endDate = treatment.end_date 
      ? new Date(treatment.end_date)
      : normalizeDate(new Date());
    
    if (Number.isNaN(endDate.getTime())) return;
    
    // Generate all dates in this treatment range
    const startDay = normalizeDate(startDate);
    const endDay = normalizeDate(endDate);
    const totalDays = Math.floor((endDay - startDay) / MS_PER_DAY) + 1;
    
    for (let offset = 0; offset < totalDays; offset += 1) {
      const current = new Date(startDay);
      current.setDate(startDay.getDate() + offset);
      const dateKey = formatDateKey(current);
      treatmentDateRanges.add(dateKey);
    }
  });

  // If no treatments, return empty events
  if (treatmentDateRanges.size === 0) return events;

  // Get date range from treatment date ranges
  const allDates = Array.from(treatmentDateRanges).map((dateKey) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  });

  if (allDates.length === 0) return events;

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const today = normalizeDate(new Date());

  // Generate status events only for dates within treatment ranges
  const startDay = normalizeDate(minDate);
  const endDay = normalizeDate(maxDate);
  const totalDays = Math.floor((endDay - startDay) / MS_PER_DAY) + 1;

  for (let offset = 0; offset < totalDays; offset += 1) {
    const current = new Date(startDay);
    current.setDate(startDay.getDate() + offset);
    const dateKey = formatDateKey(current);
    const currentNormalized = normalizeDate(current);

    // Only mark dates that are within treatment date ranges
    if (!treatmentDateRanges.has(dateKey)) continue;
    
    // Only show status for dates up to and including today
    if (currentNormalized > today) continue;

    const isCompleted = completedDates.has(dateKey);

    events.push({
      id: `status-${dateKey}`,
      title: "",
      start: dateKey,
      allDay: true,
      display: "list-item",
      backgroundColor: "transparent",
      borderColor: "transparent",
      textColor: "transparent",
      extendedProps: {
        type: "status",
        status: isCompleted ? "completed" : "missed",
        date: dateKey,
      },
    });
  }

  return events;
};

const PatientReportDetailPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [activeTreatment, setActiveTreatment] = useState(null);
  const [previousTreatment, setPreviousTreatment] = useState(null);
  const [completedDays, setCompletedDays] = useState(0);
  const [shouldCompletedDays, setShouldCompletedDays] = useState(0);
  const [sessionsCompletionRate, setSessionsCompletionRate] = useState(null);
  const [totalRepsCompleted, setTotalRepsCompleted] = useState(0);
  const [shouldCompletedReps, setShouldCompletedReps] = useState(0);
  const [repsCompletionRate, setRepsCompletionRate] = useState(null);
  const [avgRepDuration, setAvgRepDuration] = useState(null);
  const [consistencyScore, setConsistencyScore] = useState(null);
  const [avgFatigueIndex, setAvgFatigueIndex] = useState(null);
  const [lastExerciseDate, setLastExerciseDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [exerciseRecords, setExerciseRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [allTreatments, setAllTreatments] = useState([]);
  const [selectedDateTreatmentExercises, setSelectedDateTreatmentExercises] = useState([]);
  
  // Use refs to store latest values for event handlers
  const selectedDateRef = useRef(null);
  const treatmentDateRangesRef = useRef(new Set());

  const fetchDetails = async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch patient report detail and all treatments in parallel
      const [reportResponse, treatmentsResponse] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/patient-report-detail/${patientId}/`),
        fetch(`http://127.0.0.1:8000/api/treatments/?patient_id=${patientId}`)
      ]);

      if (!reportResponse.ok) {
        throw new Error("Failed to load patient report detail");
      }

      const data = await reportResponse.json();

      setPatientInfo(data.patient);
      setRecords(Array.isArray(data.records) ? data.records : []);
      setActiveTreatment(data.active_treatment);
      setPreviousTreatment(data.previous_treatment);
      setCompletedDays(data.completed_days || 0);
      setShouldCompletedDays(data.should_completed_days || 0);
      setSessionsCompletionRate(data.sessions_completion_rate);
      setTotalRepsCompleted(data.total_reps_completed || 0);
      setShouldCompletedReps(data.should_completed_reps || 0);
      setRepsCompletionRate(data.reps_completion_rate);
      setAvgRepDuration(data.avg_rep_duration);
      setConsistencyScore(data.consistency_score);
      setAvgFatigueIndex(data.avg_fatigue_index);
      setLastExerciseDate(data.last_exercise_date);
      
      const records = data.exercise_records || [];
      setExerciseRecords(records);
      
      // Default to showing the latest (first) record
      if (records.length > 0) {
        setSelectedRecord(records[0]);
      }

      // Fetch all treatments for calendar marking
      if (treatmentsResponse.ok) {
        const treatmentsData = await treatmentsResponse.json();
        // Filter treatments to ensure they belong to this patient (double check)
        const filteredTreatments = Array.isArray(treatmentsData) 
          ? treatmentsData.filter(treatment => {
              // Check if treatment.patient_id matches patientId (handle both string and number)
              const treatmentPatientId = String(treatment.patient_id || '');
              const currentPatientId = String(patientId || '');
              return treatmentPatientId === currentPatientId;
            })
          : [];
        setAllTreatments(filteredTreatments);
      } else {
        setAllTreatments([]);
      }
    } catch (err) {
      console.error("Failed to load patient report:", err);
      setError(err.message || "Failed to load patient report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [patientId]);

  const dailyStatusEvents = useMemo(
    () => buildDailyStatusEvents(records, allTreatments),
    [records, allTreatments]
  );

  const events = useMemo(
    () => [...dailyStatusEvents],
    [dailyStatusEvents]
  );

  // Helper function to convert date string to YYYY-MM-DD format
  const formatDateForChart = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Find treatment for selected date
  // First try to find treatment_id from exercise records for that date
  // If not found, fall back to finding treatment by date range
  const selectedDateTreatment = useMemo(() => {
    if (!selectedDate || !allTreatments || allTreatments.length === 0) return null;
    
    const selectedDateObj = new Date(selectedDate);
    if (Number.isNaN(selectedDateObj.getTime())) return null;
    selectedDateObj.setHours(0, 0, 0, 0);
    
    // First, try to find treatment_id from exercise records for this date
    if (exerciseRecords && exerciseRecords.length > 0) {
      const recordForDate = exerciseRecords.find((record) => {
        if (!record.date) return false;
        const recordDate = formatDateForChart(record.date);
        return recordDate === selectedDate;
      });
      
      if (recordForDate && recordForDate.treatment_id) {
        // Find treatment by treatment_id from the record
        const treatment = allTreatments.find((t) => t.treatment_id === recordForDate.treatment_id);
        if (treatment) {
          return treatment;
        }
      }
    }
    
    // Fallback: Find treatment that covers the selected date by date range
    const treatment = allTreatments.find((treatment) => {
      if (!treatment.start_date) return false;
      
      const startDate = new Date(treatment.start_date);
      if (Number.isNaN(startDate.getTime())) return false;
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = treatment.end_date 
        ? new Date(treatment.end_date)
        : new Date(); // If no end_date, use today as the end
      if (Number.isNaN(endDate.getTime())) return false;
      endDate.setHours(23, 59, 59, 999);
      
      return selectedDateObj >= startDate && selectedDateObj <= endDate;
    });
    
    return treatment || null;
  }, [selectedDate, allTreatments, exerciseRecords]);

  // Determine current treatment: use selectedDateTreatment if date is selected, otherwise use activeTreatment
  const currentTreatment = useMemo(() => {
    return selectedDate && selectedDateTreatment ? selectedDateTreatment : activeTreatment;
  }, [selectedDate, selectedDateTreatment, activeTreatment]);

  // Calculate chart data from exercise records (use currentTreatment)
  const repsTrendData = useMemo(() => {
    if (!exerciseRecords || exerciseRecords.length === 0) return [];
    
    const currentTreatmentId = currentTreatment?.treatment_id;
    const filteredRecords = currentTreatmentId
      ? exerciseRecords.filter((record) => record.treatment_id === currentTreatmentId)
      : exerciseRecords;
    
    // Group records by date and sum reps
    const dateMap = new Map();
    filteredRecords.forEach((record) => {
      const dateKey = formatDateForChart(record.date);
      if (!dateKey) return;
      
      if (dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          reps: dateMap.get(dateKey).reps + (record.reps || 0),
        });
      } else {
        dateMap.set(dateKey, {
          date: dateKey,
          reps: record.reps || 0,
        });
      }
    });
    
    // Convert to array and sort by date
    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [exerciseRecords, currentTreatment]);

  const avgDurationData = useMemo(() => {
    if (!exerciseRecords || exerciseRecords.length === 0) return [];
    
    const currentTreatmentId = currentTreatment?.treatment_id;
    const filteredRecords = currentTreatmentId
      ? exerciseRecords.filter((record) => record.treatment_id === currentTreatmentId)
      : exerciseRecords;
    
    // Group records by date and calculate average duration
    const dateMap = new Map();
    filteredRecords.forEach((record) => {
      const dateKey = formatDateForChart(record.date);
      if (!dateKey || record.avg_time === null || record.avg_time === undefined) return;
      
      if (dateMap.has(dateKey)) {
        const existing = dateMap.get(dateKey);
        existing.totalDuration += record.avg_time;
        existing.count += 1;
        existing.duration = existing.totalDuration / existing.count;
      } else {
        dateMap.set(dateKey, {
          date: dateKey,
          duration: record.avg_time,
          totalDuration: record.avg_time,
          count: 1,
        });
      }
    });
    
    // Convert to array and sort by date
    return Array.from(dateMap.values())
      .map(({ date, duration }) => ({ date, duration: Number(duration.toFixed(2)) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [exerciseRecords, currentTreatment]);

  const consistencyData = useMemo(() => {
    if (!exerciseRecords || exerciseRecords.length === 0) return [];
    
    const currentTreatmentId = currentTreatment?.treatment_id;
    const filteredRecords = currentTreatmentId
      ? exerciseRecords.filter((record) => record.treatment_id === currentTreatmentId)
      : exerciseRecords;
    
    // Group records by date and calculate average consistency
    // Note: consistency is stored as percentage (e.g., 75.5), convert to decimal (0.755)
    const dateMap = new Map();
    filteredRecords.forEach((record) => {
      const dateKey = formatDateForChart(record.date);
      if (!dateKey || record.consistency === null || record.consistency === undefined) return;
      
      // Convert percentage to decimal
      const consistencyDecimal = record.consistency / 100;
      
      if (dateMap.has(dateKey)) {
        const existing = dateMap.get(dateKey);
        existing.totalScore += consistencyDecimal;
        existing.count += 1;
        existing.score = existing.totalScore / existing.count;
      } else {
        dateMap.set(dateKey, {
          date: dateKey,
          score: consistencyDecimal,
          totalScore: consistencyDecimal,
          count: 1,
        });
      }
    });
    
    // Convert to array and sort by date
    return Array.from(dateMap.values())
      .map(({ date, score }) => ({ date, score: Number(score.toFixed(3)) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [exerciseRecords, currentTreatment]);

  // Filter exercise records for current treatment only (for table display)
  const filteredExerciseRecords = useMemo(() => {
    if (!exerciseRecords || exerciseRecords.length === 0) return [];
    
    const currentTreatmentId = currentTreatment?.treatment_id;
    return currentTreatmentId
      ? exerciseRecords.filter((record) => record.treatment_id === currentTreatmentId)
      : exerciseRecords;
  }, [exerciseRecords, currentTreatment]);

  // Build treatment date ranges set (same logic as buildDailyStatusEvents)
  const treatmentDateRanges = useMemo(() => {
    const ranges = new Set();
    if (!allTreatments || allTreatments.length === 0) {
      treatmentDateRangesRef.current = ranges;
      return ranges;
    }
    
    allTreatments.forEach((treatment) => {
      if (!treatment.start_date) return;
      
      const startDate = new Date(treatment.start_date);
      if (Number.isNaN(startDate.getTime())) return;
      
      // If end_date exists, use it; otherwise, use today as the end date
      const endDate = treatment.end_date 
        ? new Date(treatment.end_date)
        : normalizeDate(new Date());
      
      if (Number.isNaN(endDate.getTime())) return;
      
      // Generate all dates in this treatment range
      const startDay = normalizeDate(startDate);
      const endDay = normalizeDate(endDate);
      const totalDays = Math.floor((endDay - startDay) / MS_PER_DAY) + 1;
      
      for (let offset = 0; offset < totalDays; offset += 1) {
        const current = new Date(startDay);
        current.setDate(startDay.getDate() + offset);
        const dateKey = formatDateKey(current);
        ranges.add(dateKey);
      }
    });
    
    // Update ref with latest ranges
    treatmentDateRangesRef.current = ranges;
    return ranges;
  }, [allTreatments]);
  
  // Update refs when values change
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Fetch exercises for selected date treatment
  useEffect(() => {
    // Clear exercises when selectedDate is cleared
    if (!selectedDate) {
      setSelectedDateTreatmentExercises([]);
      return;
    }

    // If no selectedDateTreatment, clear exercises
    if (!selectedDateTreatment || !selectedDateTreatment.treatment_id) {
      setSelectedDateTreatmentExercises([]);
      return;
    }

    const treatmentId = selectedDateTreatment.treatment_id;

    const fetchSelectedDateTreatmentExercises = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/treatment-exercises/${treatmentId}/`
        );
        
        if (response.ok) {
          const exercisesData = await response.json();
          // Transform to match the format expected by the UI
          const transformedExercises = Array.isArray(exercisesData)
            ? exercisesData.map((ex) => ({
                treatment_exercise_id: ex.treatment_exercise_id,
                exercise_name: ex.exercise_name,
                reps_per_set: ex.reps_per_set,
                sets: ex.sets,
                order_in_treatment: ex.order_in_treatment,
              }))
            : [];
          setSelectedDateTreatmentExercises(transformedExercises);
        } else {
          setSelectedDateTreatmentExercises([]);
        }
      } catch (error) {
        console.error("Error fetching selected date treatment exercises:", error);
        setSelectedDateTreatmentExercises([]);
      }
    };

    fetchSelectedDateTreatmentExercises();
  }, [selectedDate, selectedDateTreatment?.treatment_id]);

  // Filter exercise records for selected date's treatment (show all records for that treatment, not just the selected date)
  // IMPORTANT: Use exerciseRecords (all records) instead of filteredExerciseRecords (only active treatment)
  const selectedDateExerciseRecords = useMemo(() => {
    if (!selectedDate || !selectedDateTreatment || !exerciseRecords || exerciseRecords.length === 0) {
      return [];
    }
    
    // Get the treatment_id from the selected date's treatment
    const treatmentId = selectedDateTreatment.treatment_id;
    if (!treatmentId) {
      return [];
    }
    
    // Filter by treatment_id from ALL exercise records (not just active treatment)
    return exerciseRecords.filter((record) => {
      return record.treatment_id === treatmentId;
    });
  }, [selectedDate, selectedDateTreatment, exerciseRecords]);

  // Auto-select the first exercise record when selectedDate changes
  useEffect(() => {
    if (selectedDate && selectedDateExerciseRecords && selectedDateExerciseRecords.length > 0) {
      // Find the first record that matches the selected date
      const recordForDate = selectedDateExerciseRecords.find((record) => {
        if (!record.date) return false;
        const recordDate = formatDateForChart(record.date);
        return recordDate === selectedDate;
      });
      
      // If found a record for the selected date, select it
      // Otherwise, select the first record from the treatment
      const recordToSelect = recordForDate || selectedDateExerciseRecords[0];
      setSelectedRecord(recordToSelect);
    } else if (!selectedDate) {
      // When no date is selected, select the first record from filteredExerciseRecords
      if (filteredExerciseRecords && filteredExerciseRecords.length > 0) {
        setSelectedRecord(filteredExerciseRecords[0]);
      }
    }
  }, [selectedDate, selectedDateExerciseRecords, filteredExerciseRecords]);

  // Calculate statistics for current treatment (useMemo to recalculate when currentTreatment changes)
  const currentTreatmentStats = useMemo(() => {
    if (!currentTreatment || !exerciseRecords || exerciseRecords.length === 0) {
      return {
        completedDays: 0,
        shouldCompletedDays: 0,
        sessionsCompletionRate: null,
        totalRepsCompleted: 0,
        shouldCompletedReps: 0,
        repsCompletionRate: null,
        avgRepDuration: null,
        consistencyScore: null,
        avgFatigueIndex: null,
      };
    }

    const currentTreatmentId = currentTreatment.treatment_id;
    const treatmentRecords = exerciseRecords.filter((record) => record.treatment_id === currentTreatmentId);

    if (treatmentRecords.length === 0) {
      return {
        completedDays: 0,
        shouldCompletedDays: 0,
        sessionsCompletionRate: null,
        totalRepsCompleted: 0,
        shouldCompletedReps: 0,
        repsCompletionRate: null,
        avgRepDuration: null,
        consistencyScore: null,
        avgFatigueIndex: null,
      };
    }

    // Calculate completed days (unique dates with records)
    const completedDatesSet = new Set();
    treatmentRecords.forEach((record) => {
      if (record.date) {
        const dateKey = formatDateForChart(record.date);
        if (dateKey) completedDatesSet.add(dateKey);
      }
    });
    const completedDays = completedDatesSet.size;

    // Calculate should completed days (from treatment start_date to end_date or today)
    const startDate = new Date(currentTreatment.start_date);
    const endDate = currentTreatment.end_date ? new Date(currentTreatment.end_date) : new Date();
    const today = normalizeDate(new Date());
    const treatmentEndDate = normalizeDate(endDate > today ? today : endDate);
    const treatmentStartDate = normalizeDate(startDate);
    const shouldCompletedDays = Math.max(1, Math.floor((treatmentEndDate - treatmentStartDate) / MS_PER_DAY) + 1);
    const sessionsCompletionRate = shouldCompletedDays > 0 ? (completedDays / shouldCompletedDays) * 100 : null;

    // Calculate total reps completed
    const totalRepsCompleted = treatmentRecords.reduce((sum, record) => sum + (record.reps || 0), 0);

    // Calculate should completed reps (from treatment exercises)
    const exercises = selectedDate && selectedDateTreatment ? selectedDateTreatmentExercises : (currentTreatment?.exercises || []);
    const shouldCompletedReps = exercises.reduce((sum, ex) => {
      const dailyReps = (ex.reps_per_set || 0) * (ex.sets || 0);
      return sum + (dailyReps * shouldCompletedDays);
    }, 0);
    const repsCompletionRate = shouldCompletedReps > 0 ? (totalRepsCompleted / shouldCompletedReps) * 100 : null;

    // Calculate average rep duration
    const recordsWithAvgTime = treatmentRecords.filter((r) => r.avg_time !== null && r.avg_time !== undefined);
    const avgRepDuration = recordsWithAvgTime.length > 0
      ? recordsWithAvgTime.reduce((sum, r) => sum + r.avg_time, 0) / recordsWithAvgTime.length
      : null;

    // Calculate average consistency score
    const recordsWithConsistency = treatmentRecords.filter((r) => r.consistency !== null && r.consistency !== undefined);
    const avgConsistency = recordsWithConsistency.length > 0
      ? recordsWithConsistency.reduce((sum, r) => sum + (r.consistency / 100), 0) / recordsWithConsistency.length
      : null;

    // Calculate average fatigue index
    const recordsWithFatigue = treatmentRecords.filter((r) => r.fatigue !== null && r.fatigue !== undefined);
    const avgFatigueIndex = recordsWithFatigue.length > 0
      ? recordsWithFatigue.reduce((sum, r) => sum + r.fatigue, 0) / recordsWithFatigue.length
      : null;

    return {
      completedDays,
      shouldCompletedDays,
      sessionsCompletionRate,
      totalRepsCompleted,
      shouldCompletedReps,
      repsCompletionRate,
      avgRepDuration,
      consistencyScore: avgConsistency,
      avgFatigueIndex,
    };
  }, [currentTreatment, exerciseRecords, selectedDate, selectedDateTreatment, selectedDateTreatmentExercises]);

  // Use currentTreatmentStats when date is selected, otherwise use original stats
  const displayStats = selectedDate && currentTreatment
    ? currentTreatmentStats
    : {
        completedDays,
        shouldCompletedDays,
        sessionsCompletionRate,
        totalRepsCompleted,
        shouldCompletedReps,
        repsCompletionRate,
        avgRepDuration,
        consistencyScore,
        avgFatigueIndex,
      };

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
          variant="outlined"
        >
          Back
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Patient Profile Card with Title - Full Width */}
          <Grid item xs={12}>
            <Card elevation={0} sx={{ borderRadius: 3, overflow: "hidden" }}>
              <Box
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  p: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: "rgba(255, 255, 255, 0.2)",
                    fontSize: "1.5rem",
                  }}
                >
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                    Patient Report Dashboard
                  </Typography>
                  <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
                    {patientInfo?.username || patientInfo?.full_name || "-"}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      ID: {patientInfo?.id || patientId}
                    </Typography>
                    {patientInfo?.phone && (
                      <>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>•</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {patientInfo.phone}
                        </Typography>
                      </>
                    )}
                  </Stack>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Treatment Information and Date Picker Container */}
          <Grid item xs={12} lg={8}>
            <Stack spacing={3}>
              {/* Active Treatment Card */}
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                    <CheckCircleIcon sx={{ color: "success.main", fontSize: 32 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Treatment Info
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Treatment progress and completion status
                      </Typography>
                    </Box>
                  </Stack>

                  {currentTreatment ? (
                    <Stack spacing={3}>
                      {selectedDate && selectedDateTreatment && (
                        <Box sx={{ mb: 1 }}>
                          <Chip 
                            label={`Selected Date: ${formatDate(selectedDate)}`}
                            color="info"
                            size="small"
                            sx={{ mb: 2 }}
                          />
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                          Treatment Name
                        </Typography>
                        <Typography variant="h6" fontWeight={500}>
                          {currentTreatment.name}
                        </Typography>
                      </Box>

                      <Divider />

                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                              Start Date
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CalendarTodayIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                              <Typography variant="body1" fontWeight={500}>
                                {formatDate(currentTreatment.start_date)}
                              </Typography>
                            </Stack>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                              End Date
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CalendarTodayIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                              <Typography variant="body1" fontWeight={500}>
                                {currentTreatment.end_date ? formatDate(currentTreatment.end_date) : "Ongoing"}
                              </Typography>
                            </Stack>
                          </Box>
                        </Grid>
                      </Grid>

                      <Divider />

                      {/* Treatment Exercises */}
                      {(() => {
                        const exercisesToShow = selectedDate && selectedDateTreatment
                          ? selectedDateTreatmentExercises 
                          : (currentTreatment?.exercises || []);
                        
                        return exercisesToShow.length > 0 && (
                          <>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
                                Treatment Exercises
                              </Typography>
                              <Stack spacing={1.5}>
                                {exercisesToShow.map((exercise, index) => (
                                <Paper
                                  key={exercise.treatment_exercise_id || index}
                                  elevation={0}
                                  sx={{
                                    p: 2,
                                    bgcolor: "grey.50",
                                    borderRadius: 2,
                                    border: "1px solid",
                                    borderColor: "divider",
                                  }}
                                >
                                  <Stack direction="row" spacing={2} alignItems="center">
                                    <Box
                                      sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        bgcolor: "primary.main",
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 600,
                                        fontSize: "0.875rem",
                                      }}
                                    >
                                      {exercise.order_in_treatment || index + 1}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body1" fontWeight={500}>
                                        {exercise.exercise_name}
                                      </Typography>
                                      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                        {exercise.reps_per_set && (
                                          <Typography variant="caption" color="text.secondary">
                                            Reps: {exercise.reps_per_set}
                                          </Typography>
                                        )}
                                        {exercise.sets && (
                                          <Typography variant="caption" color="text.secondary">
                                            Sets: {exercise.sets}
                                          </Typography>
                                        )}
                                      </Stack>
                                    </Box>
                                  </Stack>
                                </Paper>
                                ))}
                              </Stack>
                            </Box>
                            <Divider />
                          </>
                        );
                      })()}

                      {/* Last Exercise and Previous Treatment */}
                      <Grid container spacing={3}>
                        {lastExerciseDate && (
                          <Grid item xs={12} sm={6}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <AccessTimeIcon sx={{ color: "text.secondary", fontSize: 28 }} />
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Last Exercise
                                </Typography>
                                <Typography variant="body1" fontWeight={500}>
                                  {formatDateTime(lastExerciseDate)}
                                </Typography>
                              </Box>
                            </Stack>
                          </Grid>
                        )}
                        {previousTreatment && (
                          <Grid item xs={12} sm={6}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <AssessmentIcon sx={{ color: "text.secondary", fontSize: 28 }} />
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Previous Treatment
                                </Typography>
                                <Typography variant="body1" fontWeight={500} noWrap>
                                  {previousTreatment.name}
                                </Typography>
                              </Box>
                            </Stack>
                          </Grid>
                        )}
                      </Grid>
                    </Stack>
                  ) : (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No active treatment assigned
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Right Column - Calendar */}
          <Grid item xs={12} lg={4}>
            {!loading && !error && (
              <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                    <CalendarTodayIcon sx={{ color: "secondary.main", fontSize: 24 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Date Selector
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                        Click a date to view performance
                      </Typography>
                    </Box>
                  </Stack>

                  {selectedDate && (
                    <Paper
                      elevation={0}
                      sx={{
                        mb: 1.5,
                        p: 1.5,
                        bgcolor: "info.light",
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "info.main",
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CheckCircleIcon sx={{ fontSize: 18, color: "info.main" }} />
                        <Typography variant="body2" fontWeight={500} color="info.main" sx={{ fontSize: "0.8rem" }}>
                          Selected: {formatDate(selectedDate)}
                        </Typography>
                      </Stack>
                    </Paper>
                  )}

                  <Box
                    sx={{
                      overflowX: "hidden",
                      "--calendar-status-complete": "#4CAF50",
                      "--calendar-status-missed": "#EF5350",
                      "& .fc": {
                        "--fc-theme-standard-border-color": "#e0e0e0",
                        fontSize: "0.75rem",
                      },
                      "& .fc-header-toolbar": {
                        marginBottom: "0.5em",
                        padding: "0.4em",
                      },
                      "& .fc-toolbar-title": {
                        fontSize: "0.95rem",
                        fontWeight: 600,
                      },
                      "& .fc-button": {
                        padding: "0.3em 0.6em",
                        fontSize: "0.7rem",
                        borderRadius: "4px",
                        textTransform: "none",
                        fontWeight: 500,
                      },
                      "& .fc-button-primary": {
                        backgroundColor: "primary.main",
                        borderColor: "primary.main",
                        "&:hover": {
                          backgroundColor: "primary.dark",
                        },
                      },
                      "& .fc-daygrid-day-frame": {
                        position: "relative",
                      },
                      "& .fc-daygrid-day-number": {
                        fontSize: "0.75rem",
                        padding: "4px",
                        fontWeight: 500,
                      },
                      "& .fc-col-header-cell": {
                        padding: "6px 2px",
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      },
                      "& .fc-daygrid-day": {
                        minHeight: "2.5em",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      },
                      "& .fc-daygrid-day:hover": {
                        backgroundColor: "rgba(25, 118, 210, 0.08)",
                      },
                      "& .fc-daygrid-day.fc-day-selected": {
                        backgroundColor: "rgba(25, 118, 210, 0.15)",
                        border: "2px solid",
                        borderColor: "primary.main",
                      },
                      "& .treatment-day-status": {
                        display: "flex !important",
                        alignItems: "flex-end",
                        justifyContent: "flex-end",
                        pointerEvents: "none",
                        margin: 0,
                      },
                      "& .treatment-day-status::after": {
                        content: "''",
                        width: 8,
                        height: 8,
                        borderRadius: "2px",
                        margin: "0 2px 2px 0",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                      },
                      "& .treatment-day-status.completed::after": {
                        backgroundColor: "var(--calendar-status-complete)",
                      },
                      "& .treatment-day-status.missed::after": {
                        backgroundColor: "var(--calendar-status-missed)",
                      },
                      "& .fc .fc-daygrid-day.fc-day-today": {
                        backgroundColor: "rgba(255, 213, 79, 0.2)",
                        fontWeight: 600,
                      },
                    }}
                  >
                    <FullCalendar
                      plugins={[dayGridPlugin]}
                      initialView="dayGridMonth"
                      headerToolbar={{
                        left: "prev today",
                        center: "title",
                        right: "next",
                      }}
                      height="auto"
                      fixedWeekCount={false}
                      events={events}
                      eventClassNames={(arg) => {
                        const { type, status } = arg.event.extendedProps || {};
                        if (type === "status") {
                          return ["treatment-day-status", status];
                        }
                        return [];
                      }}
                      eventDidMount={(arg) => {
                        const { extendedProps } = arg.event;
                        if (extendedProps?.type === "status") {
                          arg.el.setAttribute(
                            "title",
                            `${extendedProps.status === "completed" ? "Completed" : "Missed"} - ${extendedProps.date}`
                          );
                        }
                      }}
                      dateClick={(info) => {
                        const clickedDate = formatDateKey(info.date);
                        
                        // Check if the clicked date has a treatment using the same logic as calendar marking
                        const hasTreatment = treatmentDateRanges.has(clickedDate);
                        
                        // Only allow selection if the date has a treatment
                        if (hasTreatment) {
                          const newSelectedDate = clickedDate === selectedDate ? null : clickedDate;
                          setSelectedDate(newSelectedDate);
                        }
                      }}
                      dayCellDidMount={(arg) => {
                        // Add click handler directly to the day cell
                        const dateKey = formatDateKey(arg.date);
                        const hasTreatment = treatmentDateRangesRef.current.has(dateKey);
                        
                        if (hasTreatment) {
                          arg.el.style.cursor = 'pointer';
                          
                          // Use a data attribute to identify if handler is already added
                          if (!arg.el.dataset.clickHandlerAdded) {
                            arg.el.dataset.clickHandlerAdded = 'true';
                            
                            arg.el.addEventListener('click', (e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const currentSelected = selectedDateRef.current;
                              const newSelectedDate = dateKey === currentSelected ? null : dateKey;
                              setSelectedDate(newSelectedDate);
                            });
                          }
                        } else {
                          arg.el.style.cursor = 'default';
                        }
                      }}
                      dayCellClassNames={(arg) => {
                        const dateKey = formatDateKey(arg.date);
                        return selectedDate === dateKey ? ["fc-day-selected"] : [];
                      }}
                      dayMaxEvents={false}
                    />
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Performance Metrics Cards - One Row */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: { xs: "wrap", md: "nowrap" },
              }}
            >
              {/* 1. Sessions Completion Rate */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 8px)", md: "1 1 0" },
                  minWidth: 0,
                  transition: "all 0.3s",
                  "&:hover": {
                    boxShadow: 2,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Treatment Participation Rate
                  </Typography>
                  {/* <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", mb: 1, display: "block", opacity: 0.7 }}>
                    The percentage of treatment days the patient successfully completed their daily exercise.
                  </Typography> */}
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {displayStats.sessionsCompletionRate !== null && displayStats.sessionsCompletionRate !== undefined && displayStats.shouldCompletedDays > 0
                      ? `${displayStats.sessionsCompletionRate.toFixed(1)}% (${displayStats.completedDays}/${displayStats.shouldCompletedDays})`
                      : "-"}
                  </Typography>
                </CardContent>
              </Card>

              {/* 2. Total Reps Completed */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 8px)", md: "1 1 0" },
                  minWidth: 0,
                  transition: "all 0.3s",
                  "&:hover": {
                    boxShadow: 2,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Total Reps Completed
                  </Typography>
                  {/* <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", mb: 1, display: "block", opacity: 0.7 }}>
                    The total number of exercise repetitions the patient has completed during this treatment phase.
                  </Typography> */}
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {displayStats.repsCompletionRate !== null && displayStats.repsCompletionRate !== undefined && displayStats.shouldCompletedReps > 0
                      ? `${displayStats.repsCompletionRate.toFixed(1)}% (${displayStats.totalRepsCompleted.toLocaleString()}/${displayStats.shouldCompletedReps.toLocaleString()})`
                      : "-"}
                  </Typography>
                </CardContent>
              </Card>

              {/* 3. Average Rep Duration */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 8px)", md: "1 1 0" },
                  minWidth: 0,
                  transition: "all 0.3s",
                  "&:hover": {
                    boxShadow: 2,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Average Rep Duration
                  </Typography>
                  {/* <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", mb: 1, display: "block", opacity: 0.7 }}>
                    The patient's average time per repetition, indicating movement smoothness and motor control.
                  </Typography> */}
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {displayStats.avgRepDuration !== null && displayStats.avgRepDuration !== undefined
                      ? `${displayStats.avgRepDuration.toFixed(2)}s`
                      : "-"}
                  </Typography>
                </CardContent>
              </Card>

              {/* 4. Average Consistency Score */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 8px)", md: "1 1 0" },
                  minWidth: 0,
                  transition: "all 0.3s",
                  "&:hover": {
                    boxShadow: 2,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Average Consistency Score
                  </Typography>
                  {/* <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", mb: 1, display: "block", opacity: 0.7 }}>
                    Reflects how consistent the patient's repetition times are; higher scores indicate steadier and more controlled movements.
                  </Typography> */}
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {displayStats.consistencyScore !== null && displayStats.consistencyScore !== undefined
                      ? `${(displayStats.consistencyScore * 100).toFixed(1)}%`
                      : "-"}
                  </Typography>
                </CardContent>
              </Card>

              {/* 5. Average Fatigue Index */}
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 8px)", md: "1 1 0" },
                  minWidth: 0,
                  transition: "all 0.3s",
                  "&:hover": {
                    boxShadow: 2,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Average Fatigue Index
                  </Typography>
                  {/* <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", mb: 1, display: "block", opacity: 0.7 }}>
                    Measures how much the patient's movement speed drops in the second half of each exercise, indicating fatigue level.
                  </Typography> */}
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {displayStats.avgFatigueIndex !== null && displayStats.avgFatigueIndex !== undefined
                      ? `${displayStats.avgFatigueIndex.toFixed(1)}%`
                      : "-"}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Graphs Section */}
      {!loading && !error && (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* 1. Reps Trend */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Reps Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={repsTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="reps" fill="#1976d2" name="Reps" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* 2. Avg Duration Trend */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Avg Duration Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={avgDurationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip formatter={(value) => `${value}s`} />
                    <Legend />
                    <Line type="monotone" dataKey="duration" stroke="#1976d2" strokeWidth={2} name="Duration (s)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* 3. Consistency Trend */}
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Consistency Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={consistencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#1976d2" strokeWidth={2} name="Consistency Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      )}

      {/* Exercise Records Table */}
      {!loading && !error && (selectedDate ? selectedDateExerciseRecords.length > 0 : filteredExerciseRecords.length > 0) && (
        <Box sx={{ mt: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Exercise Records
            </Typography>
            {selectedDate && selectedDateTreatment && (
              <Chip 
                label={`Treatment: ${selectedDateTreatment.name}`}
                color="info"
                size="small"
                onDelete={() => setSelectedDate(null)}
              />
            )}
          </Stack>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Exercise</TableCell>
                    <TableCell align="center">Total Reps</TableCell>
                    <TableCell align="center">Sets</TableCell>
                    <TableCell align="center">Avg Time</TableCell>
                    <TableCell align="center">Consistency</TableCell>
                    <TableCell align="center">Fatigue</TableCell>
                    <TableCell align="center">Pauses</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedDate && selectedDateExerciseRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No exercise records found for the treatment on {formatDate(selectedDate)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (selectedDate ? selectedDateExerciseRecords : filteredExerciseRecords).map((record) => (
                    <TableRow key={record.record_id} hover>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.exercise_name || "-"}</TableCell>
                      <TableCell align="center">{record.reps}</TableCell>
                      <TableCell align="center">{record.sets}</TableCell>
                      <TableCell align="center">
                        {record.avg_time !== null && record.avg_time !== undefined
                          ? `${record.avg_time}s`
                          : "-"}
                      </TableCell>
                      <TableCell align="center">
                        {record.consistency !== null && record.consistency !== undefined
                          ? `${record.consistency}%`
                          : "-"}
                      </TableCell>
                      <TableCell align="center">
                        {record.fatigue !== null && record.fatigue !== undefined
                          ? `${record.fatigue}%`
                          : "-"}
                      </TableCell>
                      <TableCell align="center">{record.pauses}</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="text"
                          color="primary"
                          onClick={() => {
                            setSelectedRecord(record);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* Exercise Record Details */}
      {!loading && !error && selectedRecord && (
        <Box sx={{ mt: 3 }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
            {/* Header with colored background */}
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "white",
                p: 2.5,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                {selectedRecord.exercise_name}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {formatDate(selectedRecord.date)}
              </Typography>
            </Box>

            <CardContent sx={{ p: 3 }}>
              {/* Basic Info - Grid Layout */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: "center", p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      {selectedRecord.reps}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Reps
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: "center", p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      {selectedRecord.sets}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      sets
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: "center", p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      {selectedRecord.avg_time ? `${selectedRecord.avg_time}s` : "-"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg Time
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: "center", p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      {selectedRecord.consistency ? `${selectedRecord.consistency}%` : "-"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Consistency
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Repetition Time Chart */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Repetition Time Chart
                </Typography>
                {selectedRecord.repetition_times && selectedRecord.repetition_times.length > 0 ? (
                  (() => {
                    const times = selectedRecord.repetition_times;
                    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
                    const threshold = avgTime * 2;
                    const minTime = Math.min(...times);
                    const maxTime = Math.max(...times);
                    
                    const chartData = times.map((time, index) => ({
                      index: index + 1,
                      rep: `${index + 1}`,
                      time: time,
                      isOutlier: time > threshold,
                      deviation: time - avgTime,
                      speed: time < avgTime ? 'High' : 'Low',
                    }));
                    
                    // Custom dot component for outlier detection
                    const CustomDot = (props) => {
                      const { cx, cy, payload } = props;
                      const fill = payload.isOutlier ? '#f44336' : '#1976d2';
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={fill}
                          stroke="white"
                          strokeWidth={2}
                        />
                      );
                    };
                    
                    // Custom Tooltip component
                    const CustomTooltip = ({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const deviation = data.deviation;
                        const deviationSign = deviation >= 0 ? '+' : '';
                        return (
                          <Box
                            sx={{
                              bgcolor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #ccc',
                              borderRadius: 1,
                              p: 1.5,
                              boxShadow: 2,
                            }}
                          >
                            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                              Rep #{data.index}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              Time: {data.time.toFixed(2)}s
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              Speed: {data.speed}
                            </Typography>
                            <Typography variant="body2">
                              Deviation from Avg: {deviationSign}{deviation.toFixed(2)}s
                            </Typography>
                          </Box>
                        );
                      }
                      return null;
                    };
                    
                    return (
                      <>
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis 
                              dataKey="index" 
                              label={{ value: 'Repetition', position: 'insideBottom', offset: -15 }}
                              tick={{ fontSize: 11 }}
                            />
                            <YAxis 
                              label={{ value: 'Time (s)', angle: -90, position: 'insideLeft' }}
                              tick={{ fontSize: 11 }}
                            />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Line 
                              type="monotone"
                              dataKey="time" 
                              stroke="#1976d2"
                              strokeWidth={2}
                              dot={<CustomDot />}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        {/* Min/Max Section */}
                        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                          <Box sx={{ flex: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                              Min Time
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="primary.main">
                              {minTime.toFixed(2)}s
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                              Max Time
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="primary.main">
                              {maxTime.toFixed(2)}s
                            </Typography>
                          </Box>
                        </Box>
                      </>
                    );
                  })()
                ) : (
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: "grey.100",
                      borderRadius: 2,
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No repetition time data available
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Consistency Analysis */}
              {selectedRecord.repetition_times && selectedRecord.repetition_times.length > 1 && (
                <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                    Consistency Analysis
                  </Typography>
                  
                  {(() => {
                    const times = selectedRecord.repetition_times;
                    const n = times.length;
                    
                    // Calculate Mean
                    const mean = times.reduce((sum, t) => sum + t, 0) / n;
                    
                    // Calculate Standard Deviation
                    const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / n;
                    const std = Math.sqrt(variance);
                    
                    // Calculate Coefficient of Variation
                    const cv = mean > 0 ? std / mean : 0;
                    
                    // Calculate Consistency Score
                    const consistencyScore = (1 / (1 + cv)) * 100;
                    
                    // Determine Interpretation
                    let interpretation = "";
                    let interpretationColor = "";
                    if (consistencyScore >= 70) {
                      interpretation = "High Stability";
                      interpretationColor = "success.main";
                    } else if (consistencyScore >= 40) {
                      interpretation = "Moderate Stability";
                      interpretationColor = "warning.main";
                    } else {
                      interpretation = "Low Stability";
                      interpretationColor = "error.main";
                    }
                    
                    return (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Mean Rep Time
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="text.primary">
                              {mean.toFixed(2)}s
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Standard Deviation
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="text.primary">
                              {std.toFixed(2)}s
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Coefficient of Variation
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="text.primary">
                              {cv.toFixed(2)}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Consistency Score
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="text.primary">
                              {consistencyScore.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Box 
                            sx={{ 
                              p: 2, 
                              bgcolor: interpretationColor === "success.main" ? "success.50" : 
                                       interpretationColor === "warning.main" ? "warning.50" : "error.50",
                              borderRadius: 2,
                              textAlign: "center",
                              position: "relative"
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Interpretation
                              </Typography>
                              <Tooltip
                                title={
                                  <Box sx={{ p: 1 }}>
                                    <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                      Stability Criteria:
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 0.3 }}>
                                      ≥ 70% → High Stability
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 0.3 }}>
                                      40–69% → Moderate Stability
                                    </Typography>
                                    <Typography variant="body2">
                                      &lt; 40% → Low Stability
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <IconButton size="small" sx={{ ml: 0.5, p: 0 }}>
                                  <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            <Typography variant="h6" fontWeight={600} sx={{ color: interpretationColor }}>
                              {interpretation}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    );
                  })()}
                </Box>
              )}

              {/* Fatigue Analysis */}
              {selectedRecord.repetition_times && selectedRecord.repetition_times.length > 1 && (
                <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                    Fatigue Analysis
                  </Typography>
                  
                  {(() => {
                    const times = selectedRecord.repetition_times;
                    const n = times.length;
                    const halfIndex = Math.floor(n / 2);
                    
                    // Calculate First-half and Second-half averages
                    const firstHalf = times.slice(0, halfIndex);
                    const secondHalf = times.slice(halfIndex);
                    
                    const firstHalfAvg = firstHalf.length > 0 
                      ? firstHalf.reduce((sum, t) => sum + t, 0) / firstHalf.length 
                      : 0;
                    const secondHalfAvg = secondHalf.length > 0 
                      ? secondHalf.reduce((sum, t) => sum + t, 0) / secondHalf.length 
                      : 0;
                    
                    // Calculate Fatigue Index
                    const fatigueIndex = firstHalfAvg > 0 
                      ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
                      : 0;
                    
                    // Set to 0 if negative
                    const displayFatigue = Math.max(0, fatigueIndex);
                    
                    // Determine Interpretation
                    let interpretation = "";
                    let interpretationColor = "";
                    if (displayFatigue < 10) {
                      interpretation = "Low Fatigue";
                      interpretationColor = "success.main";
                    } else if (displayFatigue < 30) {
                      interpretation = "Moderate Fatigue";
                      interpretationColor = "warning.main";
                    } else {
                      interpretation = "High Fatigue";
                      interpretationColor = "error.main";
                    }
                    
                    return (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              First-half Avg
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="text.primary">
                              {firstHalfAvg.toFixed(2)}s
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Second-half Avg
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="text.primary">
                              {secondHalfAvg.toFixed(2)}s
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Fatigue Index
                            </Typography>
                            <Typography variant="h6" fontWeight={600} color="text.primary">
                              {displayFatigue.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Box 
                            sx={{ 
                              p: 2, 
                              bgcolor: interpretationColor === "success.main" ? "success.50" : 
                                       interpretationColor === "warning.main" ? "warning.50" : "error.50",
                              borderRadius: 2,
                              textAlign: "center",
                              position: "relative"
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Interpretation
                              </Typography>
                              <Tooltip
                                title={
                                  <Box sx={{ p: 1 }}>
                                    <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                      Fatigue Criteria:
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 0.3 }}>
                                      &lt; 10% → Low Fatigue
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 0.3 }}>
                                      10–30% → Moderate Fatigue
                                    </Typography>
                                    <Typography variant="body2">
                                      ≥ 30% → High Fatigue
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <IconButton size="small" sx={{ ml: 0.5, p: 0 }}>
                                  <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            <Typography variant="h6" fontWeight={600} sx={{ color: interpretationColor }}>
                              {interpretation}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    );
                  })()}
                </Box>
              )}

              {/* Performance Score */}
              {selectedRecord.repetition_times && selectedRecord.repetition_times.length > 1 && (
                <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                    Performance Score
                  </Typography>
                  
                  {(() => {
                    const times = selectedRecord.repetition_times;
                    const n = times.length;
                    
                    // 1. Calculate Consistency Score (40%)
                    const mean = times.reduce((sum, t) => sum + t, 0) / n;
                    const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / n;
                    const std = Math.sqrt(variance);
                    const cv = mean > 0 ? std / mean : 0;
                    const consistencyScore = (1 / (1 + cv)) * 100;
                    const consistencyPoints = (consistencyScore / 100) * 40;
                    
                    // 2. Calculate Fatigue Score (20%)
                    const halfIndex = Math.floor(n / 2);
                    const firstHalf = times.slice(0, halfIndex);
                    const secondHalf = times.slice(halfIndex);
                    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, t) => sum + t, 0) / firstHalf.length : 0;
                    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, t) => sum + t, 0) / secondHalf.length : 0;
                    const fatigueIndex = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
                    const displayFatigue = Math.max(0, fatigueIndex);
                    // Lower fatigue is better: 0% = 100 points, 100% = 0 points
                    const fatigueScore = Math.max(0, 100 - displayFatigue);
                    const fatiguePoints = (fatigueScore / 100) * 20;
                    
                    // 3. Calculate Duration Score (20%)
                    // Assume ideal duration is around mean, penalize if too slow or too fast
                    // For simplicity, use consistency as proxy: more consistent = better duration control
                    const durationScore = consistencyScore; // Reuse consistency logic
                    const durationPoints = (durationScore / 100) * 20;
                    
                    // 4. Calculate Pauses Score (20%)
                    const pauses = selectedRecord.pauses || 0;
                    // Assume 0 pauses = 100 points, each pause reduces score
                    // Penalty: -10 points per pause (max 10 pauses = 0 points)
                    const pauseScore = Math.max(0, 100 - (pauses * 10));
                    const pausePoints = (pauseScore / 100) * 20;
                    
                    // Total Performance Score
                    const performanceScore = Math.round(consistencyPoints + fatiguePoints + durationPoints + pausePoints);
                    
                    // Determine color based on score
                    let scoreColor = "";
                    let scoreBgColor = "";
                    if (performanceScore >= 80) {
                      scoreColor = "success.main";
                      scoreBgColor = "success.50";
                    } else if (performanceScore >= 60) {
                      scoreColor = "info.main";
                      scoreBgColor = "info.50";
                    } else if (performanceScore >= 40) {
                      scoreColor = "warning.main";
                      scoreBgColor = "warning.50";
                    } else {
                      scoreColor = "error.main";
                      scoreBgColor = "error.50";
                    }
                    
                    return (
                      <Box>
                        <Box 
                          sx={{ 
                            p: 3, 
                            bgcolor: scoreBgColor,
                            borderRadius: 2,
                            textAlign: "center"
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Overall Performance
                          </Typography>
                          <Typography variant="h3" fontWeight={700} sx={{ color: scoreColor }}>
                            {performanceScore}/100
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={2} sx={{ mt: 2 }}>
                          <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2, textAlign: "center" }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Consistency (40%)
                              </Typography>
                              <Typography variant="body1" fontWeight={600} color="text.primary">
                                {consistencyPoints.toFixed(1)}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2, textAlign: "center" }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Fatigue (20%)
                              </Typography>
                              <Typography variant="body1" fontWeight={600} color="text.primary">
                                {fatiguePoints.toFixed(1)}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2, textAlign: "center" }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Duration (20%)
                              </Typography>
                              <Typography variant="body1" fontWeight={600} color="text.primary">
                                {durationPoints.toFixed(1)}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2, textAlign: "center" }}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Pauses (20%)
                              </Typography>
                              <Typography variant="body1" fontWeight={600} color="text.primary">
                                {pausePoints.toFixed(1)}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })()}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
};

export default PatientReportDetailPage;

