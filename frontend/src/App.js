import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/BeforeLogin/LoginPage";
import HomeLayout from "./components/AfterLogin/HomeLayout";
import Dashboard from "./components/AfterLogin/Dashboard";
import UserAccountManagementHome from "./components/AfterLogin/UserAccountManagement/UserAccountManagementHome";
import UserAccountManagementAccountPage from "./components/AfterLogin/UserAccountManagement/UserAccountManagementAccountPage";
import EditUserPage from "./components/AfterLogin/UserAccountManagement/EdittUserPage";
import UserProfilePage from "./components/AfterLogin/Profile/UserProfilePage";
import PatientAppointments from './components/AfterLogin/Appointment/Patient/PatientAppointments';
import TherapistAppointments from './components/AfterLogin/Appointment/Therapist/TherapistAppointments';
import AdminTherapistAppointments from './components/AfterLogin/Appointment/Admin/AdminTherapistAppointments';
import TherapistSchedule from './components/Therapist/TherapistSchedule';
import { TreatmentManagement } from './components/AfterLogin/Treatment/Therapist';
import { TreatmentAdminCenter } from './components/AfterLogin/Treatment/Admin';
import PatientListPage from './components/AfterLogin/PatientInfo/PatientListPage';
import PatientDetailPage from './components/AfterLogin/PatientInfo/PatientDetailPage';
import ExercisePage from './components/AfterLogin/Exercise/ExercisePage';
import ExerciseAdminCenter from './components/AfterLogin/Admin/ExerciseAdminCenter';
import ErrorPage from './components/ErrorPage';
import TestComponent from './components/TestComponent';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/home" element={<HomeLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<UserAccountManagementHome />} />
        <Route path="users/view/:id" element={<UserAccountManagementAccountPage />} />
        <Route path="users/edit/:id" element={<EditUserPage />} />
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="therapist-appointments" element={<TherapistAppointments />} />
        <Route path="admin-appointments" element={<AdminTherapistAppointments />} />
        <Route path="schedule" element={<TherapistSchedule />} />
        <Route path="treatment" element={<TreatmentManagement />} />
        <Route path="admin-treatment" element={<TreatmentAdminCenter />} />
        <Route path="exercise-admin" element={<ExerciseAdminCenter />} />
        <Route path="patients" element={<PatientListPage />} />
        <Route path="patients/:patientId" element={<PatientDetailPage />} />
        <Route path="exercise" element={<ExercisePage />} />
        <Route path="*" element={<ErrorPage status={404} message="Page not found in this section" />} />
      </Route>
      <Route path="*" element={<ErrorPage status={404} message="Page not found" />} />
    </Routes>
  );
}

export default App;
