import hashlib
from django.db import models


class Agent(models.Model):
    """
    Representa a un asesor o agente telefónico del Call Center.
    """
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name="Código de Agente"
    )
    name = models.CharField(
        max_length=150,
        verbose_name="Nombre del Agente"
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
        verbose_name = "Agente"
        verbose_name_plural = "Agentes"
        ordering = ['code']

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class IngestedFile(models.Model):
    """
    Auditoría e historial de cada archivo Excel cargado en la plataforma.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pendiente'),
        ('PROCESSED', 'Procesado Exitosamente'),
        ('FAILED', 'Fallido'),
    )

    filename = models.CharField(
        max_length=255,
        verbose_name="Nombre del Archivo"
    )
    sha256_hash = models.CharField(
        max_length=64,
        db_index=True,
        verbose_name="Hash SHA-256 (Idempotencia)"
    )
    file_size_bytes = models.PositiveIntegerField(
        verbose_name="Tamaño en Bytes"
    )
    total_rows = models.PositiveIntegerField(
        default=0,
        verbose_name="Total de Filas"
    )
    valid_rows = models.PositiveIntegerField(
        default=0,
        verbose_name="Filas Válidas"
    )
    invalid_rows = models.PositiveIntegerField(
        default=0,
        verbose_name="Filas Inválidas"
    )
    duplicate_rows = models.PositiveIntegerField(
        default=0,
        verbose_name="Filas Duplicadas"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name="Estado de Ingesta"
    )
    error_message = models.TextField(
        blank=True,
        default='',
        verbose_name="Detalle de Error"
    )
    file = models.FileField(
        upload_to='uploads/%Y/%m/%d/',
        verbose_name="Archivo Almacenado"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Ingesta"
    )

    class Meta:
        verbose_name = "Archivo Ingestado"
        verbose_name_plural = "Archivos Ingestados"
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.filename} ({self.status}) - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class CallRecord(models.Model):
    """
    Registro individual de llamada telefónica saneado y normalizado.
    """
    CALL_TYPES = (
        ('ENTRANTE', 'Llamada Entrante (Inbound)'),
        ('SALIENTE', 'Llamada Saliente (Outbound)'),
    )

    CALL_STATUSES = (
        ('CONTESTADA', 'Contestada'),
        ('PERDIDA', 'Perdida'),
        ('ABANDONADA', 'Abandonada'),
    )

    call_id = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="Identificador Único de Llamada"
    )
    ingested_file = models.ForeignKey(
        IngestedFile,
        on_delete=models.CASCADE,
        related_name='calls',
        verbose_name="Archivo Origen"
    )
    agent = models.ForeignKey(
        Agent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='calls',
        verbose_name="Agente Asignado"
    )
    call_datetime = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha y Hora de la Llamada"
    )
    call_type = models.CharField(
        max_length=50,
        choices=CALL_TYPES,
        default='ENTRANTE',
        verbose_name="Tipo de Llamada"
    )
    call_status = models.CharField(
        max_length=50,
        choices=CALL_STATUSES,
        default='CONTESTADA',
        verbose_name="Estado de la Llamada"
    )
    total_duration_seconds = models.FloatField(
        default=0.0,
        verbose_name="Duración Total (Segundos)"
    )
    talk_time_seconds = models.FloatField(
        default=0.0,
        verbose_name="Tiempo de Conversación (Segundos)"
    )
    wait_time_seconds = models.FloatField(
        default=0.0,
        verbose_name="Tiempo de Espera en Fila (Segundos)"
    )
    wrap_up_time_seconds = models.FloatField(
        default=0.0,
        verbose_name="Tiempo Post-Llamada / Wrap-Up (Segundos)"
    )
    silence_time_seconds = models.FloatField(
        default=0.0,
        verbose_name="Tiempo de Silencio / Pausa (Segundos)"
    )
    is_valid = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Es Registro Válido"
    )
    is_duplicate = models.BooleanField(
        default=False,
        verbose_name="Es Duplicado Exacto"
    )
    validation_error = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Causa de Invalidez"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Registro"
    )

    class Meta:
        verbose_name = "Registro de Llamada"
        verbose_name_plural = "Registros de Llamadas"
        ordering = ['-call_datetime', '-id']

    def __str__(self) -> str:
        return f"{self.call_id} | {self.agent.code if self.agent else 'N/A'} | {self.total_duration_seconds}s"


class ThresholdConfig(models.Model):
    """
    Parámetros globales y umbrales deterministas para el cálculo de cumplimiento.
    """
    name = models.CharField(
        max_length=100,
        default='Política Estándar de Call Center',
        verbose_name="Nombre de la Política"
    )
    threshold_seconds = models.FloatField(
        default=20.0,
        verbose_name="Umbral Objetivo de TMO (Segundos)"
    )
    warning_multiplier = models.FloatField(
        default=1.15,
        verbose_name="Multiplicador de Alerta / Observación (Ej: 1.15 = +15%)"
    )
    z_score_threshold = models.FloatField(
        default=2.0,
        verbose_name="Umbral Z-Score para Detección de Outliers"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Política Activa"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Modificación"
    )

    class Meta:
        verbose_name = "Configuración de Umbral"
        verbose_name_plural = "Configuraciones de Umbral"

    def __str__(self) -> str:
        return f"{self.name} - Meta: {self.threshold_seconds}s (Activa: {self.is_active})"
