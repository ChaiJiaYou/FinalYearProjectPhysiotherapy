from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from .models import CustomUser
from .serializers import CustomUserSerializer

import json



@api_view(['POST'])
@csrf_exempt
def login(request):
    # Access request data using DRF's Request object
        data = request.data
        username = data.get('username')
        password = data.get('password')

        # Validate required fields
        if not username or not password:
            return JsonResponse({'success': False, 'error': 'Username and password are required.'}, status=400)

        # Authenticate user
        user = authenticate(username=username, password=password)
        if user is not None:
            # Return user-specific data
            return JsonResponse({
                'success': True,
                'id': user.id,
                'username': user.username,
                'role': user.role,
            })
        else:
            return JsonResponse({'success': False, 'error': 'Invalid username or password'}, status=401)        
        
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