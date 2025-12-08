from rest_framework import serializers
from .models import CustomUser, Appointment, MedicalHistory, Admin, Therapist, Patient, Notification, Exercise, ExerciseRecord, Treatment, TreatmentExercise
import base64
from django.utils import timezone
import pytz
import statistics
from collections import defaultdict
from django.db.models import Sum, DateField, Q
from django.db.models.functions import TruncDate, Cast

class AdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = ['admin_role']

class TherapistProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Therapist
        fields = ['specialization', 'employment_date']

class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ['emergency_contact']

class CustomUserSerializer(serializers.ModelSerializer):
    admin_profile = serializers.SerializerMethodField()
    therapist_profile = serializers.SerializerMethodField()
    patient_profile = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    modified_by = serializers.SerializerMethodField()
    create_date = serializers.SerializerMethodField()
    last_login = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'ic', 'contact_number', 
                 'gender', 'dob', 'status', 'avatar', 'create_date', 'last_login',
                 'admin_profile', 'therapist_profile', 'patient_profile',
                 'created_by', 'modified_by']

    def get_create_date(self, obj):
        if obj.create_date:
            # 转换为马来西亚时区
            malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')
            malaysia_time = obj.create_date.astimezone(malaysia_tz)
            return malaysia_time.strftime("%d/%b/%Y %I:%M %p")  # DD/MMM/YYYY format
        return None

    def get_last_login(self, obj):
        if obj.last_login:
            # 转换为马来西亚时区
            malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')
            malaysia_time = obj.last_login.astimezone(malaysia_tz)
            return malaysia_time.strftime("%d/%b/%Y %I:%M %p")  # DD/MMM/YYYY format
        return None

    def get_avatar(self, obj):
        if obj.avatar:
            try:
                return base64.b64encode(obj.avatar).decode('utf-8')
            except Exception as e:
                print(f"Error encoding avatar: {e}")
                return None
        return None

    def get_admin_profile(self, obj):
        if hasattr(obj, 'admin_profile') and obj.admin_profile:
            return {
                'admin_role': obj.admin_profile.admin_role
            }
        return None

    def get_therapist_profile(self, obj):
        if hasattr(obj, 'therapist_profile') and obj.therapist_profile:
            return {
                'specialization': obj.therapist_profile.specialization,
                'employment_date': obj.therapist_profile.employment_date
            }
        return None

    def get_patient_profile(self, obj):
        if hasattr(obj, 'patient_profile') and obj.patient_profile:
            return {
                'emergency_contact': obj.patient_profile.emergency_contact
            }
        return None

    def get_created_by(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None

    def get_modified_by(self, obj):
        if obj.modified_by:
            return obj.modified_by.username
        return None

    def update(self, instance, validated_data):
        avatar_upload = validated_data.pop('avatar_upload', None)
        if avatar_upload:
            instance.avatar = base64.b64decode(avatar_upload)

        # Update basic fields
        instance = super().update(instance, validated_data)

        request = self.context.get('request')
        if request and request.POST.get('role'):
            role = request.POST.get('role')

            if role == 'admin' and hasattr(instance, 'admin_profile'):
                admin_data = {
                    'admin_role': request.POST.get('admin_profile.admin_role')
                }
                serializer = AdminProfileSerializer(instance.admin_profile, data=admin_data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()

            elif role == 'therapist' and hasattr(instance, 'therapist_profile'):
                therapist_data = {
                    'specialization': request.POST.get('therapist_profile.specialization'),
                    'employment_date': request.POST.get('therapist_profile.employment_date')
                }
                serializer = TherapistProfileSerializer(instance.therapist_profile, data=therapist_data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()

            elif role == 'patient' and hasattr(instance, 'patient_profile'):
                patient_data = {
                    'emergency_contact': request.POST.get('patient_profile.emergency_contact')
                }
                serializer = PatientProfileSerializer(instance.patient_profile, data=patient_data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()

        return instance

    def validate_ic(self, value):
        if value and value.strip():  # Only validate if value is not empty
            if not value.isdigit() or len(value) != 12:
                raise serializers.ValidationError("IC must be exactly 12 digits.")
        return value

    def validate_contact_number(self, value):
        if value and value.strip():  # Only validate if value is not empty
            if not value.isdigit():
                raise serializers.ValidationError("Contact number must contain only digits.")
            if len(value) < 10:
                raise serializers.ValidationError("Contact number must be at least 10 digits long.")
        return value

    def validate_email(self, value):
        if value and value.strip():  # Only validate if value is not empty
            if not "@" in value or not "." in value:
                raise serializers.ValidationError("Invalid email format.")
        return value
    

class UserSerializer(serializers.ModelSerializer):
    gender = serializers.CharField(read_only=True)

    class Meta:
        model = CustomUser
        fields = ["id", "username", "gender"]
        
        from .models import Admin, Therapist, Patient
        
        
class AppointmentSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    therapist = serializers.SerializerMethodField()
    latest_medical_history = serializers.SerializerMethodField()

    def get_patient(self, obj):
        if obj.patient_id:
            return {
                'id': obj.patient_id.id,
                'username': obj.patient_id.username,
                'email': obj.patient_id.email,
                'avatar': base64.b64encode(obj.patient_id.avatar).decode('utf-8') if obj.patient_id.avatar else None
            }
        return {
            'contact_name': obj.contact_name,
            'contact_phone': obj.contact_phone,
            'is_placeholder': True
        }

    def get_therapist(self, obj):
        return {
            'id': obj.therapist_id.id,
            'username': obj.therapist_id.username
        }

    def get_latest_medical_history(self, obj):
        if obj.patient_id:
            history = obj.patient_id.medical_histories.order_by('-created_at').first()
            if history:
                return MedicalHistorySerializer(history).data
        return None

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_code",
            "therapist_id",
            "patient_id",
            "contact_name",
            "contact_phone",
            "start_at",
            "end_at",
            "duration_min",
            "mode",
            "status",
            "notes",
            "patient_message",
            "session_notes",
            "cancel_reason",
            "completed_at",
            "cancelled_at",
            "created_at",
            "updated_at",
            "patient",
            "therapist",
            "latest_medical_history"
        ]


class UnavailableSlotSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [
            "id",
            "therapist_id",
            "start_at",
            "end_at",
            "description",
            "created_at",
            "updated_at"
        ]
    
    def __init__(self, *args, **kwargs):
        from .models import UnavailableSlot
        self.Meta.model = UnavailableSlot
        super().__init__(*args, **kwargs)
 
        
class MedicalHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalHistory
        fields = [
            "id",
            "patient_id",
            "recorded_by_id",
            "created_at",
            "updated_at",
            "past_medical_history",
            "surgical_history",
            "family_history",
            "medications",
            "allergies",
            "notes",
        ]

class PatientHistorySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    user = serializers.SerializerMethodField()
    medical_histories = serializers.SerializerMethodField()
    emergency_contact = serializers.SerializerMethodField()

    def get_user(self, obj):
        import base64
        avatar_data = None
        if obj.user.avatar:
            try:
                avatar_data = base64.b64encode(bytes(obj.user.avatar)).decode('utf-8')
            except Exception as e:
                avatar_data = None
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email,
            'contact_number': obj.user.contact_number,
            'ic': obj.user.ic,
            'gender': obj.user.gender,
            'dob': obj.user.dob,
            'status': obj.user.status,
            'avatar': avatar_data
        }
    
    def get_emergency_contact(self, obj):
        return obj.emergency_contact

    def get_medical_histories(self, obj):
        histories = obj.user.medical_histories.all().order_by('-created_at')
        return MedicalHistorySerializer(histories, many=True).data

    class Meta:
        model = Patient
        fields = ['id', 'user', 'emergency_contact', 'medical_histories']

class NotificationSerializer(serializers.ModelSerializer):
    created_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'is_read', 
                 'created_at', 'created_at_formatted', 'related_id']
        
    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime("%d/%b/%Y at %I:%M %p")  # DD/MMM/YYYY format

class ExerciseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = [
            'exercise_id', 'name', 'category', 'difficulty', 
            'instructions', 'action_id', 'created_by', 'created_by_name'
        ]
        
    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None


class PatientReportSummarySerializer(serializers.ModelSerializer):
    """
    Serializer for Patient Reports list page
    Based on CustomUser model, with calculated fields for treatment and exercise data
    """
    
    # Rename fields for frontend
    patient_id = serializers.CharField(source='id', read_only=True)
    patient_name = serializers.CharField(source='username', read_only=True)
    
    # Custom fields
    phone = serializers.SerializerMethodField()
    last_recorded_at = serializers.SerializerMethodField()
    today_status_state = serializers.SerializerMethodField()
    today_status_message = serializers.SerializerMethodField()
    treatment_has_treatment = serializers.SerializerMethodField()
    treatment_completed_days = serializers.SerializerMethodField()
    treatment_completion_rate = serializers.SerializerMethodField()
    treatment_avg_rep_duration = serializers.SerializerMethodField()
    treatment_consistency_score = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'patient_id',
            'patient_name',
            'phone',
            'last_recorded_at',
            'today_status_state',
            'today_status_message',
            'treatment_has_treatment',
            'treatment_completed_days',
            'treatment_completion_rate',
            'treatment_avg_rep_duration',
            'treatment_consistency_score',
        ]
    
    def get_phone(self, obj):
        """Get patient contact number"""
        return obj.contact_number
    
    def get_last_recorded_at(self, obj):
        """Get latest exercise record timestamp"""
        latest_record = ExerciseRecord.objects.filter(
            patient_id=obj
        ).order_by('-recorded_at').first()
        
        return latest_record.recorded_at.isoformat() if latest_record and latest_record.recorded_at else None
    
    def _get_active_treatment(self, obj):
        """Helper method to get active treatment (cached)"""
        if not hasattr(obj, '_cached_active_treatment'):
            obj._cached_active_treatment = Treatment.objects.filter(
                patient_id=obj,
                is_active=True
            ).order_by('-created_at').first()
        return obj._cached_active_treatment
    
    def _get_treatment_records(self, obj, active_treatment):
        """Helper method to get treatment records (cached)"""
        cache_key = '_cached_treatment_records'
        if not hasattr(obj, cache_key):
            if active_treatment:
                obj._cached_treatment_records = ExerciseRecord.objects.filter(
                    patient_id=obj,
                    treatment_exercise_id__treatment_id=active_treatment
                )
            else:
                obj._cached_treatment_records = ExerciseRecord.objects.none()
        return obj._cached_treatment_records
    
    def get_treatment_has_treatment(self, obj):
        """Check if patient has active treatment"""
        active_treatment = self._get_active_treatment(obj)
        return active_treatment is not None
    
    def get_treatment_completed_days(self, obj):
        """Calculate completed days in Malaysia timezone (UTC+8)"""
        active_treatment = self._get_active_treatment(obj)
        if not active_treatment:
            return 0
        
        treatment_records = self._get_treatment_records(obj, active_treatment)
        malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')
        
        # Convert each recorded_at to Malaysia timezone and extract date
        completed_dates = set()
        for record in treatment_records:
            if record.recorded_at:
                # Convert to Malaysia timezone
                if timezone.is_aware(record.recorded_at):
                    my_time = record.recorded_at.astimezone(malaysia_tz)
                else:
                    my_time = timezone.make_aware(record.recorded_at, malaysia_tz)
                # Extract date
                completion_date = my_time.date()
                completed_dates.add(completion_date)
        
        print(f"[Completed Days Debug] Patient {obj.id}: Total unique dates = {len(completed_dates)}, dates = {sorted(completed_dates)}")
        return len(completed_dates)
    
    def get_treatment_completion_rate(self, obj):
        """Calculate overall completion rate"""
        active_treatment = self._get_active_treatment(obj)
        if not active_treatment:
            return None
        
        treatment_records = self._get_treatment_records(obj, active_treatment)
        
        # Get all unique dates with records
        record_dates = treatment_records.annotate(
            record_date=Cast('recorded_at', DateField())
        ).values_list('record_date', flat=True).distinct()
        
        # Get all exercises in this treatment
        exercises = TreatmentExercise.objects.filter(
            treatment_id=active_treatment
        )
        
        session_completion_rates = []
        
        # Calculate completion rate for each date with records
        for record_date in record_dates:
            # Calculate total target reps for this date
            total_target_reps = 0
            for exercise in exercises:
                # Check if exercise is scheduled for this date
                exercise_start = exercise.start_date
                exercise_end = exercise.end_date
                if exercise_start and exercise_start > record_date:
                    continue
                if exercise_end and exercise_end < record_date:
                    continue
                
                sets = exercise.sets or 0
                reps_per_set = exercise.reps_per_set or 0
                total_target_reps += sets * reps_per_set
            
            if total_target_reps > 0:
                # Calculate actual completed reps for this date
                date_records = treatment_records.filter(recorded_at__date=record_date)
                actual_completed_reps = date_records.aggregate(
                    total=Sum('repetitions_completed')
                )['total'] or 0
                
                # Calculate completion rate for this session
                session_rate = (actual_completed_reps / total_target_reps) * 100
                session_completion_rates.append(session_rate)
        
        # Calculate overall completion rate as mean of all session rates
        if session_completion_rates:
            return round(sum(session_completion_rates) / len(session_completion_rates), 1)
        return None
    
    def get_treatment_avg_rep_duration(self, obj):
        """Calculate average rep duration from repetition_times"""
        from api.views import calculate_avg_duration
        
        active_treatment = self._get_active_treatment(obj)
        if not active_treatment:
            return None
        
        treatment_records = self._get_treatment_records(obj, active_treatment)
        
        avg_durations = []
        for record in treatment_records:
            avg_dur = calculate_avg_duration(record)
            if avg_dur is not None and avg_dur > 0:
                avg_durations.append(avg_dur)
        
        if avg_durations:
            return round(sum(avg_durations) / len(avg_durations), 2)
        return None
    
    def get_treatment_consistency_score(self, obj):
        """Calculate consistency score using SPARC (Consistency = 1 - CV(SPARC))."""
        active_treatment = self._get_active_treatment(obj)
        if not active_treatment:
            return None
        
        treatment_records = self._get_treatment_records(obj, active_treatment)
        
        sparc_values = []
        for record in treatment_records:
            if record.rep_sparc_scores and isinstance(record.rep_sparc_scores, list):
                for score in record.rep_sparc_scores:
                    if isinstance(score, (int, float)) and score is not None:
                        sparc_values.append(abs(score))
        
        if len(sparc_values) >= 2:
            mean_sparc = statistics.mean(sparc_values)
            if abs(mean_sparc) > 1e-6:
                std_sparc = statistics.stdev(sparc_values)
                cv = std_sparc / abs(mean_sparc)
                consistency_score = max(0, min(1, 1 - cv))
                return round(consistency_score, 3)
        
        return None
    
    def get_today_status_state(self, obj):
        """Get today's status state"""
        active_treatment = self._get_active_treatment(obj)
        # Use Malaysia timezone (UTC+8) to get today's date
        malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')
        today = timezone.now().astimezone(malaysia_tz).date()
        
        if not active_treatment:
            return 'no-treatment'
        
        # Check if in date range
        in_date_range = True
        if active_treatment.start_date and active_treatment.start_date > today:
            in_date_range = False
        if active_treatment.end_date and active_treatment.end_date < today:
            in_date_range = False
        
        if not in_date_range:
            return 'no-exercises'
        
        # Check today's completion status
        # Use start_time for date matching (consistent with last_exercise_date logic)
        # Also check recorded_at as fallback
        # Convert datetime fields to Malaysia timezone for date comparison
        treatment_records = self._get_treatment_records(obj, active_treatment)
        
        # Filter records by today's date in Malaysia timezone
        today_records = []
        print(f"[Today Status Debug] ========== TODAY STATUS CHECK ==========")
        print(f"[Today Status Debug] Today in Malaysia timezone (UTC+8): {today}")
        print(f"[Today Status Debug] Current UTC time: {timezone.now()}")
        print(f"[Today Status Debug] Current MY time: {timezone.now().astimezone(malaysia_tz)}")
        print(f"[Today Status Debug] Total records to check: {treatment_records.count()}")
        for record in treatment_records:
            # Check start_time date in Malaysia timezone
            record_date_from_start = None
            if record.start_time:
                # Convert to Malaysia timezone and get date
                if timezone.is_aware(record.start_time):
                    # Ensure proper timezone conversion
                    my_time_start = record.start_time.astimezone(malaysia_tz)
                    record_date_from_start = my_time_start.date()
                    print(f"[Today Status Debug] Record {record.record_id}: start_time(UTC)={record.start_time}, start_time(MY)={my_time_start}, start_time_date(MY)={record_date_from_start}")
                else:
                    # If naive (shouldn't happen with USE_TZ=True), use as-is
                    record_date_from_start = record.start_time.date()
                    print(f"[Today Status Debug] Record {record.record_id}: start_time(naive)={record.start_time}, start_time_date={record_date_from_start}")
            
            # Check recorded_at date in Malaysia timezone  
            record_date_from_recorded = None
            if record.recorded_at:
                if timezone.is_aware(record.recorded_at):
                    # Ensure proper timezone conversion
                    my_time_recorded = record.recorded_at.astimezone(malaysia_tz)
                    record_date_from_recorded = my_time_recorded.date()
                    print(f"[Today Status Debug] Record {record.record_id}: recorded_at(UTC)={record.recorded_at}, recorded_at(MY)={my_time_recorded}, recorded_at_date(MY)={record_date_from_recorded}")
                else:
                    # If naive (shouldn't happen with USE_TZ=True), use as-is
                    record_date_from_recorded = record.recorded_at.date()
                    print(f"[Today Status Debug] Record {record.record_id}: recorded_at(naive)={record.recorded_at}, recorded_at_date={record_date_from_recorded}")
            
            # If either date matches today, include the record
            if (record_date_from_start == today) or (record_date_from_recorded == today):
                print(f"[Today Status Debug] Record {record.record_id} matches today! sets_completed={record.sets_completed}")
                today_records.append(record)
        
        # Group completed sets by exercise_id instead of treatment_exercise_id
        # This handles cases where TreatmentExercise UUIDs change but Exercise remains the same
        completed_sets_by_exercise = defaultdict(int)
        for record in today_records:
            # Get the exercise_id from the treatment_exercise_id relationship
            try:
                treatment_exercise = record.treatment_exercise_id
                exercise_id_key = str(treatment_exercise.exercise_id.exercise_id)
                completed_sets_by_exercise[exercise_id_key] += record.sets_completed or 0
                print(f"[Today Status Debug] Record {record.record_id}: treatment_exercise_id={record.treatment_exercise_id_id}, exercise_id={exercise_id_key}, sets_completed={record.sets_completed}")
            except Exception as e:
                print(f"[Today Status Debug] Error getting exercise_id for record {record.record_id}: {e}")
                # Fallback to treatment_exercise_id if exercise_id lookup fails
                record_key = str(record.treatment_exercise_id_id)
                completed_sets_by_exercise[record_key] += record.sets_completed or 0
        
        print(f"[Today Status Debug] Completed sets by exercise_id: {dict(completed_sets_by_exercise)}")
        
        exercises = TreatmentExercise.objects.filter(
            treatment_id=active_treatment,
            is_active=True  # Only check active exercises
        ).select_related('exercise_id')
        
        has_assignments_today = False
        all_completed = True
        
        print(f"[Today Status Debug] Total exercises to check: {exercises.count()}")
        for exercise in exercises:
            # Check if exercise scheduled today
            exercise_start = exercise.start_date
            exercise_end = exercise.end_date
            print(f"[Today Status Debug] Exercise {exercise.exercise_id.name}: start_date={exercise_start}, end_date={exercise_end}, today={today}")
            if exercise_start and exercise_start > today:
                print(f"[Today Status Debug] Exercise {exercise.exercise_id.name} skipped: start_date > today")
                continue
            if exercise_end and exercise_end < today:
                print(f"[Today Status Debug] Exercise {exercise.exercise_id.name} skipped: end_date < today")
                continue
            
            has_assignments_today = True
            required_sets = exercise.sets or 0
            if required_sets <= 0:
                print(f"[Today Status Debug] Exercise {exercise.exercise_id.name} skipped: required_sets={required_sets} <= 0")
                continue
            
            # Use exercise_id instead of treatment_exercise_id for matching
            exercise_id_key = str(exercise.exercise_id.exercise_id)
            completed_sets = completed_sets_by_exercise.get(exercise_id_key, 0)
            print(f"[Today Status Debug] Exercise {exercise.exercise_id.name}: exercise_id={exercise_id_key}, completed_sets={completed_sets}, required_sets={required_sets}")
            print(f"[Today Status Debug] Available keys in completed_sets_by_exercise: {list(completed_sets_by_exercise.keys())}")
            print(f"[Today Status Debug] Key match check: key '{exercise_id_key}' in dict? {exercise_id_key in completed_sets_by_exercise}")
            if completed_sets < required_sets:
                print(f"[Today Status Debug] Exercise {exercise.exercise_id.name} NOT completed (completed < required)")
                all_completed = False
                break
            else:
                print(f"[Today Status Debug] Exercise {exercise.exercise_id.name} completed (completed >= required)")
        
        print(f"[Today Status Debug] Final: has_assignments_today={has_assignments_today}, all_completed={all_completed}")
        
        if not has_assignments_today:
            return 'no-exercises'
        elif all_completed:
            return 'completed'
        else:
            return 'pending'
    
    def get_today_status_message(self, obj):
        """Get today's status message"""
        state = self.get_today_status_state(obj)
        
        messages = {
            'no-treatment': 'Patient has no active treatment today',
            'no-exercises': 'No exercises assigned for today',
            'completed': 'Patient completed all assigned exercises today',
            'pending': 'Patient has not completed all assigned sets today',
        }
        
        return messages.get(state, 'Status unavailable')


# Serializer for Patient Report Detail Page
class PatientReportDetailSerializer(serializers.Serializer):
    """Serializer for patient report detail page - accepts pre-calculated data"""
    patient = serializers.DictField(read_only=True)
    active_treatment = serializers.DictField(read_only=True, allow_null=True)
    previous_treatment = serializers.DictField(read_only=True, allow_null=True)
    completed_days = serializers.IntegerField(read_only=True)
    should_completed_days = serializers.IntegerField(read_only=True)
    sessions_completion_rate = serializers.FloatField(read_only=True, allow_null=True)
    total_reps_completed = serializers.IntegerField(read_only=True)
    should_completed_reps = serializers.IntegerField(read_only=True)
    reps_completion_rate = serializers.FloatField(read_only=True, allow_null=True)
    avg_rep_duration = serializers.FloatField(read_only=True, allow_null=True)
    consistency_score = serializers.FloatField(read_only=True, allow_null=True)
    avg_fatigue_index = serializers.FloatField(read_only=True, allow_null=True)
    last_exercise_date = serializers.DateTimeField(read_only=True, allow_null=True)
    exercise_records = serializers.ListField(read_only=True)
    records = serializers.ListField(read_only=True)