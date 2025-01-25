from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    # Inherited from AbstractUser: username, email, first_name, last_name, etc.
    ic = models.CharField(max_length=20, blank=True, null=True)  # IC number
    contact_number = models.CharField(max_length=15, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=[('Male', 'Male'), ('Female', 'Female')], blank=True)
    dob = models.DateField(blank=True, null=True)  # Date of Birth
    role = models.CharField(
        max_length=20,
        choices=[('admin', 'Admin'), ('therapist', 'Therapist'), ('patient', 'Patient')],
    )

    def __str__(self):
        return f"{self.username} ({self.role})"
    
class Admin(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='admin_profile')
    admin_role = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"Admin: {self.user.username}"


class Therapist(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='therapist_profile')
    specialization = models.CharField(max_length=100)
    employment_date = models.DateField()
    on_work_status = models.CharField(max_length=20, choices=[('Active', 'Active'), ('Inactive', 'Inactive')])

    def __str__(self):
        return f"Therapist: {self.user.username}"


class Patient(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='patient_profile')
    emergency_contact = models.CharField(max_length=15, blank=True)
    registration_date = models.DateField()
    patient_status = models.CharField(max_length=20, choices=[('Active', 'Active'), ('Inactive', 'Inactive')])

    def __str__(self):
        return f"Patient: {self.user.username}"
