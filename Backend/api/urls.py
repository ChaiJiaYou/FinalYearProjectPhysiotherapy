from django.urls import path
from . import views

urlpatterns = [
    ## Login Page
    path('login/', views.login, name='login'),
    
    ## User Management
    path('list-users/', views.list_users, name='fetch_all_users'),
    path('get-user/<int:user_id>/', views.get_user, name='get_user'),
]
