from rest_framework.routers import DefaultRouter
from .views import CAPAViewSet

router = DefaultRouter()
router.register(r'capas', CAPAViewSet, basename='capa')

urlpatterns = router.urls