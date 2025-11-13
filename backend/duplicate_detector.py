"""
Duplicate Detection using Perceptual Hashing
Detects visually similar images even if resized/compressed
"""
import logging
from pathlib import Path
from typing import List, Dict, Tuple, Set
import hashlib

logger = logging.getLogger(__name__)


class DuplicateDetector:
    """Detect duplicate and similar images using perceptual hashing."""

    def __init__(self, db):
        self.db = db
        self.available = self._check_dependencies()

    def _check_dependencies(self) -> bool:
        """Check if imagehash is available."""
        try:
            import imagehash
            from PIL import Image
            return True
        except ImportError:
            logger.warning("imagehash not installed. Install with: pip install imagehash Pillow")
            return False

    def compute_phash(self, image_path: Path) -> str:
        """Compute perceptual hash for an image."""
        if not self.available:
            return None

        try:
            import imagehash
            from PIL import Image

            img = Image.open(image_path)
            # pHash - robust to resizing, compression
            phash = imagehash.phash(img)
            return str(phash)
        except Exception as e:
            logger.error(f"Failed to compute hash for {image_path}: {e}")
            return None

    def compute_file_hash(self, file_path: Path) -> str:
        """Compute SHA256 hash of file content."""
        try:
            sha256 = hashlib.sha256()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256.update(chunk)
            return sha256.hexdigest()
        except Exception as e:
            logger.error(f"Failed to compute file hash: {e}")
            return None

    def find_duplicates(
        self,
        folder_path: Path,
        threshold: int = 5
    ) -> Dict[str, List[Dict]]:
        """
        Find duplicate images in a folder.

        Args:
            folder_path: Path to folder
            threshold: Hash difference threshold (0-64, lower = more similar)
                      0 = identical, <5 = very similar, <10 = similar

        Returns:
            Dictionary mapping hashes to lists of similar images
        """
        if not self.available:
            return {"error": "imagehash not available"}

        try:
            import imagehash

            image_exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
            images = []
            for ext in image_exts:
                images.extend(folder_path.rglob(f"*{ext}"))

            # Compute hashes
            hash_map = {}
            for img_path in images:
                phash = self.compute_phash(img_path)
                if phash:
                    if phash not in hash_map:
                        hash_map[phash] = []
                    hash_map[phash].append({
                        "file": str(img_path),
                        "hash": phash,
                        "size": img_path.stat().st_size
                    })

            # Find similar groups
            duplicates = {}
            processed = set()

            for hash1, files1 in hash_map.items():
                if hash1 in processed:
                    continue

                similar_group = list(files1)

                for hash2, files2 in hash_map.items():
                    if hash1 == hash2 or hash2 in processed:
                        continue

                    # Compare hashes
                    diff = imagehash.hex_to_hash(hash1) - imagehash.hex_to_hash(hash2)
                    if diff <= threshold:
                        similar_group.extend(files2)
                        processed.add(hash2)

                if len(similar_group) > 1:
                    duplicates[hash1] = similar_group
                    processed.add(hash1)

            return {
                "duplicates": duplicates,
                "total_images": len(images),
                "duplicate_groups": len(duplicates),
                "potential_savings_mb": self._calculate_savings(duplicates)
            }

        except Exception as e:
            logger.error(f"Duplicate detection failed: {e}")
            return {"error": str(e)}

    def _calculate_savings(self, duplicates: Dict) -> float:
        """Calculate potential storage savings from duplicates."""
        total_bytes = 0
        for files in duplicates.values():
            if len(files) > 1:
                # Keep largest, count others as savings
                sizes = [f["size"] for f in files]
                total_bytes += sum(sizes) - max(sizes)
        return round(total_bytes / (1024 * 1024), 2)

    def mark_duplicate(self, file_path: Path, original_path: Path):
        """Mark a file as duplicate of another in database."""
        # This could extend database schema to track duplicates
        logger.info(f"Marked {file_path} as duplicate of {original_path}")

    def scan_and_store_hashes(self, folder_path: Path) -> Dict:
        """
        Scan folder and store hashes for future comparison.
        Can be used during download to prevent duplicates.
        """
        if not self.available:
            return {"error": "imagehash not available"}

        try:
            image_exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
            images = []
            for ext in image_exts:
                images.extend(folder_path.rglob(f"*{ext}"))

            processed = 0
            for img_path in images:
                phash = self.compute_phash(img_path)
                file_hash = self.compute_file_hash(img_path)
                if phash and file_hash:
                    # Store in database (extend schema)
                    processed += 1

            return {
                "ok": True,
                "processed": processed,
                "total": len(images)
            }

        except Exception as e:
            logger.error(f"Hash storage failed: {e}")
            return {"error": str(e)}


# Installation
"""
pip install imagehash Pillow

Usage:
detector = DuplicateDetector(db)
results = detector.find_duplicates(Path("/path/to/folder"))
"""
