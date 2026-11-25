"""
Vistas para la carga, gestión y reprocesamiento de documentos comerciales.
"""

from pathlib import Path
from django.views.generic import View, ListView
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from django.core.files.base import ContentFile
import pandas as pd
import io

from apps.documents.models import UploadedDocument
from apps.documents.forms import DocumentUploadForm
from apps.documents.services import process_document_etl


class DocumentListView(View):
    """
    Lista los documentos cargados y procesa la subida de nuevos archivos.
    """
    template_name = "documents/document_list.html"

    def get(self, request):
        documents = UploadedDocument.objects.all()
        form = DocumentUploadForm()
        return render(request, self.template_name, {"documents": documents, "form": form})

    def post(self, request):
        form = DocumentUploadForm(request.POST, request.FILES)
        if form.is_valid():
            uploaded_file = request.FILES["file"]
            ext = Path(uploaded_file.name).suffix.upper().replace(".", "")
            if ext == "CSV":
                file_type = "CSV"
            elif ext == "XLS":
                file_type = "XLS"
            else:
                file_type = "XLSX"

            doc = UploadedDocument.objects.create(
                file=uploaded_file,
                filename=uploaded_file.name,
                file_type=file_type,
                file_size_bytes=uploaded_file.size,
                status="PENDING",
            )

            # Procesamiento ETL inmediato
            success, msg = process_document_etl(doc)
            if success:
                messages.success(request, f"Archivo '{doc.filename}' cargado y procesado con éxito ({doc.row_count} filas).")
            else:
                messages.warning(request, f"Archivo cargado pero con errores de validación: {msg}")

            return redirect("documents:list")

        documents = UploadedDocument.objects.all()
        return render(request, self.template_name, {"documents": documents, "form": form})


class DocumentReprocessView(View):
    """
    Permite reprocesar manualmente un documento previamente cargado.
    """
    def post(self, request, pk):
        doc = get_object_or_404(UploadedDocument, pk=pk)
        success, msg = process_document_etl(doc)
        if success:
            messages.success(request, f"Documento '{doc.filename}' reprocesado: {msg}")
        else:
            messages.error(request, f"Error al reprocesar '{doc.filename}': {msg}")
        return redirect("documents:list")


class GenerateSampleDataView(View):
    """
    Genera un archivo Excel de prueba con datos comerciales verídicos para auditoría.
    Permite verificar la plataforma con 1 clic sin tener que diseñar manualmente un Excel.
    """
    def post(self, request):
        import random
        from datetime import date, timedelta

        regiones = ["Norte", "Sur", "Centro", "Occidente", "Oriente"]
        categorias = ["Hardware Enterprise", "Servicios Cloud", "Soporte SLA", "Licenciamiento", "Consultoría"]
        clientes = [
            "Banco Santander Corporativo", "Cencosud Retail", "Grupo Éxito",
            "PetroTech Internacional", "Claro Telecomunicaciones", "Avianca Cargo",
            "Seguros Bolívar", "Cementos Argos", "Ecopetrol Operaciones", "Falabella Tech"
        ]
        estados = ["PAGADA", "PAGADA", "PAGADA", "PENDIENTE", "ANULADA"]

        data = []
        base_date = date.today() - timedelta(days=60)

        for i in range(1, 121):
            codigo = f"FAC-2026-{1000 + i}"
            cliente = random.choice(clientes)
            region = random.choice(regiones)
            categoria = random.choice(categorias)
            cantidad = random.randint(1, 45)
            precio_unitario = round(random.uniform(150.0, 3200.0), 2)
            fecha_transaccion = (base_date + timedelta(days=random.randint(0, 58))).strftime("%Y-%m-%d")
            estado = random.choice(estados)

            data.append({
                "codigo_factura": codigo,
                "cliente": cliente,
                "region": region,
                "categoria_producto": categoria,
                "cantidad": cantidad,
                "precio_unitario": precio_unitario,
                "fecha_transaccion": fecha_transaccion,
                "estado": estado,
            })

        df = pd.DataFrame(data)

        # Guardar en buffer en memoria como archivo Excel
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Facturas_Auditoria")

        buffer.seek(0)
        filename = f"facturas_auditoria_muestra_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        # Crear el documento y ejecutar el ETL
        doc = UploadedDocument(
            filename=filename,
            file_type="XLSX",
            file_size_bytes=buffer.getbuffer().nbytes,
            status="PENDING",
        )
        doc.file.save(filename, ContentFile(buffer.getvalue()))
        doc.save()

        success, msg = process_document_etl(doc)
        if success:
            messages.success(request, f"¡Conjunto de prueba generado! Se crearon {doc.row_count} registros comerciales verídicos.")
        else:
            messages.error(request, f"Error al procesar la muestra: {msg}")

        return redirect("documents:list")
