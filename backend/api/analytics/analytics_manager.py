"""
Advanced Analytics Manager for Telegram Saver
Tracks usage metrics, generates reports, and provides insights
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
from enum import Enum
import statistics


class MetricType(Enum):
    """Types of metrics that can be tracked"""
    DOWNLOAD = "download"
    UPLOAD = "upload"
    SEARCH = "search"
    VIEW = "view"
    SHARE = "share"
    ERROR = "error"
    API_CALL = "api_call"
    USER_ACTION = "user_action"


class TimeRange(Enum):
    """Time ranges for analytics queries"""
    LAST_HOUR = "last_hour"
    LAST_DAY = "last_day"
    LAST_WEEK = "last_week"
    LAST_MONTH = "last_month"
    LAST_YEAR = "last_year"
    ALL_TIME = "all_time"


@dataclass
class MetricEvent:
    """Individual metric event"""
    id: str
    timestamp: str
    metric_type: str
    user_id: str
    value: float
    metadata: Dict[str, Any]
    tags: List[str]


@dataclass
class AnalyticsReport:
    """Generated analytics report"""
    report_id: str
    generated_at: str
    time_range: str
    metrics: Dict[str, Any]
    insights: List[str]
    recommendations: List[str]


class AnalyticsManager:
    """Manages analytics data collection and reporting"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.data_dir = "data/analytics"
            os.makedirs(self.data_dir, exist_ok=True)

            self.events_file = os.path.join(self.data_dir, "events.json")
            self.reports_file = os.path.join(self.data_dir, "reports.json")
            self.aggregates_file = os.path.join(self.data_dir, "aggregates.json")

            self.events: List[MetricEvent] = []
            self.reports: Dict[str, AnalyticsReport] = {}
            self.aggregates: Dict[str, Dict] = {}

            self._load_data()
            self.initialized = True

    def _load_data(self):
        """Load analytics data from files"""
        try:
            if os.path.exists(self.events_file):
                with open(self.events_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.events = [
                        MetricEvent(**event) for event in data
                    ]

            if os.path.exists(self.reports_file):
                with open(self.reports_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.reports = {
                        report_id: AnalyticsReport(**report_data)
                        for report_id, report_data in data.items()
                    }

            if os.path.exists(self.aggregates_file):
                with open(self.aggregates_file, 'r', encoding='utf-8') as f:
                    self.aggregates = json.load(f)
        except Exception as e:
            print(f"Error loading analytics data: {e}")

    def _save_data(self):
        """Save analytics data to files"""
        try:
            with open(self.events_file, 'w', encoding='utf-8') as f:
                json.dump([asdict(event) for event in self.events], f, indent=2)

            with open(self.reports_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {rid: asdict(report) for rid, report in self.reports.items()},
                    f,
                    indent=2
                )

            with open(self.aggregates_file, 'w', encoding='utf-8') as f:
                json.dump(self.aggregates, f, indent=2)
        except Exception as e:
            print(f"Error saving analytics data: {e}")

    def track_event(
        self,
        metric_type: str,
        user_id: str,
        value: float = 1.0,
        metadata: Optional[Dict] = None,
        tags: Optional[List[str]] = None
    ) -> Dict:
        """Track a new analytics event"""
        import uuid

        event = MetricEvent(
            id=str(uuid.uuid4()),
            timestamp=datetime.now().isoformat(),
            metric_type=metric_type,
            user_id=user_id,
            value=value,
            metadata=metadata or {},
            tags=tags or []
        )

        self.events.append(event)
        self._update_aggregates(event)
        self._save_data()

        return {
            'success': True,
            'event_id': event.id,
            'timestamp': event.timestamp
        }

    def _update_aggregates(self, event: MetricEvent):
        """Update aggregate statistics with new event"""
        # Daily aggregates
        date = event.timestamp[:10]  # YYYY-MM-DD

        if date not in self.aggregates:
            self.aggregates[date] = {
                'total_events': 0,
                'by_type': {},
                'by_user': {},
                'total_value': 0
            }

        agg = self.aggregates[date]
        agg['total_events'] += 1
        agg['total_value'] += event.value

        # By type
        if event.metric_type not in agg['by_type']:
            agg['by_type'][event.metric_type] = {'count': 0, 'value': 0}
        agg['by_type'][event.metric_type]['count'] += 1
        agg['by_type'][event.metric_type]['value'] += event.value

        # By user
        if event.user_id not in agg['by_user']:
            agg['by_user'][event.user_id] = {'count': 0, 'value': 0}
        agg['by_user'][event.user_id]['count'] += 1
        agg['by_user'][event.user_id]['value'] += event.value

    def _get_time_range_filter(self, time_range: str) -> datetime:
        """Get datetime filter for time range"""
        now = datetime.now()

        if time_range == TimeRange.LAST_HOUR.value:
            return now - timedelta(hours=1)
        elif time_range == TimeRange.LAST_DAY.value:
            return now - timedelta(days=1)
        elif time_range == TimeRange.LAST_WEEK.value:
            return now - timedelta(weeks=1)
        elif time_range == TimeRange.LAST_MONTH.value:
            return now - timedelta(days=30)
        elif time_range == TimeRange.LAST_YEAR.value:
            return now - timedelta(days=365)
        else:  # ALL_TIME
            return datetime.min

    def get_events(
        self,
        time_range: Optional[str] = None,
        metric_type: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 1000
    ) -> Dict:
        """Get filtered events"""
        filtered_events = self.events

        # Filter by time range
        if time_range and time_range != TimeRange.ALL_TIME.value:
            start_time = self._get_time_range_filter(time_range)
            filtered_events = [
                e for e in filtered_events
                if datetime.fromisoformat(e.timestamp) >= start_time
            ]

        # Filter by metric type
        if metric_type:
            filtered_events = [
                e for e in filtered_events
                if e.metric_type == metric_type
            ]

        # Filter by user
        if user_id:
            filtered_events = [
                e for e in filtered_events
                if e.user_id == user_id
            ]

        # Apply limit
        filtered_events = filtered_events[-limit:]

        return {
            'success': True,
            'events': [asdict(e) for e in filtered_events],
            'count': len(filtered_events)
        }

    def generate_report(
        self,
        time_range: str = TimeRange.LAST_WEEK.value,
        include_insights: bool = True
    ) -> Dict:
        """Generate comprehensive analytics report"""
        import uuid

        # Get events for time range
        events_data = self.get_events(time_range=time_range, limit=100000)
        events = [MetricEvent(**e) for e in events_data['events']]

        if not events:
            return {
                'success': False,
                'error': 'No data available for the specified time range'
            }

        # Calculate metrics
        metrics = self._calculate_metrics(events)

        # Generate insights
        insights = []
        recommendations = []

        if include_insights:
            insights = self._generate_insights(metrics, events)
            recommendations = self._generate_recommendations(metrics, events)

        # Create report
        report = AnalyticsReport(
            report_id=str(uuid.uuid4()),
            generated_at=datetime.now().isoformat(),
            time_range=time_range,
            metrics=metrics,
            insights=insights,
            recommendations=recommendations
        )

        self.reports[report.report_id] = report
        self._save_data()

        return {
            'success': True,
            'report': asdict(report)
        }

    def _calculate_metrics(self, events: List[MetricEvent]) -> Dict:
        """Calculate comprehensive metrics from events"""
        if not events:
            return {}

        # Basic counts
        total_events = len(events)

        # By type
        by_type = defaultdict(lambda: {'count': 0, 'value': 0})
        for event in events:
            by_type[event.metric_type]['count'] += 1
            by_type[event.metric_type]['value'] += event.value

        # By user
        by_user = defaultdict(lambda: {'count': 0, 'value': 0})
        for event in events:
            by_user[event.user_id]['count'] += 1
            by_user[event.user_id]['value'] += event.value

        # Time series (hourly)
        time_series = defaultdict(int)
        for event in events:
            hour = event.timestamp[:13]  # YYYY-MM-DDTHH
            time_series[hour] += 1

        # Most common tags
        all_tags = []
        for event in events:
            all_tags.extend(event.tags)
        tag_counts = Counter(all_tags)

        # Value statistics
        values = [e.value for e in events]
        value_stats = {
            'total': sum(values),
            'mean': statistics.mean(values),
            'median': statistics.median(values),
            'min': min(values),
            'max': max(values)
        }

        if len(values) > 1:
            value_stats['stdev'] = statistics.stdev(values)

        # Active users
        unique_users = len(set(e.user_id for e in events))

        # Peak activity
        peak_hour = max(time_series.items(), key=lambda x: x[1]) if time_series else (None, 0)

        return {
            'total_events': total_events,
            'unique_users': unique_users,
            'by_type': dict(by_type),
            'by_user': dict(by_user),
            'time_series': dict(sorted(time_series.items())),
            'top_tags': dict(tag_counts.most_common(10)),
            'value_statistics': value_stats,
            'peak_hour': peak_hour[0] if peak_hour[0] else None,
            'peak_hour_count': peak_hour[1] if peak_hour[0] else 0
        }

    def _generate_insights(self, metrics: Dict, events: List[MetricEvent]) -> List[str]:
        """Generate insights from metrics"""
        insights = []

        # User engagement
        if metrics.get('unique_users'):
            avg_events_per_user = metrics['total_events'] / metrics['unique_users']
            insights.append(
                f"Average of {avg_events_per_user:.1f} events per user"
            )

        # Most active type
        if metrics.get('by_type'):
            most_active_type = max(
                metrics['by_type'].items(),
                key=lambda x: x[1]['count']
            )
            insights.append(
                f"Most common activity: {most_active_type[0]} "
                f"({most_active_type[1]['count']} events)"
            )

        # Peak time
        if metrics.get('peak_hour'):
            insights.append(
                f"Peak activity at {metrics['peak_hour']} "
                f"with {metrics['peak_hour_count']} events"
            )

        # Growth trend
        if metrics.get('time_series') and len(metrics['time_series']) > 2:
            time_points = list(metrics['time_series'].values())
            first_half = time_points[:len(time_points)//2]
            second_half = time_points[len(time_points)//2:]

            if sum(first_half) > 0:
                growth = ((sum(second_half) - sum(first_half)) / sum(first_half)) * 100
                if growth > 10:
                    insights.append(f"Activity increased by {growth:.1f}%")
                elif growth < -10:
                    insights.append(f"Activity decreased by {abs(growth):.1f}%")

        # Power users
        if metrics.get('by_user'):
            sorted_users = sorted(
                metrics['by_user'].items(),
                key=lambda x: x[1]['count'],
                reverse=True
            )
            if len(sorted_users) > 0:
                top_user = sorted_users[0]
                insights.append(
                    f"Most active user: {top_user[0]} "
                    f"({top_user[1]['count']} events)"
                )

        return insights

    def _generate_recommendations(self, metrics: Dict, events: List[MetricEvent]) -> List[str]:
        """Generate recommendations based on metrics"""
        recommendations = []

        # Low engagement
        if metrics.get('unique_users', 0) < 10:
            recommendations.append(
                "Consider user acquisition strategies to increase engagement"
            )

        # Unbalanced activity
        if metrics.get('by_type'):
            type_counts = [v['count'] for v in metrics['by_type'].values()]
            if type_counts and max(type_counts) > sum(type_counts) * 0.7:
                recommendations.append(
                    "Activity is heavily concentrated in one area. "
                    "Consider promoting other features"
                )

        # High error rate
        if metrics.get('by_type', {}).get(MetricType.ERROR.value):
            error_rate = (
                metrics['by_type'][MetricType.ERROR.value]['count'] /
                metrics['total_events']
            )
            if error_rate > 0.1:
                recommendations.append(
                    f"High error rate detected ({error_rate*100:.1f}%). "
                    "Review error logs and implement fixes"
                )

        # Peak time optimization
        if metrics.get('peak_hour'):
            recommendations.append(
                f"Schedule maintenance outside peak hours (avoid {metrics['peak_hour']})"
            )

        # User retention
        if metrics.get('by_user'):
            one_time_users = sum(
                1 for user_data in metrics['by_user'].values()
                if user_data['count'] == 1
            )
            if one_time_users > metrics['unique_users'] * 0.5:
                recommendations.append(
                    "Over 50% of users have only one event. "
                    "Focus on user retention strategies"
                )

        return recommendations

    def get_dashboard_data(self, time_range: str = TimeRange.LAST_WEEK.value) -> Dict:
        """Get dashboard data for visualization"""
        events_data = self.get_events(time_range=time_range, limit=100000)
        events = [MetricEvent(**e) for e in events_data['events']]

        if not events:
            return {
                'success': False,
                'error': 'No data available'
            }

        metrics = self._calculate_metrics(events)

        # Format for charts
        dashboard_data = {
            'summary': {
                'total_events': metrics['total_events'],
                'unique_users': metrics['unique_users'],
                'avg_events_per_user': (
                    metrics['total_events'] / metrics['unique_users']
                    if metrics['unique_users'] > 0 else 0
                ),
                'peak_hour': metrics.get('peak_hour'),
                'total_value': metrics['value_statistics']['total']
            },
            'charts': {
                'time_series': [
                    {'time': k, 'count': v}
                    for k, v in metrics['time_series'].items()
                ],
                'by_type': [
                    {'type': k, 'count': v['count'], 'value': v['value']}
                    for k, v in metrics['by_type'].items()
                ],
                'top_users': [
                    {'user': k, 'count': v['count'], 'value': v['value']}
                    for k, v in sorted(
                        metrics['by_user'].items(),
                        key=lambda x: x[1]['count'],
                        reverse=True
                    )[:10]
                ],
                'top_tags': [
                    {'tag': k, 'count': v}
                    for k, v in metrics['top_tags'].items()
                ]
            },
            'statistics': metrics['value_statistics']
        }

        return {
            'success': True,
            'data': dashboard_data
        }

    def get_user_analytics(self, user_id: str, time_range: str = TimeRange.LAST_MONTH.value) -> Dict:
        """Get analytics for specific user"""
        events_data = self.get_events(
            time_range=time_range,
            user_id=user_id,
            limit=100000
        )
        events = [MetricEvent(**e) for e in events_data['events']]

        if not events:
            return {
                'success': False,
                'error': 'No data available for this user'
            }

        # Activity over time
        activity_timeline = defaultdict(int)
        for event in events:
            date = event.timestamp[:10]
            activity_timeline[date] += 1

        # Activity by type
        by_type = Counter(e.metric_type for e in events)

        # Most used tags
        all_tags = []
        for event in events:
            all_tags.extend(event.tags)
        tag_usage = Counter(all_tags)

        return {
            'success': True,
            'user_id': user_id,
            'total_events': len(events),
            'activity_timeline': dict(sorted(activity_timeline.items())),
            'activity_by_type': dict(by_type),
            'top_tags': dict(tag_usage.most_common(10)),
            'first_activity': events[0].timestamp if events else None,
            'last_activity': events[-1].timestamp if events else None
        }


# Singleton instance
analytics_manager = AnalyticsManager()
