"""
Advanced Search Engine
Provides fuzzy search, full-text search, image similarity, and advanced filtering
"""

import os
import re
import json
from typing import Dict, List, Optional, Union, Tuple, Any
from pathlib import Path
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Try to import search libraries (optional)
try:
    from fuzzywuzzy import fuzz, process
    FUZZY_AVAILABLE = True
except ImportError:
    FUZZY_AVAILABLE = False
    logger.warning("fuzzywuzzy not available. Fuzzy search will be limited.")

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    logger.warning("numpy not available. Advanced features will be limited.")


class AdvancedSearchEngine:
    """Advanced search engine with multiple search modes and filters"""

    def __init__(self, database=None):
        self.db = database
        self.search_history = []
        self.saved_searches = {}
        self.max_history = 100

    def search(
        self,
        query: str,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Perform advanced search with multiple modes

        Args:
            query: Search query
            options: Search options
                - mode: 'fuzzy', 'exact', 'regex', 'fulltext'
                - filters: Dict of filters to apply
                - limit: Maximum results
                - offset: Offset for pagination
                - sort_by: Field to sort by
                - sort_order: 'asc' or 'desc'

        Returns:
            Dict with search results and metadata
        """
        try:
            options = options or {}
            mode = options.get('mode', 'fuzzy')
            filters = options.get('filters', {})
            limit = options.get('limit', 100)
            offset = options.get('offset', 0)
            sort_by = options.get('sort_by', 'relevance')
            sort_order = options.get('sort_order', 'desc')

            # Record search in history
            self._add_to_history(query, mode, filters)

            # Perform search based on mode
            if mode == 'fuzzy':
                results = self._fuzzy_search(query, filters)
            elif mode == 'exact':
                results = self._exact_search(query, filters)
            elif mode == 'regex':
                results = self._regex_search(query, filters)
            elif mode == 'fulltext':
                results = self._fulltext_search(query, filters)
            else:
                results = []

            # Apply additional filters
            results = self._apply_filters(results, filters)

            # Sort results
            results = self._sort_results(results, sort_by, sort_order)

            # Paginate
            total = len(results)
            results = results[offset:offset + limit]

            return {
                'success': True,
                'query': query,
                'mode': mode,
                'total': total,
                'limit': limit,
                'offset': offset,
                'results': results,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Search error: {e}")
            return {
                'success': False,
                'error': str(e),
                'query': query
            }

    def _fuzzy_search(self, query: str, filters: Dict) -> List[Dict]:
        """Fuzzy search with typo tolerance"""
        if not FUZZY_AVAILABLE:
            # Fallback to simple case-insensitive search
            return self._simple_search(query, filters)

        results = []

        # Get all searchable items from database
        items = self._get_searchable_items(filters)

        # Perform fuzzy matching
        for item in items:
            # Create searchable text from item
            searchable_text = self._create_searchable_text(item)

            # Calculate fuzzy score
            score = fuzz.partial_ratio(query.lower(), searchable_text.lower())

            # Threshold for fuzzy match
            if score >= 60:  # 60% similarity
                item['relevance_score'] = score / 100.0
                results.append(item)

        return results

    def _exact_search(self, query: str, filters: Dict) -> List[Dict]:
        """Exact match search"""
        results = []
        items = self._get_searchable_items(filters)

        query_lower = query.lower()

        for item in items:
            searchable_text = self._create_searchable_text(item).lower()

            if query_lower in searchable_text:
                # Calculate position-based relevance
                position = searchable_text.find(query_lower)
                relevance = 1.0 - (position / max(len(searchable_text), 1))
                item['relevance_score'] = max(relevance, 0.5)
                results.append(item)

        return results

    def _regex_search(self, pattern: str, filters: Dict) -> List[Dict]:
        """Regex pattern search"""
        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error as e:
            logger.error(f"Invalid regex pattern: {e}")
            return []

        results = []
        items = self._get_searchable_items(filters)

        for item in items:
            searchable_text = self._create_searchable_text(item)

            if regex.search(searchable_text):
                item['relevance_score'] = 0.8
                results.append(item)

        return results

    def _fulltext_search(self, query: str, filters: Dict) -> List[Dict]:
        """Full-text search with keyword extraction"""
        results = []
        items = self._get_searchable_items(filters)

        # Extract keywords from query
        keywords = self._extract_keywords(query)

        for item in items:
            searchable_text = self._create_searchable_text(item)
            text_lower = searchable_text.lower()

            # Count keyword matches
            matches = 0
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    matches += 1

            # Calculate relevance based on match ratio
            if matches > 0:
                relevance = matches / len(keywords)
                item['relevance_score'] = relevance
                results.append(item)

        return results

    def _simple_search(self, query: str, filters: Dict) -> List[Dict]:
        """Simple fallback search"""
        return self._exact_search(query, filters)

    def _get_searchable_items(self, filters: Dict) -> List[Dict]:
        """Get searchable items from database with pre-filtering"""
        # This would query the database
        # For now, return mock data structure
        items = []

        if self.db:
            try:
                # Query database based on filters
                items = self.db.get_downloads(filters)
            except Exception as e:
                logger.error(f"Database query error: {e}")

        return items

    def _create_searchable_text(self, item: Dict) -> str:
        """Create searchable text from item"""
        text_parts = []

        # Add various fields to searchable text
        if 'filename' in item:
            text_parts.append(item['filename'])
        if 'chat' in item:
            text_parts.append(str(item['chat']))
        if 'caption' in item:
            text_parts.append(item['caption'])
        if 'tags' in item:
            text_parts.extend(item['tags'])
        if 'description' in item:
            text_parts.append(item['description'])

        return ' '.join(text_parts)

    def _extract_keywords(self, query: str) -> List[str]:
        """Extract keywords from query"""
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}

        # Split and clean
        words = query.lower().split()
        keywords = [w.strip('.,!?;:') for w in words if w not in stop_words and len(w) > 2]

        return keywords

    def _apply_filters(self, results: List[Dict], filters: Dict) -> List[Dict]:
        """Apply additional filters to results"""
        filtered = results

        # Date range filter
        if 'date_from' in filters or 'date_to' in filters:
            filtered = self._filter_by_date(filtered, filters.get('date_from'), filters.get('date_to'))

        # File size filter
        if 'size_min' in filters or 'size_max' in filters:
            filtered = self._filter_by_size(filtered, filters.get('size_min'), filters.get('size_max'))

        # Media type filter
        if 'media_types' in filters:
            filtered = self._filter_by_media_type(filtered, filters['media_types'])

        # Chat filter
        if 'chats' in filters:
            filtered = self._filter_by_chat(filtered, filters['chats'])

        # Tags filter
        if 'tags' in filters:
            filtered = self._filter_by_tags(filtered, filters['tags'])

        # Status filter
        if 'status' in filters:
            filtered = self._filter_by_status(filtered, filters['status'])

        return filtered

    def _filter_by_date(self, items: List[Dict], date_from: Optional[str], date_to: Optional[str]) -> List[Dict]:
        """Filter by date range"""
        filtered = []

        for item in items:
            item_date = item.get('timestamp') or item.get('date')
            if not item_date:
                continue

            try:
                if isinstance(item_date, str):
                    item_dt = datetime.fromisoformat(item_date.replace('Z', '+00:00'))
                else:
                    item_dt = item_date

                if date_from:
                    from_dt = datetime.fromisoformat(date_from)
                    if item_dt < from_dt:
                        continue

                if date_to:
                    to_dt = datetime.fromisoformat(date_to)
                    if item_dt > to_dt:
                        continue

                filtered.append(item)

            except (ValueError, AttributeError) as e:
                logger.warning(f"Date parsing error: {e}")
                continue

        return filtered

    def _filter_by_size(self, items: List[Dict], size_min: Optional[int], size_max: Optional[int]) -> List[Dict]:
        """Filter by file size"""
        filtered = []

        for item in items:
            size = item.get('size') or item.get('file_size')
            if size is None:
                continue

            if size_min and size < size_min:
                continue
            if size_max and size > size_max:
                continue

            filtered.append(item)

        return filtered

    def _filter_by_media_type(self, items: List[Dict], media_types: List[str]) -> List[Dict]:
        """Filter by media type"""
        return [item for item in items if item.get('media_type') in media_types or item.get('type') in media_types]

    def _filter_by_chat(self, items: List[Dict], chats: List[str]) -> List[Dict]:
        """Filter by chat"""
        return [item for item in items if item.get('chat') in chats or item.get('chat_id') in chats]

    def _filter_by_tags(self, items: List[Dict], tags: List[str]) -> List[Dict]:
        """Filter by tags"""
        filtered = []

        for item in items:
            item_tags = item.get('tags', [])
            if any(tag in item_tags for tag in tags):
                filtered.append(item)

        return filtered

    def _filter_by_status(self, items: List[Dict], status: str) -> List[Dict]:
        """Filter by download status"""
        return [item for item in items if item.get('status') == status]

    def _sort_results(self, results: List[Dict], sort_by: str, sort_order: str) -> List[Dict]:
        """Sort search results"""
        reverse = sort_order == 'desc'

        if sort_by == 'relevance':
            results.sort(key=lambda x: x.get('relevance_score', 0), reverse=reverse)
        elif sort_by == 'date':
            results.sort(key=lambda x: x.get('timestamp', ''), reverse=reverse)
        elif sort_by == 'size':
            results.sort(key=lambda x: x.get('size', 0), reverse=reverse)
        elif sort_by == 'name':
            results.sort(key=lambda x: x.get('filename', ''), reverse=reverse)

        return results

    def _add_to_history(self, query: str, mode: str, filters: Dict):
        """Add search to history"""
        entry = {
            'query': query,
            'mode': mode,
            'filters': filters,
            'timestamp': datetime.now().isoformat()
        }

        self.search_history.insert(0, entry)

        # Keep only recent history
        if len(self.search_history) > self.max_history:
            self.search_history = self.search_history[:self.max_history]

    def get_history(self, limit: int = 20) -> List[Dict]:
        """Get search history"""
        return self.search_history[:limit]

    def clear_history(self):
        """Clear search history"""
        self.search_history = []

    def save_search(self, name: str, query: str, mode: str, filters: Dict):
        """Save search for later use"""
        self.saved_searches[name] = {
            'query': query,
            'mode': mode,
            'filters': filters,
            'created_at': datetime.now().isoformat()
        }

    def get_saved_searches(self) -> Dict:
        """Get all saved searches"""
        return self.saved_searches

    def delete_saved_search(self, name: str):
        """Delete saved search"""
        if name in self.saved_searches:
            del self.saved_searches[name]

    def image_similarity_search(
        self,
        reference_image_path: str,
        threshold: float = 0.8,
        limit: int = 50
    ) -> Dict:
        """
        Search for similar images using CLIP embeddings

        Args:
            reference_image_path: Path to reference image
            threshold: Similarity threshold (0-1)
            limit: Maximum results

        Returns:
            Dict with similar images
        """
        try:
            # This would use CLIP embeddings from tagging module
            from ..ai.tagging import get_tagging_engine

            engine = get_tagging_engine()

            if not engine.is_available():
                return {
                    'success': False,
                    'error': 'CLIP model not available'
                }

            # Get embedding for reference image
            # This is a simplified version - actual implementation would:
            # 1. Get CLIP embedding for reference image
            # 2. Compare with stored embeddings in database
            # 3. Return most similar images

            return {
                'success': True,
                'reference_image': reference_image_path,
                'results': [],
                'message': 'Image similarity search requires CLIP embeddings database'
            }

        except Exception as e:
            logger.error(f"Image similarity search error: {e}")
            return {
                'success': False,
                'error': str(e)
            }


# Global search engine instance
_search_engine: Optional[AdvancedSearchEngine] = None


def get_search_engine(database=None) -> AdvancedSearchEngine:
    """Get or create search engine instance"""
    global _search_engine

    if _search_engine is None:
        _search_engine = AdvancedSearchEngine(database)

    return _search_engine
