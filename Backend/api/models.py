from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.timezone import now
import datetime

class CustomUser(AbstractUser):
    # Inherited from AbstractUser: username, email, first_name, last_name, etc.
    
    id = models.CharField(max_length=20,primary_key=True,editable=False) # Override default id attributes
    username = models.CharField(max_length=150, unique=False)
    ic = models.CharField(max_length=20, blank=True, null=True)  # IC number
    contact_number = models.CharField(max_length=15, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=[('Male', 'Male'), ('Female', 'Female')], blank=True)
    dob = models.DateField(blank=True, null=True)  # Date of Birth
    create_date = models.DateField(default=datetime.date.today)  # Automatically set when created
    status = models.BooleanField(default=True)
    role = models.CharField(
        max_length=20,
        choices=[('admin', 'Admin'), ('therapist', 'Therapist'), ('patient', 'Patient')],
    )
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    
    USERNAME_FIELD = 'id'

    def save(self, *args, **kwargs):
        # Genereate custome user ID based on role before save
        if not self.id:
            self.id = self.generate_custom_id()
        super().save(*args, **kwargs)
        
    def generate_custom_id(self):
        # Generate user ID based on Role
        prefix_map = {
            "admin": "ADM",
            "therapist": "DOC",
            "patient": "PTN",
        }
        prefix = prefix_map.get(self.role.lower(), "USR") # Default prefix if role is unknown
        last_user = CustomUser.objects.filter(id__startswith=prefix).order_by('-id').first()
        
        if last_user:
            last_number = int(last_user.id[3:]) # Extract numeric part from last ID
        else:
            last_number = 0 # Start numbering from 1
            
        return f"{prefix}{last_number + 1:06d}" # ADM000001, DOC000001, PTN000001

    def __str__(self):
        return f"{self.id} - {self.username} ({self.role})"
    
class Admin(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='admin_profile')
    admin_role = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"Admin: {self.user.id}"

class Therapist(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='therapist_profile')
    specialization = models.CharField(max_length=100)

    def __str__(self):
        return f"Therapist: {self.user.id}"

class Patient(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='patient_profile')
    emergency_contact = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return f"Patient: {self.user.id}"
    
class Appointment(models.Model):
    STATUS_CHOICES =[
        ("Scheduled","Scheduled"),
        ("Cancelled","Cancelled"),
        ("Completed","Completed"),
    ]
    
    appointmentId = models.CharField(max_length=50, unique=True, editable=False)
    patientId = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    therapistId = models.ForeignKey(Therapist, on_delete=models.CASCADE, related_name="appointments")
    appointmentDateTime = models.DateTimeField()
    creationDate = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Scheduled")
    
    def __str__(self):
        return f"Appointment {self.appointmentId} - {self.status} ({self.therapistId.specialization})"

    def save(self, *args, **kwargs):
        # Automatically generate a unique appointmentId if not provided
        if not self.appointmentId:
            self.appointmentId = f"APPT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        super().save(*args, **kwargs)
        
        # Schedule an appointment
    def scheduleAppointment(self, patient, therapist, date_time):
        self.patientId = patient
        self.therapistId = therapist  # ✅ Assign therapist
        self.appointmentDateTime = date_time
        self.status = "Scheduled"
        self.save()
        return f"Appointment {self.appointmentId} scheduled with {therapist.specialization}."

    # Cancel an appointment
    def cancelAppointment(self):
        if self.status != "Cancelled":
            self.status = "Cancelled"
            self.save()
            return f"Appointment {self.appointmentId} cancelled."
        return f"Appointment {self.appointmentId} is already cancelled."

    # View appointment details
    def viewAppointment(self):
        return {
            "appointmentId": self.appointmentId,
            "patient": self.patientId.id,
            "therapist": self.therapistId.specialization,
            "appointmentDateTime": self.appointmentDateTime,
            "creationDate": self.creationDate,
            "status": self.status,
        }
