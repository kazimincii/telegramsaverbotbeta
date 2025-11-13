"""Elasticsearch Integration for Advanced Search"""
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class ElasticsearchSearch:
    """Advanced search using Elasticsearch."""

    def __init__(self, hosts=['http://localhost:9200']):
        self.hosts = hosts
        self.es = None

    async def initialize(self):
        """Initialize Elasticsearch client."""
        try:
            from elasticsearch import Elasticsearch
            self.es = Elasticsearch(self.hosts)
            logger.info("Elasticsearch initialized")
            return True
        except ImportError:
            logger.error("Elasticsearch not installed. Install: pip install elasticsearch")
            return False
        except Exception as e:
            logger.error(f"Elasticsearch init failed: {e}")
            return False

    async def index_file(self, file_id: str, data: Dict):
        """Index a file for searching."""
        if not self.es:
            return False

        try:
            self.es.index(index='telegram-media', id=file_id, body=data)
            return True
        except Exception as e:
            logger.error(f"Indexing failed: {e}")
            return False

    async def search(self, query: str, size: int = 10) -> List[Dict]:
        """Search indexed files."""
        if not self.es:
            return []

        try:
            result = self.es.search(
                index='telegram-media',
                body={
                    'query': {
                        'multi_match': {
                            'query': query,
                            'fields': ['filename', 'chat', 'tags', 'content']
                        }
                    },
                    'size': size
                }
            )
            return [hit['_source'] for hit in result['hits']['hits']]
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

# Install: pip install elasticsearch
