from . import views
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import NotificationListCreateView, NotificationMarkReadView
from rest_framework.permissions import AllowAny

urlpatterns = [
    ## Login Page
    path('login/', views.login_view, name='login'),
    
    ## User Management
    path('list-users/', views.list_users, name='fetch_all_users'),
    path('create-user/', views.create_user, name="create-user"),    
    path('update-user-status/<str:user_id>/', views.update_user_status, name='update-user-status'),
    path('get-user/<str:user_id>/', views.get_user, name='get_user'),
    path('update-user/<str:user_id>/', views.update_user, name="update_user"),
    path('list-patients/', views.list_patients, name='list-patients'),

    #Appointment
    path('create-appointment/', views.create_appointment, name='create_appointment'),
    path("list-therapists/", views.list_therapists, name="list_therapists"),
    path('list-appointments/', views.list_appointments, name="list-appointments"),
    
    path('therapist-available-slots/', views.therapist_available_slots, name="list-availableslots"),
    path('therapist-today-appointments/', views.therapist_today_appointments, name="therapist-today-appointments"),
    path('therapist-upcoming-appointments/',views.therapist_upcoming_appointments, name='therapist-upcoming-appointments'),
    path('therapist-month-appointments/', views.therapist_month_appointments, name='therapist-month-appointments'),
    path('patient-appointments/', views.get_patient_appointments, name='patient-appointments'),
    path('therapist-all-appointments/', views.therapist_all_appointments, name='therapist-all-appointments'),

    path('update-appointment-status/<str:appointment_id>/', views.update_appointment_status, name='update-appointment-status'),
    path('get-patient-history/', views.get_patient_history, name='get-patient-history'),
    path('get-patient-detail/<str:patient_id>/', views.get_patient_detail, name='get-patient-detail'),

    # /?therapist_id=${selectedTherapist}&date=${selectedDate}
    
    # Notification endpoints
    path('notifications/', NotificationListCreateView.as_view(), name='notifications'),
    path('notifications/<str:pk>/mark-read/', NotificationMarkReadView.as_view(), name='mark-notification-read'),
    
    # Treatment Management
    path('treatment-templates/', views.treatment_templates, name='treatment-templates'),
    path('treatment-templates/<str:template_id>/', views.treatment_template_detail, name='treatment-template-detail'),
    path('treatments/', views.treatments, name='treatments'),
    path('treatments/<str:treatment_id>/', views.treatment_detail, name='treatment-detail'),
    path('therapist-treatments/<str:therapist_id>/', views.therapist_treatments, name='therapist-treatments'),
    path('treatment-exercises/<str:treatment_id>/', views.treatment_exercises, name='treatment-exercises'),
    path('create-treatment-exercise/', views.create_treatment_exercise, name='create-treatment-exercise'),
    path('update-treatment-exercise/<str:exercise_id>/', views.update_treatment_exercise, name='update-treatment-exercise'),
    
    # Exercise Management
    path('exercises/', views.list_exercises, name='list-exercises'),
    path('exercises/<str:exercise_id>/', views.exercise_detail, name='exercise-detail'),
    path('create-exercise/', views.create_exercise, name='create-exercise'),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)