# evidence/views.py

from rest_framework import viewsets, status, mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Evidence
from .serializers import EvidenceSerializer


class EvidenceViewSet(
    mixins.RetrieveModelMixin,  # GET  /evidence/{id}/
    mixins.DestroyModelMixin,   # DELETE /evidence/{id}/
    viewsets.GenericViewSet
):
    """
    ViewSet for Evidence records.

    Only retrieve and delete are exposed here.
    Uploading is done through the incident endpoint:
        POST /incidents/{id}/add_evidence/
    Listing is done per-incident:
        GET  /incidents/{id}/evidence/

    Routes:
        GET    /api/evidence/{id}/   → retrieve evidence metadata
        DELETE /api/evidence/{id}/   → delete the record and the file from disk
    """

    permission_classes = [IsAuthenticated]
    serializer_class = EvidenceSerializer

    def get_queryset(self):
        """
        Restrict to evidence uploaded by the current user unless they
        are staff/superuser (who can manage all attachments).
        """
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Evidence.objects.all()
        return Evidence.objects.filter(uploaded_by=user)

    def get_serializer_context(self):
        """
        Pass request into the serializer context so file_url can
        build an absolute URL (request.build_absolute_uri).
        """
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy so we can return a meaningful success message.
        The Evidence.delete() method already handles removing the file
        from disk (see evidence/models.py).
        """
        evidence = self.get_object()
        filename = evidence.filename  # grab before deletion
        evidence.delete()             # removes DB record + file from disk
        return Response(
            {'message': f'Evidence "{filename}" deleted successfully.'},
            status=status.HTTP_200_OK   # 200 with body is clearer than 204 No Content
        )
