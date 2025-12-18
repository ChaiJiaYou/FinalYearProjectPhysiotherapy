# Database Tables List

## Custom Application Tables

### 1. User Management Tables

#### `api_customuser`
- **Model**: `CustomUser` (extends `AbstractUser`)
- **Primary Key**: `id` (CharField, max_length=20)
- **Description**: Main user table storing all users (Admin, Therapist, Patient)
- **Key Fields**: 
  - `id`, `username`, `email`, `password`
  - `ic`, `contact_number`, `gender`, `dob`
  - `role` (admin/therapist/patient)
  - `status`, `avatar`, `create_date`
  - `created_by`, `modified_by` (ForeignKey to CustomUser)

#### `api_admin`
- **Model**: `Admin`
- **Primary Key**: Auto-generated ID
- **Description**: Admin profile information
- **Key Fields**: 
  - `user` (OneToOneField to CustomUser)
  - `admin_role` (CenterAdmin/SuperAdmin)

#### `api_therapist`
- **Model**: `Therapist`
- **Primary Key**: Auto-generated ID
- **Description**: Therapist profile information
- **Key Fields**: 
  - `user` (OneToOneField to CustomUser)
  - `specialization`, `employment_date`

#### `api_patient`
- **Model**: `Patient`
- **Primary Key**: Auto-generated ID
- **Description**: Patient profile information
- **Key Fields**: 
  - `user` (OneToOneField to CustomUser)
  - `emergency_contact`

### 2. Appointment Management Tables

#### `api_appointment`
- **Model**: `Appointment`
- **Primary Key**: Auto-generated ID
- **Description**: Appointment scheduling and management
- **Key Fields**: 
  - `appointment_code` (unique, auto-generated)
  - `therapist_id` (ForeignKey to CustomUser)
  - `patient_id` (ForeignKey to CustomUser, nullable)
  - `contact_name`, `contact_phone` (for new patient placeholder)
  - `start_at`, `end_at`, `duration_min`
  - `mode` (onsite/tele/home)
  - `status` (Scheduled/Cancelled/Completed)
  - `notes`, `patient_message`, `session_notes`, `cancel_reason`
  - `completed_at`, `cancelled_at`
  - `treatment_id` (ForeignKey to Treatment, nullable)
  - `created_at`, `updated_at`
- **Indexes**: 
  - `therapist_id` + `start_at`
  - `patient_id` + `start_at`

#### `api_unavailableslot`
- **Model**: `UnavailableSlot`
- **Primary Key**: Auto-generated ID
- **Description**: Therapist unavailable time slots
- **Key Fields**: 
  - `therapist_id` (ForeignKey to CustomUser)
  - `start_at`, `end_at`, `description`
  - `created_at`, `updated_at`
- **Indexes**: 
  - `therapist_id` + `start_at`

### 3. Medical History Table

#### `api_medicalhistory`
- **Model**: `MedicalHistory`
- **Primary Key**: Auto-generated ID
- **Description**: Patient medical history records
- **Key Fields**: 
  - `patient_id` (ForeignKey to CustomUser)
  - `recorded_by_id` (ForeignKey to CustomUser, nullable)
  - `past_medical_history`, `surgical_history`
  - `family_history`, `medications`, `allergies`
  - `notes`, `created_at`, `updated_at`

### 4. Notification Table

#### `api_notification`
- **Model**: `Notification`
- **Primary Key**: Auto-generated ID
- **Description**: System notifications for users
- **Key Fields**: 
  - `user` (ForeignKey to CustomUser)
  - `title`, `message`
  - `notification_type` (appointment/system/message)
  - `is_read`, `related_id`
  - `created_at`

### 5. Exercise & Treatment Tables

#### `api_exercise`
- **Model**: `Exercise`
- **Primary Key**: `exercise_id` (UUID)
- **Description**: Exercise library with exercise definitions
- **Key Fields**: 
  - `exercise_id`, `name`, `instructions`
  - `activity_name` (for Rehab Engine matching)
  - `demo_video_url`
  - `created_by` (ForeignKey to CustomUser, nullable)

#### `api_treatment`
- **Model**: `Treatment`
- **Primary Key**: `treatment_id` (UUID)
- **Description**: Treatment plans for patients
- **Key Fields**: 
  - `treatment_id`, `patient_id`, `therapist_id`
  - `name`, `is_active`
  - `start_date`, `end_date`
  - `goal_notes`
  - `created_by` (ForeignKey to CustomUser)
  - `created_at`, `updated_at`

#### `api_treatmentexercise`
- **Model**: `TreatmentExercise`
- **Primary Key**: `treatment_exercise_id` (UUID)
- **Description**: Association between treatments and exercises (many-to-many)
- **Key Fields**: 
  - `treatment_exercise_id`
  - `treatment_id` (ForeignKey to Treatment)
  - `exercise_id` (ForeignKey to Exercise)
  - `reps_per_set`, `sets`, `duration` (minutes)
  - `notes`, `order_in_treatment`
  - `is_active`, `start_date`, `end_date`
  - `created_at`, `updated_at`
- **Unique Constraint**: `treatment_id` + `exercise_id`

#### `api_exerciserecord`
- **Model**: `ExerciseRecord`
- **Primary Key**: `record_id` (UUID)
- **Description**: Patient exercise performance tracking records
- **Key Fields**: 
  - `record_id`
  - `treatment_exercise_id` (ForeignKey to TreatmentExercise)
  - `patient_id` (ForeignKey to CustomUser)
  - `repetitions_completed`, `sets_completed`
  - `target_reps_per_set`, `target_sets`, `target_duration_minutes`
  - `start_time`, `end_time`, `total_duration` (seconds)
  - `pause_count`
  - `repetition_times` (JSONField - array of times per rep)
  - `rep_sparc_scores` (JSONField - smoothness scores)
  - `rep_rom_scores` (JSONField - range of motion scores)
  - `recorded_at`

## Django System Tables

### Authentication & Authorization (from `AbstractUser`)
- `auth_user` - Base user table (not used, CustomUser replaces it)
- `auth_group` - User groups
- `auth_permission` - Permissions
- `auth_user_groups` - User-group associations
- `auth_user_user_permissions` - User-permission associations

### Django Framework Tables
- `django_migrations` - Migration history
- `django_session` - Session data
- `django_content_type` - Content types for permissions
- `django_admin_log` - Admin action log

### Database-Specific Tables
- PostgreSQL may have additional system tables (e.g., `pg_catalog.*`)
- Sequence tables for auto-incrementing IDs

## Table Relationships Summary

```
CustomUser (base user)
├── Admin (OneToOne)
├── Therapist (OneToOne)
├── Patient (OneToOne)
├── Appointment (therapist_id, patient_id)
├── Treatment (patient_id, therapist_id, created_by)
├── ExerciseRecord (patient_id)
├── MedicalHistory (patient_id, recorded_by_id)
├── Notification (user)
└── Exercise (created_by)

Treatment
└── TreatmentExercise (treatment_id)
    └── ExerciseRecord (treatment_exercise_id)

TreatmentExercise
└── Exercise (exercise_id)

Appointment
└── Treatment (treatment_id)
```

## Notes

- All custom tables use the `api_` prefix (from Django app name)
- UUID primary keys are used for: Exercise, Treatment, TreatmentExercise, ExerciseRecord
- CustomUser uses CharField for `id` with custom generation logic based on role
- JSONFields are used in ExerciseRecord for storing arrays of metrics (repetition_times, rep_sparc_scores, rep_rom_scores)
- ForeignKey relationships maintain referential integrity with CASCADE or SET_NULL behaviors


