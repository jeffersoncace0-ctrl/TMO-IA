"""
Formularios para la carga y validación de documentos.
"""

from django import forms
from apps.documents.models import UploadedDocument

ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"]


class DocumentUploadForm(forms.ModelForm):
    """
    Formulario con validación estricta de extensiones permitidas.
    """
    class Meta:
        model = UploadedDocument
        fields = ["file"]
        widgets = {
            "file": forms.FileInput(attrs={"class": "form-control", "accept": ".xlsx,.xls,.csv"}),
        }

    def clean_file(self):
        uploaded_file = self.cleaned_data.get("file")
        if not uploaded_file:
            raise forms.ValidationError("Debe seleccionar un archivo.")

        # Validar extensión
        import os
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise forms.ValidationError(
                f"Extensión no permitida '{ext}'. Formatos válidos: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Validar tamaño máximo (25 MB)
        max_bytes = 25 * 1024 * 1024
        if uploaded_file.size > max_bytes:
            raise forms.ValidationError("El archivo supera el tamaño máximo permitido de 25 MB.")

        return uploaded_file
