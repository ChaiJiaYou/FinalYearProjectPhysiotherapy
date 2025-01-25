from rest_framework.decorators import api_view
from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
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
                'role': user.role,  # Assuming you have a role field in your custom user model
            })
        else:
            return JsonResponse({'success': False, 'error': 'Invalid username or password'}, status=401)        