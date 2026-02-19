from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from rest_framework.routers import DefaultRouter
from incidents.views import IncidentViewSet
from capas.views import CAPAViewSet
from risk_assessment.views import RiskAssessmentViewSet
from notifications.views import NotificationViewSet

router = DefaultRouter()
router.register(r'incidents', IncidentViewSet, basename='incident')
router.register(r'capas', CAPAViewSet, basename='capa')
router.register(r'risk-assessments', RiskAssessmentViewSet, basename='risk-assessment')
router.register(r'notifications', NotificationViewSet, basename='notification')


urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # API endpoints 
    path('api/', include(router.urls)),
] 

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Why only in DEBUG mode?
# - In development: Django serves files directly (convenient)
# - In production: Use Nginx/Apache to serve files (much faster)
# - Never use Django to serve files in production (too slow)