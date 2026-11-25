"""
Enrutador Principal de URLs del Proyecto TMO.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Panel Administrativo Oficial de Django
    path('admin/', admin.site.urls),

    # Enrutamiento de Módulos de la Aplicación
    path('', include('apps.core.urls', namespace='core')),
    path('operaciones/', include('apps.operations.urls', namespace='operations')),
    path('operacion/', include('apps.operations.urls')),
    path('analitica/', include('apps.analytics.urls', namespace='analytics')),
    path('analiticas/', include('apps.analytics.urls')),
    path('automatizacion/', include('apps.automation.urls', namespace='automation')),
    path('automatizaciones/', include('apps.automation.urls')),
]

# Servir archivos estáticos y multimedia durante desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
