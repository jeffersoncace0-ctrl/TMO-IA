"""
Dashboard Analítico Comercial y Financiero Interactivo desarrollado con Dash y Plotly.
Integrado de manera nativa en el servidor WSGI del sistema unificado.
"""

from typing import List, Dict, Any
import dash
import dash_bootstrap_components as dbc
from dash import html, dcc, Input, Output
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from apps.documents.models import CommercialRecord

# Instancia nativa de Dash para analítica comercial WSGI
commercial_dash_app = dash.Dash(
    __name__,
    requests_pathname_prefix='/dashboards/dash/',
    external_stylesheets=[dbc.themes.BOOTSTRAP]
)

commercial_dash_app.title = "Analítica Comercial & Facturación | Enterprise Core"


def get_current_dataframe() -> pd.DataFrame:
    """Extrae los registros actuales de la base de datos a un DataFrame de Pandas."""
    records = CommercialRecord.objects.all().values(
        "invoice_code",
        "client_name",
        "region",
        "product_category",
        "quantity",
        "unit_price",
        "total_amount",
        "tax_amount",
        "transaction_date",
        "status",
    )
    df = pd.DataFrame(list(records))
    if df.empty:
        return pd.DataFrame(
            columns=[
                "invoice_code", "client_name", "region", "product_category",
                "quantity", "unit_price", "total_amount", "tax_amount", "transaction_date", "status"
            ]
        )
    df["total_amount"] = pd.to_numeric(df["total_amount"], errors="coerce").fillna(0.0)
    df["tax_amount"] = pd.to_numeric(df["tax_amount"], errors="coerce").fillna(0.0)
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"], errors="coerce")
    return df


LIGHT_CARD_STYLE = {
    "backgroundColor": "#FFFFFF",
    "border": "1px solid #E2E8F0",
    "borderRadius": "14px",
    "padding": "1.25rem 1.5rem",
    "boxShadow": "0 2px 8px rgba(15, 23, 42, 0.04)",
}

LIGHT_LABEL_STYLE = {
    "fontSize": "0.78rem",
    "fontWeight": "600",
    "textTransform": "uppercase",
    "letterSpacing": "0.04em",
    "color": "#64748B",
    "marginBottom": "0.35rem",
}

LIGHT_VALUE_STYLE = {
    "fontSize": "1.9rem",
    "fontWeight": "800",
    "color": "#0F172A",
    "letterSpacing": "-0.02em",
    "fontVariantNumeric": "tabular-nums",
    "marginBottom": "0",
    "lineHeight": "1.2",
}

# Layout de la Aplicación Dash Comercial
commercial_dash_app.layout = dbc.Container(
    [
        # Barra superior de filtros cruzados
        html.Div(
            dbc.Row(
                [
                    dbc.Col(
                        [
                            html.Label("Región Comercial", style={"fontSize": "0.825rem", "fontWeight": "600", "color": "#334155"}),
                            dcc.Dropdown(
                                id="filter-region",
                                options=[{"label": "Todas las Regiones", "value": "ALL"}],
                                value="ALL",
                                clearable=False,
                            ),
                        ],
                        md=4,
                    ),
                    dbc.Col(
                        [
                            html.Label("Categoría de Producto", style={"fontSize": "0.825rem", "fontWeight": "600", "color": "#334155"}),
                            dcc.Dropdown(
                                id="filter-category",
                                options=[{"label": "Todas las Categorías", "value": "ALL"}],
                                value="ALL",
                                clearable=False,
                            ),
                        ],
                        md=4,
                    ),
                    dbc.Col(
                        [
                            html.Label("Estado de Facturación", style={"fontSize": "0.825rem", "fontWeight": "600", "color": "#334155"}),
                            dcc.Dropdown(
                                id="filter-status",
                                options=[
                                    {"label": "Todos los Estados", "value": "ALL"},
                                    {"label": "Pagadas", "value": "PAGADA"},
                                    {"label": "Pendientes", "value": "PENDIENTE"},
                                    {"label": "Anuladas", "value": "ANULADA"},
                                ],
                                value="ALL",
                                clearable=False,
                            ),
                        ],
                        md=4,
                    ),
                ],
                className="g-3 align-items-end",
            ),
            style={
                "backgroundColor": "#F8FAFC",
                "border": "1px solid #E2E8F0",
                "borderRadius": "14px",
                "padding": "1.25rem 1.5rem",
                "marginBottom": "1.5rem",
            },
        ),

        # 4 Tarjetas de Métricas Clave
        dbc.Row(
            [
                dbc.Col(
                    html.Div(
                        [
                            html.Div("Facturación Total", style=LIGHT_LABEL_STYLE),
                            html.H3(id="kpi-total-revenue", children="$0.00", style=LIGHT_VALUE_STYLE),
                            html.Div("Ingresos acumulados auditados", style={"fontSize": "0.75rem", "color": "#64748B", "marginTop": "0.35rem"}),
                        ],
                        style=LIGHT_CARD_STYLE,
                    ),
                    md=3,
                ),
                dbc.Col(
                    html.Div(
                        [
                            html.Div("Impuestos Calculados (IVA)", style=LIGHT_LABEL_STYLE),
                            html.H3(id="kpi-total-tax", children="$0.00", style=LIGHT_VALUE_STYLE),
                            html.Div("Tasa calculada al 19%", style={"fontSize": "0.75rem", "color": "#64748B", "marginTop": "0.35rem"}),
                        ],
                        style=LIGHT_CARD_STYLE,
                    ),
                    md=3,
                ),
                dbc.Col(
                    html.Div(
                        [
                            html.Div("Unidades Transaccionadas", style=LIGHT_LABEL_STYLE),
                            html.H3(id="kpi-total-units", children="0", style=LIGHT_VALUE_STYLE),
                            html.Div("Volumen de productos despachados", style={"fontSize": "0.75rem", "color": "#64748B", "marginTop": "0.35rem"}),
                        ],
                        style=LIGHT_CARD_STYLE,
                    ),
                    md=3,
                ),
                dbc.Col(
                    html.Div(
                        [
                            html.Div("Ticket Promedio / Factura", style=LIGHT_LABEL_STYLE),
                            html.H3(id="kpi-avg-ticket", children="$0.00", style=LIGHT_VALUE_STYLE),
                            html.Div("Valor medio por transacción", style={"fontSize": "0.75rem", "color": "#64748B", "marginTop": "0.35rem"}),
                        ],
                        style=LIGHT_CARD_STYLE,
                    ),
                    md=3,
                ),
            ],
            className="g-3 mb-4",
        ),

        # Visualizaciones Gráficas
        dbc.Row(
            [
                dbc.Col(
                    html.Div(
                        [
                            html.Div(
                                "Facturación por Región y Categoría",
                                style={"fontSize": "0.95rem", "fontWeight": "700", "color": "#0F172A", "marginBottom": "0.75rem"},
                            ),
                            dcc.Graph(id="chart-bar-region", config={"displayModeBar": False}),
                        ],
                        style=LIGHT_CARD_STYLE,
                    ),
                    md=7,
                ),
                dbc.Col(
                    html.Div(
                        [
                            html.Div(
                                "Distribución por Estado de Facturación",
                                style={"fontSize": "0.95rem", "fontWeight": "700", "color": "#0F172A", "marginBottom": "0.75rem"},
                            ),
                            dcc.Graph(id="chart-pie-status", config={"displayModeBar": False}),
                        ],
                        style=LIGHT_CARD_STYLE,
                    ),
                    md=5,
                ),
            ],
            className="g-3 mb-4",
        ),

        # Tendencia Temporal
        dbc.Row(
            dbc.Col(
                html.Div(
                    [
                        html.Div(
                            "Evolución Temporal de Ingresos",
                            style={"fontSize": "0.95rem", "fontWeight": "700", "color": "#0F172A", "marginBottom": "0.75rem"},
                        ),
                        dcc.Graph(id="chart-trend-timeline", config={"displayModeBar": False}),
                    ],
                    style=LIGHT_CARD_STYLE,
                ),
                md=12,
            ),
            className="mb-4",
        ),
    ],
    fluid=True,
    className="p-3",
)


@commercial_dash_app.callback(
    [
        Output("filter-region", "options"),
        Output("filter-category", "options"),
        Output("kpi-total-revenue", "children"),
        Output("kpi-total-tax", "children"),
        Output("kpi-total-units", "children"),
        Output("kpi-avg-ticket", "children"),
        Output("chart-bar-region", "figure"),
        Output("chart-pie-status", "figure"),
        Output("chart-trend-timeline", "figure"),
    ],
    [
        Input("filter-region", "value"),
        Input("filter-category", "value"),
        Input("filter-status", "value"),
    ],
)
def update_dashboard_metrics(selected_region: str, selected_category: str, selected_status: str):
    """
    Función de reactividad 100% Python adaptada a interfaz ejecutiva clara.
    """
    df = get_current_dataframe()

    region_opts = [{"label": "Todas las Regiones", "value": "ALL"}]
    if not df.empty and "region" in df.columns:
        regions = sorted(df["region"].dropna().unique().tolist())
        region_opts += [{"label": r, "value": r} for r in regions]

    cat_opts = [{"label": "Todas las Categorías", "value": "ALL"}]
    if not df.empty and "product_category" in df.columns:
        cats = sorted(df["product_category"].dropna().unique().tolist())
        cat_opts += [{"label": c, "value": c} for c in cats]

    # Aplicar filtros
    filtered_df = df.copy()
    if selected_region and selected_region != "ALL" and not filtered_df.empty:
        filtered_df = filtered_df[filtered_df["region"] == selected_region]

    if selected_category and selected_category != "ALL" and not filtered_df.empty:
        filtered_df = filtered_df[filtered_df["product_category"] == selected_category]

    if selected_status and selected_status != "ALL" and not filtered_df.empty:
        # Match case-insensitively or exact
        filtered_df = filtered_df[filtered_df["status"].str.upper() == selected_status.upper()]

    if filtered_df.empty:
        empty_fig = go.Figure()
        empty_fig.update_layout(
            annotations=[{
                "text": "Sin datos disponibles para el filtro",
                "xref": "paper",
                "yref": "paper",
                "showarrow": False,
                "font": {"size": 13, "color": "#64748B"}
            }],
            xaxis={"visible": False},
            yaxis={"visible": False},
            margin=dict(l=10, r=10, t=10, b=10),
            height=280,
            paper_bgcolor="#FFFFFF",
            plot_bgcolor="#FFFFFF",
        )
        return (
            region_opts,
            cat_opts,
            "$0.00",
            "$0.00",
            "0",
            "$0.00",
            empty_fig,
            empty_fig,
            empty_fig,
        )

    total_rev = filtered_df["total_amount"].sum()
    total_tax = filtered_df["tax_amount"].sum()
    total_units = int(filtered_df["quantity"].sum())
    avg_ticket = total_rev / len(filtered_df) if len(filtered_df) > 0 else 0.0

    # 1. Gráfico de Barras Agrupadas
    region_cat_df = filtered_df.groupby(["region", "product_category"])["total_amount"].sum().reset_index()
    fig_bar = px.bar(
        region_cat_df,
        x="region",
        y="total_amount",
        color="product_category",
        barmode="group",
        labels={"region": "Región", "total_amount": "Total ($)", "product_category": "Categoría"},
        color_discrete_sequence=["#1D68FE", "#10B981", "#D97706", "#06B6D4", "#6366F1"],
    )
    fig_bar.update_layout(
        margin=dict(l=20, r=20, t=10, b=20),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1, title="", font=dict(color="#334155")),
        plot_bgcolor="#FFFFFF",
        paper_bgcolor="#FFFFFF",
        height=300,
        font=dict(family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size=11, color="#334155"),
        yaxis=dict(gridcolor="#E2E8F0", tickprefix="$", zeroline=False),
        xaxis=dict(showgrid=False),
    )

    # 2. Gráfico Donut de Estados
    status_df = filtered_df.groupby("status")["total_amount"].sum().reset_index()
    fig_pie = px.pie(
        status_df,
        names="status",
        values="total_amount",
        hole=0.6,
        color="status",
        color_discrete_map={
            "PAGADA": "#10B981",
            "PAID": "#10B981",
            "PENDIENTE": "#D97706",
            "PENDING": "#D97706",
            "ANULADA": "#EF4444",
            "CANCELLED": "#EF4444",
        },
    )
    fig_pie.update_layout(
        margin=dict(l=10, r=10, t=10, b=10),
        legend=dict(orientation="h", yanchor="bottom", y=-0.15, title="", font=dict(color="#334155")),
        height=300,
        font=dict(family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size=11, color="#334155"),
        paper_bgcolor="#FFFFFF",
    )

    # 3. Evolución Temporal de Ingresos
    timeline_df = filtered_df.groupby("transaction_date")["total_amount"].sum().reset_index().sort_values("transaction_date")
    fig_trend = px.area(
        timeline_df,
        x="transaction_date",
        y="total_amount",
        labels={"transaction_date": "Fecha", "total_amount": "Facturación ($)"},
        color_discrete_sequence=["#1D68FE"],
    )
    fig_trend.update_layout(
        margin=dict(l=20, r=20, t=10, b=20),
        plot_bgcolor="#FFFFFF",
        paper_bgcolor="#FFFFFF",
        height=260,
        font=dict(family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", size=11, color="#334155"),
        yaxis=dict(gridcolor="#E2E8F0", tickprefix="$", zeroline=False),
        xaxis=dict(gridcolor="#F1F5F9", zeroline=False),
    )

    return (
        region_opts,
        cat_opts,
        f"${total_rev:,.2f}",
        f"${total_tax:,.2f}",
        f"{total_units:,}",
        f"${avg_ticket:,.2f}",
        fig_bar,
        fig_pie,
        fig_trend,
    )
