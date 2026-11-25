"""
Registro de modelos documentales en el panel administrativo de Django.
"""

from django.contrib import admin
from apps.documents.models import UploadedDocument, CommercialRecord


@admin.register(UploadedDocument)
class UploadedDocumentAdmin(admin.ModelAdmin):
    list_display = ("filename", "file_type", "status", "row_count", "uploaded_at", "processed_at")
    list_filter = ("status", "file_type", "uploaded_at")
    search_fields = ("filename", "error_message")
    readonly_fields = ("uploaded_at", "processed_at", "row_count", "file_size_bytes")


@admin.register(CommercialRecord)
class CommercialRecordAdmin(admin.ModelAdmin):
    list_display = (
        "invoice_code",
        "client_name",
        "region",
        "product_category",
        "quantity",
        "total_amount",
        "transaction_date",
        "status",
    )
    list_filter = ("region", "product_category", "status", "transaction_date")
    search_fields = ("invoice_code", "client_name")
    readonly_fields = ("created_at", "total_amount", "tax_amount")
