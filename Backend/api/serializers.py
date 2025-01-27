from rest_framework import serializers
from .models import CustomUser

class CustomUserSerializer(serializers.ModelSerializer):
    create_date = serializers.DateField(format="%d/%m/%Y", read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'ic', 'contact_number', 'gender', 'dob', 'role', 'create_date', 'status']