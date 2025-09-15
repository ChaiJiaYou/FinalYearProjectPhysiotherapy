#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'physiotherapy.settings')
django.setup()

from api.models import CustomUser

# Create a test admin user
admin_user = CustomUser.objects.create_user(
    id='A2506001',
    email='admin@test.com',
    username='admin',
    password='admin123',
    role='admin',
    status=True
)

print(f"Created admin user: {admin_user.id} - {admin_user.username}")

# Create a test therapist user
therapist_user = CustomUser.objects.create_user(
    id='T2506001',
    email='therapist@test.com',
    username='therapist',
    password='therapist123',
    role='therapist',
    status=True
)

print(f"Created therapist user: {therapist_user.id} - {therapist_user.username}")

# Create a test patient user
patient_user = CustomUser.objects.create_user(
    id='P2506001',
    email='patient@test.com',
    username='patient',
    password='patient123',
    role='patient',
    status=True
)

print(f"Created patient user: {patient_user.id} - {patient_user.username}")

print("Test users created successfully!")
print("You can now login with:")
print("Admin: A2506001 / admin123")
print("Therapist: T2506001 / therapist123")
print("Patient: P2506001 / patient123")
