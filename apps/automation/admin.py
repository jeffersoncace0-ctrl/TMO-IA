"""Registro de modelos del módulo de automatización en el panel administrativo de Django."""

from django.contrib import admin
from .models import AutomationJob, ExecutionLog, AutomationAlertRecipient


@admin.register(AutomationJob)
class AutomationJobAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'job_type',
        'interval_minutes',
        'is_active',
        'last_run_at',
        'next_run_at',
        'total_runs',
        'success_rate',
    )
    list_filter = ('job_type', 'is_active')
    search_fields = ('name',)
    readonly_fields = ('total_runs', 'successful_runs', 'failed_runs', 'created_at', 'updated_at')


@admin.register(ExecutionLog)
class ExecutionLogAdmin(admin.ModelAdmin):
    list_display = (
        'started_at',
        'job_name',
        'trigger_type',
        'status',
        'duration_seconds',
        'records_processed',
        'agents_evaluated',
        'critical_agents',
        'email_sent',
    )
    list_filter = ('status', 'trigger_type', 'email_sent')
    search_fields = ('job_name', 'summary', 'error_trace')
    readonly_fields = (
        'started_at',
        'finished_at',
        'duration_seconds',
        'records_processed',
        'agents_evaluated',
        'compliant_agents',
        'observation_agents',
        'critical_agents',
        'global_weighted_tmo',
        'email_sent',
        'email_recipient',
        'report_file_path',
        'summary',
        'error_trace',
    )


@admin.register(AutomationAlertRecipient)
class AutomationAlertRecipientAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'is_active', 'notify_on_critical_only', 'created_at')
    list_filter = ('is_active', 'notify_on_critical_only')
    search_fields = ('name', 'email')
