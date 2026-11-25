"""
Enrutador Principal de URLs del Proyecto TMO.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic.base import RedirectView

urlpatterns = [
    # Panel Administrativo Oficial de Django
    path('admin/', admin.site.urls),

    # Enrutamiento Canónico de Módulos de la Aplicación
    path('', include('apps.core.urls', namespace='core')),
    path('auth/', include('apps.authentication.urls', namespace='authentication')),
    path('documentos/', include('apps.documents.urls', namespace='documents')),
    path('operaciones/', include('apps.operations.urls', namespace='operations')),
    path('analitica/', include('apps.analytics.urls', namespace='analytics')),
    path('automatizacion/', include('apps.automation.urls', namespace='automation')),

    # Alias Amigables y Redirecciones de Resiliencia
    path('documents/', RedirectView.as_view(url='/documentos/', permanent=False)),
    path('documents/<path:subpath>', RedirectView.as_view(url='/documentos/%(subpath)s', permanent=False)),
    path('dashboards/', RedirectView.as_view(url='/analitica/comercial/', permanent=False)),
    path('dashboards/<path:subpath>', RedirectView.as_view(url='/analitica/comercial/%(subpath)s', permanent=False)),
    path('operacion/', RedirectView.as_view(url='/operaciones/cargar/', permanent=False)),
    path('operacion/<path:subpath>', RedirectView.as_view(url='/operaciones/%(subpath)s', permanent=False)),
    path('analiticas/', RedirectView.as_view(url='/analitica/', permanent=False)),
    path('analiticas/<path:subpath>', RedirectView.as_view(url='/analitica/%(subpath)s', permanent=False)),
    path('automatizaciones/', RedirectView.as_view(url='/automatizacion/panel/', permanent=False)),
    path('automatizaciones/<path:subpath>', RedirectView.as_view(url='/automatizacion/%(subpath)s', permanent=False)),
]

# Servir archivos estáticos y multimedia durante desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
