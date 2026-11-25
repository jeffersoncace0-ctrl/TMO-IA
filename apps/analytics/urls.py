"""Enrutador de URLs para la aplicación de Analítica y Dashboards."""

from django.urls import path, re_path
from .views import DashboardView, CommercialDashboardView, DashAppView, CommercialDashAppView

app_name = 'analytics'

urlpatterns = [
    # Dashboard Call Center & TMO
    path('', DashboardView.as_view(), name='dashboard'),
    path('callcenter/', DashboardView.as_view(), name='dashboard_callcenter'),
    path('dashboard/', DashboardView.as_view(), name='dashboard_alias'),
    path('dash/', DashAppView.as_view(), name='dash_index'),
    re_path(r'^dash/(?P<path>.*)$', DashAppView.as_view(), name='dash_subpath'),

    # Dashboard Comercial & Facturación
    path('comercial/', CommercialDashboardView.as_view(), name='commercial_dashboard'),
    path('comercial/dash/', CommercialDashAppView.as_view(), name='commercial_dash_index'),
    re_path(r'^comercial/dash/(?P<path>.*)$', CommercialDashAppView.as_view(), name='commercial_dash_subpath'),
]
