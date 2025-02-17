from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import datetime, timedelta
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from .models import CustomUser, Admin, Patient, Therapist,Appointment
from .serializers import CustomUserSerializer

import json



@api_view(['POST'])
@csrf_exempt
def login(request):
    # Access request data using DRF's Request object
    data = request.data
    user_id = data.get('id')
    
    username = data.get('username')
    password = data.get('password')

    # Validate required fields
    if not user_id or not password:
        return JsonResponse({'success': False, 'error': 'User ID and password are required.'}, status=400)

    # Authenticate user
    user = CustomUser.objects.filter(id=user_id).first()
    if user and user.check_password(password):
        if not user.status:
            return JsonResponse({'success': False, 'error': 'Your account is deactivated. Please contact staff.'}, status=403)

        # Generate CSRF token to include in the response
        csrf_token = get_token(request)

        # Get full avatar URL
        avatar_url = request.build_absolute_uri(user.avatar.url) if user.avatar else None

        # Return user-specific data including avatar
        response = JsonResponse({
            'success': True,
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'avatar': avatar_url,  # Include avatar URL
            'csrfToken': csrf_token,
        })

        # Optionally set cookies for username or role (if needed for autofill purposes)
        response.set_cookie('id', id, max_age=7 * 24 * 3600, httponly=True)
        response.set_cookie('username', username, max_age=7 * 24 * 3600, httponly=True)  # Expires in 7 days
        response.set_cookie('role', user.role, max_age=7 * 24 * 3600, httponly=True)  # Optional

        return response
    else:
        return JsonResponse({'success': False, 'error': 'Invalid user ID or password'}, status=401)
   
   
# User Account Management Module
# Fetch All User From Database
@api_view(['GET'])
def list_users(request):
    try:
        users = CustomUser.objects.all()  # Fetch all users
        serializer = CustomUserSerializer(users, many=True)  # Serialize the data
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Fetch Selected  User From Database
@api_view(['GET'])
def get_user(request, user_id):
    try:
        user = get_object_or_404(CustomUser, id=user_id)  # Fetch user or return 404
        serializer = CustomUserSerializer(user)  # Serialize user data
        return JsonResponse(serializer.data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
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

# Create New User
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def create_user(request):
    try:
        # Extract form data
        username = request.data.get("username")
        email = request.data.get("email")
        role = request.data.get("role")
        contact_number = request.data.get("contact_number")
        ic = request.data.get("ic")
        gender = request.data.get("gender")
        dob = request.data.get("dob")
        password = request.data.get("password")
        avatar = request.FILES.get("avatar")


        from datetime import datetime
        try:
            dob = datetime.strptime(dob, "%Y-%m-%d").date() if dob else None
        except ValueError:
            return JsonResponse({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        # Validate required fields
        if not all([username, email, role, password]):
            return JsonResponse({"error": "Missing required fields."}, status=400)

        # Check if username or email already exists
        if CustomUser.objects.filter(ic=ic).exists():
            return JsonResponse({"error": "Account already registered."}, status=400)

        user = CustomUser.objects.create(
            username=username,
            email=email,
            role=role,
            contact_number=contact_number,
            ic=ic,
            gender=gender,
            dob=dob,
            avatar=avatar,
        )
        
        user.set_password(password)
        user.save()
        
        if role == "patient":
            Patient.objects.create(user=user, emergency_contact="123")
        elif role == "therapist":
            Therapist.objects.create(user=user, specialization="General", employment_date=datetime.now().date())
        elif role == "admin":
            Admin.objects.create(user=user, admin_role="General Admin")
        

        # ✅ Explicitly format create_date before returning
        serializer = CustomUserSerializer(user)
        response_data = serializer.data
        response_data['create_date'] = user.create_date.strftime("%Y-%m-%d")  # Ensures correct date format

        return JsonResponse(response_data, status=201)

    except ValidationError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


WORKING_HOURS = [
    ("09:00", "10:00"),
    ("10:00", "11:00"),
    ("11:00", "12:00"),
    ("13:00", "14:00"),
    ("14:00", "15:00"),
    ("15:00", "16:00"),
    ("16:00", "17:00"),
]

@api_view(["GET"])
def get_available_slots(request, therapist_id, date):
    try:
        therapist = Therapist.objects.get(id=therapist_id)
        date_obj = datetime.strptime(date, "%Y-%m-%d").date()

        # Retrieve all booked slots for the therapist on the given date
        booked_slots = Appointment.objects.filter(
            therapistId=therapist, appointmentDateTime__date=date_obj
        ).values_list("appointmentDateTime", flat=True)

        # Convert booked slots to string format (HH:MM)
        booked_times = {slot.strftime("%H:%M") for slot in booked_slots}

        # Get available slots by subtracting booked times from working hours
        available_slots = [
            {"start": start, "end": end}
            for start, end in WORKING_HOURS
            if start not in booked_times
        ]

        return Response({"date": date, "available_slots": available_slots})
    except Therapist.DoesNotExist:
        return Response({"error": "Therapist not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    

@api_view(['GET'])
def therapist_weekly_schedule(request):
    therapist_id = request.user.id  # Assuming authenticated therapist
    week_start = request.GET.get('weekStart')

    if not week_start:
        return JsonResponse({"error": "Start date of the week is required"}, status=400)

    try:
        week_start_date = datetime.strptime(week_start, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

    # Generate all dates for the week
    week_dates = [(week_start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]

    # Fetch all appointments for the therapist in this week
    booked_appointments = Appointment.objects.filter(
        therapistId=therapist_id,
        appointmentDateTime__date__range=[week_dates[0], week_dates[-1]]
    )

    # Create a dictionary of booked slots
    weekly_schedule = {date: {slot: False for slot in timeSlots} for date in week_dates}

    for appointment in booked_appointments:
        formatted_time = appointment.appointmentDateTime.strftime("%I:%M %p - %I:%M %p")
        if appointment.appointmentDateTime.strftime("%Y-%m-%d") in weekly_schedule:
            weekly_schedule[appointment.appointmentDateTime.strftime("%Y-%m-%d")][formatted_time] = True

    return JsonResponse(weekly_schedule, status=200)
