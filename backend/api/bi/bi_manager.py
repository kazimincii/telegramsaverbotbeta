"""
Business Intelligence Manager
Provides analytics, KPI tracking, reporting, and data visualization capabilities
"""

import json
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import random


class ChartType(Enum):
    """Chart types for visualizations"""
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    AREA = "area"
    SCATTER = "scatter"
    DONUT = "donut"
    GAUGE = "gauge"


class KPIType(Enum):
    """KPI calculation types"""
    COUNT = "count"
    SUM = "sum"
    AVERAGE = "average"
    PERCENTAGE = "percentage"
    RATIO = "ratio"
    GROWTH = "growth"


class ReportFormat(Enum):
    """Report export formats"""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"


class TimeRange(Enum):
    """Time range presets"""
    TODAY = "today"
    YESTERDAY = "yesterday"
    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    THIS_MONTH = "this_month"
    LAST_MONTH = "last_month"
    THIS_YEAR = "this_year"
    CUSTOM = "custom"


@dataclass
class Dashboard:
    """Dashboard configuration"""
    dashboard_id: str
    name: str
    description: str
    user_id: str
    widgets: List[Dict]  # List of widget configurations
    layout: Dict  # Grid layout configuration
    filters: Dict  # Global dashboard filters
    refresh_interval: int  # Seconds
    is_public: bool
    created_at: str
    updated_at: str
    tags: List[str]


@dataclass
class KPI:
    """Key Performance Indicator"""
    kpi_id: str
    name: str
    description: str
    metric: str  # What to measure
    kpi_type: KPIType
    target_value: Optional[float]
    current_value: float
    previous_value: Optional[float]
    change_percentage: Optional[float]
    unit: str  # e.g., "$", "%", "users"
    time_range: TimeRange
    trend: str  # "up", "down", "stable"
    status: str  # "good", "warning", "critical"
    user_id: str
    created_at: str
    updated_at: str


@dataclass
class Report:
    """Custom report"""
    report_id: str
    name: str
    description: str
    user_id: str
    template: str
    data_sources: List[str]
    filters: Dict
    columns: List[Dict]
    sorting: Dict
    grouping: List[str]
    aggregations: Dict
    charts: List[Dict]
    schedule: Optional[Dict]  # For scheduled reports
    recipients: List[str]
    format: ReportFormat
    created_at: str
    last_generated: Optional[str]
    status: str


@dataclass
class DataQuery:
    """Data query result"""
    query_id: str
    name: str
    sql: Optional[str]
    filters: Dict
    results: List[Dict]
    total_rows: int
    execution_time_ms: float
    cached: bool
    created_at: str


class BIManager:
    """
    Manages business intelligence, analytics, and reporting
    Singleton pattern for consistent state
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BIManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.dashboards: Dict[str, Dashboard] = {}
        self.kpis: Dict[str, KPI] = {}
        self.reports: Dict[str, Report] = {}
        self.queries: Dict[str, DataQuery] = {}

        # Mock data for demonstration
        self._create_sample_data()
        self._initialized = True

    def _create_sample_data(self):
        """Create sample dashboards and KPIs"""
        # Sample dashboard
        sample_dashboard = Dashboard(
            dashboard_id="dash_sample_001",
            name="Executive Dashboard",
            description="Overview of key business metrics",
            user_id="admin",
            widgets=[
                {
                    "widget_id": "w1",
                    "type": "kpi_card",
                    "kpi_id": "kpi_users",
                    "position": {"x": 0, "y": 0, "w": 3, "h": 2}
                },
                {
                    "widget_id": "w2",
                    "type": "chart",
                    "chart_type": ChartType.LINE.value,
                    "data_source": "user_growth",
                    "position": {"x": 3, "y": 0, "w": 6, "h": 4}
                }
            ],
            layout={"columns": 12, "row_height": 50},
            filters={"time_range": TimeRange.LAST_30_DAYS.value},
            refresh_interval=300,
            is_public=False,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            tags=["executive", "overview"]
        )
        self.dashboards[sample_dashboard.dashboard_id] = sample_dashboard

        # Sample KPIs
        sample_kpis = [
            KPI(
                kpi_id="kpi_users",
                name="Total Users",
                description="Total registered users",
                metric="user_count",
                kpi_type=KPIType.COUNT,
                target_value=10000,
                current_value=8543,
                previous_value=7821,
                change_percentage=9.23,
                unit="users",
                time_range=TimeRange.THIS_MONTH,
                trend="up",
                status="good",
                user_id="admin",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            ),
            KPI(
                kpi_id="kpi_revenue",
                name="Monthly Revenue",
                description="Total revenue this month",
                metric="revenue",
                kpi_type=KPIType.SUM,
                target_value=50000,
                current_value=42150,
                previous_value=38920,
                change_percentage=8.30,
                unit="$",
                time_range=TimeRange.THIS_MONTH,
                trend="up",
                status="warning",
                user_id="admin",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            ),
            KPI(
                kpi_id="kpi_conversion",
                name="Conversion Rate",
                description="User conversion rate",
                metric="conversion",
                kpi_type=KPIType.PERCENTAGE,
                target_value=5.0,
                current_value=3.8,
                previous_value=3.5,
                change_percentage=8.57,
                unit="%",
                time_range=TimeRange.LAST_7_DAYS,
                trend="up",
                status="warning",
                user_id="admin",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )
        ]

        for kpi in sample_kpis:
            self.kpis[kpi.kpi_id] = kpi

    def create_dashboard(self, name: str, description: str, user_id: str,
                        widgets: List[Dict] = None, layout: Dict = None,
                        filters: Dict = None, **kwargs) -> Dict:
        """Create a new dashboard"""
        dashboard_id = f"dash_{secrets.token_hex(8)}"

        dashboard = Dashboard(
            dashboard_id=dashboard_id,
            name=name,
            description=description,
            user_id=user_id,
            widgets=widgets or [],
            layout=layout or {"columns": 12, "row_height": 50},
            filters=filters or {},
            refresh_interval=kwargs.get('refresh_interval', 300),
            is_public=kwargs.get('is_public', False),
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            tags=kwargs.get('tags', [])
        )

        self.dashboards[dashboard_id] = dashboard

        return {
            "success": True,
            "dashboard_id": dashboard_id,
            "dashboard": asdict(dashboard)
        }

    def get_dashboard(self, dashboard_id: str, user_id: str) -> Dict:
        """Get dashboard by ID"""
        if dashboard_id not in self.dashboards:
            return {"success": False, "error": "Dashboard not found"}

        dashboard = self.dashboards[dashboard_id]

        # Check permissions
        if dashboard.user_id != user_id and not dashboard.is_public:
            return {"success": False, "error": "Access denied"}

        # Populate widget data
        enriched_widgets = []
        for widget in dashboard.widgets:
            enriched_widget = widget.copy()

            # If it's a KPI widget, include KPI data
            if widget.get('type') == 'kpi_card' and 'kpi_id' in widget:
                kpi = self.kpis.get(widget['kpi_id'])
                if kpi:
                    enriched_widget['kpi_data'] = asdict(kpi)

            # If it's a chart, generate mock data
            elif widget.get('type') == 'chart':
                enriched_widget['chart_data'] = self._generate_chart_data(
                    widget.get('chart_type', ChartType.LINE.value),
                    widget.get('data_source', 'default')
                )

            enriched_widgets.append(enriched_widget)

        dashboard_dict = asdict(dashboard)
        dashboard_dict['widgets'] = enriched_widgets

        return {
            "success": True,
            "dashboard": dashboard_dict
        }

    def list_dashboards(self, user_id: str, include_public: bool = True) -> Dict:
        """List all dashboards for a user"""
        user_dashboards = []

        for dashboard in self.dashboards.values():
            if dashboard.user_id == user_id or (include_public and dashboard.is_public):
                user_dashboards.append(asdict(dashboard))

        return {
            "success": True,
            "dashboards": user_dashboards,
            "total": len(user_dashboards)
        }

    def update_dashboard(self, dashboard_id: str, user_id: str, **updates) -> Dict:
        """Update dashboard configuration"""
        if dashboard_id not in self.dashboards:
            return {"success": False, "error": "Dashboard not found"}

        dashboard = self.dashboards[dashboard_id]

        if dashboard.user_id != user_id:
            return {"success": False, "error": "Access denied"}

        # Update allowed fields
        allowed_fields = ['name', 'description', 'widgets', 'layout', 'filters',
                         'refresh_interval', 'is_public', 'tags']

        for field in allowed_fields:
            if field in updates:
                setattr(dashboard, field, updates[field])

        dashboard.updated_at = datetime.now().isoformat()

        return {
            "success": True,
            "dashboard": asdict(dashboard)
        }

    def delete_dashboard(self, dashboard_id: str, user_id: str) -> Dict:
        """Delete a dashboard"""
        if dashboard_id not in self.dashboards:
            return {"success": False, "error": "Dashboard not found"}

        dashboard = self.dashboards[dashboard_id]

        if dashboard.user_id != user_id:
            return {"success": False, "error": "Access denied"}

        del self.dashboards[dashboard_id]

        return {"success": True, "message": "Dashboard deleted"}

    def create_kpi(self, name: str, description: str, metric: str,
                   kpi_type: str, user_id: str, **kwargs) -> Dict:
        """Create a new KPI"""
        kpi_id = f"kpi_{secrets.token_hex(8)}"

        current_value = kwargs.get('current_value', 0.0)
        previous_value = kwargs.get('previous_value')

        # Calculate change percentage
        change_percentage = None
        if previous_value is not None and previous_value != 0:
            change_percentage = ((current_value - previous_value) / previous_value) * 100

        # Determine trend
        trend = "stable"
        if change_percentage is not None:
            if change_percentage > 0:
                trend = "up"
            elif change_percentage < 0:
                trend = "down"

        # Determine status
        target_value = kwargs.get('target_value')
        status = "good"
        if target_value is not None:
            if current_value >= target_value:
                status = "good"
            elif current_value >= target_value * 0.8:
                status = "warning"
            else:
                status = "critical"

        kpi = KPI(
            kpi_id=kpi_id,
            name=name,
            description=description,
            metric=metric,
            kpi_type=KPIType(kpi_type),
            target_value=target_value,
            current_value=current_value,
            previous_value=previous_value,
            change_percentage=change_percentage,
            unit=kwargs.get('unit', ''),
            time_range=TimeRange(kwargs.get('time_range', TimeRange.THIS_MONTH.value)),
            trend=trend,
            status=status,
            user_id=user_id,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )

        self.kpis[kpi_id] = kpi

        return {
            "success": True,
            "kpi_id": kpi_id,
            "kpi": asdict(kpi)
        }

    def get_kpi(self, kpi_id: str) -> Dict:
        """Get KPI by ID"""
        if kpi_id not in self.kpis:
            return {"success": False, "error": "KPI not found"}

        kpi = self.kpis[kpi_id]

        return {
            "success": True,
            "kpi": asdict(kpi)
        }

    def list_kpis(self, user_id: str) -> Dict:
        """List all KPIs for a user"""
        user_kpis = [
            asdict(kpi) for kpi in self.kpis.values()
            if kpi.user_id == user_id or kpi.user_id == "admin"
        ]

        return {
            "success": True,
            "kpis": user_kpis,
            "total": len(user_kpis)
        }

    def update_kpi(self, kpi_id: str, **updates) -> Dict:
        """Update KPI values"""
        if kpi_id not in self.kpis:
            return {"success": False, "error": "KPI not found"}

        kpi = self.kpis[kpi_id]

        # If updating current value, move old current to previous
        if 'current_value' in updates:
            kpi.previous_value = kpi.current_value
            kpi.current_value = updates['current_value']

            # Recalculate change percentage
            if kpi.previous_value and kpi.previous_value != 0:
                kpi.change_percentage = (
                    (kpi.current_value - kpi.previous_value) / kpi.previous_value
                ) * 100

                # Update trend
                if kpi.change_percentage > 0:
                    kpi.trend = "up"
                elif kpi.change_percentage < 0:
                    kpi.trend = "down"
                else:
                    kpi.trend = "stable"

        # Update other fields
        for field in ['name', 'description', 'target_value', 'unit', 'time_range']:
            if field in updates:
                setattr(kpi, field, updates[field])

        # Recalculate status
        if kpi.target_value is not None:
            if kpi.current_value >= kpi.target_value:
                kpi.status = "good"
            elif kpi.current_value >= kpi.target_value * 0.8:
                kpi.status = "warning"
            else:
                kpi.status = "critical"

        kpi.updated_at = datetime.now().isoformat()

        return {
            "success": True,
            "kpi": asdict(kpi)
        }

    def create_report(self, name: str, description: str, user_id: str,
                     template: str, data_sources: List[str], **kwargs) -> Dict:
        """Create a custom report"""
        report_id = f"report_{secrets.token_hex(8)}"

        report = Report(
            report_id=report_id,
            name=name,
            description=description,
            user_id=user_id,
            template=template,
            data_sources=data_sources,
            filters=kwargs.get('filters', {}),
            columns=kwargs.get('columns', []),
            sorting=kwargs.get('sorting', {}),
            grouping=kwargs.get('grouping', []),
            aggregations=kwargs.get('aggregations', {}),
            charts=kwargs.get('charts', []),
            schedule=kwargs.get('schedule'),
            recipients=kwargs.get('recipients', []),
            format=ReportFormat(kwargs.get('format', ReportFormat.PDF.value)),
            created_at=datetime.now().isoformat(),
            last_generated=None,
            status="draft"
        )

        self.reports[report_id] = report

        return {
            "success": True,
            "report_id": report_id,
            "report": asdict(report)
        }

    def generate_report(self, report_id: str, user_id: str) -> Dict:
        """Generate a report"""
        if report_id not in self.reports:
            return {"success": False, "error": "Report not found"}

        report = self.reports[report_id]

        if report.user_id != user_id:
            return {"success": False, "error": "Access denied"}

        # Generate mock report data
        report_data = self._generate_report_data(report)

        report.last_generated = datetime.now().isoformat()
        report.status = "generated"

        return {
            "success": True,
            "report_id": report_id,
            "generated_at": report.last_generated,
            "format": report.format.value,
            "data": report_data,
            "download_url": f"/api/bi/reports/{report_id}/download"
        }

    def query_data(self, name: str, filters: Dict, user_id: str,
                   sql: Optional[str] = None) -> Dict:
        """Execute a data query"""
        query_id = f"query_{secrets.token_hex(8)}"

        # Generate mock query results
        results = self._generate_query_results(filters)

        query = DataQuery(
            query_id=query_id,
            name=name,
            sql=sql,
            filters=filters,
            results=results,
            total_rows=len(results),
            execution_time_ms=round(random.uniform(10, 500), 2),
            cached=random.choice([True, False]),
            created_at=datetime.now().isoformat()
        )

        self.queries[query_id] = query

        return {
            "success": True,
            "query": asdict(query)
        }

    def get_metrics(self, metric_type: str, time_range: str, user_id: str) -> Dict:
        """Get aggregated metrics"""
        # Generate mock metrics based on type and time range
        metrics = self._generate_metrics(metric_type, time_range)

        return {
            "success": True,
            "metric_type": metric_type,
            "time_range": time_range,
            "metrics": metrics,
            "generated_at": datetime.now().isoformat()
        }

    def export_dashboard(self, dashboard_id: str, format: str, user_id: str) -> Dict:
        """Export dashboard to file"""
        if dashboard_id not in self.dashboards:
            return {"success": False, "error": "Dashboard not found"}

        dashboard = self.dashboards[dashboard_id]

        if dashboard.user_id != user_id and not dashboard.is_public:
            return {"success": False, "error": "Access denied"}

        # Mock export
        export_file = f"/exports/dashboard_{dashboard_id}.{format}"

        return {
            "success": True,
            "dashboard_id": dashboard_id,
            "format": format,
            "file_path": export_file,
            "download_url": f"/api/bi/dashboards/{dashboard_id}/download?format={format}",
            "generated_at": datetime.now().isoformat()
        }

    def _generate_chart_data(self, chart_type: str, data_source: str) -> Dict:
        """Generate mock chart data"""
        if chart_type == ChartType.LINE.value or chart_type == ChartType.AREA.value:
            # Time series data
            labels = [(datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
                     for i in range(30, 0, -1)]
            return {
                "labels": labels,
                "datasets": [
                    {
                        "label": "Users",
                        "data": [random.randint(100, 500) for _ in range(30)],
                        "borderColor": "#667eea",
                        "backgroundColor": "rgba(102, 126, 234, 0.1)"
                    }
                ]
            }

        elif chart_type == ChartType.BAR.value:
            return {
                "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                "datasets": [
                    {
                        "label": "Revenue",
                        "data": [random.randint(10000, 50000) for _ in range(6)],
                        "backgroundColor": "#667eea"
                    }
                ]
            }

        elif chart_type == ChartType.PIE.value or chart_type == ChartType.DONUT.value:
            return {
                "labels": ["Direct", "Organic", "Referral", "Social"],
                "datasets": [
                    {
                        "data": [random.randint(10, 50) for _ in range(4)],
                        "backgroundColor": ["#667eea", "#764ba2", "#f093fb", "#4facfe"]
                    }
                ]
            }

        else:
            return {"labels": [], "datasets": []}

    def _generate_report_data(self, report: Report) -> Dict:
        """Generate mock report data"""
        return {
            "title": report.name,
            "description": report.description,
            "generated_at": datetime.now().isoformat(),
            "sections": [
                {
                    "title": "Summary",
                    "type": "text",
                    "content": "This is a sample report showing key metrics and trends."
                },
                {
                    "title": "Key Metrics",
                    "type": "table",
                    "data": {
                        "headers": ["Metric", "Value", "Change"],
                        "rows": [
                            ["Total Users", "8,543", "+9.2%"],
                            ["Revenue", "$42,150", "+8.3%"],
                            ["Conversion Rate", "3.8%", "+0.3%"]
                        ]
                    }
                },
                {
                    "title": "Trends",
                    "type": "chart",
                    "chart_data": self._generate_chart_data(ChartType.LINE.value, "trends")
                }
            ]
        }

    def _generate_query_results(self, filters: Dict) -> List[Dict]:
        """Generate mock query results"""
        results = []
        for i in range(random.randint(5, 20)):
            results.append({
                "id": i + 1,
                "date": (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d'),
                "value": round(random.uniform(100, 1000), 2),
                "category": random.choice(["A", "B", "C", "D"])
            })
        return results

    def _generate_metrics(self, metric_type: str, time_range: str) -> Dict:
        """Generate mock metrics"""
        return {
            "total": random.randint(1000, 10000),
            "average": round(random.uniform(10, 100), 2),
            "min": round(random.uniform(1, 10), 2),
            "max": round(random.uniform(100, 200), 2),
            "trend": random.choice(["up", "down", "stable"]),
            "data_points": [
                {
                    "timestamp": (datetime.now() - timedelta(hours=i)).isoformat(),
                    "value": round(random.uniform(10, 100), 2)
                }
                for i in range(24, 0, -1)
            ]
        }


# Singleton instance
bi_manager = BIManager()
