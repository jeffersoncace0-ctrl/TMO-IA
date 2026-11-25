"""Aplicación interactiva Dash para el Dashboard Analítico de TMO.

Construye la interfaz visual pura en Python utilizando Dash, Dash Core Components (dcc),
Dash HTML Components (html) y gráficos vectoriales avanzados de Plotly.
Conecta de forma reactiva con el ORM de Django y TMOCalculatorService.
"""

from typing import Any, Dict, List, Tuple
import dash
from dash import dcc, html, Input, Output
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from django.conf import settings

from apps.operations.models import Agent, CallRecord, ThresholdConfig
from services.tmo_calculator import TMOCalculatorService


# Paleta corporativa oscura (Dark Theme) coherente con la plataforma
DARK_THEME = {
    'bg_card': '#1E293B',
    'bg_main': '#0F172A',
    'border': '#334155',
    'text': '#F8FAFC',
    'text_muted': '#94A3B8',
    'primary': '#3B82F6',
    'success': '#10B981',
    'warning': '#F59E0B',
    'danger': '#EF4444',
    'purple': '#8B5CF6',
}

# Inicialización de la aplicación Dash
# requests_pathname_prefix permite montar la app en /analitica/dash/
dash_app = dash.Dash(
    __name__,
    requests_pathname_prefix='/analitica/dash/',
    routes_pathname_prefix='/analitica/dash/',
    suppress_callback_exceptions=True,
    title='Dashboard Analítico TMO'
)

# Estilos reutilizables para tarjetas y controles
CARD_STYLE = {
    'backgroundColor': DARK_THEME['bg_card'],
    'border': f"1px solid {DARK_THEME['border']}",
    'borderRadius': '10px',
    'padding': '16px',
    'color': DARK_THEME['text'],
    'boxShadow': '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
}

KPI_CARD_STYLE = {
    'backgroundColor': DARK_THEME['bg_card'],
    'border': f"1px solid {DARK_THEME['border']}",
    'borderRadius': '10px',
    'padding': '16px',
    'textAlign': 'center',
    'flex': '1',
    'minWidth': '200px'
}


def build_layout() -> html.Div:
    """Construye el árbol de componentes del layout principal del Dashboard."""
    return html.Div(
        style={
            'backgroundColor': DARK_THEME['bg_main'],
            'minHeight': '100vh',
            'padding': '20px',
            'fontFamily': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            'color': DARK_THEME['text']
        },
        children=[
            # Intervalo opcional de auto-refresco (cada 60 segundos)
            dcc.Interval(id='interval-refresh', interval=60000, n_intervals=0),

            # Barra superior de filtros y controles interactivos
            html.Div(
                style=CARD_STYLE,
                children=[
                    html.Div(
                        style={'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'flexWrap': 'wrap', 'gap': '15px'},
                        children=[
                            html.Div([
                                html.H2("📊 Inteligencia Operativa de TMO", style={'margin': '0', 'fontSize': '1.4rem', 'color': '#60A5FA', 'fontWeight': '700'}),
                                html.P("Monitoreo continuo de llamadas, auditoría de tiempos y detección estadística de desvíos.", style={'margin': '4px 0 0 0', 'fontSize': '0.85rem', 'color': DARK_THEME['text_muted']})
                            ]),
                            html.Div([
                                html.Button(
                                    "🔄 Actualizar Datos",
                                    id='btn-refresh',
                                    n_clicks=0,
                                    style={
                                        'backgroundColor': DARK_THEME['primary'],
                                        'color': '#FFFFFF',
                                        'border': 'none',
                                        'padding': '8px 16px',
                                        'borderRadius': '6px',
                                        'fontWeight': '600',
                                        'cursor': 'pointer',
                                        'fontSize': '0.85rem'
                                    }
                                )
                            ])
                        ]
                    ),
                    html.Hr(style={'borderColor': DARK_THEME['border'], 'margin': '15px 0'}),
                    # Fila de controles interactivos
                    html.Div(
                        style={'display': 'flex', 'gap': '20px', 'flexWrap': 'wrap', 'alignItems': 'center'},
                        children=[
                            # Selector de Asesor
                            html.Div(
                                style={'flex': '2', 'minWidth': '260px'},
                                children=[
                                    html.Label("Filtrar por Asesor:", style={'fontSize': '0.8rem', 'fontWeight': '600', 'color': DARK_THEME['text_muted'], 'marginBottom': '6px', 'display': 'block'}),
                                    dcc.Dropdown(
                                        id='dropdown-agent',
                                        clearable=False,
                                        style={'color': '#0F172A', 'fontSize': '0.9rem'}
                                    )
                                ]
                            ),
                            # Slider dinámico de Umbral Objetivo
                            html.Div(
                                style={'flex': '3', 'minWidth': '320px'},
                                children=[
                                    html.Div(
                                        style={'display': 'flex', 'justifyContent': 'space-between'},
                                        children=[
                                            html.Label("Simulador de Umbral TMO:", style={'fontSize': '0.8rem', 'fontWeight': '600', 'color': DARK_THEME['text_muted']}),
                                            html.Span(id='label-threshold-val', style={'fontSize': '0.85rem', 'fontWeight': '700', 'color': '#60A5FA'})
                                        ]
                                    ),
                                    dcc.Slider(
                                        id='slider-threshold',
                                        min=5,
                                        max=60,
                                        step=1,
                                        value=getattr(settings, 'DEFAULT_TMO_THRESHOLD', 20.0),
                                        marks={10: '10s', 20: '20s', 30: '30s', 45: '45s', 60: '60s'},
                                        tooltip={'placement': 'bottom', 'always_visible': False}
                                    )
                                ]
                            ),
                        ]
                    )
                ]
            ),

            # Tarjetas de Indicadores Clave (KPI Cards)
            html.Div(
                id='kpi-cards-container',
                style={'display': 'flex', 'gap': '15px', 'flexWrap': 'wrap', 'marginTop': '15px'}
            ),

            # Fila 1 de Gráficos: TMO vs Umbral & Torta de Cumplimiento
            html.Div(
                style={'display': 'grid', 'gridTemplateColumns': 'repeat(auto-fit, minmax(450px, 1fr))', 'gap': '15px', 'marginTop': '15px'},
                children=[
                    html.Div(
                        style=CARD_STYLE,
                        children=[
                            html.H3("Comparativo de TMO por Asesor vs. Meta", style={'margin': '0 0 10px 0', 'fontSize': '1.05rem', 'fontWeight': '700'}),
                            dcc.Graph(id='graph-bar-tmo', config={'displayModeBar': False})
                        ]
                    ),
                    html.Div(
                        style=CARD_STYLE,
                        children=[
                            html.H3("Distribución de Cumplimiento Operativo", style={'margin': '0 0 10px 0', 'fontSize': '1.05rem', 'fontWeight': '700'}),
                            dcc.Graph(id='graph-pie-status', config={'displayModeBar': False})
                        ]
                    ),
                ]
            ),

            # Fila 2 de Gráficos: Outliers Z-Score & Desglose de Tiempos
            html.Div(
                style={'display': 'grid', 'gridTemplateColumns': 'repeat(auto-fit, minmax(450px, 1fr))', 'gap': '15px', 'marginTop': '15px'},
                children=[
                    html.Div(
                        style=CARD_STYLE,
                        children=[
                            html.H3("Detección Estadística de Outliers (Z-Score)", style={'margin': '0 0 10px 0', 'fontSize': '1.05rem', 'fontWeight': '700'}),
                            dcc.Graph(id='graph-scatter-outliers', config={'displayModeBar': False})
                        ]
                    ),
                    html.Div(
                        style=CARD_STYLE,
                        children=[
                            html.H3("Composición de Tiempos por Asesor", style={'margin': '0 0 10px 0', 'fontSize': '1.05rem', 'fontWeight': '700'}),
                            dcc.Graph(id='graph-stacked-times', config={'displayModeBar': False})
                        ]
                    ),
                ]
            ),

            # Fila 3: Tabla Detallada de Asesores
            html.Div(
                style={**CARD_STYLE, 'marginTop': '15px'},
                children=[
                    html.H3("📋 Auditoría Individual Detallada de Asesores", style={'margin': '0 0 12px 0', 'fontSize': '1.05rem', 'fontWeight': '700'}),
                    html.Div(id='table-agents-container')
                ]
            )
        ]
    )


dash_app.layout = build_layout


def fetch_call_center_data() -> Tuple[pd.DataFrame, float, float]:
    """Consulta la base de datos de Django para extraer registros de llamadas y configuración."""
    records_qs = CallRecord.objects.select_related('agent').filter(is_valid=True)

    records_list = []
    for r in records_qs:
        agent_code = r.agent.code if r.agent else 'AG-000'
        agent_name = r.agent.name if r.agent else 'Asesor Desconocido'
        records_list.append({
            'call_id': r.call_id,
            'agent_code': agent_code,
            'agent_name': agent_name,
            'call_datetime': r.call_datetime,
            'call_status': r.call_status,
            'total_duration': r.total_duration_seconds,
            'talk_time': r.talk_time_seconds,
            'wait_time': r.wait_time_seconds,
            'silence_time': r.silence_time_seconds,
            'wrap_up_time': r.wrap_up_time_seconds,
        })

    df = pd.DataFrame(records_list)

    # Obtener umbral activo configurado
    threshold_obj = ThresholdConfig.objects.filter(is_active=True).first()
    target_tmo = threshold_obj.threshold_seconds if threshold_obj else getattr(settings, 'DEFAULT_TMO_THRESHOLD', 20.0)
    warning_mult = threshold_obj.warning_multiplier if threshold_obj else 1.15

    return df, target_tmo, warning_mult


# Callback para poblar dinámicamente las opciones del Dropdown de Asesores
@dash_app.callback(
    Output('dropdown-agent', 'options'),
    Output('dropdown-agent', 'value'),
    Input('btn-refresh', 'n_clicks'),
    Input('interval-refresh', 'n_intervals')
)
def update_agent_dropdown(n_clicks: int, n_intervals: int) -> Tuple[List[Dict[str, str]], str]:
    """Carga los asesores disponibles desde la base de datos."""
    df, _, _ = fetch_call_center_data()
    options = [{'label': '👥 Todos los Asesores (Consolidado)', 'value': 'ALL'}]

    if not df.empty:
        unique_agents = df[['agent_code', 'agent_name']].drop_duplicates().sort_values(by='agent_name')
        for _, row in unique_agents.iterrows():
            options.append({
                'label': f"{row['agent_name']} ({row['agent_code']})",
                'value': str(row['agent_code'])
            })

    return options, 'ALL'


# Callback principal reactivo del Dashboard
@dash_app.callback(
    Output('label-threshold-val', 'children'),
    Output('kpi-cards-container', 'children'),
    Output('graph-bar-tmo', 'figure'),
    Output('graph-pie-status', 'figure'),
    Output('graph-scatter-outliers', 'figure'),
    Output('graph-stacked-times', 'figure'),
    Output('table-agents-container', 'children'),
    Input('slider-threshold', 'value'),
    Input('dropdown-agent', 'value'),
    Input('btn-refresh', 'n_clicks'),
    Input('interval-refresh', 'n_intervals')
)
def update_dashboard(
    selected_threshold: float,
    selected_agent: str,
    n_clicks: int,
    n_intervals: int
) -> Tuple[str, List[html.Div], go.Figure, go.Figure, go.Figure, go.Figure, html.Table]:
    """Calcula todas las métricas y genera los gráficos reactivos de Plotly."""
    threshold = float(selected_threshold or 20.0)
    label_threshold = f"Meta: {threshold:.1f} segundos"

    df_valid, _, warning_mult = fetch_call_center_data()

    # Si no hay datos cargados en la base de datos
    if df_valid.empty:
        empty_fig = go.Figure()
        empty_fig.update_layout(
            template='plotly_dark',
            paper_bgcolor=DARK_THEME['bg_card'],
            plot_bgcolor=DARK_THEME['bg_card'],
            annotations=[{
                'text': 'No se registran llamadas cargadas en el sistema.',
                'xref': 'paper',
                'yref': 'paper',
                'showarrow': False,
                'font': {'size': 14, 'color': DARK_THEME['text_muted']}
            }]
        )
        empty_kpi = [html.Div("No hay registros disponibles. Cargue un archivo Excel en Operaciones.", style=CARD_STYLE)]
        empty_table = html.Div("Sin datos.", style={'color': DARK_THEME['text_muted']})
        return label_threshold, empty_kpi, empty_fig, empty_fig, empty_fig, empty_fig, empty_table

    # Calcular resúmenes individuales y globales usando TMOCalculatorService
    df_agents = TMOCalculatorService.calculate_agent_summaries(
        df_valid=df_valid,
        threshold=threshold,
        warning_multiplier=warning_mult
    )
    kpis = TMOCalculatorService.calculate_global_kpis(
        df_valid=df_valid,
        df_agents=df_agents,
        threshold=threshold
    )

    # Filtrar por asesor seleccionado si no es 'ALL'
    if selected_agent and selected_agent != 'ALL':
        df_agents_display = df_agents[df_agents['agent_code'] == selected_agent]
        df_calls_display = df_valid[df_valid['agent_code'] == selected_agent]
    else:
        df_agents_display = df_agents
        df_calls_display = df_valid

    # 1. Construir Tarjetas KPI
    tmo_global = kpis.get('weighted_tmo_global', 0.0)
    total_calls = kpis.get('total_calls', 0)
    compliance_rate = kpis.get('compliance_rate', 0.0)
    review_count = kpis.get('review_agents', 0)

    kpi_cards = [
        html.Div(style=KPI_CARD_STYLE, children=[
            html.Div("TMO Ponderado Global", style={'fontSize': '0.75rem', 'color': DARK_THEME['text_muted'], 'textTransform': 'uppercase', 'fontWeight': '600'}),
            html.Div(f"{tmo_global:.2f} s", style={'fontSize': '1.75rem', 'fontWeight': '800', 'color': DARK_THEME['success'] if tmo_global <= threshold else DARK_THEME['danger'], 'margin': '4px 0'}),
            html.Div(f"Meta: {threshold:.1f}s", style={'fontSize': '0.75rem', 'color': DARK_THEME['text_muted']})
        ]),
        html.Div(style=KPI_CARD_STYLE, children=[
            html.Div("Total Llamadas Válidas", style={'fontSize': '0.75rem', 'color': DARK_THEME['text_muted'], 'textTransform': 'uppercase', 'fontWeight': '600'}),
            html.Div(f"{total_calls:,}", style={'fontSize': '1.75rem', 'fontWeight': '800', 'color': '#F8FAFC', 'margin': '4px 0'}),
            html.Div(f"{kpis.get('answered_calls', 0)} Contestadas", style={'fontSize': '0.75rem', 'color': DARK_THEME['primary']})
        ]),
        html.Div(style=KPI_CARD_STYLE, children=[
            html.Div("Tasa de Cumplimiento", style={'fontSize': '0.75rem', 'color': DARK_THEME['text_muted'], 'textTransform': 'uppercase', 'fontWeight': '600'}),
            html.Div(f"{compliance_rate:.1f}%", style={'fontSize': '1.75rem', 'fontWeight': '800', 'color': DARK_THEME['success'] if compliance_rate >= 80 else DARK_THEME['warning'], 'margin': '4px 0'}),
            html.Div(f"{kpis.get('approved_agents', 0)} de {kpis.get('total_agents', 0)} Aprobados", style={'fontSize': '0.75rem', 'color': DARK_THEME['text_muted']})
        ]),
        html.Div(style=KPI_CARD_STYLE, children=[
            html.Div("Asesores en Riesgo / Críticos", style={'fontSize': '0.75rem', 'color': DARK_THEME['text_muted'], 'textTransform': 'uppercase', 'fontWeight': '600'}),
            html.Div(f"{review_count}", style={'fontSize': '1.75rem', 'fontWeight': '800', 'color': DARK_THEME['danger'] if review_count > 0 else DARK_THEME['success'], 'margin': '4px 0'}),
            html.Div("Requieren Auditoría Inmediata", style={'fontSize': '0.75rem', 'color': DARK_THEME['danger'] if review_count > 0 else DARK_THEME['text_muted']})
        ]),
    ]

    # 2. Gráfico 1: Barras TMO vs Umbral
    color_map = {
        'APROBADO': DARK_THEME['success'],
        'EN OBSERVACIÓN': DARK_THEME['warning'],
        'REQUIERE REVISIÓN': DARK_THEME['danger']
    }

    fig_bar = go.Figure()
    for status, color in color_map.items():
        subset = df_agents_display[df_agents_display['status'] == status]
        if not subset.empty:
            fig_bar.add_trace(go.Bar(
                x=subset['agent_name'],
                y=subset['tmo'],
                name=status,
                marker_color=color,
                hovertemplate="<b>%{x}</b><br>TMO: %{y:.2f}s<br>Llamadas: %{customdata}<extra></extra>",
                customdata=subset['total_calls']
            ))

    # Línea de Meta / Umbral
    fig_bar.add_hline(
        y=threshold,
        line_dash="dash",
        line_color="#60A5FA",
        annotation_text=f"Meta: {threshold}s",
        annotation_position="top right",
        annotation_font_color="#60A5FA"
    )

    fig_bar.update_layout(
        template='plotly_dark',
        paper_bgcolor=DARK_THEME['bg_card'],
        plot_bgcolor=DARK_THEME['bg_card'],
        margin={'l': 40, 'r': 20, 't': 20, 'b': 60},
        xaxis={'tickangle': -25, 'color': DARK_THEME['text_muted']},
        yaxis={'title': 'TMO (Segundos)', 'color': DARK_THEME['text_muted']},
        legend={'orientation': 'h', 'yanchor': 'bottom', 'y': 1.02, 'xanchor': 'right', 'x': 1}
    )

    # 3. Gráfico 2: Torta / Donut de Cumplimiento
    status_counts = df_agents['status'].value_counts()
    fig_pie = go.Figure(data=[go.Pie(
        labels=status_counts.index,
        values=status_counts.values,
        hole=0.6,
        marker={'colors': [color_map.get(s, '#94A3B8') for s in status_counts.index]},
        textinfo='label+percent',
        hovertemplate="<b>%{label}</b>: %{value} asesores (%{percent})<extra></extra>"
    )])
    fig_pie.update_layout(
        template='plotly_dark',
        paper_bgcolor=DARK_THEME['bg_card'],
        plot_bgcolor=DARK_THEME['bg_card'],
        margin={'l': 20, 'r': 20, 't': 20, 'b': 20},
        showlegend=False,
        annotations=[{
            'text': f"Total<br><b>{len(df_agents)}</b><br>Asesores",
            'x': 0.5, 'y': 0.5,
            'font': {'size': 13, 'color': '#F8FAFC'},
            'showarrow': False
        }]
    )

    # 4. Gráfico 3: Dispersión Z-Score / Outliers
    fig_scatter = go.Figure()
    fig_scatter.add_trace(go.Scatter(
        x=df_agents_display['total_calls'],
        y=df_agents_display['tmo'],
        mode='markers+text',
        marker={
            'size': np.clip(df_agents_display['silence_percentage'] * 0.8, 12, 35),
            'color': [DARK_THEME['danger'] if out else DARK_THEME['primary'] for out in df_agents_display['is_outlier']],
            'showscale': False,
            'opacity': 0.85
        },
        text=df_agents_display['agent_name'],
        textposition="top center",
        hovertemplate="<b>%{text}</b><br>Llamadas: %{x}<br>TMO: %{y:.2f}s<br>Z-Score: %{customdata[0]}<br>Silencio: %{customdata[1]}%<extra></extra>",
        customdata=list(zip(df_agents_display['z_score'], df_agents_display['silence_percentage']))
    ))
    fig_scatter.update_layout(
        template='plotly_dark',
        paper_bgcolor=DARK_THEME['bg_card'],
        plot_bgcolor=DARK_THEME['bg_card'],
        margin={'l': 40, 'r': 20, 't': 20, 'b': 40},
        xaxis={'title': 'Volumen de Llamadas', 'color': DARK_THEME['text_muted']},
        yaxis={'title': 'TMO Individual (s)', 'color': DARK_THEME['text_muted']}
    )

    # 5. Gráfico 4: Composición de Tiempos Apilados
    fig_stacked = go.Figure()
    fig_stacked.add_trace(go.Bar(
        name='Conversación (Talk Time)',
        x=df_agents_display['agent_name'],
        y=df_agents_display['talk_time'] / df_agents_display['total_calls'],
        marker_color='#3B82F6'
    ))
    fig_stacked.add_trace(go.Bar(
        name='Espera / Silencio',
        x=df_agents_display['agent_name'],
        y=(df_agents_display['wait_time'] + df_agents_display['silence_time']) / df_agents_display['total_calls'],
        marker_color='#F59E0B'
    ))
    fig_stacked.add_trace(go.Bar(
        name='Wrap-Up Post-Llamada',
        x=df_agents_display['agent_name'],
        y=df_agents_display['wrap_up_time'] / df_agents_display['total_calls'],
        marker_color='#8B5CF6'
    ))
    fig_stacked.update_layout(
        barmode='stack',
        template='plotly_dark',
        paper_bgcolor=DARK_THEME['bg_card'],
        plot_bgcolor=DARK_THEME['bg_card'],
        margin={'l': 40, 'r': 20, 't': 20, 'b': 60},
        xaxis={'tickangle': -25, 'color': DARK_THEME['text_muted']},
        yaxis={'title': 'Segundos Promedio por Llamada', 'color': DARK_THEME['text_muted']},
        legend={'orientation': 'h', 'yanchor': 'bottom', 'y': 1.02, 'xanchor': 'right', 'x': 1}
    )

    # 6. Tabla de Auditoría en HTML puro de Dash
    table_rows = []
    for _, ag in df_agents_display.iterrows():
        st = ag['status']
        badge_bg = '#065F46' if st == 'APROBADO' else ('#78350F' if st == 'EN OBSERVACIÓN' else '#7F1D1D')
        badge_color = '#34D399' if st == 'APROBADO' else ('#FBBF24' if st == 'EN OBSERVACIÓN' else '#F87171')

        excess = ag['excess_seconds']
        excess_str = f"+{excess:.2f}s" if excess > 0 else f"{excess:.2f}s"

        table_rows.append(html.Tr(
            style={'borderBottom': f"1px solid {DARK_THEME['border']}"},
            children=[
                html.Td(ag['agent_code'], style={'padding': '8px 12px', 'color': DARK_THEME['text_muted']}),
                html.Td(ag['agent_name'], style={'padding': '8px 12px', 'fontWeight': '600'}),
                html.Td(str(ag['total_calls']), style={'padding': '8px 12px', 'textAlign': 'center'}),
                html.Td(f"{ag['tmo']:.2f}s", style={'padding': '8px 12px', 'textAlign': 'right', 'fontWeight': '700'}),
                html.Td(f"{ag['silence_percentage']:.1f}%", style={'padding': '8px 12px', 'textAlign': 'right'}),
                html.Td(excess_str, style={'padding': '8px 12px', 'textAlign': 'right', 'color': DARK_THEME['danger'] if excess > 0 else DARK_THEME['success']}),
                html.Td(f"{ag['z_score']:.2f}", style={'padding': '8px 12px', 'textAlign': 'center', 'fontWeight': '600', 'color': DARK_THEME['danger'] if ag['is_outlier'] else DARK_THEME['text_muted']}),
                html.Td(
                    html.Span(st, style={'backgroundColor': badge_bg, 'color': badge_color, 'padding': '2px 8px', 'borderRadius': '4px', 'fontSize': '0.75rem', 'fontWeight': '700'}),
                    style={'padding': '8px 12px', 'textAlign': 'center'}
                ),
            ]
        ))

    table = html.Table(
        style={'width': '100%', 'borderCollapse': 'collapse', 'fontSize': '0.85rem'},
        children=[
            html.Thead(
                html.Tr(
                    style={'borderBottom': f"2px solid {DARK_THEME['border']}", 'color': DARK_THEME['text_muted'], 'textTransform': 'uppercase', 'fontSize': '0.75rem'},
                    children=[
                        html.Th("Código", style={'padding': '8px 12px', 'textAlign': 'left'}),
                        html.Th("Nombre Asesor", style={'padding': '8px 12px', 'textAlign': 'left'}),
                        html.Th("Llamadas", style={'padding': '8px 12px', 'textAlign': 'center'}),
                        html.Th("TMO", style={'padding': '8px 12px', 'textAlign': 'right'}),
                        html.Th("% Silencio", style={'padding': '8px 12px', 'textAlign': 'right'}),
                        html.Th("Desvío", style={'padding': '8px 12px', 'textAlign': 'right'}),
                        html.Th("Z-Score", style={'padding': '8px 12px', 'textAlign': 'center'}),
                        html.Th("Clasificación", style={'padding': '8px 12px', 'textAlign': 'center'}),
                    ]
                )
            ),
            html.Tbody(table_rows)
        ]
    )

    return (
        label_threshold,
        kpi_cards,
        fig_bar,
        fig_pie,
        fig_scatter,
        fig_stacked,
        table
    )
