"""
CLIP AI Integration - Real OpenAI CLIP Implementation
Zero-shot image classification with natural language queries
"""
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import json

logger = logging.getLogger(__name__)


class CLIPClassifier:
    """OpenAI CLIP-based image classifier with zero-shot capabilities."""

    def __init__(self, model_name: str = "ViT-B/32", device: str = "cpu"):
        self.model_name = model_name
        self.device = device
        self.model = None
        self.preprocess = None
        self.available = self._check_dependencies()

    def _check_dependencies(self) -> bool:
        """Check if CLIP dependencies are available."""
        try:
            import torch
            import clip
            return True
        except ImportError:
            logger.warning("CLIP dependencies not installed. Install with: pip install torch torchvision git+https://github.com/openai/CLIP.git")
            return False

    async def initialize(self) -> bool:
        """Load CLIP model."""
        if not self.available:
            logger.error("CLIP dependencies not available")
            return False

        try:
            import torch
            import clip

            logger.info(f"Loading CLIP model: {self.model_name}")
            self.model, self.preprocess = clip.load(self.model_name, device=self.device)
            logger.info("CLIP model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            return False

    async def classify_image(
        self,
        image_path: Path,
        text_prompts: Optional[List[str]] = None,
        top_k: int = 3
    ) -> Dict[str, Any]:
        """
        Classify image using CLIP zero-shot classification.

        Args:
            image_path: Path to image file
            text_prompts: List of text descriptions (e.g., ["a photo of a cat", "a screenshot"])
            top_k: Number of top predictions to return

        Returns:
            Classification results with probabilities
        """
        if not self.model:
            return {"error": "Model not initialized. Call initialize() first."}

        try:
            import torch
            import clip
            from PIL import Image

            # Default prompts if none provided
            if not text_prompts:
                text_prompts = [
                    "a photo of a person",
                    "a photo of nature or landscape",
                    "a screenshot of text or software",
                    "a meme or funny image",
                    "a photo of food",
                    "a photo of an animal",
                    "a document or paper",
                    "artwork or illustration",
                    "a photo of technology or electronics",
                    "other content"
                ]

            # Load and preprocess image
            image = self.preprocess(Image.open(image_path)).unsqueeze(0).to(self.device)

            # Tokenize text prompts
            text = clip.tokenize(text_prompts).to(self.device)

            # Calculate features
            with torch.no_grad():
                image_features = self.model.encode_image(image)
                text_features = self.model.encode_text(text)

                # Calculate similarity
                image_features /= image_features.norm(dim=-1, keepdim=True)
                text_features /= text_features.norm(dim=-1, keepdim=True)
                similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)

            # Get top-k predictions
            values, indices = similarity[0].topk(top_k)

            predictions = []
            for i in range(top_k):
                predictions.append({
                    "label": text_prompts[indices[i]],
                    "confidence": float(values[i]),
                    "category": self._extract_category(text_prompts[indices[i]])
                })

            return {
                "file": str(image_path),
                "predictions": predictions,
                "primary_category": predictions[0]["category"],
                "confidence": predictions[0]["confidence"],
                "model": self.model_name
            }

        except Exception as e:
            logger.error(f"Failed to classify image {image_path}: {e}")
            return {"error": str(e)}

    def _extract_category(self, prompt: str) -> str:
        """Extract category from text prompt."""
        # Simple extraction from "a photo of X" format
        if "person" in prompt.lower():
            return "people"
        elif "nature" in prompt.lower() or "landscape" in prompt.lower():
            return "nature"
        elif "screenshot" in prompt.lower() or "text" in prompt.lower() or "software" in prompt.lower():
            return "screenshots"
        elif "meme" in prompt.lower() or "funny" in prompt.lower():
            return "memes"
        elif "food" in prompt.lower():
            return "food"
        elif "animal" in prompt.lower():
            return "animals"
        elif "document" in prompt.lower() or "paper" in prompt.lower():
            return "documents"
        elif "art" in prompt.lower() or "illustration" in prompt.lower():
            return "art"
        elif "technology" in prompt.lower() or "electronics" in prompt.lower():
            return "technology"
        else:
            return "other"

    async def search_images(
        self,
        folder_path: Path,
        query: str,
        top_n: int = 10,
        threshold: float = 0.2
    ) -> List[Dict[str, Any]]:
        """
        Search images using natural language query.

        Args:
            folder_path: Path to folder containing images
            query: Natural language search query (e.g., "photos with cats")
            top_n: Number of top results to return
            threshold: Minimum similarity threshold

        Returns:
            List of matching images with scores
        """
        if not self.model:
            return [{"error": "Model not initialized"}]

        try:
            import torch
            import clip
            from PIL import Image

            results = []

            # Find all image files
            image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
            image_files = []
            for ext in image_extensions:
                image_files.extend(folder_path.rglob(f"*{ext}"))

            if not image_files:
                return []

            # Process query
            text = clip.tokenize([query]).to(self.device)

            with torch.no_grad():
                text_features = self.model.encode_text(text)
                text_features /= text_features.norm(dim=-1, keepdim=True)

                # Process each image
                for img_path in image_files:
                    try:
                        image = self.preprocess(Image.open(img_path)).unsqueeze(0).to(self.device)
                        image_features = self.model.encode_image(image)
                        image_features /= image_features.norm(dim=-1, keepdim=True)

                        # Calculate similarity
                        similarity = float((image_features @ text_features.T).squeeze())

                        if similarity >= threshold:
                            results.append({
                                "file": str(img_path),
                                "score": similarity,
                                "query": query
                            })
                    except Exception as e:
                        logger.warning(f"Failed to process {img_path}: {e}")
                        continue

            # Sort by score and return top-n
            results.sort(key=lambda x: x['score'], reverse=True)
            return results[:top_n]

        except Exception as e:
            logger.error(f"Search failed: {e}")
            return [{"error": str(e)}]

    async def find_similar_images(
        self,
        reference_image: Path,
        folder_path: Path,
        top_n: int = 5,
        threshold: float = 0.85
    ) -> List[Dict[str, Any]]:
        """
        Find similar images to a reference image.
        Useful for duplicate detection.

        Args:
            reference_image: Path to reference image
            folder_path: Path to folder to search
            top_n: Number of similar images to return
            threshold: Similarity threshold (0.85+ = very similar)

        Returns:
            List of similar images with similarity scores
        """
        if not self.model:
            return [{"error": "Model not initialized"}]

        try:
            import torch
            import clip
            from PIL import Image

            # Process reference image
            ref_image = self.preprocess(Image.open(reference_image)).unsqueeze(0).to(self.device)

            with torch.no_grad():
                ref_features = self.model.encode_image(ref_image)
                ref_features /= ref_features.norm(dim=-1, keepdim=True)

                results = []

                # Find all images
                image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
                image_files = []
                for ext in image_extensions:
                    image_files.extend(folder_path.rglob(f"*{ext}"))

                for img_path in image_files:
                    if img_path == reference_image:
                        continue  # Skip self

                    try:
                        image = self.preprocess(Image.open(img_path)).unsqueeze(0).to(self.device)
                        image_features = self.model.encode_image(image)
                        image_features /= image_features.norm(dim=-1, keepdim=True)

                        # Cosine similarity
                        similarity = float((ref_features @ image_features.T).squeeze())

                        if similarity >= threshold:
                            results.append({
                                "file": str(img_path),
                                "similarity": similarity,
                                "reference": str(reference_image)
                            })
                    except Exception as e:
                        logger.warning(f"Failed to compare {img_path}: {e}")
                        continue

                # Sort by similarity
                results.sort(key=lambda x: x['similarity'], reverse=True)
                return results[:top_n]

        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            return [{"error": str(e)}]


# Installation instructions
"""
To use CLIP AI features, install required packages:

pip install torch torchvision
pip install git+https://github.com/openai/CLIP.git
pip install Pillow

For GPU support (recommended):
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

Model sizes:
- ViT-B/32: 151MB (fastest, recommended for CPU)
- ViT-B/16: 149MB (better accuracy)
- ViT-L/14: 428MB (best accuracy, needs GPU)
"""
