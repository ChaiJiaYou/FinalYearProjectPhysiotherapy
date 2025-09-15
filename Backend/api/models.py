from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.timezone import now
import datetime
import uuid

class CustomUserManager(BaseUserManager):
    def create_user(self, id=None, email=None, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        
        # If no ID provided, generate one based on role
        if not id:
            role = extra_fields.get('role', 'admin')  # Default to admin for superuser
            user = self.model(email=email, role=role, **extra_fields)
            # Generate ID will be called in save() method
        else:
            user = self.model(id=id, email=email, **extra_fields)
        
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, id=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('username', email or 'superuser')  # Use email as username fallback
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(id, email, password, **extra_fields)

class CustomUser(AbstractUser):
    # Inherited from AbstractUser: username, email, first_name, last_name, etc.
    
    id = models.CharField(max_length=20,primary_key=True,editable=False) # Override default id attributes
    username = models.CharField(max_length=150, unique=False)
    ic = models.CharField(max_length=20, blank=True, null=True)  # IC number
    contact_number = models.CharField(max_length=15, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=[('Male', 'Male'), ('Female', 'Female')], blank=True)
    dob = models.DateField(blank=True, null=True)  # Date of Birth
    create_date = models.DateTimeField(default=datetime.datetime.now)
    status = models.BooleanField(default=True)
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_users')
    modified_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='modified_users')
    role = models.CharField(
        max_length=20,
        choices=[('admin', 'Admin'), ('therapist', 'Therapist'), ('patient', 'Patient')],
    )
    avatar = models.BinaryField(blank=True, null=True)
    
    USERNAME_FIELD = 'id'
    REQUIRED_FIELDS = ['email']  # Required for superuser creation
    objects = CustomUserManager()
    
    def save(self, *args, **kwargs):
        # Genereate custome user ID based on role before save
        if not self.id:
            self.id = self.generate_custom_id()
        super().save(*args, **kwargs)
        
    def generate_custom_id(self):
        # Generate user ID based on Role with different formats
        current_date = datetime.datetime.now()
        year_month = current_date.strftime('%y%m')  # YYMM format
        
        if self.role.lower() == "admin":
            # Admin: A + 4 increment digits (A0001)
            prefix = "A"
            last_user = CustomUser.objects.filter(id__startswith=prefix).order_by('-id').first()
            
            if last_user:
                last_number = int(last_user.id[1:])  # Extract numeric part after 'A'
            else:
                last_number = 0
                
            return f"{prefix}{last_number + 1:04d}"  # A0001, A0002, etc.
            
        elif self.role.lower() == "therapist":
            # Therapist: D + YYMM + 3 increment digits (D2501001)
            prefix = f"D{year_month}"
            last_user = CustomUser.objects.filter(id__startswith=prefix).order_by('-id').first()
            
            if last_user:
                last_number = int(last_user.id[5:])  # Extract numeric part after 'DYYMM'
            else:
                last_number = 0
                
            return f"{prefix}{last_number + 1:03d}"  # D2501001, D2501002, etc.
            
        elif self.role.lower() == "patient":
            # Patient: P + YYMM + 3 increment digits (P2501001)
            prefix = f"P{year_month}"
            last_user = CustomUser.objects.filter(id__startswith=prefix).order_by('-id').first()
            
            if last_user:
                last_number = int(last_user.id[5:])  # Extract numeric part after 'PYYMM'
            else:
                last_number = 0
                
            return f"{prefix}{last_number + 1:03d}"  # P2501001, P2501002, etc.
            
        else:
            # Default fallback for unknown roles
            return f"USR{current_date.strftime('%y%m')}{1:03d}"

    def __str__(self):
        return f"{self.id} - {self.username} ({self.role})"
    
class Admin(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='admin_profile')
    admin_role = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"Admin: {self.user.id}"
    
class Therapist(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='therapist_profile')
    specialization = models.CharField(max_length=100)
    employment_date = models.DateField(default=datetime.date.today)
    def __str__(self):
        return f"Therapist: {self.user.id}"

class Patient(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='patient_profile')
    emergency_contact = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return f"Patient: {self.user.id}"
    
class Appointment(models.Model):
    STATUS_CHOICES = [
        ("Scheduled", "Scheduled"),
        ("Cancelled", "Cancelled"),
        ("Completed", "Completed"),
    ]

    DURATION_CHOICES = [
        (30, "30 minutes"),
        (45, "45 minutes"),
        (60, "60 minutes"),
    ]

    appointmentId = models.CharField(max_length=50, unique=True, editable=False)
    patientId = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="patient_appointments", limit_choices_to={'role': 'patient'})
    therapistId = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="therapist_appointments", limit_choices_to={'role': 'therapist'})
    treatment_id = models.ForeignKey('Treatment', on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments")  # Link to treatment (nullable)
    appointmentDateTime = models.DateTimeField()
    duration = models.IntegerField(choices=DURATION_CHOICES, default=30)  # Duration in minutes
    creationDate = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Scheduled")
    notes = models.TextField(blank=True, null=True)  # 预约备注
    sessionNotes = models.TextField(blank=True, null=True)  # 诊疗记录

    def __str__(self):
        return f"Appointment {self.appointmentId} - {self.status} ({self.therapistId.username})"

    def save(self, *args, **kwargs):
        if not self.appointmentId:
            # Count existing appointments today to generate a simple incremental ID
            today_str = now().strftime('%Y%m%d')  # Format: YYYYMMDD
            existing_count = Appointment.objects.filter(appointmentId__startswith=f"APT-{today_str}").count()
            self.appointmentId = f"APT-{today_str}-{existing_count + 1:03d}"  # APT-20250219-001
        super().save(*args, **kwargs)

class MedicalHistory(models.Model):
    patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="medical_histories",  limit_choices_to={'role': 'patient'} )

    session_date = models.DateField()
    description = models.TextField()  # Summary of patient symptoms and progress
    objective_findings = models.TextField(blank=True, null=True)  # Therapist-observed facts
    treatment = models.TextField(blank=True, null=True)           # What was done in the session
    remarks = models.TextField(blank=True, null=True)             # Optional comments

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"History on {self.session_date} - {self.patient.user.username}"
    
class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('appointment', 'Appointment'),
        ('system', 'System'),
        ('message', 'Message'),
    )

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='system')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_id = models.CharField(max_length=50, null=True, blank=True)  # Changed to CharField to support appointment IDs

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"

    @classmethod
    def create_appointment_notification(cls, user, appointment, action):
        """
        Create a notification for appointment-related events
        """
        if action == "created":
            title = "New Appointment Scheduled"
            message = f"An appointment has been scheduled for {appointment.appointmentDateTime.strftime('%d/%b/%Y at %I:%M %p')}"
        elif action == "cancelled":
            title = "Appointment Cancelled"
            message = f"Your appointment scheduled for {appointment.appointmentDateTime.strftime('%d/%b/%Y at %I:%M %p')} has been cancelled"
        elif action == "completed":
            title = "Appointment Completed"
            message = f"Your appointment on {appointment.appointmentDateTime.strftime('%d/%b/%Y at %I:%M %p')} has been marked as completed"
        
        return cls.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type='appointment',
            related_id=appointment.appointmentId
        )

    @classmethod
    def create_system_notification(cls, user, title, message):
        """
        Create a system notification
        """
        return cls.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type='system'
        )

# 1. Exercise - Independent exercise library
class Exercise(models.Model):
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'), 
        ('advanced', 'Advanced'),
    ]
    
    exercise_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, default='Unnamed Exercise')  # e.g., Wall Crawl, Shoulder Flexion
    body_part = models.CharField(max_length=50, default='general')  # e.g., left_shoulder, right_knee
    category = models.CharField(max_length=50, default='general')  # e.g., ROM, Strength, Balance
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    default_metrics = models.JSONField(default=dict)  # e.g., {"angle": 90, "hold_time": 5}
    instructions = models.TextField(default='No instructions provided')  # Exercise instructions
    demo_video_url = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="created_exercises", limit_choices_to={'role': 'therapist'}, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    detection_rules = models.JSONField(default=dict, blank=True)  # JSON rules for Rule Engine
    
    def __str__(self):
        return f"{self.name} ({self.body_part})"
    
    class Meta:
        ordering = ['category', 'name']

# 2. TreatmentTemplate - Reusable treatment templates
class TreatmentTemplate(models.Model):
    TREATMENT_TYPE_CHOICES = [
        ('joint_specific', 'Joint Specific'),
        ('functional', 'Functional'),
        ('symmetry', 'Symmetry'),
        ('pain_adapted', 'Pain Adapted'),
    ]
    
    template_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, default='Unnamed Template')  # e.g., "Shoulder ROM Recovery", "Post-Surgery Knee"
    treatment_type = models.CharField(max_length=20, choices=TREATMENT_TYPE_CHOICES, default='joint_specific')
    treatment_subtype = models.CharField(max_length=50, blank=True, null=True)
    condition = models.CharField(max_length=100, default='General Condition')  # e.g., "Frozen Shoulder", "ACL Recovery"
    description = models.TextField(blank=True, null=True)
    default_frequency = models.CharField(max_length=20, default='3x/week')  # Default frequency
    estimated_duration_weeks = models.IntegerField(blank=True, null=True)  # Estimated treatment duration
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="created_templates", limit_choices_to={'role': 'therapist'}, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Template: {self.name} ({self.treatment_type})"
    
    class Meta:
        ordering = ['treatment_type', 'name']

# 3. TemplateExercise - Association between templates and exercises
class TemplateExercise(models.Model):
    template_exercise_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template_id = models.ForeignKey(TreatmentTemplate, on_delete=models.CASCADE, related_name="template_exercises")
    exercise_id = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="template_associations")
    default_target_metrics = models.JSONField(default=dict)  # Override exercise defaults if needed
    default_repetitions = models.IntegerField(blank=True, null=True)
    default_sets = models.IntegerField(blank=True, null=True)
    default_pain_threshold = models.IntegerField(blank=True, null=True)  # 1-10 scale
    order_in_template = models.IntegerField(default=1)  # Exercise order in template
    is_required = models.BooleanField(default=True)  # If false, therapist can optionally include
    
    def __str__(self):
        return f"{self.template_id.name} - {self.exercise_id.name}"
    
    class Meta:
        ordering = ['template_id', 'order_in_template']
        unique_together = ['template_id', 'exercise_id']

# 4. Treatment - Main treatment records (supports both template and custom)
class Treatment(models.Model):
    TREATMENT_TYPE_CHOICES = [
        ('joint_specific', 'Joint Specific'),
        ('functional', 'Functional'),
        ('symmetry', 'Symmetry'),
        ('pain_adapted', 'Pain Adapted'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
    ]
    
    CREATION_METHOD_CHOICES = [
        ('template', 'From Template'),
        ('custom', 'Custom Created'),
    ]
    
    treatment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_id = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="patient_treatments", limit_choices_to={'role': 'patient'})
    therapist_id = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="therapist_treatments", limit_choices_to={'role': 'therapist'})
    
    # Template reference (nullable for custom treatments)
    template_id = models.ForeignKey(TreatmentTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name="treatments")
    creation_method = models.CharField(max_length=20, choices=CREATION_METHOD_CHOICES, default='custom')
    
    # Treatment details
    name = models.CharField(max_length=100, default='Unnamed Treatment')  # Custom name or template name
    treatment_type = models.CharField(max_length=20, choices=TREATMENT_TYPE_CHOICES, default='joint_specific')
    treatment_subtype = models.CharField(max_length=50, blank=True, null=True)
    condition = models.CharField(max_length=100, blank=True, null=True)  # Patient condition
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    frequency = models.CharField(max_length=20, blank=True, null=True)  # e.g., daily, 3x/week
    
    # Dates
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    estimated_end_date = models.DateField(blank=True, null=True)
    
    # Notes and goals
    treatment_goals = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Treatment: {self.name} - {self.patient_id.username}"
    
    class Meta:
        ordering = ['-created_at']

# 5. TreatmentExercise - Individual treatment-exercise associations
class TreatmentExercise(models.Model):
    treatment_exercise_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    treatment_id = models.ForeignKey(Treatment, on_delete=models.CASCADE, related_name="treatment_exercises")
    exercise_id = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="treatment_assignments")
    
    # Customizable parameters (can override template/exercise defaults)
    target_metrics = models.JSONField(default=dict)  # e.g., {"flexion": 90, "hold_sec": 5}
    repetitions = models.IntegerField(blank=True, null=True)
    sets = models.IntegerField(blank=True, null=True)
    pain_threshold = models.IntegerField(blank=True, null=True)  # 1-10 scale
    
    # Exercise scheduling
    order_in_treatment = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    
    # Progress tracking
    progress_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.treatment_id.name} - {self.exercise_id.name}"
    
    class Meta:
        ordering = ['treatment_id', 'order_in_treatment']
        unique_together = ['treatment_id', 'exercise_id']

# 6. ExerciseRecord - Performance tracking records
class ExerciseRecord(models.Model):
    record_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    treatment_exercise_id = models.ForeignKey(TreatmentExercise, on_delete=models.CASCADE, related_name="records")
    patient_id = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="exercise_records", limit_choices_to={'role': 'patient'})
    
    # Performance data
    actual_metrics = models.JSONField(default=dict)  # e.g., {"flexion": 85, "accuracy": 0.9, "hold_time": 4}
    repetitions_completed = models.IntegerField(blank=True, null=True)
    sets_completed = models.IntegerField(blank=True, null=True)
    pain_level = models.IntegerField(blank=True, null=True)  # 1-10 scale, patient self-report
    
    # Session information
    session_duration_minutes = models.IntegerField(blank=True, null=True)
    completion_percentage = models.FloatField(blank=True, null=True)  # 0.0 to 1.0
    
    # Notes and feedback
    patient_notes = models.TextField(blank=True, null=True)  # Patient feedback
    therapist_notes = models.TextField(blank=True, null=True)  # Therapist observations
    
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Record: {self.treatment_exercise_id.exercise_id.name} - {self.recorded_at.date()}"
    
    class Meta:
        ordering = ['-recorded_at']


# ==================== NEW ACTION LEARNING MODELS ====================
# Support for "demo video → automatic learning → real-time recognition & counting"

class Action(models.Model):
    """
    Main action definition supporting video-based learning workflow
    """
    MODE_CHOICES = [
        ('dtw', 'DTW Recognition'),
        ('clf', 'Classifier Model'),
    ]
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='dtw')
    params_json = models.JSONField(default=dict)  # thresholds, window, etc.
    model_path = models.CharField(max_length=255, blank=True)  # for trained models
    created_by = models.IntegerField(null=True, blank=True)  # optional FK to user
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Action: {self.name} ({self.mode})"
    
    class Meta:
        ordering = ['-created_at']


class ActionSample(models.Model):
    """
    Demo video samples and extracted keypoints for action learning
    """
    id = models.AutoField(primary_key=True)
    action = models.ForeignKey(Action, on_delete=models.CASCADE, related_name='samples')
    video_url = models.CharField(max_length=255, blank=True)  # optional video file path
    keypoints_json = models.JSONField(default=dict)  # frame->keypoints mapping
    fps = models.IntegerField(default=30)
    weak_labels_json = models.JSONField(default=dict)  # auto-segmentation labels
    refined_labels_json = models.JSONField(default=dict)  # user-refined labels
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Sample for {self.action.name} - {self.created_at.date()}"
    
    class Meta:
        ordering = ['-created_at']


class ActionTemplate(models.Model):
    """
    Individual action templates (one per detected repetition)
    """
    id = models.AutoField(primary_key=True)
    action = models.ForeignKey(Action, on_delete=models.CASCADE, related_name='templates')
    seq_json = models.JSONField(default=dict)  # {'T':int,'F':int,'data':[[...],...]}
    length = models.IntegerField()  # T (time steps)
    feature_dim = models.IntegerField()  # F (feature dimensions)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Template for {self.action.name} - {self.length}T×{self.feature_dim}F"
    
    class Meta:
        ordering = ['-created_at']


class ActionSession(models.Model):
    """
    Real-time recognition/counting session results
    """
    id = models.AutoField(primary_key=True)
    action = models.ForeignKey(Action, on_delete=models.CASCADE, related_name='sessions')
    reps = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    metrics_json = models.JSONField(default=dict)  # accuracy, avg_distance, etc.
    
    def __str__(self):
        return f"Session for {self.action.name} - {self.reps} reps"
    
    class Meta:
        ordering = ['-started_at']