from rest_framework import serializers
from .models import CustomUser, Timetable

class CustomUserSerializer(serializers.ModelSerializer):
    create_date = serializers.DateField(format="%d/%m/%Y", read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'ic', 'contact_number', 'gender', 'dob', 'role', 'create_date', 'status', 'avatar']
        
#Timetable
class TimetableSerializer(serializers.ModelSerializer):
    therapist_name = serializers.SerializerMethodField()

    class Meta:
        model = Timetable
        fields = [
            'id', 'therapist', 'therapist_name', 'date', 'start_time',
            'end_time', 'slot_duration', 'is_booked', 'notes'
        ]

    def get_therapist_name(self, obj):
        return obj.therapist.user.username if obj.therapist else None


