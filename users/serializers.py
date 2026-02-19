from rest_framework import serializers
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model
    
    Used for displaying user information in other serializers
    """
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        # Don't include password or other sensitive fields!
        
        # Make all fields read-only
        read_only_fields = ['id', 'username', 'email', 'first_name', 'last_name']

class UserBasicSerializer(serializers.ModelSerializer):
    """
    Minimal user info (just ID and username)
    For nested display where we don't need full details
    """
    
    class Meta:
        model = User
        fields = ['id', 'username']
        read_only_fields = ['id', 'username']