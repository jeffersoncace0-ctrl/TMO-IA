"""Enrutador de URLs para el módulo de automatizaciones y tareas programadas."""

from django.urls import path
from .views import (
    AutomationDashboardView,
    TriggerJobView,
    ToggleSchedulerView,
    ExecutionLogDetailView,
    DownloadExecutionReportView,
)

app_name = 'automation'

urlpatterns = [
    path('panel/', AutomationDashboardView.as_view(), name='panel'),
    path('trigger/', TriggerJobView.as_view(), name='trigger'),
    path('toggle/', ToggleSchedulerView.as_view(), name='toggle'),
    path('log/<int:pk>/', ExecutionLogDetailView.as_view(), name='log_detail'),
    path('log/<int:pk>/download/', DownloadExecutionReportView.as_view(), name='download_report'),
]
