"""Servicio empresarial para el despacho de alertas y notificaciones por correo electrónico.

Construye correos corporativos en formato HTML enriquecido con resumen
ejecutivo de métricas de TMO, tablas de asesores en alerta y adjunta el
reporte consolidado de Excel generado automáticamente.
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import pandas as pd
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

logger = logging.getLogger('services.email')


class EmailNotificationService:
    """Gestiona el formateo y envío de alertas ejecutivas de control de TMO."""

    @classmethod
    def send_hourly_audit_alert(
        cls,
        calculation_result: Optional[Dict[str, Any]] = None,
        kpis: Optional[Dict[str, Any]] = None,
        df_agents: Optional[Union[pd.DataFrame, List[Dict[str, Any]]]] = None,
        report_path: Optional[str] = None,
        recipients: Optional[List[str]] = None,
    ) -> Tuple[bool, str]:
        """Envía un informe de corte horario con resumen visual y archivo adjunto.

        Permite pasar kpis y df_agents directamente o un diccionario unificado calculation_result.
        """
        # Resolver parámetros para máxima compatibilidad
        summary_data: Dict[str, Any] = {}
        if kpis is not None:
            summary_data = kpis
        elif calculation_result is not None:
            summary_data = calculation_result.get('global_summary', calculation_result)

        # Resolver lista o DataFrame de asesores
        agents_data: List[Dict[str, Any]] = []
        if df_agents is not None:
            if isinstance(df_agents, pd.DataFrame):
                agents_data = df_agents.to_dict(orient='records')
            elif isinstance(df_agents, list):
                agents_data = df_agents
        elif calculation_result is not None:
            agents_data = calculation_result.get('agent_metrics', [])

        # Determinar lista de destinatarios
        to_emails: List[str] = cls._resolve_recipients(recipients)
        if not to_emails:
            msg = "No se especificaron destinatarios válidos para el despacho de la alerta."
            logger.warning(msg)
            return False, msg

        # Extraer métricas globales
        threshold = float(summary_data.get('threshold', getattr(settings, 'DEFAULT_TMO_THRESHOLD', 20.0)))
        total_calls = int(summary_data.get('total_calls', 0))
        weighted_tmo = float(summary_data.get('weighted_tmo_global', summary_data.get('weighted_tmo_minutes', 0.0)))
        critical_count = int(summary_data.get('review_agents', summary_data.get('critical_agents', 0)))
        observation_count = int(summary_data.get('observation_agents', 0))
        approved_count = int(summary_data.get('approved_agents', 0))
        total_agents = int(summary_data.get('total_agents', len(agents_data)))

        # Determinar asunto del correo según nivel de criticidad
        timestamp_str = timezone.now().strftime('%Y-%m-%d %H:%M')
        if critical_count > 0:
            subject = f"🚨 [ALERTA CRÍTICA] TMO Enterprise: {critical_count} Asesores Desviados ({timestamp_str})"
        else:
            subject = f"✅ [OPERACIÓN REGULAR] TMO Enterprise: Corte Horario Aprobado ({timestamp_str})"

        # Generar versión en texto plano
        text_body = cls._build_plain_text(
            summary_data=summary_data,
            agents_data=agents_data,
            threshold=threshold,
            timestamp=timestamp_str
        )

        # Generar versión HTML corporativa
        html_body = cls._build_html_template(
            summary_data=summary_data,
            agents_data=agents_data,
            threshold=threshold,
            timestamp=timestamp_str,
            critical_count=critical_count,
            observation_count=observation_count,
            approved_count=approved_count,
            total_agents=total_agents,
            weighted_tmo=weighted_tmo,
            total_calls=total_calls
        )

        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'notificaciones@empresa.com')

        try:
            email_msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=from_email,
                to=to_emails
            )
            email_msg.attach_alternative(html_body, "text/html")

            # Adjuntar reporte Excel si la ruta existe físicamente
            if report_path and os.path.exists(report_path):
                file_name = Path(report_path).name
                with open(report_path, 'rb') as f:
                    file_content = f.read()
                email_msg.attach(
                    filename=file_name,
                    content=file_content,
                    mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                logger.info("Adjuntado reporte Excel %s al correo.", file_name)

            # Intentar despacho SMTP real
            email_msg.send(fail_silently=False)
            success_msg = f"Alerta despachada exitosamente a {len(to_emails)} destinatario(s): {', '.join(to_emails)}"
            logger.info(success_msg)
            return True, success_msg

        except Exception as exc:
            error_msg = f"Fallo al enviar correo SMTP: {str(exc)}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg

    @classmethod
    def _resolve_recipients(cls, recipients: Optional[List[str]]) -> List[str]:
        """Obtiene la lista final de correos verificando fuentes de configuración."""
        if recipients and len(recipients) > 0:
            return [email.strip() for email in recipients if email and '@' in email]

        try:
            from apps.automation.models import AutomationAlertRecipient
            db_emails = list(
                AutomationAlertRecipient.objects.filter(is_active=True).values_list('email', flat=True)
            )
            if db_emails:
                return db_emails
        except Exception as db_err:
            logger.debug("No se pudo consultar AutomationAlertRecipient: %s", db_err)

        fallback_email = getattr(settings, 'SMTP_NOTIFICATION_RECIPIENT', '')
        if fallback_email and '@' in fallback_email:
            return [fallback_email.strip()]

        return []

    @classmethod
    def _build_plain_text(
        cls,
        summary_data: Dict[str, Any],
        agents_data: List[Dict[str, Any]],
        threshold: float,
        timestamp: str
    ) -> str:
        """Genera versión de respaldo en texto plano."""
        critical_agents = [
            a for a in agents_data
            if a.get('status') == 'REQUIERE REVISIÓN' or a.get('classification') == 'REQUIERE REVISIÓN'
        ]

        weighted_tmo = summary_data.get('weighted_tmo_global', summary_data.get('weighted_tmo_minutes', 0.0))
        total_calls = summary_data.get('total_calls', 0)
        total_agents = summary_data.get('total_agents', len(agents_data))
        approved = summary_data.get('approved_agents', 0)
        observation = summary_data.get('observation_agents', 0)
        critical = summary_data.get('review_agents', summary_data.get('critical_agents', len(critical_agents)))

        text = (
            f"=== TMO ENTERPRISE - INFORME EJECUTIVO DE CORTE HORARIO ===\n"
            f"Fecha de Corte: {timestamp}\n"
            f"Meta TMO Establecida: {threshold:.2f} s\n"
            f"TMO Ponderado Global: {weighted_tmo:.2f} s\n"
            f"Llamadas Procesadas: {total_calls}\n"
            f"Asesores Evaluados: {total_agents}\n"
            f"- Aprobados: {approved}\n"
            f"- En Observación: {observation}\n"
            f"- Críticos: {critical}\n\n"
        )

        if critical_agents:
            text += "ASESORES CRÍTICOS (SUPERAN META):\n"
            for ag in critical_agents:
                ag_name = ag.get('agent_name', ag.get('agent_code', 'Desconocido'))
                ag_tmo = ag.get('tmo', ag.get('tmo_minutes', 0.0))
                ag_calls = ag.get('total_calls', 0)
                text += f" - {ag_name}: TMO {ag_tmo:.2f}s ({ag_calls} llamadas)\n"
        else:
            text += "Todos los asesores se encuentran operando dentro de los rangos tolerables.\n"

        text += "\nConsulte el archivo Excel adjunto para ver las métricas analíticas completas."
        return text

    @classmethod
    def _build_html_template(
        cls,
        summary_data: Dict[str, Any],
        agents_data: List[Dict[str, Any]],
        threshold: float,
        timestamp: str,
        critical_count: int,
        observation_count: int,
        approved_count: int,
        total_agents: int,
        weighted_tmo: float,
        total_calls: int,
    ) -> str:
        """Construye una plantilla HTML responsive compatible con gestores de correo corporativos."""
        header_color = "#DC2626" if critical_count > 0 else "#2563EB"
        header_title = "INFORME DE ALERTA OPERATIVA: TMO CRÍTICO" if critical_count > 0 else "INFORME PERIÓDICO DE CONTROL DE TMO"

        # Construir filas de tabla para asesores
        agent_rows_html = ""
        # Priorizar asesores críticos primero
        def sort_key(x):
            st = x.get('status', x.get('classification', ''))
            return (0 if st == 'REQUIERE REVISIÓN' else (1 if st == 'EN OBSERVACIÓN' else 2), -float(x.get('tmo', x.get('tmo_minutes', 0.0))))

        sorted_agents = sorted(agents_data, key=sort_key)

        for ag in sorted_agents[:15]:
            status_val = ag.get('status', ag.get('classification', 'APROBADO'))
            if status_val == 'REQUIERE REVISIÓN':
                badge_bg = '#FEE2E2'
                badge_color = '#991B1B'
                badge_label = 'CRÍTICO'
            elif status_val == 'EN OBSERVACIÓN':
                badge_bg = '#FEF3C7'
                badge_color = '#92400E'
                badge_label = 'OBSERVACIÓN'
            else:
                badge_bg = '#DCFCE7'
                badge_color = '#166534'
                badge_label = 'APROBADO'

            tmo_val = float(ag.get('tmo', ag.get('tmo_minutes', 0.0)))
            calls_val = ag.get('total_calls', 0)
            dev_val = float(ag.get('excess_seconds', ag.get('deviation_from_threshold', tmo_val - threshold)))
            dev_str = f"+{dev_val:.2f}" if dev_val > 0 else f"{dev_val:.2f}"

            agent_rows_html += f"""
            <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 10px 12px; font-weight: 600; color: #1F2937;">{ag.get('agent_name', '')}</td>
                <td style="padding: 10px 12px; text-align: center; color: #4B5563;">{calls_val}</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #111827;">{tmo_val:.2f} s</td>
                <td style="padding: 10px 12px; text-align: right; color: {'#DC2626' if dev_val > 0 else '#059669'}; font-weight: 600;">{dev_str} s</td>
                <td style="padding: 10px 12px; text-align: center;">
                    <span style="background-color: {badge_bg}; color: {badge_color}; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
                        {badge_label}
                    </span>
                </td>
            </tr>
            """

        html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte TMO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="650" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #E5E7EB;">
                    <!-- Cabecera -->
                    <tr>
                        <td style="background-color: {header_color}; padding: 28px 32px; color: #FFFFFF;">
                            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">TMO Enterprise Analytics</div>
                            <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 800; line-height: 1.2;">{header_title}</h1>
                            <div style="margin-top: 8px; font-size: 13px; opacity: 0.95;">Corte Automático: {timestamp} (UTC-5)</div>
                        </td>
                    </tr>

                    <!-- Tarjetas de Resumen KPI -->
                    <tr>
                        <td style="padding: 24px 32px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td width="31%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; text-align: center;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">TMO Global</div>
                                        <div style="font-size: 24px; font-weight: 800; color: #0F172A; margin: 4px 0;">{weighted_tmo:.2f} <span style="font-size: 14px; font-weight: 500;">s</span></div>
                                        <div style="font-size: 11px; color: #64748B;">Meta: {threshold:.2f} s</div>
                                    </td>
                                    <td width="3%"></td>
                                    <td width="31%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; text-align: center;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Llamadas</div>
                                        <div style="font-size: 24px; font-weight: 800; color: #0F172A; margin: 4px 0;">{total_calls:,}</div>
                                        <div style="font-size: 11px; color: #64748B;">Analizadas</div>
                                    </td>
                                    <td width="3%"></td>
                                    <td width="31%" style="background-color: {'#FEF2F2' if critical_count > 0 else '#F0FDF4'}; border: 1px solid {'#FECACA' if critical_count > 0 else '#BBF7D0'}; border-radius: 8px; padding: 14px; text-align: center;">
                                        <div style="font-size: 11px; font-weight: 700; color: {'#991B1B' if critical_count > 0 else '#166534'}; text-transform: uppercase;">Críticos</div>
                                        <div style="font-size: 24px; font-weight: 800; color: {'#DC2626' if critical_count > 0 else '#16A34A'}; margin: 4px 0;">{critical_count}</div>
                                        <div style="font-size: 11px; color: {'#991B1B' if critical_count > 0 else '#166534'};">De {total_agents} Asesores</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Desglose de Clasificación -->
                    <tr>
                        <td style="padding: 0 32px 16px 32px;">
                            <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 16px; font-size: 13px;">
                                <strong>Distribución del Personal:</strong>
                                <span style="color: #059669; font-weight: 700; margin-left: 8px;">✔ {approved_count} Aprobados</span>
                                <span style="color: #D97706; font-weight: 700; margin-left: 12px;">⚠ {observation_count} En Observación</span>
                                <span style="color: #DC2626; font-weight: 700; margin-left: 12px;">✖ {critical_count} Requieren Revisión</span>
                            </div>
                        </td>
                    </tr>

                    <!-- Tabla de Asesores -->
                    <tr>
                        <td style="padding: 0 32px 24px 32px;">
                            <div style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 10px;">
                                Estado Detallado de Asesores:
                            </div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background-color: #F3F4F6; border-bottom: 2px solid #E5E7EB;">
                                        <th style="padding: 10px 12px; text-align: left; font-weight: 700; color: #4B5563;">Asesor</th>
                                        <th style="padding: 10px 12px; text-align: center; font-weight: 700; color: #4B5563;">Llamadas</th>
                                        <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #4B5563;">TMO</th>
                                        <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #4B5563;">Desvío</th>
                                        <th style="padding: 10px 12px; text-align: center; font-weight: 700; color: #4B5563;">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agent_rows_html}
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    <!-- Pie de página -->
                    <tr>
                        <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 20px 32px; font-size: 12px; color: #6B7280; text-align: center;">
                            <p style="margin: 0 0 6px 0;">Este mensaje fue generado automáticamente por el motor de automatización <strong>APScheduler</strong> de la plataforma TMO Enterprise.</p>
                            <p style="margin: 0;">Se ha adjuntado el libro oficial de Excel con las 4 pestañas de auditoría, gráficos nativos y desglose por tipología.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""
        return html
