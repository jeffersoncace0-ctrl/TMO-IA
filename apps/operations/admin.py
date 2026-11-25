from django.contrib import admin
from .models import Agent, IngestedFile, CallRecord, ThresholdConfig


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'created_at')
    search_fields = ('code', 'name')
    ordering = ('code',)


@admin.register(IngestedFile)
class IngestedFileAdmin(admin.ModelAdmin):
    list_display = ('filename', 'status', 'total_rows', 'valid_rows', 'duplicate_rows', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('filename', 'sha256_hash')
    readonly_fields = ('sha256_hash', 'file_size_bytes', 'created_at')


@admin.register(CallRecord)
class CallRecordAdmin(admin.ModelAdmin):
    list_display = ('call_id', 'agent', 'call_type', 'call_status', 'total_duration_seconds', 'is_valid', 'call_datetime')
    list_filter = ('is_valid', 'call_type', 'call_status', 'is_duplicate')
    search_fields = ('call_id', 'agent__code', 'agent__name')
    date_hierarchy = 'call_datetime'


@admin.register(ThresholdConfig)
class ThresholdConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'threshold_seconds', 'warning_multiplier', 'z_score_threshold', 'is_active', 'updated_at')
    list_editable = ('threshold_seconds', 'warning_multiplier', 'z_score_threshold', 'is_active')
