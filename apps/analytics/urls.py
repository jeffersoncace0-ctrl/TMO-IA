"""Enrutador de URLs para la aplicación de Analítica y Dashboards."""

from django.urls import path, re_path
from .views import DashboardView, DashAppView

app_name = 'analytics'

urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard'),
    path('dashboard/', DashboardView.as_view(), name='dashboard_alias'),
    path('dash/', DashAppView.as_view(), name='dash_index'),
    re_path(r'^dash/(?P<path>.*)$', DashAppView.as_view(), name='dash_subpath'),
]
