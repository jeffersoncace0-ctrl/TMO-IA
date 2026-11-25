"""Vistas de la aplicación de Analítica e integración de Dash con Django.

Proporciona el controlador del Dashboard principal y el adaptador WSGI de alta
eficiencia para servir los componentes, layouts y callbacks de Dash a través
del enrutador nativo de Django.
"""

from io import BytesIO
import logging
from typing import Any, Dict

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from apps.analytics.dash_app import dash_app
from apps.operations.models import CallRecord, ThresholdConfig
from apps.automation.models import ExecutionLog

logger = logging.getLogger('apps.analytics.views')


class DashboardView(View):
    """Vista contenedora principal que renderiza la plantilla corporativa con Dash."""

    def get(self, request: HttpRequest) -> HttpResponse:
        total_calls = CallRecord.objects.filter(is_valid=True).count()
        threshold_config = ThresholdConfig.objects.filter(is_active=True).first()
        target_tmo = threshold_config.threshold_seconds if threshold_config else getattr(settings, 'DEFAULT_TMO_THRESHOLD', 20.0)
        last_execution = ExecutionLog.objects.order_by('-started_at').first()

        context: Dict[str, Any] = {
            'title': 'Dashboard Analítico de TMO & Inteligencia Operativa',
            'total_calls': total_calls,
            'target_tmo': target_tmo,
            'last_execution': last_execution,
        }
        return render(request, 'analytics/dashboard.html', context)


@method_decorator(csrf_exempt, name='dispatch')
class DashAppView(View):
    """Adaptador de nivel WSGI para despachar peticiones de Dash dentro del ciclo de vida de Django.

    Permite que Dash sirva su layout, assets, dependencias y callbacks reactivos POST
    sin requerir servidores proxy externos ni Node.js, operando 100% en Python.
    """

    def dispatch(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        environ = request.environ.copy()

        # Asegurar compatibilidad de PATH_INFO
        path_info = environ.get('PATH_INFO', '')
        if not path_info.startswith('/analitica/dash'):
            environ['PATH_INFO'] = f"/analitica/dash{path_info}"

        status_code = 200
        headers_list = []

        def start_response(status: str, headers: list, exc_info: Any = None) -> None:
            nonlocal status_code, headers_list
            status_code = int(status.split()[0])
            headers_list = headers

        # En solicitudes POST (callbacks de Dash), proveer un stream fresco con el body
        if request.method in ('POST', 'PUT', 'PATCH'):
            body_bytes = request.body
            environ['wsgi.input'] = BytesIO(body_bytes)
            environ['CONTENT_LENGTH'] = str(len(body_bytes))

        # Invocar la aplicación WSGI de Dash/Flask en el mismo proceso de Python
        try:
            response_iter = dash_app.server.wsgi_app(environ, start_response)
            response_content = b''.join(response_iter)
        except Exception as exc:
            logger.error("Error al procesar solicitud WSGI de Dash: %s", exc, exc_info=True)
            return HttpResponse(f"Error interno en componente Dash: {str(exc)}", status=500)

        # Reconstruir respuesta HTTP compatible con Django
        django_response = HttpResponse(content=response_content, status=status_code)

        for header_key, header_val in headers_list:
            key_lower = header_key.lower()
            if key_lower == 'content-type':
                django_response['Content-Type'] = header_val
            elif key_lower not in ('content-length', 'content-encoding'):
                django_response[header_key] = header_val

        return django_response
