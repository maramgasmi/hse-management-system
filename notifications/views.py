from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Notification
    
    GET    /api/notifications/              → My notifications
    GET    /api/notifications/{id}/         → Get notification
    PATCH  /api/notifications/{id}/         → Update (mark read)
    DELETE /api/notifications/{id}/         → Delete
    
    Custom:
    POST   /api/notifications/mark-all-read/ → Mark all as read
    GET    /api/notifications/unread-count/  → Count unread
    """
    
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    # No POST - notifications are created by the system, not users
    
    def get_queryset(self):
        """Users only see their own notifications"""
        return Notification.objects.filter(
            recipient=self.request.user
        ).order_by('-created_at')
    
    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """
        Mark all notifications as read
        
        """
        from django.utils import timezone
        
        updated = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated} notification(s) marked as read'
        })
    
    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """
        Get count of unread notifications
        
        """
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        
        return Response({'unread_count': count})
    
    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """
        Mark single notification as read
        
        """
        notification = self.get_object()
        notification.mark_as_read()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)