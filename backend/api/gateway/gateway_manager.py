"""
API Gateway Manager
Provides routing, rate limiting, load balancing, service discovery, and API documentation
"""

import json
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import random
from collections import defaultdict


class LoadBalancingStrategy(Enum):
    """Load balancing strategies"""
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    WEIGHTED = "weighted"
    IP_HASH = "ip_hash"
    RANDOM = "random"


class ServiceStatus(Enum):
    """Service health status"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"


class RateLimitPeriod(Enum):
    """Rate limit time periods"""
    SECOND = "second"
    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"


@dataclass
class Service:
    """Microservice registration"""
    service_id: str
    name: str
    description: str
    base_url: str
    version: str
    status: ServiceStatus
    instances: List[Dict]  # List of service instances
    health_check_url: str
    metadata: Dict
    registered_at: str
    last_health_check: Optional[str]


@dataclass
class Route:
    """API route configuration"""
    route_id: str
    path: str
    method: str  # GET, POST, PUT, DELETE, etc.
    service_id: str
    target_path: str
    description: str
    auth_required: bool
    rate_limit_id: Optional[str]
    transform_request: bool
    transform_response: bool
    cache_enabled: bool
    cache_ttl: int  # seconds
    timeout: int  # milliseconds
    retry_count: int
    created_at: str
    enabled: bool


@dataclass
class RateLimit:
    """Rate limiting configuration"""
    limit_id: str
    name: str
    description: str
    max_requests: int
    period: RateLimitPeriod
    scope: str  # "global", "user", "ip", "api_key"
    enabled: bool
    created_at: str


@dataclass
class LoadBalancer:
    """Load balancer configuration"""
    balancer_id: str
    name: str
    service_id: str
    strategy: LoadBalancingStrategy
    health_check_interval: int  # seconds
    unhealthy_threshold: int
    healthy_threshold: int
    session_affinity: bool
    created_at: str
    enabled: bool


@dataclass
class APIEndpoint:
    """API endpoint documentation"""
    endpoint_id: str
    path: str
    method: str
    service_name: str
    description: str
    parameters: List[Dict]
    request_body: Optional[Dict]
    responses: Dict[str, Dict]  # status_code -> response schema
    auth_required: bool
    rate_limited: bool
    tags: List[str]
    deprecated: bool


@dataclass
class CircuitBreaker:
    """Circuit breaker for fault tolerance"""
    breaker_id: str
    service_id: str
    failure_threshold: int
    timeout_duration: int  # seconds
    half_open_requests: int
    state: str  # "closed", "open", "half_open"
    failure_count: int
    last_failure_time: Optional[str]
    next_retry_time: Optional[str]


class GatewayManager:
    """
    Manages API Gateway functionality including routing, load balancing,
    rate limiting, and service discovery
    Singleton pattern for consistent state
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GatewayManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.services: Dict[str, Service] = {}
        self.routes: Dict[str, Route] = {}
        self.rate_limits: Dict[str, RateLimit] = {}
        self.load_balancers: Dict[str, LoadBalancer] = {}
        self.api_endpoints: Dict[str, APIEndpoint] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}

        # Runtime state
        self.rate_limit_counters: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.route_counters: Dict[str, int] = defaultdict(int)  # For round-robin
        self.instance_connections: Dict[str, int] = defaultdict(int)  # For least connections

        self._create_sample_data()
        self._initialized = True

    def _create_sample_data(self):
        """Create sample gateway configuration"""
        # Sample services
        sample_services = [
            Service(
                service_id="svc_auth",
                name="Authentication Service",
                description="User authentication and authorization",
                base_url="http://auth-service:8001",
                version="1.0.0",
                status=ServiceStatus.HEALTHY,
                instances=[
                    {"instance_id": "auth-1", "url": "http://auth-1:8001", "weight": 1},
                    {"instance_id": "auth-2", "url": "http://auth-2:8001", "weight": 1}
                ],
                health_check_url="/health",
                metadata={"team": "platform", "environment": "production"},
                registered_at=datetime.now().isoformat(),
                last_health_check=datetime.now().isoformat()
            ),
            Service(
                service_id="svc_media",
                name="Media Processing Service",
                description="Media transcoding and processing",
                base_url="http://media-service:8002",
                version="2.1.0",
                status=ServiceStatus.HEALTHY,
                instances=[
                    {"instance_id": "media-1", "url": "http://media-1:8002", "weight": 2},
                    {"instance_id": "media-2", "url": "http://media-2:8002", "weight": 1}
                ],
                health_check_url="/health",
                metadata={"team": "media", "environment": "production"},
                registered_at=datetime.now().isoformat(),
                last_health_check=datetime.now().isoformat()
            ),
            Service(
                service_id="svc_analytics",
                name="Analytics Service",
                description="Business intelligence and analytics",
                base_url="http://analytics-service:8003",
                version="1.2.0",
                status=ServiceStatus.HEALTHY,
                instances=[
                    {"instance_id": "analytics-1", "url": "http://analytics-1:8003", "weight": 1}
                ],
                health_check_url="/health",
                metadata={"team": "data", "environment": "production"},
                registered_at=datetime.now().isoformat(),
                last_health_check=datetime.now().isoformat()
            )
        ]

        for service in sample_services:
            self.services[service.service_id] = service

        # Sample rate limits
        sample_rate_limits = [
            RateLimit(
                limit_id="rl_global",
                name="Global Rate Limit",
                description="Overall API rate limit",
                max_requests=10000,
                period=RateLimitPeriod.HOUR,
                scope="global",
                enabled=True,
                created_at=datetime.now().isoformat()
            ),
            RateLimit(
                limit_id="rl_user",
                name="Per User Rate Limit",
                description="Rate limit per authenticated user",
                max_requests=100,
                period=RateLimitPeriod.MINUTE,
                scope="user",
                enabled=True,
                created_at=datetime.now().isoformat()
            ),
            RateLimit(
                limit_id="rl_ip",
                name="Per IP Rate Limit",
                description="Rate limit per IP address",
                max_requests=1000,
                period=RateLimitPeriod.HOUR,
                scope="ip",
                enabled=True,
                created_at=datetime.now().isoformat()
            )
        ]

        for limit in sample_rate_limits:
            self.rate_limits[limit.limit_id] = limit

        # Sample routes
        sample_routes = [
            Route(
                route_id="route_login",
                path="/api/auth/login",
                method="POST",
                service_id="svc_auth",
                target_path="/login",
                description="User login endpoint",
                auth_required=False,
                rate_limit_id="rl_ip",
                transform_request=False,
                transform_response=True,
                cache_enabled=False,
                cache_ttl=0,
                timeout=5000,
                retry_count=3,
                created_at=datetime.now().isoformat(),
                enabled=True
            ),
            Route(
                route_id="route_media_upload",
                path="/api/media/upload",
                method="POST",
                service_id="svc_media",
                target_path="/upload",
                description="Media file upload",
                auth_required=True,
                rate_limit_id="rl_user",
                transform_request=True,
                transform_response=False,
                cache_enabled=False,
                cache_ttl=0,
                timeout=30000,
                retry_count=2,
                created_at=datetime.now().isoformat(),
                enabled=True
            ),
            Route(
                route_id="route_analytics",
                path="/api/analytics/dashboard",
                method="GET",
                service_id="svc_analytics",
                target_path="/dashboard",
                description="Analytics dashboard data",
                auth_required=True,
                rate_limit_id="rl_user",
                transform_request=False,
                transform_response=False,
                cache_enabled=True,
                cache_ttl=300,
                timeout=10000,
                retry_count=3,
                created_at=datetime.now().isoformat(),
                enabled=True
            )
        ]

        for route in sample_routes:
            self.routes[route.route_id] = route

        # Sample load balancers
        for service_id in self.services.keys():
            balancer = LoadBalancer(
                balancer_id=f"lb_{service_id}",
                name=f"Load Balancer for {self.services[service_id].name}",
                service_id=service_id,
                strategy=LoadBalancingStrategy.ROUND_ROBIN,
                health_check_interval=30,
                unhealthy_threshold=3,
                healthy_threshold=2,
                session_affinity=False,
                created_at=datetime.now().isoformat(),
                enabled=True
            )
            self.load_balancers[balancer.balancer_id] = balancer

    def register_service(self, name: str, description: str, base_url: str,
                        version: str, instances: List[Dict], **kwargs) -> Dict:
        """Register a new microservice"""
        service_id = f"svc_{secrets.token_hex(6)}"

        service = Service(
            service_id=service_id,
            name=name,
            description=description,
            base_url=base_url,
            version=version,
            status=ServiceStatus.UNKNOWN,
            instances=instances,
            health_check_url=kwargs.get('health_check_url', '/health'),
            metadata=kwargs.get('metadata', {}),
            registered_at=datetime.now().isoformat(),
            last_health_check=None
        )

        self.services[service_id] = service

        # Auto-create load balancer
        balancer_id = f"lb_{service_id}"
        balancer = LoadBalancer(
            balancer_id=balancer_id,
            name=f"Load Balancer for {name}",
            service_id=service_id,
            strategy=LoadBalancingStrategy.ROUND_ROBIN,
            health_check_interval=kwargs.get('health_check_interval', 30),
            unhealthy_threshold=kwargs.get('unhealthy_threshold', 3),
            healthy_threshold=kwargs.get('healthy_threshold', 2),
            session_affinity=kwargs.get('session_affinity', False),
            created_at=datetime.now().isoformat(),
            enabled=True
        )
        self.load_balancers[balancer_id] = balancer

        return {
            "success": True,
            "service_id": service_id,
            "service": asdict(service)
        }

    def deregister_service(self, service_id: str) -> Dict:
        """Deregister a microservice"""
        if service_id not in self.services:
            return {"success": False, "error": "Service not found"}

        # Remove associated routes
        routes_to_remove = [
            rid for rid, route in self.routes.items()
            if route.service_id == service_id
        ]
        for rid in routes_to_remove:
            del self.routes[rid]

        # Remove load balancer
        balancer_id = f"lb_{service_id}"
        if balancer_id in self.load_balancers:
            del self.load_balancers[balancer_id]

        del self.services[service_id]

        return {
            "success": True,
            "message": f"Service {service_id} deregistered"
        }

    def get_service(self, service_id: str) -> Dict:
        """Get service details"""
        if service_id not in self.services:
            return {"success": False, "error": "Service not found"}

        return {
            "success": True,
            "service": asdict(self.services[service_id])
        }

    def list_services(self, status_filter: Optional[str] = None) -> Dict:
        """List all registered services"""
        services = list(self.services.values())

        if status_filter:
            services = [s for s in services if s.status.value == status_filter]

        return {
            "success": True,
            "services": [asdict(s) for s in services],
            "total": len(services)
        }

    def create_route(self, path: str, method: str, service_id: str,
                    target_path: str, description: str, **kwargs) -> Dict:
        """Create a new API route"""
        if service_id not in self.services:
            return {"success": False, "error": "Service not found"}

        route_id = f"route_{secrets.token_hex(6)}"

        route = Route(
            route_id=route_id,
            path=path,
            method=method.upper(),
            service_id=service_id,
            target_path=target_path,
            description=description,
            auth_required=kwargs.get('auth_required', False),
            rate_limit_id=kwargs.get('rate_limit_id'),
            transform_request=kwargs.get('transform_request', False),
            transform_response=kwargs.get('transform_response', False),
            cache_enabled=kwargs.get('cache_enabled', False),
            cache_ttl=kwargs.get('cache_ttl', 0),
            timeout=kwargs.get('timeout', 5000),
            retry_count=kwargs.get('retry_count', 3),
            created_at=datetime.now().isoformat(),
            enabled=kwargs.get('enabled', True)
        )

        self.routes[route_id] = route

        return {
            "success": True,
            "route_id": route_id,
            "route": asdict(route)
        }

    def list_routes(self) -> Dict:
        """List all routes"""
        return {
            "success": True,
            "routes": [asdict(r) for r in self.routes.values()],
            "total": len(self.routes)
        }

    def create_rate_limit(self, name: str, description: str, max_requests: int,
                         period: str, scope: str, **kwargs) -> Dict:
        """Create a rate limit configuration"""
        limit_id = f"rl_{secrets.token_hex(6)}"

        rate_limit = RateLimit(
            limit_id=limit_id,
            name=name,
            description=description,
            max_requests=max_requests,
            period=RateLimitPeriod(period),
            scope=scope,
            enabled=kwargs.get('enabled', True),
            created_at=datetime.now().isoformat()
        )

        self.rate_limits[limit_id] = rate_limit

        return {
            "success": True,
            "limit_id": limit_id,
            "rate_limit": asdict(rate_limit)
        }

    def check_rate_limit(self, limit_id: str, identifier: str) -> Dict:
        """Check if request is within rate limit"""
        if limit_id not in self.rate_limits:
            return {"success": False, "error": "Rate limit not found"}

        limit = self.rate_limits[limit_id]

        if not limit.enabled:
            return {
                "success": True,
                "allowed": True,
                "current_count": 0,
                "limit": limit.max_requests
            }

        # Mock rate limiting (in production, use Redis or similar)
        current_count = self.rate_limit_counters[limit_id][identifier]
        allowed = current_count < limit.max_requests

        if allowed:
            self.rate_limit_counters[limit_id][identifier] += 1

        return {
            "success": True,
            "allowed": allowed,
            "current_count": current_count,
            "limit": limit.max_requests,
            "reset_time": (datetime.now() + timedelta(hours=1)).isoformat()
        }

    def list_rate_limits(self) -> Dict:
        """List all rate limit configurations"""
        return {
            "success": True,
            "rate_limits": [asdict(rl) for rl in self.rate_limits.values()],
            "total": len(self.rate_limits)
        }

    def configure_load_balancer(self, service_id: str, strategy: str, **kwargs) -> Dict:
        """Configure load balancer for a service"""
        if service_id not in self.services:
            return {"success": False, "error": "Service not found"}

        balancer_id = f"lb_{service_id}"

        if balancer_id in self.load_balancers:
            balancer = self.load_balancers[balancer_id]
            balancer.strategy = LoadBalancingStrategy(strategy)
            balancer.health_check_interval = kwargs.get('health_check_interval', balancer.health_check_interval)
            balancer.session_affinity = kwargs.get('session_affinity', balancer.session_affinity)
        else:
            balancer = LoadBalancer(
                balancer_id=balancer_id,
                name=f"Load Balancer for {self.services[service_id].name}",
                service_id=service_id,
                strategy=LoadBalancingStrategy(strategy),
                health_check_interval=kwargs.get('health_check_interval', 30),
                unhealthy_threshold=kwargs.get('unhealthy_threshold', 3),
                healthy_threshold=kwargs.get('healthy_threshold', 2),
                session_affinity=kwargs.get('session_affinity', False),
                created_at=datetime.now().isoformat(),
                enabled=True
            )
            self.load_balancers[balancer_id] = balancer

        return {
            "success": True,
            "balancer": asdict(balancer)
        }

    def get_next_instance(self, service_id: str) -> Dict:
        """Get next service instance using load balancing"""
        if service_id not in self.services:
            return {"success": False, "error": "Service not found"}

        service = self.services[service_id]
        balancer_id = f"lb_{service_id}"

        if balancer_id not in self.load_balancers:
            return {"success": False, "error": "Load balancer not configured"}

        balancer = self.load_balancers[balancer_id]

        if not service.instances:
            return {"success": False, "error": "No instances available"}

        # Select instance based on strategy
        if balancer.strategy == LoadBalancingStrategy.ROUND_ROBIN:
            index = self.route_counters[service_id] % len(service.instances)
            self.route_counters[service_id] += 1
            selected = service.instances[index]

        elif balancer.strategy == LoadBalancingStrategy.RANDOM:
            selected = random.choice(service.instances)

        elif balancer.strategy == LoadBalancingStrategy.WEIGHTED:
            weights = [inst.get('weight', 1) for inst in service.instances]
            selected = random.choices(service.instances, weights=weights)[0]

        elif balancer.strategy == LoadBalancingStrategy.LEAST_CONNECTIONS:
            # Select instance with least connections
            min_conn = min(
                self.instance_connections[inst['instance_id']]
                for inst in service.instances
            )
            candidates = [
                inst for inst in service.instances
                if self.instance_connections[inst['instance_id']] == min_conn
            ]
            selected = random.choice(candidates)
            self.instance_connections[selected['instance_id']] += 1

        else:  # Default to round-robin
            index = self.route_counters[service_id] % len(service.instances)
            self.route_counters[service_id] += 1
            selected = service.instances[index]

        return {
            "success": True,
            "instance": selected,
            "strategy": balancer.strategy.value
        }

    def health_check(self, service_id: str) -> Dict:
        """Perform health check on service"""
        if service_id not in self.services:
            return {"success": False, "error": "Service not found"}

        service = self.services[service_id]

        # Mock health check (in production, make actual HTTP request)
        is_healthy = random.random() > 0.1  # 90% healthy

        if is_healthy:
            service.status = ServiceStatus.HEALTHY
        else:
            service.status = ServiceStatus.UNHEALTHY

        service.last_health_check = datetime.now().isoformat()

        return {
            "success": True,
            "service_id": service_id,
            "status": service.status.value,
            "checked_at": service.last_health_check,
            "instances_checked": len(service.instances)
        }

    def get_api_documentation(self) -> Dict:
        """Get complete API documentation"""
        endpoints = []

        for route in self.routes.values():
            if route.service_id in self.services:
                service = self.services[route.service_id]

                endpoint = {
                    "path": route.path,
                    "method": route.method,
                    "service": service.name,
                    "description": route.description,
                    "auth_required": route.auth_required,
                    "rate_limited": route.rate_limit_id is not None,
                    "cache_enabled": route.cache_enabled,
                    "timeout": route.timeout,
                    "enabled": route.enabled
                }
                endpoints.append(endpoint)

        return {
            "success": True,
            "api_version": "1.0.0",
            "total_endpoints": len(endpoints),
            "endpoints": endpoints,
            "services": [asdict(s) for s in self.services.values()]
        }

    def get_gateway_stats(self) -> Dict:
        """Get gateway statistics"""
        return {
            "success": True,
            "stats": {
                "total_services": len(self.services),
                "healthy_services": len([s for s in self.services.values()
                                        if s.status == ServiceStatus.HEALTHY]),
                "total_routes": len(self.routes),
                "enabled_routes": len([r for r in self.routes.values() if r.enabled]),
                "total_rate_limits": len(self.rate_limits),
                "active_rate_limits": len([rl for rl in self.rate_limits.values()
                                           if rl.enabled]),
                "total_load_balancers": len(self.load_balancers)
            },
            "timestamp": datetime.now().isoformat()
        }


# Singleton instance
gateway_manager = GatewayManager()
