"""
Performance Optimization Manager
Provides caching, query optimization, asset compression, and lazy loading
"""

import json
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import random


class CacheStrategy(Enum):
    """Cache eviction strategies"""
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    FIFO = "fifo"  # First In First Out
    TTL = "ttl"  # Time To Live


class CompressionType(Enum):
    """Compression algorithms"""
    GZIP = "gzip"
    BROTLI = "brotli"
    DEFLATE = "deflate"
    ZSTD = "zstd"


@dataclass
class CacheEntry:
    """Cache entry"""
    key: str
    value: Any
    created_at: str
    last_accessed: str
    access_count: int
    ttl: int  # seconds
    size_bytes: int
    tags: List[str]


@dataclass
class CacheConfig:
    """Cache configuration"""
    cache_id: str
    name: str
    max_size_mb: int
    strategy: CacheStrategy
    default_ttl: int
    enabled: bool
    stats: Dict


@dataclass
class QueryOptimization:
    """Query optimization result"""
    query_id: str
    original_query: str
    optimized_query: str
    indexes_used: List[str]
    estimated_speedup: float
    recommendations: List[str]
    created_at: str


@dataclass
class AssetCompression:
    """Compressed asset"""
    asset_id: str
    original_path: str
    compressed_path: str
    compression_type: CompressionType
    original_size: int
    compressed_size: int
    compression_ratio: float
    created_at: str


@dataclass
class LazyLoadConfig:
    """Lazy loading configuration"""
    config_id: str
    resource_type: str  # "images", "scripts", "modules"
    threshold: int  # pixels or count
    placeholder: str
    enabled: bool


class PerformanceOptimizer:
    """
    Manages performance optimization including caching, query optimization,
    asset compression, and lazy loading
    Singleton pattern for consistent state
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PerformanceOptimizer, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.cache_configs: Dict[str, CacheConfig] = {}
        self.cache_data: Dict[str, Dict[str, CacheEntry]] = {}
        self.query_optimizations: Dict[str, QueryOptimization] = {}
        self.compressed_assets: Dict[str, AssetCompression] = {}
        self.lazy_load_configs: Dict[str, LazyLoadConfig] = {}

        self._create_sample_data()
        self._initialized = True

    def _create_sample_data(self):
        """Create sample optimization configuration"""
        # Sample cache configs
        sample_caches = [
            CacheConfig(
                cache_id="cache_api",
                name="API Response Cache",
                max_size_mb=512,
                strategy=CacheStrategy.LRU,
                default_ttl=300,
                enabled=True,
                stats={"hits": 12543, "misses": 1234, "hit_rate": 0.91}
            ),
            CacheConfig(
                cache_id="cache_db",
                name="Database Query Cache",
                max_size_mb=1024,
                strategy=CacheStrategy.TTL,
                default_ttl=600,
                enabled=True,
                stats={"hits": 45123, "misses": 3421, "hit_rate": 0.93}
            ),
            CacheConfig(
                cache_id="cache_static",
                name="Static Asset Cache",
                max_size_mb=2048,
                strategy=CacheStrategy.FIFO,
                default_ttl=86400,
                enabled=True,
                stats={"hits": 98234, "misses": 1234, "hit_rate": 0.99}
            )
        ]

        for cache in sample_caches:
            self.cache_configs[cache.cache_id] = cache
            self.cache_data[cache.cache_id] = {}

    def create_cache(self, name: str, max_size_mb: int, strategy: str,
                    default_ttl: int, **kwargs) -> Dict:
        """Create a new cache configuration"""
        cache_id = f"cache_{secrets.token_hex(6)}"

        cache_config = CacheConfig(
            cache_id=cache_id,
            name=name,
            max_size_mb=max_size_mb,
            strategy=CacheStrategy(strategy),
            default_ttl=default_ttl,
            enabled=kwargs.get('enabled', True),
            stats={"hits": 0, "misses": 0, "hit_rate": 0.0}
        )

        self.cache_configs[cache_id] = cache_config
        self.cache_data[cache_id] = {}

        return {
            "success": True,
            "cache_id": cache_id,
            "cache": asdict(cache_config)
        }

    def set_cache(self, cache_id: str, key: str, value: Any,
                  ttl: Optional[int] = None, tags: List[str] = None) -> Dict:
        """Set a cache entry"""
        if cache_id not in self.cache_configs:
            return {"success": False, "error": "Cache not found"}

        cache_config = self.cache_configs[cache_id]

        if not cache_config.enabled:
            return {"success": False, "error": "Cache is disabled"}

        # Create cache entry
        entry = CacheEntry(
            key=key,
            value=value,
            created_at=datetime.now().isoformat(),
            last_accessed=datetime.now().isoformat(),
            access_count=0,
            ttl=ttl or cache_config.default_ttl,
            size_bytes=len(str(value)),
            tags=tags or []
        )

        self.cache_data[cache_id][key] = entry

        return {
            "success": True,
            "key": key,
            "cached_at": entry.created_at
        }

    def get_cache(self, cache_id: str, key: str) -> Dict:
        """Get a cache entry"""
        if cache_id not in self.cache_configs:
            return {"success": False, "error": "Cache not found"}

        cache_config = self.cache_configs[cache_id]

        if key not in self.cache_data[cache_id]:
            cache_config.stats["misses"] += 1
            cache_config.stats["hit_rate"] = cache_config.stats["hits"] / (
                cache_config.stats["hits"] + cache_config.stats["misses"]
            )
            return {"success": False, "error": "Cache miss", "cached": False}

        entry = self.cache_data[cache_id][key]

        # Check if entry has expired
        created = datetime.fromisoformat(entry.created_at)
        if (datetime.now() - created).seconds > entry.ttl:
            del self.cache_data[cache_id][key]
            cache_config.stats["misses"] += 1
            cache_config.stats["hit_rate"] = cache_config.stats["hits"] / (
                cache_config.stats["hits"] + cache_config.stats["misses"]
            )
            return {"success": False, "error": "Cache expired", "cached": False}

        # Update access metrics
        entry.last_accessed = datetime.now().isoformat()
        entry.access_count += 1

        cache_config.stats["hits"] += 1
        cache_config.stats["hit_rate"] = cache_config.stats["hits"] / (
            cache_config.stats["hits"] + cache_config.stats["misses"]
        )

        return {
            "success": True,
            "cached": True,
            "value": entry.value,
            "age_seconds": (datetime.now() - created).seconds
        }

    def invalidate_cache(self, cache_id: str, key: Optional[str] = None,
                        tags: List[str] = None) -> Dict:
        """Invalidate cache entries"""
        if cache_id not in self.cache_configs:
            return {"success": False, "error": "Cache not found"}

        if key:
            # Invalidate specific key
            if key in self.cache_data[cache_id]:
                del self.cache_data[cache_id][key]
                return {"success": True, "invalidated": 1}
            return {"success": True, "invalidated": 0}

        elif tags:
            # Invalidate by tags
            count = 0
            keys_to_delete = []
            for k, entry in self.cache_data[cache_id].items():
                if any(tag in entry.tags for tag in tags):
                    keys_to_delete.append(k)
                    count += 1

            for k in keys_to_delete:
                del self.cache_data[cache_id][k]

            return {"success": True, "invalidated": count}

        else:
            # Clear all
            count = len(self.cache_data[cache_id])
            self.cache_data[cache_id] = {}
            return {"success": True, "invalidated": count}

    def get_cache_stats(self, cache_id: str) -> Dict:
        """Get cache statistics"""
        if cache_id not in self.cache_configs:
            return {"success": False, "error": "Cache not found"}

        cache_config = self.cache_configs[cache_id]
        cache_data = self.cache_data[cache_id]

        total_size = sum(entry.size_bytes for entry in cache_data.values())

        return {
            "success": True,
            "cache_id": cache_id,
            "name": cache_config.name,
            "stats": {
                **cache_config.stats,
                "entries": len(cache_data),
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "max_size_mb": cache_config.max_size_mb,
                "usage_percent": round((total_size / (cache_config.max_size_mb * 1024 * 1024)) * 100, 2)
            }
        }

    def list_caches(self) -> Dict:
        """List all cache configurations"""
        return {
            "success": True,
            "caches": [asdict(cache) for cache in self.cache_configs.values()],
            "total": len(self.cache_configs)
        }

    def optimize_query(self, query: str, table: str) -> Dict:
        """Optimize a database query"""
        query_id = f"qopt_{secrets.token_hex(6)}"

        # Mock query optimization
        recommendations = []
        indexes_used = []

        if "WHERE" in query.upper():
            recommendations.append("Add index on WHERE clause columns")
            indexes_used.append(f"idx_{table}_filter")

        if "ORDER BY" in query.upper():
            recommendations.append("Add index on ORDER BY columns")
            indexes_used.append(f"idx_{table}_sort")

        if "JOIN" in query.upper():
            recommendations.append("Ensure foreign key indexes exist")
            indexes_used.append(f"idx_{table}_fk")

        if "SELECT *" in query.upper():
            recommendations.append("Select only needed columns instead of SELECT *")

        optimization = QueryOptimization(
            query_id=query_id,
            original_query=query,
            optimized_query=query.replace("SELECT *", "SELECT id, name"),
            indexes_used=indexes_used,
            estimated_speedup=round(random.uniform(1.5, 10.0), 2),
            recommendations=recommendations,
            created_at=datetime.now().isoformat()
        )

        self.query_optimizations[query_id] = optimization

        return {
            "success": True,
            "optimization": asdict(optimization)
        }

    def compress_asset(self, file_path: str, compression_type: str) -> Dict:
        """Compress an asset"""
        asset_id = f"asset_{secrets.token_hex(6)}"

        # Mock compression
        original_size = random.randint(100000, 5000000)  # 100KB - 5MB
        compression_ratios = {
            "gzip": 0.3,
            "brotli": 0.25,
            "deflate": 0.35,
            "zstd": 0.28
        }

        ratio = compression_ratios.get(compression_type, 0.3)
        compressed_size = int(original_size * ratio)

        compression = AssetCompression(
            asset_id=asset_id,
            original_path=file_path,
            compressed_path=f"{file_path}.{compression_type}",
            compression_type=CompressionType(compression_type),
            original_size=original_size,
            compressed_size=compressed_size,
            compression_ratio=round(compressed_size / original_size, 3),
            created_at=datetime.now().isoformat()
        )

        self.compressed_assets[asset_id] = compression

        return {
            "success": True,
            "asset_id": asset_id,
            "compression": asdict(compression),
            "saved_bytes": original_size - compressed_size,
            "saved_percent": round((1 - ratio) * 100, 1)
        }

    def configure_lazy_load(self, resource_type: str, threshold: int,
                           placeholder: str, **kwargs) -> Dict:
        """Configure lazy loading"""
        config_id = f"lazy_{secrets.token_hex(6)}"

        config = LazyLoadConfig(
            config_id=config_id,
            resource_type=resource_type,
            threshold=threshold,
            placeholder=placeholder,
            enabled=kwargs.get('enabled', True)
        )

        self.lazy_load_configs[config_id] = config

        return {
            "success": True,
            "config_id": config_id,
            "config": asdict(config)
        }

    def get_performance_metrics(self) -> Dict:
        """Get overall performance metrics"""
        total_cache_hits = sum(c.stats["hits"] for c in self.cache_configs.values())
        total_cache_misses = sum(c.stats["misses"] for c in self.cache_configs.values())

        avg_hit_rate = (total_cache_hits / (total_cache_hits + total_cache_misses)
                       if total_cache_hits + total_cache_misses > 0 else 0)

        total_compressed = len(self.compressed_assets)
        total_saved = sum(
            c.original_size - c.compressed_size
            for c in self.compressed_assets.values()
        )

        return {
            "success": True,
            "metrics": {
                "caching": {
                    "total_caches": len(self.cache_configs),
                    "total_hits": total_cache_hits,
                    "total_misses": total_cache_misses,
                    "average_hit_rate": round(avg_hit_rate, 3)
                },
                "compression": {
                    "total_assets": total_compressed,
                    "total_saved_bytes": total_saved,
                    "total_saved_mb": round(total_saved / (1024 * 1024), 2)
                },
                "optimization": {
                    "queries_optimized": len(self.query_optimizations),
                    "lazy_load_configs": len(self.lazy_load_configs)
                }
            },
            "timestamp": datetime.now().isoformat()
        }


# Singleton instance
performance_optimizer = PerformanceOptimizer()
