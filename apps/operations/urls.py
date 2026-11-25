from django.urls import path
from .views import UploadExcelView, FileDetailView, CallRecordsListView, DownloadReportView

app_name = 'operations'

urlpatterns = [
    path('cargar/', UploadExcelView.as_view(), name='upload_excel'),
    path('lote/<int:file_id>/', FileDetailView.as_view(), name='file_detail'),
    path('llamadas/', CallRecordsListView.as_view(), name='calls_list'),
    path('reporte/descargar/', DownloadReportView.as_view(), name='download_report_all'),
    path('reporte/descargar/<int:file_id>/', DownloadReportView.as_view(), name='download_report_file'),
]
