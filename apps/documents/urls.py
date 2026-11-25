from django.urls import path
from . import views

app_name = "documents"

urlpatterns = [
    path("", views.DocumentListView.as_view(), name="list"),
    path("<int:pk>/reprocess/", views.DocumentReprocessView.as_view(), name="reprocess"),
    path("generate-sample/", views.GenerateSampleDataView.as_view(), name="generate_sample"),
]
