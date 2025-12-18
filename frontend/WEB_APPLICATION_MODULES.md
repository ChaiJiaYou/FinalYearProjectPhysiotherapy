# Web Application Modules and Components

## HTML Entry Point
- **Single HTML File**: `public/index.html` (All modules render within this single-page application)

## Module Structure

### 1. Authentication Module
- **Component**: `src/components/BeforeLogin/LoginPage.js`
- **Route**: `/login`, `/`
- **Description**: User authentication and login interface

### 2. Admin Dashboard Module
- **Component**: `src/components/AfterLogin/Admin/AdminDashboardPage.js`
- **Route**: `/home/admin-dashboard`
- **Description**: Admin overview dashboard with system statistics

### 3. Exercise Management Module (Admin)
- **Component**: `src/components/AfterLogin/Admin/ExerciseManagementCenter.js`
- **Route**: `/home/exercise-management`
- **Description**: Admin interface for managing exercise definitions and demo videos

### 4. User Account Management Module (Admin)
- **Main Component**: `src/components/AfterLogin/UserAccountManagement/UserAccountManagementHome.js`
- **View Component**: `src/components/AfterLogin/UserAccountManagement/UserAccountManagementAccountPage.js`
- **Edit Component**: `src/components/AfterLogin/UserAccountManagement/EdittUserPage.js`
- **Routes**: 
  - `/home/users` (List)
  - `/home/users/view/:id` (View)
  - `/home/users/edit/:id` (Edit)
- **Description**: Admin interface for managing user accounts (Admin, Therapist, Patient)

### 5. Treatment Management Module (Admin)
- **Component**: `src/components/AfterLogin/Treatment/Admin/TreatmentAdminCenter.js`
- **Route**: `/home/admin-treatment`
- **Description**: Admin interface for viewing and managing patient treatment plans

### 6. Appointment Management Module (Admin)
- **Component**: `src/components/AfterLogin/Appointment/Admin/AdminTherapistAppointments.js`
- **Route**: `/home/admin-appointments`
- **Description**: Admin interface for managing therapist appointments

### 7. Therapist Dashboard Module
- **Component**: `src/components/AfterLogin/Therapist/TherapistDashboardPage.js`
- **Route**: `/home/therapist-dashboard`
- **Description**: Therapist overview dashboard with patient statistics

### 8. Patient Reports Module (Therapist)
- **List Component**: `src/components/AfterLogin/Therapist/PatientReportsPage.js`
- **Detail Component**: `src/components/AfterLogin/Therapist/PatientReportDetailPage.js`
- **Routes**: 
  - `/home/patient-reports` (List)
  - `/home/patient-reports/:patientId` (Detail)
- **Description**: Therapist interface for viewing patient exercise reports and statistics

### 9. Treatment Plan Module (Therapist)
- **Center Component**: `src/components/AfterLogin/Treatment/Therapist/TherapistTreatmentCenter.js`
- **Create/Edit Component**: `src/components/AfterLogin/Treatment/Therapist/CreateTreatmentPlanPage.js`
- **Routes**: 
  - `/home/treatment` (Center)
  - `/home/treatment/:patientId/create` (Create)
  - `/home/treatment/:patientId/:treatmentId/edit` (Edit)
- **Description**: Therapist interface for creating and managing patient treatment plans

### 10. Appointment Management Module (Therapist)
- **Main Component**: `src/components/AfterLogin/Appointment/Therapist/TherapistAppointmentPage.js`
- **Schedule Component**: `src/components/AfterLogin/Appointment/Therapist/TherapistAppointments.js`
- **Route**: `/home/therapist-appointments`
- **Description**: Therapist interface for managing appointments and schedule

### 11. Patient List Module (Therapist)
- **List Component**: `src/components/AfterLogin/PatientInfo/PatientListPage.js`
- **Detail Component**: `src/components/AfterLogin/PatientInfo/PatientDetailPage.js`
- **Medical History Component**: `src/components/AfterLogin/PatientInfo/AddMedicalHistoryPage.js`
- **Routes**: 
  - `/home/patients` (List)
  - `/home/patients/:patientId` (Detail)
  - `/home/patients/:patientId/add-medical-history` (Medical History)
- **Description**: Therapist interface for viewing patient information and medical history

### 12. Patient Dashboard Module
- **Component**: `src/components/AfterLogin/Patient/PatientDashboardPage.js`
- **Route**: `/home/patient-dashboard`
- **Description**: Patient overview dashboard with exercise progress and upcoming appointments

### 13. Patient Exercise Module
- **Component**: `src/components/AfterLogin/Patient/PatientExercisePage.js`
- **Route**: `/home/exercise`
- **Description**: Patient interface for performing exercises with real-time movement detection and feedback

### 14. Appointment Management Module (Patient)
- **Component**: `src/components/AfterLogin/Appointment/Patient/PatientAppointmentPage.js`
- **Route**: `/home/appointments`
- **Description**: Patient interface for viewing and creating appointments

### 15. User Profile Module
- **Component**: `src/components/AfterLogin/Profile/UserProfilePage.js`
- **Route**: `/home/profile`
- **Description**: User profile management for all user types (Admin, Therapist, Patient)

### 16. Layout Component
- **Component**: `src/components/AfterLogin/HomeLayout.js`
- **Description**: Main layout wrapper with navigation sidebar and header for authenticated users

### 17. Error Handling Module
- **Component**: `src/components/ErrorPage.js`
- **Route**: `*` (catch-all for 404 errors)
- **Description**: Error page for handling 404 and other error states

## Shared Components

### Custom Dialog Components
- `src/components/CustomComponents/CreateUserDialog.js` - User creation dialog
- `src/components/CustomComponents/ChangePasswordDialog.js` - Password change dialog
- `src/components/CustomComponents/ChangeUserPasswordDialog.js` - User password change dialog
- `src/components/CustomComponents/ConfirmationDialog.js` - Confirmation dialog

### Notification Component
- `src/components/AfterLogin/NotificationIcon.js` - Notification icon and dropdown

## Architecture Notes

- **Single Page Application (SPA)**: All modules are React components that render within a single HTML entry point (`public/index.html`)
- **Client-Side Routing**: React Router handles navigation between modules without page reloads
- **Role-Based Access**: Different modules are accessible based on user role (Admin, Therapist, Patient)
- **Component Reusability**: Shared components (dialogs, layouts) are used across multiple modules


