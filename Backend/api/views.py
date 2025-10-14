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
from .models import CustomUser, Admin, Patient, Therapist, Appointment, Notification, Treatment, TreatmentExercise, Exercise, MedicalHistory
import time
import json
from .serializers import CustomUserSerializer, AppointmentSerializer, PatientHistorySerializer, NotificationSerializer, MedicalHistorySerializer
from django.utils.dateparse import parse_datetime
from django.db import transaction
from django.contrib.auth import login
from django.db.models import Q
import base64


@api_view(['POST'])
@csrf_exempt
def login_view(request):
    data = request.data
    user_id = data.get('id')
    password = data.get('password')

    print(f"Login attempt - User ID: {user_id}, Password length: {len(password) if password else 0}")

    if not user_id or not password:
        print("Missing user ID or password")
        return JsonResponse({'success': False, 'error': 'User ID and password are required.'}, status=400)

    user = CustomUser.objects.filter(id=user_id).first()
    print(f"User found: {user is not None}")
    
    # List all users for debugging
    all_users = CustomUser.objects.all()
    print(f"Total users in database: {all_users.count()}")
    for u in all_users[:5]:  # Show first 5 users
        print(f"  - ID: {u.id}, Username: {u.username}, Role: {u.role}, Status: {u.status}")
    
    # Check specifically for A0001
    specific_user = CustomUser.objects.filter(id='A0001').first()
    if specific_user:
        password_test = specific_user.check_password('chai030513')
        print(f"Password test for A0001: {password_test}")
    else:
        print("A0001 user not found in database")
    
    if user:
        print(f"User status: {user.status}")
        password_check = user.check_password(password)
        print(f"Password check: {password_check}")
        print(f"User details: ID={user.id}, Username={user.username}, Email={user.email}")
    
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
                Admin.objects.create(
                    user=user,
                    admin_role=admin_role
                )

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

        # Determine status based on who is creating the appointment
        # If patient is creating, status should be Pending
        # If therapist is creating, status should be Scheduled
        current_user = request.user
        if hasattr(current_user, 'role') and current_user.role == 'patient':
            appointment_status = "Pending"
        else:
            appointment_status = "Scheduled"  # 默认为治疗师创建
        
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
                treatments = Treatment.objects.filter(patient_id=patient_id).select_related('patient_id', 'therapist_id').order_by('-created_at')
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
                    'status': treatment.status,
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
            treatment = Treatment.objects.create(
                patient_id=patient,
                therapist_id=therapist,
                name=data.get('name', 'Unnamed Treatment'),
                start_date=data.get('start_date'),
                end_date=data.get('end_date'),
                goal_notes=data.get('goal_notes'),
                status=data.get('status', 'active'),
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
        if data.get('status') == 'active':
            Treatment.objects.filter(
                patient_id=patient,
                status='active'
            ).update(status='completed')
        
        # Create treatment
        treatment = Treatment.objects.create(
            patient_id=patient,
            therapist_id=therapist,
            name=data.get('name', 'Unnamed Treatment'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            goal_notes=data.get('goal_notes'),
            status=data.get('status', 'active'),
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
            status='active'
        ).select_related('therapist_id').order_by('-created_at')
        
        data = []
        for treatment in treatments:
            # Get exercise count
            exercise_count = TreatmentExercise.objects.filter(treatment_id=treatment.treatment_id).count()
            
            data.append({
                'treatment_id': str(treatment.treatment_id),
                'name': treatment.name,
                'status': treatment.status,
                'start_date': treatment.start_date,
                'end_date': treatment.end_date,
                'goal_notes': treatment.goal_notes,
                'created_at': treatment.created_at,
                'therapist_name': treatment.therapist_id.username if treatment.therapist_id else 'Unknown',
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
                'treatment_type': treatment.treatment_type,
                'treatment_subtype': treatment.treatment_subtype,
                'condition': treatment.condition,
                'status': treatment.status,
                'frequency': treatment.frequency,
                'start_date': treatment.start_date,
                'end_date': treatment.end_date,
                'created_at': treatment.created_at,
                'creation_method': treatment.creation_method,
                'template_name': None,  # No longer using templates
            })
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def treatment_exercises(request, treatment_id):
    """Get all exercises for a treatment"""
    try:
        exercises = TreatmentExercise.objects.filter(treatment_id=treatment_id).select_related('exercise_id', 'exercise_id__action_id')
        
        data = []
        for te in exercises:
            # Get demo video URL from linked action's samples
            demo_video_url = None
            if te.exercise_id and te.exercise_id.action_id:
                # Get the first sample video URL from the action
                action = te.exercise_id.action_id
                # Get the first sample for this action
                first_sample = action.samples.first()
                if first_sample and first_sample.video_url:
                    demo_video_url = first_sample.video_url
            
            data.append({
                'treatment_exercise_id': str(te.treatment_exercise_id),
                'exercise_id': str(te.exercise_id.exercise_id) if te.exercise_id else None,
                'exercise_name': te.exercise_id.name if te.exercise_id else 'Custom Exercise',
                'category': te.exercise_id.category if te.exercise_id else 'N/A',
                'difficulty': te.exercise_id.difficulty if te.exercise_id else 'N/A',
                'instructions': te.exercise_id.instructions if te.exercise_id else '',
                'reps_per_set': te.reps_per_set,
                'sets': te.sets,
                'duration_per_set': te.duration_per_set,
                'notes': te.notes,
                'order_in_treatment': te.order_in_treatment,
                'is_active': te.is_active,
                'start_date': te.start_date,
                'end_date': te.end_date,
                'demo_video_url': demo_video_url,
                'action_id': str(te.exercise_id.action_id.id) if te.exercise_id and te.exercise_id.action_id else None,
            })
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_treatment_exercise(request):
    """Create a new exercise for a treatment"""
    try:
        data = request.data
        
        treatment = get_object_or_404(Treatment, treatment_id=data.get('treatment_id'))
        exercise = get_object_or_404(Exercise, exercise_id=data.get('exercise_id'))
        
        treatment_exercise = TreatmentExercise.objects.create(
            treatment_id=treatment,
            exercise_id=exercise,
            reps_per_set=data.get('reps_per_set'),
            sets=data.get('sets', 1),
            duration_per_set=data.get('duration_per_set'),
            notes=data.get('notes'),
            order_in_treatment=data.get('order_in_treatment', 1),
            is_active=data.get('is_active', True),
        )
        
        return Response({
            'exercise_id': str(treatment_exercise.treatment_exercise_id),
            'message': 'Treatment exercise created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
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
                'status': treatment.status,
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
            if 'status' in data:
                treatment.status = data['status']
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
        if 'duration_per_set' in data:
            exercise.duration_per_set = data['duration_per_set']
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

@api_view(['GET'])
def list_exercises(request):
    """Get all available exercises"""
    try:
        exercises = Exercise.objects.all().order_by('category', 'name')
        
        data = []
        for exercise in exercises:
            data.append({
                'exercise_id': str(exercise.exercise_id),
                'name': exercise.name,
                'category': exercise.category,
                'difficulty': exercise.difficulty,
                'instructions': exercise.instructions,
                'action_id': str(exercise.action_id.id) if exercise.action_id else None,
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
        
        # Get the therapist creating the exercise
        created_by = None
        if 'created_by' in data:
            created_by = get_object_or_404(CustomUser, id=data['created_by'], role='therapist')
        
        # Get the action if provided
        action_id = None
        if data.get('action_id'):
            from .models import Action
            action_id = get_object_or_404(Action, id=data['action_id'])
        
        exercise = Exercise.objects.create(
            name=data.get('name', 'Unnamed Exercise'),
            category=data.get('category', 'upper_body'),
            difficulty=data.get('difficulty', 'beginner'),
            instructions=data.get('instructions', 'No instructions provided'),
            action_id=action_id,
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
                'body_part': exercise.body_part,
                'category': exercise.category,
                'difficulty': exercise.difficulty,
                'description': exercise.instructions,
                'instructions': exercise.instructions,
                'default_target_metrics': exercise.default_metrics,
                'default_sets': 3,  # Default values
                'default_repetitions': 10,
                'default_pain_threshold': 5,
                'demo_video_url': exercise.demo_video_url,
                'is_active': exercise.is_active,
                'created_at': exercise.created_at,
                'created_by_name': exercise.created_by.username if exercise.created_by else 'System',
                'detection_rules': exercise.detection_rules or {},
                'action_id': str(exercise.action_id.id) if exercise.action_id else None,
                'action_name': exercise.action_id.name if exercise.action_id else None,
            }
            return Response(data, status=status.HTTP_200_OK)
            
        elif request.method == 'PUT':
            data = request.data
            
            # Update fields if provided
            if 'name' in data:
                exercise.name = data['name']
            if 'category' in data:
                exercise.category = data['category']
            if 'difficulty' in data:
                exercise.difficulty = data['difficulty']
            if 'instructions' in data:
                exercise.instructions = data['instructions']
            if 'action_id' in data:
                if data['action_id']:  # If action_id is provided and not empty
                    from .models import Action
                    action = get_object_or_404(Action, id=data['action_id'])
                    exercise.action_id = action
                else:  # If action_id is empty string, set to None
                    exercise.action_id = None
                
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


# ==================== NEW ACTION LEARNING API VIEWS ====================

from .models import Action, ActionSample, ActionTemplate, ActionSession
from .services.pipeline import (
    finalize_action_from_video, 
    dtw_infer_update, 
    setup_action_for_inference,
    process_realtime_frame
)
from .services.dtw_recognition import reset_recognizer, get_recognizer_status


@api_view(['POST'])
def create_action(request):
    """Create new action for video-based learning"""
    try:
        name = request.data.get('name')
        description = request.data.get('description', '')
        created_by = request.data.get('created_by')
        
        if not name:
            return JsonResponse({'error': 'Action name is required'}, status=400)
        
        action = Action.objects.create(
            name=name,
            description=description,
            created_by=created_by,
            mode='dtw'  # Default to DTW mode
        )
        
        return JsonResponse({
            'id': action.id,
            'name': action.name,
            'description': action.description,
            'mode': action.mode,
            'created_at': action.created_at.isoformat()
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
def list_actions(request):
    """List all actions"""
    try:
        actions = Action.objects.all().order_by('-created_at')
        
        data = []
        for action in actions:
            # Count templates and samples
            template_count = ActionTemplate.objects.filter(action=action).count()
            sample_count = ActionSample.objects.filter(action=action).count()
            
            data.append({
                'id': action.id,
                'name': action.name,
                'description': action.description,
                'mode': action.mode,
                'template_count': template_count,
                'sample_count': sample_count,
                'params': action.params_json,
                'created_at': action.created_at.isoformat()
            })
        
        return JsonResponse({'actions': data})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['DELETE'])
def delete_action(request, action_id):
    """
    Delete an action and all associated data:
    - Delete all ActionSample records and their video files
    - Delete all ActionTemplate records
    - Set action_id to NULL for all linked Exercise records
    - Delete the Action record itself
    """
    try:
        import os
        from django.conf import settings
        
        action = Action.objects.get(id=action_id)
        action_name = action.name
        
        # 1. Get all samples and delete their video files
        samples = ActionSample.objects.filter(action=action)
        deleted_videos = 0
        for sample in samples:
            if sample.video_url:
                # Handle both relative URLs and absolute paths
                if sample.video_url.startswith('/media/'):
                    # Relative URL - construct full path
                    video_path = os.path.join(settings.BASE_DIR, sample.video_url.lstrip('/'))
                else:
                    # Absolute path (legacy)
                    video_path = sample.video_url
                
                if os.path.exists(video_path):
                    try:
                        os.remove(video_path)
                        deleted_videos += 1
                    except Exception as e:
                        print(f"Failed to delete video file {video_path}: {e}")
        
        # Count records before deletion
        template_count = ActionTemplate.objects.filter(action=action).count()
        sample_count = samples.count()
        
        # 2. Update all linked exercises (set action_id to NULL)
        # Note: This happens automatically due to on_delete=SET_NULL, but we'll count them
        linked_exercises = Exercise.objects.filter(action_id=action).count()
        
        # 3. Delete the action (this will CASCADE delete samples and templates)
        action.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'Action "{action_name}" deleted successfully',
            'details': {
                'templates_deleted': template_count,
                'samples_deleted': sample_count,
                'videos_deleted': deleted_videos,
                'exercises_unlinked': linked_exercises
            }
        })
        
    except Action.DoesNotExist:
        return JsonResponse({'error': 'Action not found'}, status=404)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_record(request, action_id):
    """Upload demo video or keypoints data for action learning"""
    try:
        action = Action.objects.get(id=action_id)
        
        # Handle video file upload
        video_file = request.FILES.get('video')
        keypoints_data = request.data.get('keypoints')
        fps = int(request.data.get('fps', 30))
        
        if video_file:
            # Save video file
            import os
            from django.conf import settings
            
            # Create media directory if it doesn't exist
            media_dir = os.path.join(settings.BASE_DIR, 'media', 'action_videos')
            os.makedirs(media_dir, exist_ok=True)
            
            # Save video with unique filename
            video_filename = f"action_{action_id}_{int(time.time())}.mp4"
            video_path = os.path.join(media_dir, video_filename)
            
            with open(video_path, 'wb') as f:
                for chunk in video_file.chunks():
                    f.write(chunk)
            
            # Create sample record with relative URL
            # Convert absolute path to relative URL for web access
            relative_url = f"/media/action_videos/{video_filename}"
            sample = ActionSample.objects.create(
                action=action,
                video_url=relative_url,
                fps=fps
            )
            
            return JsonResponse({
                'sample_id': sample.id,
                'video_saved': True,
                'video_path': video_path
            })
        
        elif keypoints_data:
            # Handle direct keypoints upload
            try:
                if isinstance(keypoints_data, str):
                    keypoints_json = json.loads(keypoints_data)
                else:
                    keypoints_json = keypoints_data
            except json.JSONDecodeError:
                return JsonResponse({'error': 'Invalid keypoints JSON format'}, status=400)
            
            sample = ActionSample.objects.create(
                action=action,
                keypoints_json=keypoints_json,
                fps=fps
            )
            
            return JsonResponse({
                'sample_id': sample.id,
                'keypoints_saved': True,
                'frame_count': len(keypoints_json)
            })
        
        else:
            return JsonResponse({'error': 'No video file or keypoints data provided'}, status=400)
        
    except Action.DoesNotExist:
        return JsonResponse({'error': 'Action not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
def finalize_action(request, action_id):
    """Finalize action: extract features, segment, create templates, estimate thresholds"""
    try:
        result = finalize_action_from_video(action_id)
        
        if result['success']:
            return JsonResponse(result)
        else:
            return JsonResponse(result, status=400)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
def infer_stream(request):
    """Real-time inference endpoint for DTW-based action recognition"""
    try:
        features = None
        update_thresholds = None
        
        # Handle different input formats
        if request.content_type.startswith('multipart/form-data'):
            # Image frame upload
            frame_file = request.FILES.get('frame')
            if frame_file:
                # Read image
                img_array = np.frombuffer(frame_file.read(), np.uint8)
                image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                
                # Process frame
                frame_result = process_realtime_frame(image)
                if not frame_result['success']:
                    return JsonResponse(frame_result, status=400)
                
                features = frame_result['features']
                
                # Check for threshold updates in form data
                thr_in = request.POST.get('thr_in')
                thr_out = request.POST.get('thr_out')
                if thr_in and thr_out:
                    update_thresholds = {
                        'thr_in': float(thr_in),
                        'thr_out': float(thr_out)
                    }
                else:
                    update_thresholds = None
            else:
                return JsonResponse({'error': 'No frame data provided'}, status=400)
        
        else:
            # JSON payload with features or keypoints
            payload = request.data if hasattr(request, 'data') else json.loads(request.body)
            
            if 'features' in payload:
                # Direct features input
                features = payload['features']
            elif 'keypoints' in payload:
                # Process keypoints to features
                frame_result = process_realtime_frame(payload['keypoints'])
                if not frame_result['success']:
                    return JsonResponse(frame_result, status=400)
                features = frame_result['features']
            else:
                return JsonResponse({'error': 'No features or keypoints provided'}, status=400)
            
            # Extract threshold updates if present
            update_thresholds = payload.get('update_thresholds')
        
        # Run DTW inference
        
        inference_payload = {
            'features': features,
            'update_thresholds': update_thresholds
        }
        
        result = dtw_infer_update(inference_payload)
        # Ensure debug observability fields
        if isinstance(result, dict):
            dbg = result.get('debug', {}) or {}
            # Attach reason_code if recognizer provided it (present in dtw_recognition debug or pipeline state machine)
            # If missing, keep 'OK' as default
            dbg.setdefault('reason_code', 'OK')
            result['debug'] = dbg
        return JsonResponse(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
def setup_action_inference(request, action_id):
    """Setup DTW recognizer for a specific action"""
    try:
        result = setup_action_for_inference(action_id)
        
        if result['success']:
            return JsonResponse(result)
        else:
            return JsonResponse(result, status=400)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
def reset_inference(request):
    """Reset DTW recognizer state"""
    try:
        result = reset_recognizer()
        return JsonResponse(result)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
def inference_status(request):
    """Get current DTW recognizer status"""
    try:
        result = get_recognizer_status()
        return JsonResponse(result)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
def action_detail(request, action_id):
    """Get detailed information about an action"""
    try:
        action = Action.objects.get(id=action_id)
        
        # Get related data
        templates = ActionTemplate.objects.filter(action=action)
        samples = ActionSample.objects.filter(action=action)
        sessions = ActionSession.objects.filter(action=action).order_by('-started_at')[:10]
        
        template_data = []
        for template in templates:
            template_data.append({
                'id': template.id,
                'length': template.length,
                'feature_dim': template.feature_dim,
                'created_at': template.created_at.isoformat()
            })
        
        sample_data = []
        for sample in samples:
            sample_data.append({
                'id': sample.id,
                'has_video': bool(sample.video_url),
                'video_url': sample.video_url if sample.video_url else None,
                'has_keypoints': bool(sample.keypoints_json),
                'fps': sample.fps,
                'created_at': sample.created_at.isoformat()
            })
        
        session_data = []
        for session in sessions:
            session_data.append({
                'id': session.id,
                'reps': session.reps,
                'started_at': session.started_at.isoformat(),
                'metrics': session.metrics_json
            })
        
        return JsonResponse({
            'action': {
                'id': action.id,
                'name': action.name,
                'description': action.description,
                'mode': action.mode,
                'params': action.params_json,
                'created_at': action.created_at.isoformat()
            },
            'templates': template_data,
            'samples': sample_data,
            'recent_sessions': session_data
        })
        
    except Action.DoesNotExist:
        return JsonResponse({'error': 'Action not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ==================== LEGACY MODE SUPPORT ====================

@api_view(['GET'])
def legacy_mode_status(request):
    """Check if legacy mode is enabled"""
    # For now, always return available but disabled by default
    return JsonResponse({
        'legacy_mode_available': True,
        'legacy_mode_enabled': False,
        'legacy_endpoints': [
            '/api/legacy/detect-pose/',
            '/api/legacy/exercises/',
        ]
    })


# Legacy endpoint aliases for backward compatibility
@api_view(['POST'])
@parser_classes([MultiPartParser])
def legacy_detect_pose(request):
    """Legacy pose detection endpoint - identical to original detect_pose"""
    return detect_pose(request)

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
        
        # Only allow completing Pending or Scheduled appointments
        if appointment.status not in ["Pending", "Scheduled"]:
            return Response({"error": "Can only complete Pending or Scheduled appointments"}, status=status.HTTP_400_BAD_REQUEST)
        
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
        
        # Only allow rejecting Pending or Scheduled appointments
        if appointment.status not in ["Pending", "Scheduled"]:
            return Response({"error": "Can only reject Pending or Scheduled appointments"}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = appointment.status
        appointment.status = "Cancelled"
        appointment.cancelled_at = timezone.now()
        appointment.cancel_reason = "Admin force reject" if old_status == "Pending" else "Admin force cancel"
        appointment.save()
        
        # Create notification for patient
        if appointment.patient_id:
            action_text = "rejected" if old_status == "Pending" else "cancelled"
            Notification.objects.create(
                user=appointment.patient_id,
                title=f"Appointment {action_text.title()}",
                message=f"Your appointment with {appointment.therapist_id.username} scheduled for {appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')} has been {action_text} by admin.",
                notification_type='appointment',
                related_id=appointment.appointment_code
            )
        
        # Create notification for therapist
        action_text = "rejected" if old_status == "Pending" else "cancelled"
        Notification.objects.create(
            user=appointment.therapist_id,
            title=f"Appointment {action_text.title()} by Admin",
            message=f"Your appointment with {appointment.patient_id.username if appointment.patient_id else appointment.contact_name} scheduled for {appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')} has been {action_text} by admin.",
            notification_type='appointment',
            related_id=appointment.appointment_code
        )
        
        action_text = "rejected" if old_status == "Pending" else "cancelled"
        return Response({
            "message": f"Appointment {action_text} successfully",
            "appointment_id": appointment.appointment_code,
            "status": appointment.status
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
