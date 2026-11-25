"""Configuración de la aplicación Django de Automatización y Tareas Programadas."""

import os
import sys
from django.apps import AppConfig


class AutomationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.automation'
    verbose_name = 'Automatización y Scheduler'

    def ready(self) -> None:
        """Inicializa componentes del ciclo de vida de la aplicación.

        Inicia de manera segura el scheduler de fondo si SCHEDULER_AUTOSTART está
        habilitado en la configuración y no estamos en un comando de gestión
        como migraciones o ejecución de pruebas unitarias.
        """
        # Comandos de gestión donde no se debe disparar el scheduler
        management_commands = ['makemigrations', 'migrate', 'collectstatic', 'test', 'pytest', 'createsuperuser']
        if any(cmd in sys.argv for cmd in management_commands):
            return

        from django.conf import settings
        if getattr(settings, 'SCHEDULER_AUTOSTART', False):
            # En modo DEBUG con runserver, evitar doble arranque usando RUN_MAIN
            if os.environ.get('RUN_MAIN') == 'true' or not settings.DEBUG:
                from services.scheduler_service import scheduler_service
                scheduler_service.start()
