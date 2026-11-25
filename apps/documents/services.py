"""
Servicio orquestador del procesamiento ETL para documentos comerciales.
"""

from pathlib import Path
from typing import Tuple
from django.utils import timezone
from django.db import transaction
import logging

from apps.documents.models import UploadedDocument, CommercialRecord
from services.excel_processor import read_file_to_dataframe
from services.data_cleaner import clean_commercial_dataframe

logger = logging.getLogger("documents")


def process_document_etl(document: UploadedDocument) -> Tuple[bool, str]:
    """
    Ejecuta el ciclo de vida completo de ETL sobre un documento:
    1. Marca el documento como 'PROCESSING'.
    2. Lee el archivo a un DataFrame con Pandas/OpenPyXL.
    3. Aplica reglas de limpieza y validación.
    4. Inserta registros masivos en la base de datos usando bulk_create.
    5. Actualiza el estado final del documento ('COMPLETED' o 'FAILED').

    :param document: Instancia de UploadedDocument.
    :return: Tupla (éxito, mensaje_resultado).
    """
    logger.info("Iniciando procesamiento ETL para el documento ID=%d: %s", document.pk, document.filename)

    document.status = "PROCESSING"
    document.error_message = ""
    document.save(update_fields=["status", "error_message"])

    try:
        file_path = Path(document.file.path)
        if not file_path.exists():
            raise FileNotFoundError(f"El archivo físico no existe en disco: {file_path}")

        # Extracción
        df_raw = read_file_to_dataframe(file_path)

        # Transformación y validación
        cleaning_result = clean_commercial_dataframe(df_raw)
        if not cleaning_result.is_valid:
            error_details = " | ".join(cleaning_result.errors)
            document.status = "FAILED"
            document.error_message = error_details
            document.save(update_fields=["status", "error_message"])
            logger.warning("Documento ID=%d falló validaciones: %s", document.pk, error_details)
            return False, error_details

        df_clean = cleaning_result.dataframe

        # Carga en Base de Datos de manera atómica
        with transaction.atomic():
            # Limpiar registros previos si era un reprocesamiento
            CommercialRecord.objects.filter(document=document).delete()

            # Mapeo a instancias de modelos
            records_to_create = [
                CommercialRecord(
                    document=document,
                    invoice_code=row["invoice_code"],
                    client_name=row["client_name"],
                    region=row["region"],
                    product_category=row["product_category"],
                    quantity=row["quantity"],
                    unit_price=row["unit_price"],
                    total_amount=row["total_amount"],
                    tax_amount=row["tax_amount"],
                    transaction_date=row["transaction_date"],
                    status=row["status"],
                )
                for _, row in df_clean.iterrows()
            ]

            # Inserción masiva en lotes de 500 registros para alta eficiencia
            CommercialRecord.objects.bulk_create(records_to_create, batch_size=500)

        # Actualización de metadatos del documento
        document.status = "COMPLETED"
        document.row_count = len(records_to_create)
        document.processed_at = timezone.now()
        document.save(update_fields=["status", "row_count", "processed_at"])

        msg = f"Procesamiento exitoso: {len(records_to_create)} registros comerciales insertados."
        logger.info("Documento ID=%d completado. %s", document.pk, msg)
        return True, msg

    except Exception as exc:
        err_msg = f"Error crítico durante el procesamiento: {str(exc)}"
        logger.exception("Fallo en ETL para documento ID=%d: %s", document.pk, str(exc))
        document.status = "FAILED"
        document.error_message = err_msg
        document.save(update_fields=["status", "error_message"])
        return False, err_msg
