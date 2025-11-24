import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/BeforeLogin/LoginPage";
import HomeLayout from "./components/AfterLogin/HomeLayout";
import AdminDashboardPage from "./components/AfterLogin/Admin/AdminDashboardPage";
import TherapistDashboardPage from "./components/AfterLogin/Therapist/TherapistDashboardPage";
import PatientReportsPage from "./components/AfterLogin/Therapist/PatientReportsPage";
import PatientReportDetailPage from "./components/AfterLogin/Therapist/PatientReportDetailPage";
import PatientDashboardPage from "./components/AfterLogin/Patient/PatientDashboardPage";
import UserAccountManagementHome from "./components/AfterLogin/UserAccountManagement/UserAccountManagementHome";
import UserAccountManagementAccountPage from "./components/AfterLogin/UserAccountManagement/UserAccountManagementAccountPage";
import EditUserPage from "./components/AfterLogin/UserAccountManagement/EdittUserPage";
import UserProfilePage from "./components/AfterLogin/Profile/UserProfilePage";
import PatientAppointmentPage from './components/AfterLogin/Appointment/Patient/PatientAppointmentPage';
import TherapistAppointments from './components/AfterLogin/Appointment/Therapist/TherapistAppointments';
import TherapistAppointmentPage from './components/AfterLogin/Appointment/Therapist/TherapistAppointmentPage';
import AdminTherapistAppointments from './components/AfterLogin/Appointment/Admin/AdminTherapistAppointments';
import { TreatmentManagement } from './components/AfterLogin/Treatment/Therapist';
import CreateTreatmentPlanPage from './components/AfterLogin/Treatment/Therapist/CreateTreatmentPlanPage';
import TherapistTreatmentCenter from './components/AfterLogin/Treatment/Therapist/TherapistTreatmentCenter';
import { TreatmentAdminCenter, TreatmentList } from './components/AfterLogin/Treatment/Admin';
import PatientTreatmentDetail from './components/AfterLogin/Treatment/Admin/PatientTreatmentDetail';
import PatientListPage from './components/AfterLogin/PatientInfo/PatientListPage';
import PatientDetailPage from './components/AfterLogin/PatientInfo/PatientDetailPage';
import AddMedicalHistoryPage from './components/AfterLogin/PatientInfo/AddMedicalHistoryPage';
import PatientExercisePage from './components/AfterLogin/Patient/PatientExercisePage';
import ActionLearningCenter from './components/AfterLogin/Admin/ActionLearningCenter';
import ExerciseManagementCenter from './components/AfterLogin/Admin/ExerciseManagementCenter';
import ErrorPage from './components/ErrorPage';
import TestComponent from './components/TestComponent';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<HomeLayout />}>
        <Route path="admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="therapist-dashboard" element={<TherapistDashboardPage />} />
        <Route path="patient-dashboard" element={<PatientDashboardPage />} />
        <Route path="users" element={<UserAccountManagementHome />} />
        <Route path="users/view/:id" element={<UserAccountManagementAccountPage />} />
        <Route path="users/edit/:id" element={<EditUserPage />} />
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="appointments" element={<PatientAppointmentPage />} />
        <Route path="therapist-appointments" element={<TherapistAppointmentPage />} />
        <Route path="admin-appointments" element={<AdminTherapistAppointments />} />
        <Route path="treatment" element={<TherapistTreatmentCenter />} />
        <Route path="patient-reports" element={<PatientReportsPage />} />
        <Route path="patient-reports/:patientId" element={<PatientReportDetailPage />} />
        <Route path="treatment/:patientId" element={<PatientTreatmentDetail />} />
        <Route path="treatment/:patientId/create" element={<CreateTreatmentPlanPage />} />
        <Route path="treatment/:patientId/:treatmentId/edit" element={<CreateTreatmentPlanPage />} />
        <Route path="create-treatment-plan" element={<CreateTreatmentPlanPage />} />
        <Route path="admin-treatment" element={<TreatmentAdminCenter />} />
        <Route path="exercise-management" element={<ExerciseManagementCenter />} />
        <Route path="action-learning" element={<ActionLearningCenter />} />
        <Route path="patients" element={<PatientListPage />} />
        <Route path="patients/:patientId" element={<PatientDetailPage />} />
        <Route path="patients/:patientId/add-medical-history" element={<AddMedicalHistoryPage />} />
        <Route path="exercise" element={<PatientExercisePage />} />
        <Route path="*" element={<ErrorPage status={404} message="Page not found in this section" />} />
      </Route>
      <Route path="*" element={<ErrorPage status={404} message="Page not found" />} />
    </Routes>
  );
}

export default App;
