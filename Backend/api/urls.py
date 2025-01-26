from django.urls import path
from . import views

urlpatterns = [
    ## Login Page
    path('login/', views.login, name='login'),
    
    ##User Management
    
]
