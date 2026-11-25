"""Modelos de datos para el módulo de automatizaciones y tareas programadas.

Define las entidades responsables de persistir la configuración de tareas,
el historial auditable de cada ejecución (ExecutionLog) y los destinatarios
de alertas por correo corporativo.
"""

from django.db import models
from django.utils import timezone


class AutomationJob(models.Model):
    """Representa una tarea programada administrada por el scheduler."""

    JOB_TYPE_CHOICES = [
        ('HOURLY_AUDIT', 'Auditoría Horaria de TMO'),
        ('DAILY_SUMMARY', 'Resumen Diario Consolidado'),
        ('CLEANUP', 'Mantenimiento de Archivos Temporales'),
    ]

    name = models.CharField(
        max_length=150,
        verbose_name="Nombre de la Tarea",
        help_text="Identificador legible de la automatización."
    )
    job_type = models.CharField(
        max_length=50,
        choices=JOB_TYPE_CHOICES,
        default='HOURLY_AUDIT',
        verbose_name="Tipo de Tarea"
    )
    interval_minutes = models.PositiveIntegerField(
        default=60,
        verbose_name="Frecuencia (Minutos)",
        help_text="Intervalo periódico de ejecución programada."
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="¿Activa?",
        help_text="Indica si el programador ejecutará esta tarea automáticamente."
    )
    last_run_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Última Ejecución"
    )
    next_run_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Próxima Ejecución Estimada"
    )
    total_runs = models.PositiveIntegerField(
        default=0,
        verbose_name="Total Ejecuciones"
    )
    successful_runs = models.PositiveIntegerField(
        default=0,
        verbose_name="Ejecuciones Exitosas"
    )
    failed_runs = models.PositiveIntegerField(
        default=0,
        verbose_name="Ejecuciones Fallidas"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )

    class Meta:
        verbose_name = "Tarea Programada"
        verbose_name_plural = "Tareas Programadas"
        ordering = ['name']

    def __str__(self) -> str:
        estado = "ACTIVA" if self.is_active else "PAUSADA"
        return f"{self.name} ({estado} - cada {self.interval_minutes} min)"

    @property
    def success_rate(self) -> float:
        """Calcula el porcentaje de éxito histórico de la tarea."""
        if self.total_runs == 0:
            return 100.0
        return round((self.successful_runs / self.total_runs) * 100.0, 1)


class ExecutionLog(models.Model):
    """Registro inmutable y auditable de cada corrida de automatización."""

    TRIGGER_CHOICES = [
        ('SCHEDULED', 'Programado por APScheduler'),
        ('MANUAL', 'Disparo Manual desde Panel'),
    ]

    STATUS_CHOICES = [
        ('RUNNING', 'En Ejecución'),
        ('SUCCESS', 'Completado con Éxito'),
        ('WARNING', 'Completado con Advertencias'),
        ('FAILED', 'Fallido'),
    ]

    job = models.ForeignKey(
        AutomationJob,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs',
        verbose_name="Tarea Asociada"
    )
    job_name = models.CharField(
        max_length=150,
        default="Auditoría Horaria de TMO",
        verbose_name="Nombre de la Ejecución"
    )
    trigger_type = models.CharField(
        max_length=20,
        choices=TRIGGER_CHOICES,
        default='SCHEDULED',
        verbose_name="Tipo de Disparo"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='RUNNING',
        verbose_name="Estado de Ejecución"
    )
    started_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Hora de Inicio"
    )
    finished_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Hora de Finalización"
    )
    duration_seconds = models.FloatField(
        default=0.0,
        verbose_name="Duración (segundos)"
    )
    records_processed = models.PositiveIntegerField(
        default=0,
        verbose_name="Registros Procesados"
    )
    agents_evaluated = models.PositiveIntegerField(
        default=0,
        verbose_name="Asesores Evaluados"
    )
    compliant_agents = models.PositiveIntegerField(
        default=0,
        verbose_name="Asesores Cumplen (TMO <= Meta)"
    )
    observation_agents = models.PositiveIntegerField(
        default=0,
        verbose_name="Asesores en Observación"
    )
    critical_agents = models.PositiveIntegerField(
        default=0,
        verbose_name="Asesores Críticos (TMO > Meta)"
    )
    global_weighted_tmo = models.FloatField(
        default=0.0,
        verbose_name="TMO Ponderado Global (min)"
    )
    email_sent = models.BooleanField(
        default=False,
        verbose_name="¿Alerta Despachada por Correo?"
    )
    email_recipient = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Destinatario del Correo"
    )
    report_file_path = models.CharField(
        max_length=500,
        blank=True,
        default='',
        verbose_name="Ruta del Reporte Excel Generado"
    )
    summary = models.TextField(
        blank=True,
        default='',
        verbose_name="Resumen Ejecutivo de la Corrida"
    )
    error_trace = models.TextField(
        blank=True,
        default='',
        verbose_name="Traza de Error (Si aplica)"
    )

    class Meta:
        verbose_name = "Historial de Ejecución"
        verbose_name_plural = "Historial de Ejecuciones"
        ordering = ['-started_at']

    def __str__(self) -> str:
        return f"[{self.get_status_display()}] {self.job_name} - {self.started_at.strftime('%Y-%m-%d %H:%M:%S')}"


class AutomationAlertRecipient(models.Model):
    """Destinatarios configurados para recibir reportes y alertas periódicas."""

    name = models.CharField(
        max_length=150,
        verbose_name="Nombre del Destinatario"
    )
    email = models.EmailField(
        unique=True,
        verbose_name="Correo Electrónico"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="¿Activo para Envíos?"
    )
    notify_on_critical_only = models.BooleanField(
        default=False,
        verbose_name="Notificar Solo si Existen Asesores Críticos"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Registro"
    )

    class Meta:
        verbose_name = "Destinatario de Alerta"
        verbose_name_plural = "Destinatarios de Alertas"
        ordering = ['name']

    def __str__(self) -> str:
        return f"{self.name} <{self.email}>"
