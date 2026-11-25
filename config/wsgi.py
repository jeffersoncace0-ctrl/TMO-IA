"""Punto de Entrada WSGI para despliegue y servidores compatibles con WSGI.

Monta la aplicación Django principal y despacha las rutas analíticas a la
aplicación Dash mediante DispatcherMiddleware para entornos de producción.
"""

import os
from django.core.wsgi import get_wsgi_application
from werkzeug.middleware.dispatcher import DispatcherMiddleware

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_application = get_wsgi_application()

try:
    from apps.analytics.dash_app import dash_app
    application = DispatcherMiddleware(django_application, {
        '/analitica/dash': dash_app.server,
    })
except Exception:
    application = django_application
