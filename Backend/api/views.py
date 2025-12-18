from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from datetime import timedelta, datetime, time
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils.timezone import localtime, now, make_aware
from .models import CustomUser, Admin, Patient, Therapist, Appointment, Notification, Treatment, TreatmentExercise, Exercise, MedicalHistory, ExerciseRecord
import time
import json
import statistics
from .serializers import CustomUserSerializer, AppointmentSerializer, PatientHistorySerializer, NotificationSerializer, MedicalHistorySerializer, PatientReportSummarySerializer, PatientReportDetailSerializer
from django.utils.dateparse import parse_datetime
from collections import defaultdict
from django.db import transaction
from django.contrib.auth import login
from django.db.models import Q, Sum, DateField
import base64
from django.db.models.functions import TruncDate, Cast


# Helper function to calculate avg_duration from record
def calculate_avg_duration(record):
    """
    Calculate average duration per repetition from record.
    Uses repetition_times with outlier filtering, or falls back to start/end time.
    """
    # Try to use repetition_times first (more accurate)
    if record.repetition_times and isinstance(record.repetition_times, list) and len(record.repetition_times) > 0:
        rep_times = record.repetition_times
        
        # Remove outliers using IQR method if enough data points
        if len(rep_times) > 4:
            sorted_times = sorted(rep_times)
            q1_index = len(sorted_times) // 4
            q3_index = (3 * len(sorted_times)) // 4
            q1 = sorted_times[q1_index]
            q3 = sorted_times[q3_index]
            iqr = q3 - q1
            
            # Filter outliers: values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            filtered_times = [t for t in rep_times if lower_bound <= t <= upper_bound]
            
            # Only use filtered data if we have at least 1 value
            if len(filtered_times) >= 1:
                rep_times = filtered_times
        
        # Calculate mean
        return sum(rep_times) / len(rep_times)
    
    # Fallback: use start_time and end_time
    if record.start_time and record.end_time and record.repetitions_completed and record.repetitions_completed > 0:
        total_duration = (record.end_time - record.start_time).total_seconds()
        return total_duration / record.repetitions_completed
    
    return None


@api_view(['POST'])
@csrf_exempt
def login_view(request):
    data = request.data
    user_id = data.get('id')
    password = data.get('password')

    if not user_id or not password:
        return JsonResponse({'success': False, 'error': 'User ID and password are required.'}, status=400)

    user = CustomUser.objects.filter(id=user_id).first()
    
    if user and user.check_password(password):
        if not user.status:
            return JsonResponse({'success': False, 'error': 'Your account is deactivated. Please contact staff.'}, status=403)

        # ✅ Login the user into Django session
        login(request._request, user)


        user.last_login = now()
        user.save(update_fields=["last_login"])
        
        csrf_token = get_token(request)

        response = JsonResponse({
            'success': True,
            'id': user.id,
            'userId': user.id,  # Add userId for frontend consistency
            'username': user.username,
            'role': user.role,
            'csrfToken': csrf_token,
        })
        
        response.set_cookie(
            key='sessionid',
            value=request.session.session_key,
            httponly=True,
            max_age=7 * 24 * 3600,
            samesite='Lax',
            secure=False,
        )

        response.set_cookie('id', user.id, max_age=7 * 24 * 3600, httponly=True)
        response.set_cookie('username', user.username, max_age=7 * 24 * 3600, httponly=True)
        response.set_cookie('role', user.role, max_age=7 * 24 * 3600, httponly=True)

        return response

    else:
        print(f"Login failed - User ID: {user_id}, User exists: {user is not None}")
        if user:
            print(f"Password incorrect for user: {user.username}")
        else:
            print(f"User not found with ID: {user_id}")
        return JsonResponse({'success': False, 'error': 'Invalid user ID or password'}, status=401)

   
# User Account Management Module
# Fetch All User From Database
@api_view(['GET'])
def list_users(request):
    try:
        users = CustomUser.objects.all().order_by('-create_date')
        serializer = CustomUserSerializer(users, many=True)  # Serialize the data
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Fetch Selected  User From Database
@api_view(['GET'])
def get_user(request, user_id):
    try:
        user = get_object_or_404(CustomUser, id=user_id)
        serializer = CustomUserSerializer(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error in get_user: {str(e)}")  # Add debug log
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# Update User Status From User Account Management
@api_view(['PUT'])
def update_user_status(request, user_id):
    try:
        user = get_object_or_404(CustomUser, id=user_id) # Fetch user from database
        data = request.data
        new_status = data.get('status')
        
        if new_status is None:
            return Response({'error': 'Status field is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        #Update user status
        user.status = new_status
        user.save()
        
        serializer = CustomUserSerializer(user)
        
        return Response({
            'success': True,
            'message': 'User status updated successfully.',
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error' : str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def create_user(request):
    try:
        with transaction.atomic():
            # Extract form data
            username = request.data.get("username")
            email = request.data.get("email")
            role = request.data.get("role")
            contact_number = request.data.get("contact_number")
            ic = request.data.get("ic")
            gender = request.data.get("gender")
            dob = request.data.get("dob")
            password = request.data.get("password")
            avatar_file = request.FILES.get("avatar")
            creator_id = request.data.get("creator_id")

            # Validate required fields
            if not all([username, email, role, password]):
                return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

            # Check for existing IC
            if ic and CustomUser.objects.filter(ic=ic).exists():
                return Response({"error": "Account with this IC already exists."}, status=status.HTTP_400_BAD_REQUEST)

            # Get creator user if creator_id is provided
            creator_user = None
            if creator_id:
                try:
                    creator_user = CustomUser.objects.get(id=creator_id)
                except CustomUser.DoesNotExist:
                    return Response({"error": "Creator user not found."}, status=status.HTTP_400_BAD_REQUEST)

            # Process date of birth
            try:
                dob_date = datetime.strptime(dob, "%Y-%m-%d").date() if dob else None
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

            # Create user instance
            user = CustomUser(
                username=username,
                email=email,
                role=role,
                contact_number=contact_number,
                ic=ic,
                gender=gender,
                dob=dob_date,
                created_by=creator_user,
                modified_by=creator_user,
            )

            # Set password
            user.set_password(password)

            # Handle avatar
            if avatar_file:
                user.avatar = avatar_file.read()

            # Save user
            user.save()

            # Create role-specific profile
            if role == "patient":
                emergency_contact = request.data.get("emergency_contact", "")
                Patient.objects.create(
                    user=user,
                    emergency_contact=emergency_contact
                )
            elif role == "therapist":
                specialization = request.data.get("specialization", "General")
                employment_date = request.data.get("employment_date") or datetime.now().date()
                Therapist.objects.create(
                    user=user,
                    specialization=specialization,
                    employment_date=employment_date
                )
            elif role == "admin":
                admin_role = request.data.get("admin_role", "General Admin")
                try:
                    Admin.objects.create(
                        user=user,
                        admin_role=admin_role
                    )
                except Exception as e:
                    # If duplicate key error, fix sequence and retry
                    if 'duplicate key' in str(e).lower() or 'violates unique constraint' in str(e).lower():
                        from django.db import connection
                        with connection.cursor() as cursor:
                            cursor.execute("SELECT COALESCE(MAX(id), 0) FROM api_admin")
                            max_id = cursor.fetchone()[0]
                            cursor.execute(f"SELECT setval('api_admin_id_seq', {max_id + 1}, false)")
                        # Retry creation
                        Admin.objects.create(
                            user=user,
                            admin_role=admin_role
                        )
                    else:
                        raise

            # Serialize and return the created user
            serializer = CustomUserSerializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Error creating user: {str(e)}")  # For debugging
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def update_user(request, user_id):
    try:
        user = CustomUser.objects.get(pk=user_id)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    # Handle avatar file update if provided
    avatar_file = request.FILES.get('avatar')
    if avatar_file:
        avatar_data = avatar_file.read()
        user.avatar = avatar_data

    serializer = CustomUserSerializer(user, data=request.data, context={"request": request}, partial=True)
    if serializer.is_valid():
        serializer.save()

        # 🔁 Manually update related role-specific model
        role = user.role
        if role == "admin":
            admin = getattr(user, "admin_profile", None)
            if admin:
                admin.admin_role = request.data.get("admin_profile.admin_role", admin.admin_role)
                admin.save()
        elif role == "therapist":
            therapist = getattr(user, "therapist_profile", None)
            if therapist:
                therapist.specialization = request.data.get("therapist_profile.specialization", therapist.specialization)
                therapist.employment_date = request.data.get("therapist_profile.employment_date", therapist.employment_date)
                therapist.save()
        elif role == "patient":
            patient = getattr(user, "patient_profile", None)
            if patient:
                patient.emergency_contact = request.data.get("patient_profile.emergency_contact", patient.emergency_contact)
                patient.save()

        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # Print detailed error information for debugging
    print(f"Serializer errors: {serializer.errors}")
    print(f"Request data: {request.data}")
    return Response({
        "error": "Validation failed",
        "details": serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)




@api_view(['POST'])
def create_appointment(request):
    try:
        data = request.data
        patient_id = data.get("patient_id")
        therapist_id = data.get("therapist_id")
        appointmentDateTime = data.get("appointmentDateTime")
        duration = data.get("duration", 30)
        notes = data.get("notes", "")

        # Validate required fields
        missing_fields = []
        if not patient_id:
            missing_fields.append("patient_id")
        if not therapist_id:
            missing_fields.append("therapist_id")
        if not appointmentDateTime:
            missing_fields.append("appointmentDateTime")

        if missing_fields:
            return Response({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate duration
        if duration not in [30, 45, 60]:
            return Response({
                "error": "Invalid duration. Must be 30, 45, or 60 minutes."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointmentDateTime = parse_datetime(appointmentDateTime)
            if appointmentDateTime is None:
                raise ValueError("Could not parse datetime")
        except ValueError as e:
            return Response({
                "error": f"Invalid date format: {str(e)}. Use ISO format (YYYY-MM-DDTHH:MM:SSZ)"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate users exist
        try:
            patient = get_object_or_404(CustomUser, id=patient_id, role="patient")
            therapist = get_object_or_404(CustomUser, id=therapist_id, role="therapist")
        except Exception as e:
            return Response({
                "error": f"Invalid user: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check for time conflicts
        appointmentEndTime = appointmentDateTime + timedelta(minutes=duration)
        overlapping_appointments = Appointment.objects.filter(
            therapistId=therapist,
            appointmentDateTime__lt=appointmentEndTime,
            appointmentDateTime__gt=appointmentDateTime
        ).exists()

        if overlapping_appointments:
            return Response({
                "error": "This time slot conflicts with another appointment."
            }, status=status.HTTP_400_BAD_REQUEST)

        # All appointments are created as Scheduled (no Pending status)
        appointment_status = "Scheduled"
        
        # Create appointment
        appointment = Appointment.objects.create(
            patientId=patient,
            therapistId=therapist,
            appointmentDateTime=appointmentDateTime,
            duration=duration,
            notes=notes,
            status=appointment_status
        )

        # Create notification for the patient
        Notification.objects.create(
            user=patient,
            title="New Appointment Scheduled",
            message=f"You have a new appointment scheduled with {therapist.username} on {appointmentDateTime.strftime('%d/%b/%Y at %I:%M %p')}",
            notification_type='appointment',
            related_id=str(appointment.appointment_code)
        )

        # Create notification for the therapist
        Notification.objects.create(
            user=therapist,
            title="New Appointment Created",
            message=f"New appointment scheduled with {patient.username} on {appointmentDateTime.strftime('%d/%b/%Y at %I:%M %p')}",
            notification_type='appointment',
            related_id=str(appointment.appointment_code)
        )

        serializer = AppointmentSerializer(appointment)
        return Response({
            "message": "Appointment created successfully!",
            "appointment": serializer.data
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({
            "error": f"An error occurred: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_therapists(request):
    try:
        therapists = Therapist.objects.all()
        
        # Serialize the therapist data
        data = []
        for therapist in therapists:
            avatar_data = None
            if therapist.user.avatar:
                try:
                    # 如果是BinaryField，转换为base64
                    import base64
                    avatar_data = f"data:image/jpeg;base64,{base64.b64encode(therapist.user.avatar).decode('utf-8')}"
                except Exception as e:
                    print(f"Error processing avatar for {therapist.user.username}: {e}")
                    avatar_data = None
            
            data.append({
                "id": therapist.user.id,  # Therapist's unique user ID
                "username": therapist.user.username,
                "email": therapist.user.email,
                "avatar": avatar_data,
            })

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
@api_view(['GET'])
def list_appointments(request):
    try:
        appointments = Appointment.objects.all()
        data = [
            {
                "appointmentId": appt.appointment_code,
                "patient": {
                    "id": appt.patient_id.id if appt.patient_id else None,
                    "username": appt.patient_id.username if appt.patient_id else appt.contact_name,
                },
                "therapist": {
                    "id": appt.therapist_id.id,
                    "username": appt.therapist_id.username,
                },
                "appointmentDateTime": appt.start_at,
                "status": appt.status,
            }
            for appt in appointments
        ]
        return Response(data, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# Fetch Available Time slot for selected therapist
@api_view(['GET'])
def therapist_available_slots(request):
    therapist_id = request.GET.get("therapist_id")
    date = request.GET.get("date")

    if not therapist_id or not date:
        return Response({"error": "Missing therapist_id or date"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # 获取指定日期的所有预约
        appointments = Appointment.objects.filter(
            therapist_id__id=therapist_id,
            start_at__date=date
        ).order_by('start_at')

        # 序列化预约数据
        serializer = AppointmentSerializer(appointments, many=True)
        
        return Response({
            "appointments": serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {"error": f"Error fetching appointments: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

from django.utils.timezone import localdate

@api_view(['GET'])
def therapist_today_appointments(request):
    therapist_id = request.GET.get("therapist_id")
    date_str = request.GET.get("date")

    if not therapist_id or not date_str:
        return Response({"error": "Missing therapist_id or date"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # 将日期字符串转换为日期对象
        selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # 获取当天的开始和结束时间（使用本地时区）
        start_datetime = make_aware(datetime.combine(selected_date, time.min))
        end_datetime = make_aware(datetime.combine(selected_date, time.max))

        # 获取指定日期的预约
        appointments = Appointment.objects.filter(
            therapistId__id=therapist_id,
            appointmentDateTime__range=(start_datetime, end_datetime)
        ).order_by('appointmentDateTime')

        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except ValueError:
        return Response({"error": "Invalid date format"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def therapist_upcoming_appointments(request):
    therapist_id = request.GET.get("therapist_id")

    if not therapist_id:
        return Response({"error": "Missing therapist_id"}, status=status.HTTP_400_BAD_REQUEST)

    # Get today's date and 7 days later
    today = localtime().date()
    end_date = today + timedelta(days=7)
    today = today + timedelta(days=1)
    # Filter appointments within the next 7 days
    upcoming_appointments = Appointment.objects.filter(
        therapistId__id=therapist_id,
        appointmentDateTime__date__range=[today, end_date]
    ).order_by("appointmentDateTime")

    serializer = AppointmentSerializer(upcoming_appointments, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# Retrieve specific Patient Appointment
@api_view(['GET'])
def get_patient_appointments(request):
    patient_id = request.GET.get("patient_id")

    if not patient_id:
        return Response({"error": "Missing patient_id"}, status=status.HTTP_400_BAD_REQUEST)

    # Retrieve all appointments for this patient
    appointments = Appointment.objects.filter(patient_id__id=patient_id).order_by("-start_at")
    
    serializer = AppointmentSerializer(appointments, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# Cancel Patient Appointment
@api_view(['PUT'])
def update_appointment_status(request, appointment_id):
    try:
        # Get the appointment by ID
        appointment = get_object_or_404(Appointment, appointment_code=appointment_id)

        # Get the new status and notes from request
        data = request.data
        new_status = data.get("status")
        new_session_notes = data.get("sessionNotes")

        if new_status not in ["Scheduled", "Cancelled", "Completed"]:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        old_status = appointment.status
        # Update the status and notes
        appointment.status = new_status
        if new_session_notes is not None:
            appointment.sessionNotes = new_session_notes
        appointment.save()

        # Create notifications based on status change
        if new_status != old_status:
            if new_status == "Cancelled":
                # Notify patient
                Notification.objects.create(
                    user=appointment.patientId,
                    title="Appointment Cancelled",
                    message=f"Your appointment with {appointment.therapistId.username} scheduled for {appointment.appointmentDateTime.strftime('%d/%b/%Y at %I:%M %p')} has been cancelled.",
                    notification_type='appointment',
                    related_id=appointment.appointment_code
                )
                # Notify therapist
                Notification.objects.create(
                    user=appointment.therapistId,
                    title="Appointment Cancelled",
                    message=f"The appointment with {appointment.patientId.username} scheduled for {appointment.appointmentDateTime.strftime('%d/%b/%Y at %I:%M %p')} has been cancelled.",
                    notification_type='appointment',
                    related_id=appointment.appointment_code
                )
            elif new_status == "Completed":
                # Notify patient
                Notification.objects.create(
                    user=appointment.patientId,
                    title="Appointment Completed",
                    message=f"Your appointment with {appointment.therapistId.username} has been marked as completed.",
                    notification_type='appointment',
                    related_id=appointment.appointment_code
                )
                # Notify therapist
                Notification.objects.create(
                    user=appointment.therapistId,
                    title="Appointment Completed",
                    message=f"The appointment with {appointment.patientId.username} has been marked as completed.",
                    notification_type='appointment',
                    related_id=appointment.appointment_code
                )

        serializer = AppointmentSerializer(appointment)
        return Response(
            {
                "message": f"Appointment {new_status} successfully",
                "appointment": serializer.data
            },
            status=status.HTTP_200_OK
        )

    except Exception as e:
        return Response(
            {"error": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['GET'])
def therapist_all_appointments(request):
    therapist_id = request.GET.get("therapist_id")

    if not therapist_id:
        return Response({"error": "Missing therapist_id"}, status=status.HTTP_400_BAD_REQUEST)

    # Fetch all appointments from now onward
    appointments = Appointment.objects.filter(
        therapistId__id=therapist_id,
        appointmentDateTime__gte=now()
    ).order_by("appointmentDateTime")

    serializer = AppointmentSerializer(appointments, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
def get_patient_history(request):
    try:
        # Get query parameters
        search_query = request.GET.get('search', '')
        
        # Get all patients with their related user data and medical histories
        patients = Patient.objects.select_related('user').prefetch_related(
            'user__medical_histories'
        ).all()
        
        # Apply search filter if provided
        if search_query:
            patients = patients.filter(
                Q(user__username__icontains=search_query) |
                Q(user__ic__icontains=search_query) |
                Q(user__email__icontains=search_query)
            )
        
        # Serialize the data
        serializer = PatientHistorySerializer(patients, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_patient_detail(request, patient_id):
    try:
        print(f"Fetching patient detail for ID: {patient_id}, type: {type(patient_id)}")
        
        # Try to get patient by user ID first (string ID like P2506001)
        try:
            patient = Patient.objects.select_related('user').prefetch_related(
                'user__medical_histories'
            ).get(user__id=patient_id)
        except Patient.DoesNotExist:
            # If not found by user ID, try by patient ID (numeric)
            try:
                patient = Patient.objects.select_related('user').prefetch_related(
                    'user__medical_histories'
                ).get(id=patient_id)
            except Patient.DoesNotExist:
                print(f"Patient not found with ID: {patient_id}")
                return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = PatientHistorySerializer(patient)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error fetching patient detail: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def add_medical_history(request, patient_id):
    try:
        # Try to get patient by user ID first (string ID like P2506001)
        try:
            patient = Patient.objects.get(user__id=patient_id)
        except Patient.DoesNotExist:
            # If not found by user ID, try by patient ID (numeric)
            try:
                patient = Patient.objects.get(id=patient_id)
            except Patient.DoesNotExist:
                return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        
        user = patient.user
        
        # Get form data
        data = request.data
        
        # Create medical history record
        medical_history = MedicalHistory.objects.create(
            patient_id=user,
            recorded_by_id=request.user if request.user.is_authenticated else None,
            past_medical_history=data.get('past_medical_history', ''),
            surgical_history=data.get('surgical_history', ''),
            family_history=data.get('family_history', ''),
            medications=data.get('medications', ''),
            allergies=data.get('allergies', ''),
            notes=data.get('notes', '')
        )
        
        # Serialize and return the created record
        serializer = MedicalHistorySerializer(medical_history)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error adding medical history: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
def update_medical_history(request, history_id):
    try:
        # Get the medical history record
        medical_history = MedicalHistory.objects.get(id=history_id)
        
        # Get form data
        data = request.data
        
        # Update medical history record
        medical_history.past_medical_history = data.get('past_medical_history', medical_history.past_medical_history)
        medical_history.surgical_history = data.get('surgical_history', medical_history.surgical_history)
        medical_history.family_history = data.get('family_history', medical_history.family_history)
        medical_history.medications = data.get('medications', medical_history.medications)
        medical_history.allergies = data.get('allergies', medical_history.allergies)
        medical_history.notes = data.get('notes', medical_history.notes)
        medical_history.save()
        
        # Serialize and return the updated record
        serializer = MedicalHistorySerializer(medical_history)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except MedicalHistory.DoesNotExist:
        return Response({'error': 'Medical history record not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error updating medical history: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_patients(request):
    try:
        patients = CustomUser.objects.filter(role='patient', status=True)
        
        data = [{
            'id': patient.id,
            'username': patient.username,
            'first_name': patient.first_name,
            'last_name': patient.last_name,
            'gender': patient.gender,
            'contact_number': patient.contact_number,
            'email': patient.email,
            'status': patient.status
        } for patient in patients]
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def check_patients_treatment_status(request):
    """Check if patients have active treatment today"""
    try:
        from datetime import date
        
        today = date.today()
        
        # Get all active treatments where today is between start_date and end_date
        # Also handle cases where end_date might be None (ongoing treatment)
        active_treatments = Treatment.objects.filter(
            is_active=True,
            start_date__lte=today
        ).filter(
            Q(end_date__gte=today) | Q(end_date__isnull=True)
        ).select_related('patient_id')
        
        # Create a set of patient IDs who have active treatments
        patients_with_treatment = set(
            treatment.patient_id.id for treatment in active_treatments if treatment.patient_id
        )
        
        # Return as list for easier frontend consumption
        return Response(list(patients_with_treatment), status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def therapist_month_appointments(request):
    therapist_id = request.GET.get("therapist_id")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    if not all([therapist_id, start_date, end_date]):
        return Response(
            {"error": "Missing required parameters"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # 获取指定日期范围内的所有预约
        appointments = Appointment.objects.filter(
            therapistId__id=therapist_id,
            appointmentDateTime__date__range=[start_date, end_date]
        ).order_by('appointmentDateTime')

        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class NotificationListCreateView(generics.ListCreateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.AllowAny]  # 允许所有请求，但我们会在视图中处理认证

    def get_queryset(self):
        user_id = self.request.headers.get('X-User-ID')
        if not user_id:
            return Notification.objects.none()
        try:
            user = CustomUser.objects.get(id=user_id)
            return Notification.objects.filter(user=user).order_by('-created_at')
        except CustomUser.DoesNotExist:
            return Notification.objects.none()

    def perform_create(self, serializer):
        user_id = self.request.headers.get('X-User-ID')
        try:
            user = CustomUser.objects.get(id=user_id)
            serializer.save(user=user)
        except CustomUser.DoesNotExist:
            raise ValidationError('User not found')

    def get(self, request, *args, **kwargs):
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return Response({'error': 'X-User-ID header is required'}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            unread_count = queryset.filter(is_read=False).count()
            
            return Response({
                'notifications': serializer.data,
                'unread_count': unread_count
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class NotificationMarkReadView(generics.UpdateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.AllowAny]  # 允许所有请求，但我们会在视图中处理认证
    
    def get_queryset(self):
        user_id = self.request.headers.get('X-User-ID')
        if not user_id:
            return Notification.objects.none()
        try:
            user = CustomUser.objects.get(id=user_id)
            return Notification.objects.filter(user=user)
        except CustomUser.DoesNotExist:
            return Notification.objects.none()

    def patch(self, request, *args, **kwargs):
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return Response({'error': 'X-User-ID header is required'}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            if kwargs.get('pk') == 'all':
                self.get_queryset().filter(is_read=False).update(is_read=True)
                return Response({'status': 'All notifications marked as read'})
            
            notification = self.get_object()
            notification.is_read = True
            notification.save()
            return Response({'status': 'Notification marked as read'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Treatment Management Views

# @api_view(['GET', 'POST'])
# def treatment_templates(request):
#     """Get all treatment templates or create a new one"""
#     try:
#         if request.method == 'GET':
#             # Return all templates for admin management (active + inactive)
#             templates = TreatmentTemplate.objects.all().prefetch_related('template_exercises__exercise_id')
#             
#             data = []
#             for template in templates:
#                 template_exercises = []
#                 for te in template.template_exercises.all():
#                     template_exercises.append({
#                         'exercise_id': str(te.exercise_id.exercise_id),
#                         'exercise_name': te.exercise_id.name,
#                         'body_part': te.exercise_id.body_part,
#                         'default_target_metrics': te.default_target_metrics,
#                         'default_repetitions': te.default_repetitions,
#                         'default_sets': te.default_sets,
#                         'default_pain_threshold': te.default_pain_threshold,
#                         'order_in_template': te.order_in_template,
#                         'is_required': te.is_required,
#                     })
#                 
#                 data.append({
#                     'template_id': str(template.template_id),
#                     'name': template.name,
#                     'treatment_type': template.treatment_type,
#                     'treatment_subtype': template.treatment_subtype,
#                     'condition': template.condition,
#                     'description': template.description,
#                     'default_frequency': template.default_frequency,
#                     'estimated_duration_weeks': template.estimated_duration_weeks,
#                     'is_active': template.is_active,
#                     'exercises': template_exercises,
#                 })
#             
#             return Response(data, status=status.HTTP_200_OK)
#             
#         elif request.method == 'POST':
#             data = request.data
#             
#             # Get the therapist creating the template
#             created_by = None
#             if 'created_by' in data:
#                 created_by = get_object_or_404(CustomUser, id=data['created_by'], role='therapist')
#             
#             template = TreatmentTemplate.objects.create(
#                 name=data.get('name', 'Unnamed Template'),
#                 treatment_type=data.get('treatment_type'),
#                 treatment_subtype=data.get('treatment_subtype'),
#                 condition=data.get('condition'),
#                 description=data.get('description', ''),
#                 default_frequency=data.get('default_frequency', ''),
#                 estimated_duration_weeks=data.get('estimated_duration_weeks', 4),
#                 is_active=data.get('is_active', True),
#                 created_by=created_by,
#             )
#             
#             return Response({
#                 'template_id': str(template.template_id),
#                 'message': 'Template created successfully'
#             }, status=status.HTTP_201_CREATED)
#             
#     except Exception as e:
#         return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# @api_view(['GET', 'PUT', 'DELETE'])
# def treatment_template_detail(request, template_id):
#     """Get, update, or delete a specific treatment template with exercises"""
#     try:
#         template = TreatmentTemplate.objects.prefetch_related('template_exercises__exercise_id').get(template_id=template_id)
#         
#         if request.method == 'GET':
#             template_exercises = []
#             for te in template.template_exercises.all():
#                 template_exercises.append({
#                     'exercise_id': str(te.exercise_id.exercise_id),
#                     'exercise_name': te.exercise_id.name,
#                     'body_part': te.exercise_id.body_part,
#                     'default_target_metrics': te.default_target_metrics,
#                     'default_repetitions': te.default_repetitions,
#                     'default_sets': te.default_sets,
#                     'default_pain_threshold': te.default_pain_threshold,
#                     'order_in_template': te.order_in_template,
#                     'is_required': te.is_required,
#                 })
#             
#             data = {
#                 'template_id': str(template.template_id),
#                 'name': template.name,
#                 'treatment_type': template.treatment_type,
#                 'treatment_subtype': template.treatment_subtype,
#                 'condition': template.condition,
#                 'description': template.description,
#                 'default_frequency': template.default_frequency,
#                 'estimated_duration_weeks': template.estimated_duration_weeks,
#                 'is_active': template.is_active,
#                 'exercises': template_exercises,
#             }
#             
#             return Response(data, status=status.HTTP_200_OK)
#             
#         elif request.method == 'PUT':
#             data = request.data
#             
#             # Update fields if provided
#             if 'name' in data:
#                 template.name = data['name']
#             if 'treatment_type' in data:
#                 template.treatment_type = data['treatment_type']
#             if 'treatment_subtype' in data:
#                 template.treatment_subtype = data['treatment_subtype']
#             if 'condition' in data:
#                 template.condition = data['condition']
#             if 'description' in data:
#                 template.description = data['description']
#             if 'default_frequency' in data:
#                 template.default_frequency = data['default_frequency']
#             if 'estimated_duration_weeks' in data:
#                 template.estimated_duration_weeks = data['estimated_duration_weeks']
#             if 'is_active' in data:
#                 template.is_active = data['is_active']
#                 
#             template.save()
#             
#             return Response({'message': 'Template updated successfully'}, status=status.HTTP_200_OK)
#             
#         elif request.method == 'DELETE':
#             template.is_active = False  # Soft delete
#             template.save()
#             return Response({'message': 'Template deleted successfully'}, status=status.HTTP_200_OK)
#             
#     except TreatmentTemplate.DoesNotExist:
#         return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
#     except Exception as e:
#         return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])
def treatments(request):
    """Get all treatments or create a new treatment plan"""
    try:
        if request.method == 'GET':
            # Support filtering by patient_id
            patient_id = request.GET.get('patient_id')
            if patient_id:
                # Explicitly filter by patient_id using the ForeignKey's id field
                treatments = Treatment.objects.filter(patient_id__id=patient_id).select_related('patient_id', 'therapist_id').order_by('-created_at')
            else:
                treatments = Treatment.objects.all().select_related('patient_id', 'therapist_id').order_by('-created_at')
            
            data = []
            for treatment in treatments:
                # Get exercise count
                exercise_count = TreatmentExercise.objects.filter(treatment_id=treatment.treatment_id).count()
                
                data.append({
                    'treatment_id': str(treatment.treatment_id),
                    'patient_name': treatment.patient_id.username if treatment.patient_id else 'Unknown',
                    'patient_id': treatment.patient_id.id if treatment.patient_id else '',
                    'therapist_name': treatment.therapist_id.username if treatment.therapist_id else 'Unknown',
                    'therapist_id': treatment.therapist_id.id if treatment.therapist_id else '',
                    'name': treatment.name,
                    'is_active': treatment.is_active,
                    'start_date': treatment.start_date,
                    'end_date': treatment.end_date,
                    'goal_notes': treatment.goal_notes,
                    'created_at': treatment.created_at,
                    'exercise_count': exercise_count,
                })
            
            return Response(data, status=status.HTTP_200_OK)
            
        elif request.method == 'POST':
            data = request.data
            
            # Get patient and therapist
            patient = get_object_or_404(CustomUser, id=data.get('patient_id'), role='patient')
            therapist = get_object_or_404(CustomUser, id=data.get('therapist_id'), role='therapist')
            
            # Create treatment
            # Determine is_active: use is_active if provided, otherwise check status field for backward compatibility
            is_active_value = data.get('is_active', True) if 'is_active' in data else (True if data.get('status') == 'active' else True)
            
            treatment = Treatment.objects.create(
                patient_id=patient,
                therapist_id=therapist,
                name=data.get('name', 'Unnamed Treatment'),
                start_date=data.get('start_date'),
                end_date=data.get('end_date'),
                goal_notes=data.get('goal_notes'),
                is_active=is_active_value,
            )
            
            return Response({
                'treatment_id': str(treatment.treatment_id),
                'message': 'Treatment created successfully'
            }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_treatment(request):
    """Create a new treatment plan"""
    try:
        data = request.data
        print(f"DEBUG: Creating treatment with data: {data}")  # Debug log
        
        # Get patient and therapist
        patient = get_object_or_404(CustomUser, id=data.get('patient_id'), role='patient')
        # Allow admin or therapist to create treatment plans
        therapist = get_object_or_404(CustomUser, id=data.get('therapist_id'), role__in=['therapist', 'admin'])
        
        # If creating an active treatment, deactivate any existing active treatments for this patient
        is_active = data.get('is_active', True) if 'is_active' in data else (True if data.get('status') == 'active' else False)
        if is_active:
            Treatment.objects.filter(
                patient_id=patient,
                is_active=True
            ).update(is_active=False)
        
        # Get created_by - the user who is creating this treatment (admin or therapist)
        created_by_id = data.get('created_by')
        created_by = None
        if created_by_id:
            try:
                created_by = CustomUser.objects.get(id=created_by_id)
            except CustomUser.DoesNotExist:
                pass  # If created_by user doesn't exist, leave it as None
        
        # Create treatment
        # Determine is_active: use is_active if provided, otherwise check status field for backward compatibility
        is_active_value = data.get('is_active', True) if 'is_active' in data else (True if data.get('status') == 'active' else True)
        
        treatment = Treatment.objects.create(
            patient_id=patient,
            therapist_id=therapist,
            name=data.get('name', 'Unnamed Treatment'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            goal_notes=data.get('goal_notes'),
            is_active=is_active_value,
            created_by=created_by,  # Record who created this treatment
        )
        print(f"DEBUG: Treatment created successfully: {treatment.treatment_id}")  # Debug log
        
        return Response({
            'treatment_id': str(treatment.treatment_id),
            'message': 'Treatment created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"DEBUG: Error creating treatment: {str(e)}")  # Debug log
        import traceback
        traceback.print_exc()  # Print full error stack
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def patient_treatments(request, patient_id):
    """Get active treatment for a patient (only one active treatment at a time)"""
    try:
        treatments = Treatment.objects.filter(
            patient_id=patient_id, 
            is_active=True
        ).select_related('therapist_id').order_by('-created_at')
        
        data = []
        for treatment in treatments:
            # Get exercise count
            exercise_count = TreatmentExercise.objects.filter(treatment_id=treatment.treatment_id).count()
            
            data.append({
                'treatment_id': str(treatment.treatment_id),
                'name': treatment.name,
                'is_active': treatment.is_active,
                'start_date': treatment.start_date,
                'end_date': treatment.end_date,
                'goal_notes': treatment.goal_notes,
                'created_at': treatment.created_at,
                'therapist_name': treatment.therapist_id.username if treatment.therapist_id else 'Unknown',
                'therapist_contact': treatment.therapist_id.contact_number if treatment.therapist_id else None,
                'exercise_count': exercise_count,
            })
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def therapist_treatments(request, therapist_id):
    """Get all treatments for a therapist"""
    try:
        treatments = Treatment.objects.filter(therapist_id=therapist_id).select_related('patient_id')
        
        data = []
        for treatment in treatments:
            data.append({
                'treatment_id': str(treatment.treatment_id),
                'patient_name': treatment.patient_id.username,
                'patient_id': treatment.patient_id.id,
                'name': treatment.name,
                'is_active': treatment.is_active,
                'start_date': treatment.start_date,
                'end_date': treatment.end_date,
                'goal_notes': treatment.goal_notes,
                'created_at': treatment.created_at,
            })
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def treatment_exercises(request, treatment_id):
    """Get active exercises for a treatment (legacy endpoint)."""
    try:
        exercises = (
            TreatmentExercise.objects
            .filter(treatment_id=treatment_id, is_active=True)
            .select_related('exercise_id')
            .order_by('order_in_treatment')
        )
        
        data = []
        for te in exercises:
            demo_video_url = te.exercise_id.demo_video_url if te.exercise_id and hasattr(te.exercise_id, 'demo_video_url') else None
            
            data.append({
                'treatment_exercise_id': str(te.treatment_exercise_id),
                'exercise_id': str(te.exercise_id.exercise_id) if te.exercise_id else None,
                'exercise_name': te.exercise_id.name if te.exercise_id else 'Custom Exercise',
                'instructions': te.exercise_id.instructions if te.exercise_id else '',
                'activity_name': te.exercise_id.activity_name if te.exercise_id else None,
                'reps_per_set': te.reps_per_set,
                'sets': te.sets,
                'duration': te.duration,
                'notes': te.notes,
                'order_in_treatment': te.order_in_treatment,
                'is_active': te.is_active,
                'start_date': te.start_date,
                'end_date': te.end_date,
                'demo_video_url': demo_video_url,
            })
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def treatment_exercises_all(request, treatment_id):
    """Get all exercises for a treatment, including inactive ones."""
    try:
        exercises = (
            TreatmentExercise.objects
            .filter(treatment_id=treatment_id)
            .select_related('exercise_id')
            .order_by('order_in_treatment')
        )
        
        data = []
        for te in exercises:
            demo_video_url = te.exercise_id.demo_video_url if te.exercise_id and hasattr(te.exercise_id, 'demo_video_url') else None
            
            data.append({
                'treatment_exercise_id': str(te.treatment_exercise_id),
                'exercise_id': str(te.exercise_id.exercise_id) if te.exercise_id else None,
                'exercise_name': te.exercise_id.name if te.exercise_id else 'Custom Exercise',
                'instructions': te.exercise_id.instructions if te.exercise_id else '',
                'activity_name': te.exercise_id.activity_name if te.exercise_id else None,
                'reps_per_set': te.reps_per_set,
                'sets': te.sets,
                'duration': te.duration,
                'notes': te.notes,
                'order_in_treatment': te.order_in_treatment,
                'is_active': te.is_active,
                'start_date': te.start_date,
                'end_date': te.end_date,
                'demo_video_url': demo_video_url,
            })
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_treatment_exercise(request):
    """Create a new exercise for a treatment or re-activate an existing one"""
    try:
        data = request.data
        treatment = get_object_or_404(Treatment, treatment_id=data.get('treatment_id'))
        exercise = get_object_or_404(Exercise, exercise_id=data.get('exercise_id'))
        
        def resolve_bool(value, default=True):
            if value is None:
                return default
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.strip().lower() in ('true', '1', 'yes', 'on')
            return bool(value)

        reps_per_set = data.get('reps_per_set')
        sets = data.get('sets', 1)
        duration = data.get('duration', 1)
        notes = data.get('notes')
        order_in_treatment = data.get('order_in_treatment', 1)
        is_active_flag = resolve_bool(data.get('is_active'), True)

        existing_te = TreatmentExercise.objects.filter(
            treatment_id=treatment,
            exercise_id=exercise
        ).first()

        if existing_te:
            existing_te.reps_per_set = reps_per_set
            existing_te.sets = sets
            existing_te.duration = duration
            existing_te.notes = notes
            existing_te.order_in_treatment = order_in_treatment
            existing_te.is_active = is_active_flag
            existing_te.save(update_fields=[
                'reps_per_set',
                'sets',
                'duration',
                'notes',
                'order_in_treatment',
                'is_active'
            ])

            return Response({
                'exercise_id': str(existing_te.treatment_exercise_id),
                'message': 'Existing treatment exercise re-activated'
            }, status=status.HTTP_200_OK)
        
        treatment_exercise = TreatmentExercise.objects.create(
            treatment_id=treatment,
            exercise_id=exercise,
            reps_per_set=reps_per_set,
            sets=sets,
            duration=duration,
            notes=notes,
            order_in_treatment=order_in_treatment,
            is_active=is_active_flag,
        )
        
        return Response({
            'exercise_id': str(treatment_exercise.treatment_exercise_id),
            'message': 'Treatment exercise created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def save_exercise_record(request):
    """Save exercise completion record to database"""
    try:
        print("\n" + "=" * 80)
        print("🔔 API CALLED: save_exercise_record")
        print("=" * 80)
        
        data = request.data
        print(f"📥 Received data: {data}")
        
        # Get required fields
        treatment_exercise_id = data.get('treatment_exercise_id')
        patient_id = data.get('patient_id')
        
        print(f"🔍 treatment_exercise_id: {treatment_exercise_id}")
        print(f"🔍 patient_id: {patient_id}")
        
        if not treatment_exercise_id or not patient_id:
            print("❌ ERROR: Missing required fields")
            return Response({'error': 'treatment_exercise_id and patient_id are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Get related objects
        print(f"🔍 Looking up TreatmentExercise with ID: {treatment_exercise_id}")
        try:
            treatment_exercise = get_object_or_404(TreatmentExercise, treatment_exercise_id=treatment_exercise_id)
            print(f"✅ Found TreatmentExercise: {treatment_exercise}")
        except Exception as e:
            print(f"❌ ERROR finding TreatmentExercise: {e}")
            raise
        
        print(f"🔍 Looking up Patient with ID: {patient_id}")
        try:
            patient = get_object_or_404(CustomUser, id=patient_id)
            print(f"✅ Found Patient: {patient.username}")
        except Exception as e:
            print(f"❌ ERROR finding Patient: {e}")
            raise
        
        # Parse datetime strings if provided
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        print(f"🔍 Parsing start_time: {start_time}")
        print(f"🔍 Parsing end_time: {end_time}")
        
        if start_time:
            start_time = parse_datetime(start_time)
            if start_time and timezone.is_naive(start_time):
                start_time = make_aware(start_time, timezone=timezone.get_current_timezone())
            print(f"✅ Parsed start_time: {start_time}")
        if end_time:
            end_time = parse_datetime(end_time)
            if end_time and timezone.is_naive(end_time):
                end_time = make_aware(end_time, timezone=timezone.get_current_timezone())
            print(f"✅ Parsed end_time: {end_time}")
        
        # Get repetition_times and smoothness metrics
        repetition_times = data.get('repetition_times', [])
        rep_sparc_scores = data.get('rep_sparc_scores', [])
        rep_rom_scores = data.get('rep_rom_scores', [])
        
        # Prepare record data for printing/logging
        print("📝 Preparing record data for printing...")
        record_data = {
            'treatment_exercise_id': str(treatment_exercise_id),
            'patient_id': str(patient_id),
            'repetitions_completed': data.get('repetitions_completed', 0),
            'sets_completed': data.get('sets_completed', 0),
            'start_time': start_time.isoformat() if start_time else None,
            'end_time': end_time.isoformat() if end_time else None,
            'total_duration': data.get('total_duration'),
            'pause_count': data.get('pause_count', 0),
            'repetition_times': repetition_times,
            'rep_sparc_scores': rep_sparc_scores,
            'rep_rom_scores': rep_rom_scores,
        }
        
        # Print exercise record data to terminal (for testing)
        print("=" * 80)
        print("📊 EXERCISE RECORD DATA (Saving to database):")
        print("=" * 80)
        print(json.dumps(record_data, indent=2, ensure_ascii=False))
        print("=" * 80)
        print("✅ Data logged successfully\n")
        
        target_reps_per_set = treatment_exercise.reps_per_set
        target_sets = treatment_exercise.sets
        target_duration_minutes = treatment_exercise.duration
        
        with transaction.atomic():
            exercise_record = ExerciseRecord.objects.create(
                treatment_exercise_id=treatment_exercise,
                patient_id=patient,
                repetitions_completed=data.get('repetitions_completed', 0),
                sets_completed=data.get('sets_completed', 0),
                target_reps_per_set=target_reps_per_set,
                target_sets=target_sets,
                target_duration_minutes=target_duration_minutes,
                start_time=start_time,
                end_time=end_time,
                total_duration=data.get('total_duration'),
                pause_count=data.get('pause_count', 0),
                repetition_times=repetition_times or [],
                rep_sparc_scores=rep_sparc_scores or [],
                rep_rom_scores=rep_rom_scores or []
            )
            print("💾 ExerciseRecord saved with ID:", exercise_record.record_id)
        
        return Response({
            'message': 'Exercise record saved successfully',
            'record_id': str(exercise_record.record_id)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print("=" * 80)
        print("❌ ERROR in save_exercise_record:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print("Traceback:")
        print(traceback.format_exc())
        print("=" * 80)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_patient_exercise_records(request):
    """Return aggregated exercise record summary grouped by patient"""
    try:
        records = ExerciseRecord.objects.select_related(
            'patient_id',
            'treatment_exercise_id',
            'treatment_exercise_id__exercise_id',
            'treatment_exercise_id__treatment_id'
        ).order_by('-recorded_at')
        
        summaries = {}
        
        for record in records:
            patient = record.patient_id
            patient_key = str(patient.id)
            
            if patient_key not in summaries:
                summaries[patient_key] = {
                    'patient_id': patient_key,
                    'patient_name': patient.username,
                    'patient_email': patient.email,
                    'total_records': 0,
                    'total_repetitions': 0,
                    'total_sets': 0,
                    'total_duration': 0.0,
                    'last_recorded_at': None,
                    'last_exercise_name': None,
                    'treatments': {}
                }
            
            summary = summaries[patient_key]
            summary['total_records'] += 1
            summary['total_repetitions'] += record.repetitions_completed or 0
            summary['total_sets'] += record.sets_completed or 0
            summary['total_duration'] += record.total_duration or 0

            treatment = getattr(record.treatment_exercise_id, 'treatment_id', None)
            if treatment:
                treatment_key = str(treatment.treatment_id)
                if treatment_key not in summary['treatments']:
                    summary['treatments'][treatment_key] = {
                        'treatment_id': treatment_key,
                        'treatment_name': treatment.name,
                        'start_date': treatment.start_date.isoformat() if treatment.start_date else None,
                        'end_date': treatment.end_date.isoformat() if treatment.end_date else None,
                        'is_active': treatment.is_active,
                        'completed_dates': set()
                    }
                completion_date = record.start_time or record.recorded_at
                if completion_date:
                    summary['treatments'][treatment_key]['completed_dates'].add(completion_date.date().isoformat())
            
            if summary['last_recorded_at'] is None or record.recorded_at > summary['last_recorded_at']:
                summary['last_recorded_at'] = record.recorded_at
                exercise = getattr(record.treatment_exercise_id, 'exercise_id', None)
                summary['last_exercise_name'] = exercise.name if exercise else None
        
        # Convert to list sorted by last_recorded_at desc
        summary_list = sorted(
            summaries.values(),
            key=lambda item: item['last_recorded_at'] or now(),
            reverse=True
        )
        
        # Serialize datetime fields and sets
        for item in summary_list:
            if item['last_recorded_at']:
                item['last_recorded_at'] = item['last_recorded_at'].isoformat()
            treatments = []
            for treatment in item['treatments'].values():
                treatment['completed_dates'] = sorted(list(treatment['completed_dates']))
                treatments.append(treatment)
            item['treatments'] = treatments
        
        return Response(summary_list, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def patient_report_summary(request):
    """Return enriched patient exercise report data for therapist dashboard"""
    try:
        patients = CustomUser.objects.filter(role='patient').order_by('username')
        
        # Use serializer to get data
        serializer = PatientReportSummarySerializer(patients, many=True)
        serializer_data = serializer.data
        
        # Transform serializer data to match frontend expected format
        results = []
        for item in serializer_data:
            # Convert flat structure to nested structure for frontend
            results.append({
                'patient_id': item['patient_id'],
                'patient_name': item['patient_name'],
                'phone': item['phone'],
                'today_status': {
                    'state': item['today_status_state'],
                    'message': item['today_status_message']
                },
                'last_recorded_at': item['last_recorded_at'],
                'treatment': {
                    'has_treatment': item['treatment_has_treatment'],
                    'completed_days': item['treatment_completed_days'],
                    'completion_rate': item['treatment_completion_rate'],
                    'avg_rep_duration': item['treatment_avg_rep_duration'],
                    'consistency_score': item['treatment_consistency_score']
                }
            })
        
        return Response(results, status=status.HTTP_200_OK)
    
    except Exception as e:
        print("Error building patient report summary:", e)
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def patient_exercise_records(request, patient_id):
    """Return detailed exercise records for a given patient"""
    try:
        # Start with base query
        records = ExerciseRecord.objects.filter(
            patient_id__id=patient_id
        ).select_related(
            'treatment_exercise_id',
            'treatment_exercise_id__exercise_id',
            'treatment_exercise_id__treatment_id'
        )
        
        # Filter by date range if provided
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        if start_date:
            from django.utils import timezone
            from datetime import datetime
            try:
                start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                records = records.filter(recorded_at__gte=start_datetime)
            except ValueError:
                pass  # Invalid date format, ignore
        
        if end_date:
            from django.utils import timezone
            from datetime import datetime
            try:
                end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                records = records.filter(recorded_at__lte=end_datetime)
            except ValueError:
                pass  # Invalid date format, ignore
        
        records = records.order_by('-recorded_at')
        
        data = []
        for record in records:
            exercise = getattr(record.treatment_exercise_id, 'exercise_id', None)
            treatment = getattr(record.treatment_exercise_id, 'treatment_id', None)
            
            # Calculate avg_duration from repetition_times
            avg_dur = calculate_avg_duration(record)
            
            data.append({
                'record_id': str(record.record_id),
                'treatment_id': str(treatment.treatment_id) if treatment else None,
                'treatment_name': treatment.name if treatment else None,
                'exercise_name': exercise.name if exercise else None,
                'repetitions_completed': record.repetitions_completed,
                'sets_completed': record.sets_completed,
                'start_time': record.start_time.isoformat() if record.start_time else None,
                'end_time': record.end_time.isoformat() if record.end_time else None,
                'total_duration': record.total_duration,
                'pause_count': record.pause_count,
                'avg_duration': avg_dur,
                'repetition_times': record.repetition_times,
                'rep_sparc_scores': record.rep_sparc_scores if record.rep_sparc_scores else [],
                'rep_rom_scores': record.rep_rom_scores if record.rep_rom_scores else [],
                'recorded_at': record.recorded_at.isoformat() if record.recorded_at else None,
            })
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def patient_report_detail(request, patient_id):
    """Return comprehensive patient report detail including patient info, active treatment, previous treatment, and exercise records"""
    try:
        # Get patient
        patient = get_object_or_404(CustomUser, id=patient_id, role='patient')
        
        # Get active treatment
        # Step 1: Get all active treatments
        today = timezone.localdate()
        active_treatments = Treatment.objects.filter(
            patient_id=patient,
            is_active=True
        ).order_by('-created_at')
        
        active_treatment = None
        
        # Step 2: Find treatment within current date range
        for treatment in active_treatments:
            start_date = treatment.start_date
            end_date = treatment.end_date
            
            # Check if today is within date range
            in_range = True
            if start_date and start_date > today:
                in_range = False
            if end_date and end_date < today:
                in_range = False
            
            if in_range:
                # Found treatment within current date range
                active_treatment = treatment
                break
        
        # Step 3: If no treatment in current date range, find the latest non-future active treatment
        if not active_treatment:
            for treatment in active_treatments:
                start_date = treatment.start_date
                # Exclude future treatments (start_date > today)
                if not start_date or start_date <= today:
                    active_treatment = treatment
                    break
        
        # Get previous treatment (most recent inactive treatment)
        previous_treatment = Treatment.objects.filter(
            patient_id=patient,
            is_active=False
        ).order_by('-created_at').first()
        
        # Get all exercise records for this patient
        records = ExerciseRecord.objects.filter(
            patient_id=patient
        ).select_related(
            'treatment_exercise_id',
            'treatment_exercise_id__exercise_id',
            'treatment_exercise_id__treatment_id'
        ).order_by('-recorded_at')
        
        # Calculate completion days and rate for active treatment
        completed_days = 0
        should_completed_days = 0
        sessions_completion_rate = None
        total_reps_completed = 0
        should_completed_reps = 0
        reps_completion_rate = None
        avg_rep_duration = None
        consistency_score = None
        avg_fatigue_index = None
        last_exercise_date = None
        
        if active_treatment:
            # Get records for active treatment
            active_treatment_records = records.filter(
                treatment_exercise_id__treatment_id=active_treatment
            )
            
            # Calculate total reps completed for active treatment
            total_reps_completed = active_treatment_records.aggregate(
                total=Sum('repetitions_completed')
            )['total'] or 0
            
            # Calculate unique dates with records (completed days)
            completed_dates_list = []
            if active_treatment_records.exists():
                unique_dates = active_treatment_records.annotate(
                    date=TruncDate('start_time')
                ).values('date').distinct()
                # Use set() to ensure true uniqueness
                completed_dates_set = set(item['date'] for item in unique_dates if item['date'])
                completed_dates_list = sorted(list(completed_dates_set))
                completed_days = len(completed_dates_list)
                
                # Debug: Print completed dates
                print("=" * 80)
                print("🔍 COMPLETED DAYS DEBUG:")
                print(f"Active Treatment: {active_treatment.name}")
                print(f"Start Date: {active_treatment.start_date}")
                print(f"Completed dates list: {completed_dates_list}")
                print(f"Completed days count: {completed_days}")
                print("=" * 80)
            
            # Calculate should completed reps based on dates that have exercise records
            should_completed_reps = 0
            if completed_dates_list:
                # Get all exercises for this treatment
                treatment_exercises = TreatmentExercise.objects.filter(
                    treatment_id=active_treatment.treatment_id,
                    is_active=True
                )
                
                # Calculate target reps for each date that has records
                for record_date in completed_dates_list:
                    daily_target_reps = 0
                    for exercise in treatment_exercises:
                        # Check if exercise is scheduled for this date
                        exercise_start = exercise.start_date
                        exercise_end = exercise.end_date
                        if exercise_start and exercise_start > record_date:
                            continue
                        if exercise_end and exercise_end < record_date:
                            continue
                        
                        # Add reps for this exercise on this date
                        sets = exercise.sets or 0
                        reps_per_set = exercise.reps_per_set or 0
                        daily_target_reps += sets * reps_per_set
                    
                    should_completed_reps += daily_target_reps
                
                # Calculate reps completion rate
                if should_completed_reps > 0:
                    reps_completion_rate = (total_reps_completed / should_completed_reps) * 100
            
            # Calculate average rep duration
            avg_durations = []
            for record in active_treatment_records:
                avg_dur = calculate_avg_duration(record)
                if avg_dur is not None and avg_dur > 0:
                    avg_durations.append(avg_dur)
            
            if avg_durations:
                avg_rep_duration = round(sum(avg_durations) / len(avg_durations), 2)
            
            # Calculate consistency score using SPARC (Consistency = 1 - CV(SPARC))
            sparc_values = []
            for record in active_treatment_records:
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
                    consistency_score = round(consistency_score, 3)
            
            # Calculate average fatigue index using ROM: FI = (ROM_first - ROM_last) / ROM_first
            session_fatigue_indices = []
            for record in active_treatment_records:
                if record.rep_rom_scores and isinstance(record.rep_rom_scores, list) and len(record.rep_rom_scores) >= 2:
                    try:
                        rom_scores = [
                            float(score) for score in record.rep_rom_scores
                            if isinstance(score, (int, float)) and score is not None and score >= 0
                        ]

                        if len(rom_scores) >= 2:
                            mid_point = len(rom_scores) // 2
                            first_half = rom_scores[:mid_point]
                            second_half = rom_scores[mid_point:]
                    
                            if first_half and second_half:
                                        rom_first = statistics.mean(first_half)
                                        rom_last = statistics.mean(second_half)

                                # Calculate fatigue index for this session: FI = (ROM_first - ROM_last) / ROM_first
                                        if rom_first > 0:
                                            fatigue_index = ((rom_first - rom_last) / rom_first) * 100
                                            fatigue_index = max(0, fatigue_index)  # Ensure non-negative
                                            session_fatigue_indices.append(fatigue_index)
                    except Exception as e:
                        print(f"Error calculating fatigue index: {str(e)}")
                        continue
            
            # Calculate average fatigue index across all sessions
            if session_fatigue_indices:
                avg_fatigue_index = round(statistics.mean(session_fatigue_indices), 2)
            
            # Get last exercise date
            if active_treatment_records.exists():
                last_record = active_treatment_records.first()
                if last_record and last_record.start_time:
                    last_exercise_date = last_record.start_time
            else:
                last_exercise_date = None
            
            # Calculate should completed days (from start_date to today or end_date, whichever is earlier)
            start_date = active_treatment.start_date
            end_date = active_treatment.end_date if active_treatment.end_date else today
            effective_end_date = end_date if end_date <= today else today
            
            # Only calculate if today is within or after the treatment date range
            if start_date and effective_end_date and start_date <= effective_end_date:
                should_completed_days = (effective_end_date - start_date).days + 1
                
                # Debug: Print should completed days calculation
                print("=" * 80)
                print("🔍 SHOULD COMPLETED DAYS DEBUG:")
                print(f"Start Date: {start_date}")
                print(f"End Date: {end_date}")
                print(f"Today: {today}")
                print(f"Effective End Date: {effective_end_date}")
                print(f"Should Completed Days: {should_completed_days}")
                print(f"Calculation: ({effective_end_date} - {start_date}).days + 1 = {(effective_end_date - start_date).days} + 1 = {should_completed_days}")
                print("=" * 80)
                
                # Calculate sessions completion rate: (completed_days / should_completed_days) * 100
                if should_completed_days > 0:
                    sessions_completion_rate = (completed_days / should_completed_days) * 100
                    print("=" * 80)
                    print("🔍 COMPLETION RATE DEBUG:")
                    print(f"Sessions Completion Rate: {completed_days} / {should_completed_days} * 100 = {sessions_completion_rate}%")
                    print("=" * 80)
            else:
                # If treatment hasn't started yet (today < start_date), set to 0
                should_completed_days = 0
        else:
            # If no active treatment, get last exercise date from all records
            if records.exists():
                last_record = records.first()
                if last_record and last_record.start_time:
                    last_exercise_date = last_record.start_time
        
        # Build patient data
        patient_data = {
            'id': str(patient.id),
            'username': patient.username,
            'phone': patient.contact_number or '',
            'full_name': patient.get_full_name() if hasattr(patient, 'get_full_name') else patient.username,
        }
        
        # Build active treatment data
        active_treatment_data = None
        if active_treatment:
            # Get exercises for active treatment
            treatment_exercises = TreatmentExercise.objects.filter(
                treatment_id=active_treatment.treatment_id,
                is_active=True
            ).select_related('exercise_id').order_by('order_in_treatment')
            
            exercises_data = []
            for te in treatment_exercises:
                exercises_data.append({
                    'treatment_exercise_id': str(te.treatment_exercise_id),
                    'exercise_name': te.exercise_id.name if te.exercise_id else 'Custom Exercise',
                    'reps_per_set': te.reps_per_set,
                    'sets': te.sets,
                    'duration': te.duration,
                    'order_in_treatment': te.order_in_treatment,
                })
            
            active_treatment_data = {
                'treatment_id': str(active_treatment.treatment_id),
                'name': active_treatment.name,
                'start_date': active_treatment.start_date,
                'end_date': active_treatment.end_date,
                'exercises': exercises_data,
            }
        
        # Build previous treatment data
        previous_treatment_data = None
        if previous_treatment:
            previous_treatment_data = {
                'name': previous_treatment.name,
            }
        
        # Build records data
        records_data = []
        for record in records:
            records_data.append({
                'start_time': record.start_time,
                'recorded_at': record.recorded_at,
            })
        
        # Build exercise records data for table
        exercise_records_data = []
        for record in records:
            exercise = getattr(record.treatment_exercise_id, 'exercise_id', None)
            treatment = getattr(record.treatment_exercise_id, 'treatment_id', None)
            treatment_exercise = getattr(record, 'treatment_exercise_id', None)
            
            # Calculate consistency score for this record using SPARC
            consistency = None
            if record.rep_sparc_scores and isinstance(record.rep_sparc_scores, list) and len(record.rep_sparc_scores) >= 2:
                try:
                    sparc_values = [
                        abs(score)
                        for score in record.rep_sparc_scores
                        if isinstance(score, (int, float)) and score is not None
                    ]
                    if len(sparc_values) >= 2:
                        mean_sparc = statistics.mean(sparc_values)
                        if abs(mean_sparc) > 1e-6:
                            std_sparc = statistics.stdev(sparc_values)
                            cv = std_sparc / abs(mean_sparc)
                            consistency_value = max(0, min(1, 1 - cv))
                            consistency = round(consistency_value * 100, 1)
                except Exception:
                    pass
            
            # Calculate fatigue index for this record using ROM: FI = (ROM_first - ROM_last) / ROM_first
            fatigue = None
            if record.rep_rom_scores and isinstance(record.rep_rom_scores, list) and len(record.rep_rom_scores) >= 2:
                try:
                    rom_scores = [
                        float(score) for score in record.rep_rom_scores
                        if isinstance(score, (int, float)) and score is not None and score >= 0
                    ]
                    
                    if len(rom_scores) >= 2:
                        mid_point = len(rom_scores) // 2
                        first_half = rom_scores[:mid_point]
                        second_half = rom_scores[mid_point:]
                        
                        if first_half and second_half:
                            rom_first = statistics.mean(first_half)
                            rom_last = statistics.mean(second_half)
                            
                            if rom_first > 0:
                                fatigue_value = ((rom_first - rom_last) / rom_first) * 100
                                fatigue = round(max(0, fatigue_value), 1)  # Ensure non-negative
                except Exception:
                    pass
            
            # Send full datetime, let frontend format it in local timezone
            date_str = None
            if record.start_time:
                date_str = record.start_time.isoformat()
            
            # Calculate avg_time from repetition_times
            avg_time = calculate_avg_duration(record)
            if avg_time is not None:
                avg_time = round(avg_time, 2)
            
            # Use actual completed reps and sets (not calculated reps_per_set)
            # This handles cases where user stops mid-exercise correctly
            total_reps = record.repetitions_completed or 0
            sets = record.sets_completed or 0
            
            reps_to_complete = record.target_reps_per_set
            sets_to_complete = record.target_sets
            duration_set = record.target_duration_minutes

            if reps_to_complete is None and treatment_exercise:
                reps_to_complete = treatment_exercise.reps_per_set
            if sets_to_complete is None and treatment_exercise:
                sets_to_complete = treatment_exercise.sets
            if duration_set is None and treatment_exercise:
                duration_set = treatment_exercise.duration
            
            exercise_records_data.append({
                'record_id': str(record.record_id),
                'treatment_id': str(treatment.treatment_id) if treatment else None,
                'date': date_str,
                'exercise_name': exercise.name if exercise else 'Unknown Exercise',
                'reps': total_reps,  # Total reps completed (not per set)
                'sets': sets,  # Sets completed (may be partial)
                'avg_time': avg_time,
                'consistency': consistency,  # Already in percentage format (e.g., 95.8)
                'fatigue': fatigue,
                'pauses': record.pause_count or 0,
                'repetition_times': record.repetition_times if record.repetition_times else [],
                'rep_sparc_scores': record.rep_sparc_scores if record.rep_sparc_scores else [],
                'rep_rom_scores': record.rep_rom_scores if record.rep_rom_scores else [],
                'reps_to_complete': reps_to_complete,
                'sets_to_complete': sets_to_complete,
                'duration_set': duration_set,
            })
        
        # Build response data
        response_data = {
            'patient': patient_data,
            'active_treatment': active_treatment_data,
            'previous_treatment': previous_treatment_data,
            'completed_days': completed_days,
            'should_completed_days': should_completed_days,
            'sessions_completion_rate': sessions_completion_rate,
            'total_reps_completed': total_reps_completed,
            'should_completed_reps': should_completed_reps,
            'reps_completion_rate': reps_completion_rate,
            'avg_rep_duration': avg_rep_duration,
            'consistency_score': consistency_score,
            'avg_fatigue_index': avg_fatigue_index,
            'last_exercise_date': last_exercise_date,
            'exercise_records': exercise_records_data,
            'records': records_data,
        }
        
        # Use serializer to serialize the response
        serializer = PatientReportDetailSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
            
    except Exception as e:
        print(f"Error in patient_report_detail: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PATCH', 'DELETE'])
def treatment_detail(request, treatment_id):
    """Get, update, or delete a treatment"""
    try:
        treatment = get_object_or_404(Treatment, treatment_id=treatment_id)
        
        if request.method == 'GET':
            # Get exercise count
            exercise_count = TreatmentExercise.objects.filter(treatment_id=treatment.treatment_id).count()
            
            data = {
                'treatment_id': str(treatment.treatment_id),
                'patient_name': treatment.patient_id.username if treatment.patient_id else 'Unknown',
                'patient_id': treatment.patient_id.id if treatment.patient_id else '',
                'therapist_name': treatment.therapist_id.username if treatment.therapist_id else 'Unknown',
                'therapist_id': treatment.therapist_id.id if treatment.therapist_id else '',
                'name': treatment.name,
                'is_active': treatment.is_active,
                'start_date': treatment.start_date,
                'end_date': treatment.end_date,
                'goal_notes': treatment.goal_notes,
                'created_at': treatment.created_at,
                'exercise_count': exercise_count,
            }
            
            return Response(data, status=status.HTTP_200_OK)
            
        elif request.method == 'PATCH':
            data = request.data
            
            # Update fields if provided
            if 'name' in data:
                treatment.name = data['name']
            if 'is_active' in data:
                treatment.is_active = data['is_active']
            elif 'status' in data:
                # Backward compatibility: convert status to is_active
                treatment.is_active = (data['status'] == 'active')
            if 'therapist_id' in data:
                # Allow updating therapist (only admin should be able to do this)
                therapist = get_object_or_404(CustomUser, id=data['therapist_id'], role__in=['therapist', 'admin'])
                treatment.therapist_id = therapist
            if 'start_date' in data:
                treatment.start_date = data['start_date']
            if 'end_date' in data:
                treatment.end_date = data['end_date']
            if 'goal_notes' in data:
                treatment.goal_notes = data['goal_notes']
                
            treatment.save()
            
            return Response({'message': 'Treatment updated successfully'}, status=status.HTTP_200_OK)
            
        elif request.method == 'DELETE':
            treatment.delete()
            return Response({'message': 'Treatment deleted successfully'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PATCH'])
def update_treatment_exercise(request, exercise_id):
    """Update a treatment exercise"""
    try:
        exercise = get_object_or_404(TreatmentExercise, treatment_exercise_id=exercise_id)
        data = request.data
        
        # Update fields if provided
        if 'reps_per_set' in data:
            exercise.reps_per_set = data['reps_per_set']
        if 'sets' in data:
            exercise.sets = data['sets']
        if 'duration' in data:
            exercise.duration = data['duration']
        if 'notes' in data:
            exercise.notes = data['notes']
        if 'is_active' in data:
            exercise.is_active = data['is_active']
        if 'order_in_treatment' in data:
            exercise.order_in_treatment = data['order_in_treatment']
            
        exercise.save()
        
        return Response({'message': 'Treatment exercise updated successfully'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_treatment_exercise(request, exercise_id):
    """Delete a treatment exercise from a plan"""
    try:
        exercise = get_object_or_404(TreatmentExercise, treatment_exercise_id=exercise_id)
        exercise.delete()
        return Response({'message': 'Treatment exercise deleted successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_exercises(request):
    """Get all available exercises"""
    try:
        exercises = Exercise.objects.all().order_by('name')
        
        data = []
        for exercise in exercises:
            data.append({
                'exercise_id': str(exercise.exercise_id),
                'name': exercise.name,
                'instructions': exercise.instructions,
                'activity_name': exercise.activity_name,
                'demo_video_url': exercise.demo_video_url,
                'created_by_name': exercise.created_by.username if exercise.created_by else 'System',
            })
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_exercise(request):
    """Create a new exercise"""
    try:
        data = request.data
        
        # Validate required fields
        if not data.get('name') or data.get('name', '').strip() == '':
            return Response({'error': 'Exercise name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the user creating the exercise (admin or therapist)
        created_by = None
        if 'created_by' in data:
            created_by = get_object_or_404(CustomUser, id=data['created_by'], role__in=['therapist', 'admin'])
        
        exercise = Exercise.objects.create(
            name=data.get('name', 'Unnamed Exercise'),
            instructions=data.get('instructions', 'No instructions provided'),
            activity_name=data.get('activity_name'),
            created_by=created_by,
        )
        
        return Response({
            'exercise_id': str(exercise.exercise_id),
            'message': 'Exercise created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT', 'DELETE'])
def exercise_detail(request, exercise_id):
    """Get, update, or delete a specific exercise by ID"""
    try:
        exercise = get_object_or_404(Exercise, exercise_id=exercise_id)
        
        if request.method == 'GET':
            data = {
                'exercise_id': str(exercise.exercise_id),
                'exercise_name': exercise.name,
                'instructions': exercise.instructions,
                'activity_name': exercise.activity_name,
                'created_by_name': exercise.created_by.username if exercise.created_by else 'System',
            }
            return Response(data, status=status.HTTP_200_OK)
            
        elif request.method == 'PUT':
            data = request.data
            
            # Validate required fields
            if 'name' in data and (not data['name'] or data['name'].strip() == ''):
                return Response({'error': 'Exercise name is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update fields if provided
            if 'name' in data:
                exercise.name = data['name']
            if 'instructions' in data:
                exercise.instructions = data['instructions']
            if 'activity_name' in data:
                exercise.activity_name = data['activity_name'] or None
                
            exercise.save()
            
            return Response({'message': 'Exercise updated successfully'}, status=status.HTTP_200_OK)
            
        elif request.method == 'DELETE':
            exercise.delete()  # Hard delete
            return Response({'message': 'Exercise deleted successfully'}, status=status.HTTP_200_OK)
            
    except Exercise.DoesNotExist:
        return Response({'error': 'Exercise not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

import numpy as np
import cv2

from .yolo_model import predict_pose_opencv
from .movement_counter import MovementCounter

counter = MovementCounter()

@api_view(['POST'])
@parser_classes([MultiPartParser])
def detect_pose(request):
    try:
        frame = request.FILES.get("frame")
        if not frame:
            return Response({"error": "Missing frame"}, status=400)

        img_array = np.frombuffer(frame.read(), np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        print(f"Processing image of shape: {image.shape}")

        keypoints = predict_pose_opencv(image)
        if keypoints is None:
            print("No person detected")
            return Response({"message": "No person detected", "count": counter.count})

        print(f"Keypoints detected: {keypoints.shape}")
        
        # Print some keypoint values for debugging
        if keypoints.shape[0] >= 17:
            left_shoulder = keypoints[5]
            right_shoulder = keypoints[6]
            left_elbow = keypoints[7]
            right_elbow = keypoints[8]
            print(f"Left shoulder: {left_shoulder}, Right shoulder: {right_shoulder}")
            print(f"Left elbow: {left_elbow}, Right elbow: {right_elbow}")
        
        count = counter.update(keypoints)
        print(f"Current count: {count}")
        
        return Response({
            "message": "OK", 
            "count": count,
            "keypoints_shape": keypoints.shape if keypoints is not None else None,
            "keypoints": keypoints.tolist() if keypoints is not None else None,
            "debug_info": {
                "left_shoulder": keypoints[5].tolist() if keypoints is not None and len(keypoints) > 5 else None,
                "right_shoulder": keypoints[6].tolist() if keypoints is not None and len(keypoints) > 6 else None,
                "left_elbow": keypoints[7].tolist() if keypoints is not None and len(keypoints) > 7 else None,
                "right_elbow": keypoints[8].tolist() if keypoints is not None and len(keypoints) > 8 else None,
            }
        })
        
    except Exception as e:
        print(f"Error in detect_pose: {e}")
        return Response({"error": str(e)}, status=500)


# Action Learning API views removed - replaced with new model and pipeline
# All related views (create_action, list_actions, delete_action, upload_record, 
# finalize_action, infer_stream, setup_action_inference, reset_inference, 
# inference_status, action_detail, get_action_config, legacy_mode_status, 
# legacy_detect_pose) have been removed.

@api_view(['POST'])
def change_password(request):
    """Change user password"""
    try:
        data = request.data
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return Response({'error': 'Current password and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user ID from request headers or session
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return Response({'error': 'User ID not found in request.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify current password
        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate new password
        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        user.set_password(new_password)
        user.save()
        
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def change_user_password(request, user_id):
    """Change password for a specific user (admin only)"""
    try:
        data = request.data
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return Response({'error': 'Current password and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get admin user ID from request headers
        admin_id = request.headers.get('X-User-ID')
        if not admin_id:
            return Response({'error': 'Admin user ID not found in request.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            admin_user = CustomUser.objects.get(id=admin_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Admin user not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify admin's current password
        if not admin_user.check_password(current_password):
            return Response({'error': 'Current admin password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get target user
        try:
            target_user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Target user not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate new password
        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password for target user
        target_user.set_password(new_password)
        target_user.save()
        
        return Response({'message': f'Password changed successfully for user {target_user.username}.'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Admin Force Complete Appointment
@api_view(['PUT'])
def admin_force_complete_appointment(request, appointment_id):
    try:
        appointment = get_object_or_404(Appointment, appointment_code=appointment_id)
        
        # Only allow completing Scheduled appointments
        if appointment.status != "Scheduled":
            return Response({"error": "Can only complete Scheduled appointments"}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = appointment.status
        appointment.status = "Completed"
        appointment.completed_at = timezone.now()
        appointment.save()
        
        # Create notification for patient
        if appointment.patient_id:
            Notification.objects.create(
                user=appointment.patient_id,
                title="Appointment Completed",
                message=f"Your appointment with {appointment.therapist_id.username} scheduled for {appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')} has been completed by admin.",
                notification_type='appointment',
                related_id=appointment.appointment_code
            )
        
        # Create notification for therapist
        Notification.objects.create(
            user=appointment.therapist_id,
            title="Appointment Completed by Admin",
            message=f"Your appointment with {appointment.patient_id.username if appointment.patient_id else appointment.contact_name} scheduled for {appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')} has been completed by admin.",
            notification_type='appointment',
            related_id=appointment.appointment_code
        )
        
        return Response({
            "message": "Appointment completed successfully",
            "appointment_id": appointment.appointment_code,
            "status": appointment.status
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Admin Force Reject Appointment
@api_view(['PUT'])
def admin_force_reject_appointment(request, appointment_id):
    try:
        appointment = get_object_or_404(Appointment, appointment_code=appointment_id)
        
        # Only allow cancelling Scheduled appointments
        if appointment.status != "Scheduled":
            return Response({"error": "Can only cancel Scheduled appointments"}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = appointment.status
        appointment.status = "Cancelled"
        appointment.cancelled_at = timezone.now()
        appointment.cancel_reason = "Admin force cancel"
        appointment.save()
        
        # Create notification for patient
        if appointment.patient_id:
            action_text = "cancelled"
            Notification.objects.create(
                user=appointment.patient_id,
                title=f"Appointment {action_text.title()}",
                message=f"Your appointment with {appointment.therapist_id.username} scheduled for {appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')} has been {action_text} by admin.",
                notification_type='appointment',
                related_id=appointment.appointment_code
            )
        
        # Create notification for therapist
        action_text = "cancelled"
        Notification.objects.create(
            user=appointment.therapist_id,
            title=f"Appointment {action_text.title()} by Admin",
            message=f"Your appointment with {appointment.patient_id.username if appointment.patient_id else appointment.contact_name} scheduled for {appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')} has been {action_text} by admin.",
            notification_type='appointment',
            related_id=appointment.appointment_code
        )
        
        action_text = "cancelled"
        return Response({
            "message": f"Appointment {action_text} successfully",
            "appointment_id": appointment.appointment_code,
            "status": appointment.status
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
