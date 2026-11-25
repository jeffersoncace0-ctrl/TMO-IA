from django.shortcuts import render
from django.views import View


class DashboardView(View):
    """Vista principal contenedora del Dashboard analítico interactivo."""
    def get(self, request):
        return render(request, 'analytics/dashboard.html', {'title': 'Dashboard Analítico de TMO'})
