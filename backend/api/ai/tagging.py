"""
Intelligent Auto-Tagging System
Provides image recognition, object detection, and auto-categorization using CLIP and ViT
"""

import os
import json
from typing import Dict, List, Optional, Union, Tuple
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Try to import AI/ML libraries (optional)
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("PIL not available. Image processing will be disabled.")

try:
    import torch
    import clip
    CLIP_AVAILABLE = True
except ImportError:
    CLIP_AVAILABLE = False
    logger.warning("CLIP not available. Advanced image tagging will be disabled.")

try:
    from transformers import ViTImageProcessor, ViTForImageClassification
    VIT_AVAILABLE = True
except ImportError:
    VIT_AVAILABLE = False
    logger.warning("ViT not available. Image classification will be limited.")


class AutoTaggingEngine:
    """Intelligent auto-tagging engine with CLIP and ViT support"""

    def __init__(self):
        self.clip_model = None
        self.clip_preprocess = None
        self.vit_processor = None
        self.vit_model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu" if torch else "cpu"

        # Predefined categories for classification
        self.categories = {
            'content_type': [
                'photo', 'screenshot', 'meme', 'infographic', 'document',
                'diagram', 'chart', 'map', 'artwork', 'comic'
            ],
            'scene': [
                'indoor', 'outdoor', 'nature', 'city', 'beach', 'mountain',
                'office', 'home', 'restaurant', 'street'
            ],
            'objects': [
                'person', 'people', 'face', 'animal', 'cat', 'dog', 'bird',
                'car', 'building', 'tree', 'flower', 'food', 'computer',
                'phone', 'book', 'furniture'
            ],
            'mood': [
                'happy', 'sad', 'neutral', 'excited', 'calm', 'dramatic',
                'bright', 'dark', 'colorful', 'monochrome'
            ],
            'quality': [
                'high-quality', 'low-quality', 'blurry', 'clear', 'professional',
                'amateur', 'edited', 'raw'
            ]
        }

    def is_available(self) -> bool:
        """Check if tagging engine is available"""
        return PIL_AVAILABLE and (CLIP_AVAILABLE or VIT_AVAILABLE)

    async def initialize_models(self) -> Dict:
        """Initialize CLIP and ViT models"""
        try:
            results = {'clip': False, 'vit': False}

            # Initialize CLIP
            if CLIP_AVAILABLE and not self.clip_model:
                try:
                    self.clip_model, self.clip_preprocess = clip.load("ViT-B/32", device=self.device)
                    results['clip'] = True
                    logger.info(f"CLIP model loaded on {self.device}")
                except Exception as e:
                    logger.error(f"Failed to load CLIP: {e}")

            # Initialize ViT
            if VIT_AVAILABLE and not self.vit_model:
                try:
                    self.vit_processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
                    self.vit_model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224')
                    if torch:
                        self.vit_model.to(self.device)
                    results['vit'] = True
                    logger.info(f"ViT model loaded on {self.device}")
                except Exception as e:
                    logger.error(f"Failed to load ViT: {e}")

            return {
                'success': True,
                'models_loaded': results,
                'device': self.device
            }

        except Exception as e:
            logger.error(f"Model initialization error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def tag_image(
        self,
        image_path: str,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Auto-tag image using CLIP and ViT

        Args:
            image_path: Path to image file
            options: Optional tagging options
                - use_clip: Use CLIP for tagging (bool)
                - use_vit: Use ViT for classification (bool)
                - custom_labels: Custom labels to check (list)
                - confidence_threshold: Minimum confidence (float, 0-1)

        Returns:
            Dict with tags, categories, confidence scores
        """
        if not self.is_available():
            return {
                'success': False,
                'error': 'Auto-tagging is not available. Required libraries not installed.'
            }

        try:
            options = options or {}
            use_clip = options.get('use_clip', True)
            use_vit = options.get('use_vit', True)
            custom_labels = options.get('custom_labels', [])
            threshold = options.get('confidence_threshold', 0.3)

            # Load image
            if not Path(image_path).exists():
                return {
                    'success': False,
                    'error': f'Image not found: {image_path}'
                }

            image = Image.open(image_path).convert('RGB')

            results = {
                'success': True,
                'tags': [],
                'categories': {},
                'confidence_scores': {},
                'metadata': {
                    'image_size': image.size,
                    'mode': image.mode
                },
                'timestamp': datetime.now().isoformat()
            }

            # CLIP-based tagging
            if use_clip and self.clip_model:
                clip_tags = await self._tag_with_clip(image, custom_labels, threshold)
                results['tags'].extend(clip_tags['tags'])
                results['categories'].update(clip_tags['categories'])
                results['confidence_scores'].update(clip_tags['scores'])

            # ViT-based classification
            if use_vit and self.vit_model:
                vit_tags = await self._classify_with_vit(image, threshold)
                results['tags'].extend(vit_tags['tags'])
                results['confidence_scores'].update(vit_tags['scores'])

            # Remove duplicates and sort by confidence
            results['tags'] = list(set(results['tags']))
            results['tags'].sort(
                key=lambda x: results['confidence_scores'].get(x, 0),
                reverse=True
            )

            return results

        except Exception as e:
            logger.error(f"Image tagging error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def _tag_with_clip(
        self,
        image: Image.Image,
        custom_labels: List[str],
        threshold: float
    ) -> Dict:
        """Tag image using CLIP model"""
        try:
            # Prepare image
            image_input = self.clip_preprocess(image).unsqueeze(0).to(self.device)

            # Prepare text labels
            all_labels = []
            for category, labels in self.categories.items():
                all_labels.extend(labels)

            if custom_labels:
                all_labels.extend(custom_labels)

            text_inputs = clip.tokenize([f"a photo of {label}" for label in all_labels]).to(self.device)

            # Get predictions
            with torch.no_grad():
                image_features = self.clip_model.encode_image(image_input)
                text_features = self.clip_model.encode_text(text_inputs)

                # Normalize features
                image_features /= image_features.norm(dim=-1, keepdim=True)
                text_features /= text_features.norm(dim=-1, keepdim=True)

                # Calculate similarity
                similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
                values, indices = similarity[0].topk(20)

            # Extract tags above threshold
            tags = []
            scores = {}
            categories = {}

            for value, index in zip(values, indices):
                confidence = value.item()
                if confidence >= threshold:
                    label = all_labels[index]
                    tags.append(label)
                    scores[label] = confidence

                    # Categorize tag
                    for cat_name, cat_labels in self.categories.items():
                        if label in cat_labels:
                            if cat_name not in categories:
                                categories[cat_name] = []
                            categories[cat_name].append(label)

            return {
                'tags': tags,
                'categories': categories,
                'scores': scores
            }

        except Exception as e:
            logger.error(f"CLIP tagging error: {e}")
            return {'tags': [], 'categories': {}, 'scores': {}}

    async def _classify_with_vit(
        self,
        image: Image.Image,
        threshold: float
    ) -> Dict:
        """Classify image using ViT model"""
        try:
            # Prepare image
            inputs = self.vit_processor(images=image, return_tensors="pt")
            if torch:
                inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Get predictions
            with torch.no_grad():
                outputs = self.vit_model(**inputs)
                logits = outputs.logits

            # Get top predictions
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
            top_probs, top_indices = torch.topk(probabilities[0], k=10)

            # Extract tags
            tags = []
            scores = {}

            for prob, idx in zip(top_probs, top_indices):
                confidence = prob.item()
                if confidence >= threshold:
                    label = self.vit_model.config.id2label[idx.item()]
                    # Clean label (remove ImageNet class prefixes)
                    label = label.split(',')[0].strip().lower()
                    tags.append(label)
                    scores[label] = confidence

            return {
                'tags': tags,
                'scores': scores
            }

        except Exception as e:
            logger.error(f"ViT classification error: {e}")
            return {'tags': [], 'scores': {}}

    async def batch_tag_images(
        self,
        image_paths: List[str],
        options: Optional[Dict] = None
    ) -> Dict:
        """Tag multiple images in batch"""
        results = {
            'success': True,
            'total': len(image_paths),
            'tagged': 0,
            'failed': 0,
            'results': []
        }

        for image_path in image_paths:
            try:
                result = await self.tag_image(image_path, options)
                results['results'].append({
                    'path': image_path,
                    'result': result
                })

                if result['success']:
                    results['tagged'] += 1
                else:
                    results['failed'] += 1

            except Exception as e:
                logger.error(f"Batch tagging error for {image_path}: {e}")
                results['failed'] += 1
                results['results'].append({
                    'path': image_path,
                    'result': {'success': False, 'error': str(e)}
                })

        return results

    async def suggest_tags(
        self,
        existing_tags: List[str],
        context: Optional[Dict] = None
    ) -> List[str]:
        """Suggest additional tags based on existing tags and context"""
        suggestions = []

        # Tag associations (related tags)
        tag_associations = {
            'nature': ['outdoor', 'landscape', 'scenic', 'green', 'tree'],
            'city': ['urban', 'building', 'street', 'architecture'],
            'person': ['people', 'portrait', 'face', 'human'],
            'food': ['meal', 'cooking', 'restaurant', 'delicious'],
            'travel': ['vacation', 'tourism', 'adventure', 'destination'],
            'technology': ['computer', 'digital', 'modern', 'innovation'],
            'art': ['creative', 'design', 'artistic', 'visual'],
            'animal': ['pet', 'wildlife', 'fauna', 'creature']
        }

        # Find related tags
        for tag in existing_tags:
            if tag in tag_associations:
                for related_tag in tag_associations[tag]:
                    if related_tag not in existing_tags:
                        suggestions.append(related_tag)

        # Remove duplicates
        suggestions = list(set(suggestions))

        return suggestions[:10]  # Return top 10 suggestions

    def get_available_categories(self) -> Dict:
        """Get all available categories and their labels"""
        return self.categories

    def add_custom_category(self, category_name: str, labels: List[str]):
        """Add custom category with labels"""
        self.categories[category_name] = labels
        logger.info(f"Added custom category: {category_name} with {len(labels)} labels")


# Global tagging engine instance
_engine_instance: Optional[AutoTaggingEngine] = None


def get_tagging_engine() -> AutoTaggingEngine:
    """Get or create auto-tagging engine instance"""
    global _engine_instance

    if _engine_instance is None:
        _engine_instance = AutoTaggingEngine()

    return _engine_instance
