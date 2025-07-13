import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginPage from "./components/BeforeLogin/LoginPage";
import HomeLayout from "./components/AfterLogin/HomeLayout";
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomeLayout />}>
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
        <Route path="patients" element={<PatientListPage />} />
        <Route path="patients/:patientId" element={<PatientDetailPage />} />
      </Route>
      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}

export default App;
