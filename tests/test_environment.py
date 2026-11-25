"""
Pruebas automatizadas de configuración del entorno y arranque de Django (Fase 2).
"""
import os
import pytest
from django.conf import settings
from django.test import Client


@pytest.mark.django_db
def test_django_settings_loaded():
    """Valida que las variables de configuración se carguen correctamente desde el entorno."""
    assert settings.SECRET_KEY is not None
    assert len(settings.SECRET_KEY) > 10
    assert 'apps.core.apps.CoreConfig' in settings.INSTALLED_APPS
    assert 'apps.operations.apps.OperationsConfig' in settings.INSTALLED_APPS
    assert 'apps.analytics.apps.AnalyticsConfig' in settings.INSTALLED_APPS
    assert 'apps.automation.apps.AutomationConfig' in settings.INSTALLED_APPS
    assert settings.DEFAULT_TMO_THRESHOLD == 20.0
    assert settings.CRITICAL_Z_SCORE == 2.0


@pytest.mark.django_db
def test_home_page_status_code():
    """Verifica que la página principal responda HTTP 200 OK y cargue el layout base."""
    client = Client()
    response = client.get('/')
    assert response.status_code == 200
    assert b'Enterprise Suite' in response.content


@pytest.mark.django_db
def test_routing_urls_resolvable():
    """Verifica la resolución correcta de las rutas declaradas en cada módulo."""
    client = Client()
    assert client.get('/operaciones/cargar/').status_code == 200
    assert client.get('/analitica/dashboard/').status_code == 200
    assert client.get('/automatizacion/panel/').status_code == 200
