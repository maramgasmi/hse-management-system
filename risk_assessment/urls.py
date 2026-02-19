from rest_framework.routers import DefaultRouter
from .views import RiskAssessmentViewSet

router = DefaultRouter()
router.register(r'risk-assessments', RiskAssessmentViewSet, basename='risk-assessment')

urlpatterns = router.urls