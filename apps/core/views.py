from django.shortcuts import render
from django.views import View


class HomeView(View):
    """Vista principal de bienvenida y acceso al centro de control."""
    def get(self, request):
        return render(request, 'core/home.html', {
            'title': 'Plataforma Inteligente de Control de TMO',
        })
