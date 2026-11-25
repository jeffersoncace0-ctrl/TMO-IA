from django import forms
from .models import ThresholdConfig


class ExcelUploadForm(forms.Form):
    """
    Formulario estricto para la ingesta y validación de archivos Excel de llamadas.
    """
    file = forms.FileField(
        label="Archivo Excel de Telefonía (.xlsx, .xls)",
        widget=forms.ClearableFileInput(attrs={
            'class': 'form-file-input',
            'accept': '.xlsx, .xls',
        }),
        help_text="Formatos admitidos: .xlsx, .xls (Máximo 50 MB)"
    )
    custom_threshold = forms.FloatField(
        label="Umbral Objetivo de TMO para este lote (segundos)",
        required=False,
        min_value=1.0,
        max_value=3600.0,
        widget=forms.NumberInput(attrs={
            'class': 'form-number-input',
            'placeholder': '20.0',
            'step': '0.5'
        }),
        help_text="Opcional. Si se deja en blanco, se aplicará el umbral global activo."
    )

    def clean_file(self):
        uploaded_file = self.cleaned_data['file']
        filename = uploaded_file.name.lower()

        # Validación de extensión
        if not (filename.endswith('.xlsx') or filename.endswith('.xls')):
            raise forms.ValidationError("El archivo seleccionado no es un libro de Excel válido (.xlsx o .xls).")

        # Validación de tamaño máximo (50 MB)
        max_size = 50 * 1024 * 1024
        if uploaded_file.size > max_size:
            raise forms.ValidationError(f"El archivo excede el tamaño máximo permitido de 50 MB ({uploaded_file.size / (1024*1024):.1f} MB).")

        return uploaded_file
