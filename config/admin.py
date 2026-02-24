from django.contrib import admin
from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule
from django_celery_results.models import TaskResult

# Register Celery Beat models
admin.site.register(PeriodicTask)
admin.site.register(IntervalSchedule)
admin.site.register(CrontabSchedule)

# Customize TaskResult admin
@admin.register(TaskResult)
class TaskResultAdmin(admin.ModelAdmin):
    list_display = ['task_name', 'status', 'date_done', 'worker']
    list_filter = ['status', 'date_done']
    search_fields = ['task_name', 'task_id']
    readonly_fields = ['task_id', 'task_name', 'status', 'result', 'date_done', 'traceback']
    
    def has_add_permission(self, request):
        return False  # Can't add task results manually