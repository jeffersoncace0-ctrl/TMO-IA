from pathlib import Path
import pytest
from django.test import Client
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.operations.models import IngestedFile, CallRecord, Agent

BASE_DIR = Path(__file__).resolve().parent.parent


@pytest.mark.django_db
def test_upload_excel_view_flow():
    """Valida el flujo web completo de carga de archivo, persistencia en BD y redirección."""
    client = Client()
    demo_path = BASE_DIR / 'sample_data' / 'call_center_dataset_demo.xlsx'

    with open(demo_path, 'rb') as f:
        uploaded = SimpleUploadedFile(
            name='call_center_dataset_demo.xlsx',
            content=f.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    response = client.post('/operaciones/cargar/', {'file': uploaded}, follow=True)
    assert response.status_code == 200

    # Comprobar registros en base de datos
    assert IngestedFile.objects.count() == 1
    ingested = IngestedFile.objects.first()
    assert ingested.valid_rows >= 80
    assert ingested.status == 'PROCESSED'

    # Validar agentes creados
    assert Agent.objects.count() >= 5

    # Validar llamadas creadas
    assert CallRecord.objects.count() == 92


@pytest.mark.django_db
def test_download_report_endpoint():
    """Valida que el endpoint de descarga retorne un archivo Excel con status 200."""
    client = Client()
    demo_path = BASE_DIR / 'sample_data' / 'call_center_dataset_demo.xlsx'

    with open(demo_path, 'rb') as f:
        uploaded = SimpleUploadedFile(
            name='call_center_dataset_demo.xlsx',
            content=f.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    client.post('/operaciones/cargar/', {'file': uploaded}, follow=True)

    # Descargar reporte consolidado
    res = client.get('/operaciones/reporte/descargar/')
    assert res.status_code == 200
    assert res['Content-Type'] == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    assert 'attachment;' in res['Content-Disposition']
    assert len(res.content) > 5000
