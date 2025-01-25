from django.contrib import admin
from .models import CustomUser, Admin, Therapist,Patient

# Register your models here.
admin.site.register(CustomUser)
admin.site.register(Admin)
admin.site.register(Therapist)
admin.site.register(Patient)