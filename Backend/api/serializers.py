from rest_framework import serializers
from .models import CustomUser, Appointment, MedicalHistory, Admin, Therapist, Patient, Notification, Exercise, TreatmentTemplate
import base64
from django.utils import timezone
import pytz

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
        return {
            'id': obj.patientId.id,
            'username': obj.patientId.username
        }

    def get_therapist(self, obj):
        return {
            'id': obj.therapistId.id,
            'username': obj.therapistId.username
        }

    def get_latest_medical_history(self, obj):
        history = obj.patientId.medical_histories.order_by('-session_date').first()
        if history:
            return MedicalHistorySerializer(history).data
        return None

    class Meta:
        model = Appointment
        fields = [
            "appointmentId",
            "patient",
            "therapist",
            "appointmentDateTime",
            "duration",
            "status",
            "notes",
            "sessionNotes",
            "latest_medical_history"
        ]
 
        
class MedicalHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalHistory
        fields = [
            "session_date",
            "description",
            "objective_findings",
            "treatment",
            "remarks",
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
            'avatar': avatar_data
        }
    
    def get_emergency_contact(self, obj):
        return obj.emergency_contact

    def get_medical_histories(self, obj):
        histories = obj.user.medical_histories.all().order_by('-session_date')
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
            'exercise_id', 'name', 'body_part', 'category', 'difficulty', 
            'default_metrics', 'instructions', 'demo_video_url', 
            'created_at', 'created_by', 'created_by_name', 'is_active',
            'detection_rules'
        ]
        
    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None

class TreatmentTemplateSerializer(serializers.ModelSerializer):
    exercises = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TreatmentTemplate
        fields = [
            'template_id', 'name', 'treatment_type', 'treatment_subtype',
            'condition', 'description', 'default_frequency', 
            'estimated_duration_weeks', 'created_at', 'created_by', 
            'created_by_name', 'is_active', 'exercises'
        ]
        
    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None
        
    def get_exercises(self, obj):
        template_exercises = obj.template_exercises.all().order_by('order_in_template')
        exercises_data = []
        for te in template_exercises:
            exercise_data = {
                'exercise_name': te.exercise_id.name,
                'body_part': te.exercise_id.body_part,
                'category': te.exercise_id.category,
                'default_target_metrics': te.default_target_metrics or te.exercise_id.default_metrics,
                'default_repetitions': te.default_repetitions,
                'default_sets': te.default_sets,
                'default_pain_threshold': te.default_pain_threshold,
                'order_in_template': te.order_in_template,
                'is_required': te.is_required,
                'instructions': te.exercise_id.instructions,
            }
            exercises_data.append(exercise_data)
        return exercises_data