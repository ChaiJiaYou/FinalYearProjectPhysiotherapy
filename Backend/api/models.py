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
            # Admin: A + 4 increment digits (A0001, A0002, etc.)
            prefix = "A"
            last_user = CustomUser.objects.filter(id__startswith=prefix).order_by('-id').first()
            
            if last_user:
                last_number = int(last_user.id[1:])  # Extract numeric part after 'A'
            else:
                last_number = 0
                
            return f"{prefix}{last_number + 1:04d}"  # A0001, A0002, etc.
            
        elif self.role.lower() == "therapist":
            # Therapist: D + 7 digits (D2506001, D2506002, etc.)
            prefix = f"D{year_month}"
            last_user = CustomUser.objects.filter(id__startswith=prefix).order_by('-id').first()
            
            if last_user:
                last_number = int(last_user.id[5:])  # Extract numeric part after 'DYYMM'
            else:
                last_number = 0
                
            return f"{prefix}{last_number + 1:03d}"  # D2506001, D2506002, etc.
            
        elif self.role.lower() == "patient":
            # Patient: P + 7 digits (P2506001, P2506002, etc.)
            prefix = f"P{year_month}"
            last_user = CustomUser.objects.filter(id__startswith=prefix).order_by('-id').first()
            
            if last_user:
                last_number = int(last_user.id[5:])  # Extract numeric part after 'PYYMM'
            else:
                last_number = 0
                
            return f"{prefix}{last_number + 1:03d}"  # P2506001, P2506002, etc.
            
        else:
            # Default fallback for unknown roles
            return f"USR{current_date.strftime('%y%m')}{1:03d}"

    def __str__(self):
        return f"{self.id} - {self.username} ({self.role})"
    
class Admin(models.Model):
    ADMIN_ROLE_CHOICES = [
        ('CenterAdmin', 'Center Admin'),
        ('SuperAdmin', 'Super Admin'),
    ]
    
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='admin_profile')
    admin_role = models.CharField(max_length=50, choices=ADMIN_ROLE_CHOICES, default='CenterAdmin')

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
        ("Pending", "Pending"),
        ("Scheduled", "Scheduled"),
        ("Cancelled", "Cancelled"),
        ("Completed", "Completed"),
    ]

    DURATION_CHOICES = [
        (30, "30 minutes"),
        (45, "45 minutes"),
        (60, "60 minutes"),
    ]

    MODE_CHOICES = [
        ("onsite", "On-site"),
        ("tele", "Telemedicine"),
        ("home", "Home visit"),
    ]

    # 预约编号 - 并发安全生成
    appointment_code = models.CharField(max_length=20, unique=True, editable=False)
    
    # 治疗师 - 必填
    therapist_id = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="therapist_appointments", 
        limit_choices_to={'role': 'therapist'}
    )
    
    # 患者 - 可为空（新患者占位模式）
    patient_id = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="patient_appointments", 
        limit_choices_to={'role': 'patient'},
        null=True, 
        blank=True
    )
    
    # 新患者占位字段
    contact_name = models.CharField(max_length=100, blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # 时间相关
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    duration_min = models.IntegerField(choices=DURATION_CHOICES, default=30)
    
    # 预约模式
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default="onsite")
    
    # 状态管理
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Scheduled")
    
    # 备注和记录
    notes = models.TextField(blank=True, null=True)
    patient_message = models.TextField(blank=True, null=True, help_text="Message from patient to therapist")
    session_notes = models.TextField(blank=True, null=True)
    cancel_reason = models.TextField(blank=True, null=True, help_text="Reason for cancellation")
    
    # 状态时间戳
    completed_at = models.DateTimeField(blank=True, null=True, help_text="When appointment was completed")
    cancelled_at = models.DateTimeField(blank=True, null=True, help_text="When appointment was cancelled")
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # 关联治疗计划（保留）
    treatment_id = models.ForeignKey(
        'Treatment', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="appointments"
    )

    class Meta:
        ordering = ['start_at']
        indexes = [
            models.Index(fields=['therapist_id', 'start_at']),
            models.Index(fields=['patient_id', 'start_at']),
        ]

    def __str__(self):
        return f"Appointment {self.appointment_code} - {self.status} ({self.therapist_id.username})"

    def save(self, *args, **kwargs):
        if not self.appointment_code:
            self.appointment_code = self._generate_appointment_code()
        super().save(*args, **kwargs)

    def _generate_appointment_code(self):
        """并发安全的预约编号生成"""
        from django.db import transaction
        from django.utils import timezone
        
        with transaction.atomic():
            today_str = timezone.now().strftime('%Y%m%d')
            prefix = f"APT-{today_str}-"
            
            # 使用 SELECT FOR UPDATE 锁定
            last_appointment = Appointment.objects.filter(
                appointment_code__startswith=prefix
            ).select_for_update().order_by('-appointment_code').first()
            
            if last_appointment:
                # 提取最后三位数字并自增
                last_number = int(last_appointment.appointment_code[-3:])
                new_number = last_number + 1
            else:
                new_number = 1
            
            return f"{prefix}{new_number:03d}"


class UnavailableSlot(models.Model):
    """治疗师不可用时间段"""
    
    therapist_id = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="unavailable_slots",
        limit_choices_to={'role': 'therapist'}
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    description = models.CharField(max_length=200, blank=True, null=True, help_text="Additional details")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_at']
        indexes = [
            models.Index(fields=['therapist_id', 'start_at']),
        ]

    def __str__(self):
        return f"Unavailable {self.therapist_id.username} - {self.start_at} to {self.end_at}"

class MedicalHistory(models.Model):
    # 患者 - 必填
    patient_id = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name="medical_histories", 
        limit_choices_to={'role': 'patient'}
    )
    
    # 记录者 - 可为空
    recorded_by_id = models.ForeignKey(
        CustomUser, 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL, 
        related_name="entered_histories",
        limit_choices_to={'role__in': ['therapist', 'admin']}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Past Medical History
    past_medical_history = models.TextField(
        blank=True, null=True,
        help_text="Details of any diagnosed medical conditions, including chronic illnesses and past significant illnesses."
    )

    # Surgical History
    surgical_history = models.TextField(
        blank=True, null=True,
        help_text="List of past surgeries with procedures and dates."
    )

    # Family History
    family_history = models.TextField(
        blank=True, null=True,
        help_text="Information about health of blood relatives, e.g., cancer, hypertension, diabetes."
    )

    # Medications
    medications = models.TextField(
        blank=True, null=True,
        help_text="Comprehensive list of current and past medications, including dosage and frequency."
    )

    # Allergies
    allergies = models.TextField(
        blank=True, null=True,
        help_text="Known allergies to medications, food, or environmental factors."
    )

    # Optional notes
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Medical History for {self.patient_id.username} ({self.created_at.date()})"
    
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
    
    CATEGORY_CHOICES = [
        ('upper_body', 'Upper Body'),
        ('lower_body', 'Lower Body'),
        ('full_body', 'Full Body'),
    ]
    
    exercise_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, default='Unnamed Exercise')  # e.g., Wall Crawl, Shoulder Flexion
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='upper_body')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    instructions = models.TextField(default='No instructions provided')  # Exercise instructions
    action_id = models.ForeignKey('Action', on_delete=models.SET_NULL, null=True, blank=True, related_name="exercises")
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="created_exercises", limit_choices_to={'role': 'therapist'}, null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.category})"
    
    class Meta:
        ordering = ['category', 'name']

# 2. Treatment - Main treatment records
class Treatment(models.Model):
    # 移除 STATUS_CHOICES，因为 BooleanField 不需要 choices
    
    treatment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_id = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="patient_treatments", limit_choices_to={'role': 'patient'})
    therapist_id = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="therapist_treatments", limit_choices_to={'role': 'therapist'})
    
    # Treatment details
    name = models.CharField(max_length=100, default='Unnamed Treatment')  # Treatment plan name
    is_active = models.BooleanField(default=True)  # True = active, False = completed
    
    # Dates
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    
    # Notes and goals
    goal_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Treatment: {self.name} - {self.patient_id.username}"
    
    class Meta:
        ordering = ['-created_at']

# 3. TreatmentExercise - Association between treatment plans and exercises
class TreatmentExercise(models.Model):
    treatment_exercise_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    treatment_id = models.ForeignKey(Treatment, on_delete=models.CASCADE, related_name="treatment_exercises")
    exercise_id = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name="treatment_assignments")
    
    # Exercise parameters for this treatment plan
    reps_per_set = models.IntegerField(blank=True, null=True)
    sets = models.IntegerField(default=1, help_text="Number of sets for this exercise")
    duration_per_set = models.IntegerField(blank=True, null=True, help_text="Duration per set in seconds")
    notes = models.TextField(blank=True, null=True)
    
    # Exercise scheduling
    order_in_treatment = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.treatment_id.name} - {self.exercise_id.name}"
    
    class Meta:
        ordering = ['treatment_id', 'order_in_treatment']
        unique_together = ['treatment_id', 'exercise_id']

# 4. ExerciseRecord - Performance tracking records
class ExerciseRecord(models.Model):
    record_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    treatment_exercise_id = models.ForeignKey(TreatmentExercise, on_delete=models.CASCADE, related_name="records")
    patient_id = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="exercise_records", limit_choices_to={'role': 'patient'})
    
    # Performance data
    repetitions_completed = models.IntegerField(blank=True, null=True)
    sets_completed = models.IntegerField(blank=True, null=True)
    
    # Timing data
    start_time = models.DateTimeField(blank=True, null=True, help_text="Exercise session start time")
    end_time = models.DateTimeField(blank=True, null=True, help_text="Exercise session end time")
    total_duration = models.FloatField(blank=True, null=True, help_text="Total exercise duration in seconds")
    pause_count = models.IntegerField(default=0, help_text="Number of pauses during exercise")
    # avg_duration removed - calculated dynamically from repetition_times or start/end time
    repetition_times = models.JSONField(default=list, blank=True, null=True, help_text="Array of time taken for each repetition in seconds")
    
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

