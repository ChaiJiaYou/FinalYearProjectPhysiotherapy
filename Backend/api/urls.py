from . import views
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    ## Login Page
    path('login/', views.login, name='login'),
    
    ## User Management
    path('list-users/', views.list_users, name='fetch_all_users'),    
    path('get-user/<int:user_id>/', views.get_user, name='get_user'),
    path('update-user-status/<int:user_id>/', views.update_user_status, name='update-user-status'),
    
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)