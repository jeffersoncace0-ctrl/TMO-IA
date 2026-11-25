"""
Modelos de datos para la gestión documental y almacenamiento de registros comerciales.
"""

from django.db import models
from django.utils import timezone


class UploadedDocument(models.Model):
    """
    Representa un archivo Excel o CSV cargado para procesamiento ETL.
    """
    STATUS_CHOICES = [
        ("PENDING", "Pendiente"),
        ("PROCESSING", "En Procesamiento"),
        ("COMPLETED", "Procesado Exitosamente"),
        ("FAILED", "Error de Procesamiento"),
    ]

    FILE_TYPES = [
        ("XLSX", "Excel (.xlsx)"),
        ("XLS", "Excel (.xls)"),
        ("CSV", "Valores Separados por Coma (.csv)"),
    ]

    file = models.FileField(upload_to="uploads/%Y/%m/", verbose_name="Archivo")
    filename = models.CharField(max_length=255, verbose_name="Nombre Original")
    file_type = models.CharField(max_length=10, choices=FILE_TYPES, verbose_name="Tipo de Archivo")
    file_size_bytes = models.PositiveIntegerField(verbose_name="Tamaño (Bytes)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING", verbose_name="Estado")
    row_count = models.PositiveIntegerField(default=0, verbose_name="Filas Procesadas")
    error_message = models.TextField(blank=True, default="", verbose_name="Mensaje de Error")
    uploaded_at = models.DateTimeField(default=timezone.now, verbose_name="Fecha de Carga")
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Procesamiento")

    class Meta:
        verbose_name = "Documento Cargado"
        verbose_name_plural = "Documentos Cargados"
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return f"{self.filename} ({self.get_status_display()})"


class CommercialRecord(models.Model):
    """
    Almacena los registros tabulares normalizados extraídos del archivo mediante Pandas.
    """
    STATUS_CHOICES = [
        ("PAID", "Pagada"),
        ("PENDING", "Pendiente"),
        ("CANCELLED", "Anulada"),
    ]

    document = models.ForeignKey(
        UploadedDocument,
        on_delete=models.CASCADE,
        related_name="records",
        verbose_name="Documento Origen",
    )
    invoice_code = models.CharField(max_length=50, verbose_name="Código de Factura", db_index=True)
    client_name = models.CharField(max_length=150, verbose_name="Cliente")
    region = models.CharField(max_length=50, verbose_name="Región", db_index=True)
    product_category = models.CharField(max_length=80, verbose_name="Categoría de Producto", db_index=True)
    quantity = models.PositiveIntegerField(verbose_name="Cantidad")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Precio Unitario")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, verbose_name="Monto Total")
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Impuesto (IVA)")
    transaction_date = models.DateField(verbose_name="Fecha de Transacción", db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING", verbose_name="Estado de Pago")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Inserción")

    class Meta:
        verbose_name = "Registro Comercial"
        verbose_name_plural = "Registros Comerciales"
        ordering = ["-transaction_date"]
        indexes = [
            models.Index(fields=["region", "transaction_date"]),
            models.Index(fields=["product_category", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.invoice_code} - {self.client_name} (${self.total_amount})"
