"""
AI Content Moderation System
Automatically filter and classify content for safety and compliance
"""
import logging
import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from datetime import datetime
from enum import Enum
import mimetypes

logger = logging.getLogger(__name__)


class ModerationAction(str, Enum):
    """Actions that can be taken on moderated content."""
    ALLOW = "allow"
    WARN = "warn"
    BLOCK = "block"
    QUARANTINE = "quarantine"
    DELETE = "delete"


class ContentCategory(str, Enum):
    """Content categories for classification."""
    SAFE = "safe"
    NSFW = "nsfw"
    VIOLENCE = "violence"
    HATE_SPEECH = "hate_speech"
    SPAM = "spam"
    MALWARE = "malware"
    COPYRIGHT = "copyright"
    ILLEGAL = "illegal"
    SUSPICIOUS = "suspicious"


class ModerationRule:
    """Rule for content moderation."""

    def __init__(self, rule_id: str, name: str, category: ContentCategory,
                 action: ModerationAction, threshold: float = 0.5):
        self.rule_id = rule_id
        self.name = name
        self.category = category
        self.action = action
        self.threshold = threshold  # Confidence threshold (0.0 - 1.0)
        self.enabled = True
        self.created_at = datetime.now().isoformat()
        self.triggered_count = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert rule to dictionary."""
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "category": self.category.value,
            "action": self.action.value,
            "threshold": self.threshold,
            "enabled": self.enabled,
            "created_at": self.created_at,
            "triggered_count": self.triggered_count
        }


class ModerationResult:
    """Result of content moderation."""

    def __init__(self, file_path: str, is_safe: bool, action: ModerationAction):
        self.file_path = file_path
        self.is_safe = is_safe
        self.action = action
        self.categories: Dict[ContentCategory, float] = {}  # Category -> confidence
        self.triggered_rules: List[str] = []  # Rule IDs
        self.reasons: List[str] = []
        self.timestamp = datetime.now().isoformat()

    def add_detection(self, category: ContentCategory, confidence: float, rule_id: str, reason: str):
        """Add a detection result."""
        self.categories[category] = confidence
        self.triggered_rules.append(rule_id)
        self.reasons.append(reason)

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary."""
        return {
            "file_path": self.file_path,
            "is_safe": self.is_safe,
            "action": self.action.value,
            "categories": {cat.value: conf for cat, conf in self.categories.items()},
            "triggered_rules": self.triggered_rules,
            "reasons": self.reasons,
            "timestamp": self.timestamp
        }


class ContentModerator:
    """AI-powered content moderation system."""

    def __init__(self, config_file: Path):
        self.config_file = config_file
        self.rules: Dict[str, ModerationRule] = {}
        self.moderation_history: List[ModerationResult] = []
        self.blocked_hashes: Set[str] = set()  # File hashes of blocked content
        self.auto_moderate = True

        # Create default rules
        self._create_default_rules()

        # Load existing configuration
        self._load_config()

    def _create_default_rules(self):
        """Create default moderation rules."""
        # NSFW content
        nsfw_rule = ModerationRule(
            rule_id="nsfw_default",
            name="NSFW Content Detection",
            category=ContentCategory.NSFW,
            action=ModerationAction.BLOCK,
            threshold=0.7
        )
        self.rules["nsfw_default"] = nsfw_rule

        # Violence
        violence_rule = ModerationRule(
            rule_id="violence_default",
            name="Violent Content Detection",
            category=ContentCategory.VIOLENCE,
            action=ModerationAction.WARN,
            threshold=0.6
        )
        self.rules["violence_default"] = violence_rule

        # Hate speech
        hate_rule = ModerationRule(
            rule_id="hate_default",
            name="Hate Speech Detection",
            category=ContentCategory.HATE_SPEECH,
            action=ModerationAction.BLOCK,
            threshold=0.8
        )
        self.rules["hate_default"] = hate_rule

        # Spam
        spam_rule = ModerationRule(
            rule_id="spam_default",
            name="Spam Detection",
            category=ContentCategory.SPAM,
            action=ModerationAction.QUARANTINE,
            threshold=0.5
        )
        self.rules["spam_default"] = spam_rule

        # Malware
        malware_rule = ModerationRule(
            rule_id="malware_default",
            name="Malware Detection",
            category=ContentCategory.MALWARE,
            action=ModerationAction.DELETE,
            threshold=0.9
        )
        self.rules["malware_default"] = malware_rule

        logger.info("Created default moderation rules")

    def _load_config(self):
        """Load moderation configuration from file."""
        if not self.config_file.exists():
            logger.info("No moderation config found, using defaults")
            return

        try:
            with open(self.config_file, 'r') as f:
                data = json.load(f)

            # Load custom rules
            for rule_data in data.get("rules", []):
                rule = ModerationRule(
                    rule_id=rule_data["rule_id"],
                    name=rule_data["name"],
                    category=ContentCategory(rule_data["category"]),
                    action=ModerationAction(rule_data["action"]),
                    threshold=rule_data.get("threshold", 0.5)
                )
                rule.enabled = rule_data.get("enabled", True)
                rule.created_at = rule_data.get("created_at", rule.created_at)
                rule.triggered_count = rule_data.get("triggered_count", 0)

                self.rules[rule.rule_id] = rule

            # Load blocked hashes
            self.blocked_hashes = set(data.get("blocked_hashes", []))

            # Load settings
            self.auto_moderate = data.get("auto_moderate", True)

            logger.info(f"Loaded moderation config: {len(self.rules)} rules, {len(self.blocked_hashes)} blocked hashes")

        except Exception as e:
            logger.error(f"Failed to load moderation config: {e}")

    def _save_config(self):
        """Save moderation configuration to file."""
        try:
            data = {
                "rules": [rule.to_dict() for rule in self.rules.values()],
                "blocked_hashes": list(self.blocked_hashes),
                "auto_moderate": self.auto_moderate
            }

            with open(self.config_file, 'w') as f:
                json.dump(data, f, indent=2)

            logger.debug("Saved moderation config")
        except Exception as e:
            logger.error(f"Failed to save moderation config: {e}")

    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of file."""
        sha256 = hashlib.sha256()
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    sha256.update(chunk)
            return sha256.hexdigest()
        except Exception as e:
            logger.error(f"Failed to calculate hash for {file_path}: {e}")
            return ""

    def _detect_nsfw(self, file_path: Path) -> float:
        """
        Detect NSFW content in images/videos.

        In production, this would use:
        - NudeNet (https://github.com/notAI-tech/NudeNet)
        - NSFW Detector models
        - Vision AI APIs (Google Cloud Vision, AWS Rekognition)

        Returns confidence score (0.0 - 1.0)
        """
        # Placeholder implementation
        # In real implementation, load ML model and analyze image
        mime_type, _ = mimetypes.guess_type(str(file_path))

        if mime_type and mime_type.startswith(('image/', 'video/')):
            # Simulate NSFW detection
            # Real implementation would use:
            # from nudenet import NudeDetector
            # detector = NudeDetector()
            # result = detector.detect(str(file_path))
            # confidence = result['unsafe']

            # For now, return low confidence (safe)
            return 0.0

        return 0.0

    def _detect_violence(self, file_path: Path) -> float:
        """
        Detect violent content.

        Uses:
        - Image classification models
        - Object detection (weapons, blood, etc.)
        - Scene understanding

        Returns confidence score (0.0 - 1.0)
        """
        # Placeholder
        # Real implementation:
        # - Use CLIP for violence detection
        # - Check for weapons, blood, gore keywords
        # - Analyze video frames for violence
        return 0.0

    def _detect_hate_speech(self, file_path: Path, metadata: Dict = None) -> float:
        """
        Detect hate speech in text/captions.

        Uses:
        - NLP models (BERT, RoBERTa)
        - Hate speech classifiers
        - Text from OCR for images

        Returns confidence score (0.0 - 1.0)
        """
        # Placeholder
        # Real implementation:
        # - Extract text from image (OCR)
        # - Analyze caption/description
        # - Use hate speech detection model

        if metadata:
            text = metadata.get("caption", "")
            # Analyze text for hate speech patterns
            # Use transformers model or API
            pass

        return 0.0

    def _detect_spam(self, file_path: Path, metadata: Dict = None) -> float:
        """
        Detect spam content.

        Checks for:
        - Duplicate content
        - Spam patterns
        - Suspicious URLs

        Returns confidence score (0.0 - 1.0)
        """
        # Placeholder
        # Check file hash against known spam
        file_hash = self._calculate_file_hash(file_path)

        # In production, check against spam database
        # Check for suspicious patterns

        return 0.0

    def _detect_malware(self, file_path: Path) -> float:
        """
        Detect potential malware.

        Checks:
        - File type mismatches
        - Suspicious executables
        - Malicious patterns

        Returns confidence score (0.0 - 1.0)
        """
        # Placeholder
        # Real implementation:
        # - Check file magic numbers
        # - Scan with antivirus API
        # - Detect suspicious extensions

        mime_type, _ = mimetypes.guess_type(str(file_path))

        # Block suspicious file types
        dangerous_extensions = {'.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'}
        if file_path.suffix.lower() in dangerous_extensions:
            return 0.9

        return 0.0

    async def moderate_content(self, file_path: Path, metadata: Dict = None) -> ModerationResult:
        """
        Perform content moderation on a file.

        Args:
            file_path: Path to file to moderate
            metadata: Optional metadata (caption, description, etc.)

        Returns:
            ModerationResult with action and reasons
        """
        # Check if file is in blocked hash list
        file_hash = self._calculate_file_hash(file_path)
        if file_hash in self.blocked_hashes:
            result = ModerationResult(str(file_path), False, ModerationAction.BLOCK)
            result.add_detection(
                ContentCategory.SUSPICIOUS,
                1.0,
                "hash_blocked",
                "File hash matches blocked content"
            )
            self.moderation_history.append(result)
            logger.warning(f"Blocked file by hash: {file_path}")
            return result

        # Run detection algorithms
        detections = {
            ContentCategory.NSFW: self._detect_nsfw(file_path),
            ContentCategory.VIOLENCE: self._detect_violence(file_path),
            ContentCategory.HATE_SPEECH: self._detect_hate_speech(file_path, metadata),
            ContentCategory.SPAM: self._detect_spam(file_path, metadata),
            ContentCategory.MALWARE: self._detect_malware(file_path)
        }

        # Initialize result as safe
        result = ModerationResult(str(file_path), True, ModerationAction.ALLOW)

        # Check each rule
        highest_action = ModerationAction.ALLOW
        action_priority = {
            ModerationAction.ALLOW: 0,
            ModerationAction.WARN: 1,
            ModerationAction.QUARANTINE: 2,
            ModerationAction.BLOCK: 3,
            ModerationAction.DELETE: 4
        }

        for rule in self.rules.values():
            if not rule.enabled:
                continue

            confidence = detections.get(rule.category, 0.0)

            if confidence >= rule.threshold:
                # Rule triggered
                rule.triggered_count += 1
                result.add_detection(
                    rule.category,
                    confidence,
                    rule.rule_id,
                    f"{rule.name} triggered (confidence: {confidence:.2f})"
                )

                # Update action if more severe
                if action_priority[rule.action] > action_priority[highest_action]:
                    highest_action = rule.action

        # Update result
        if highest_action != ModerationAction.ALLOW:
            result.is_safe = False
            result.action = highest_action

        # If blocked or deleted, add to blocked hashes
        if result.action in [ModerationAction.BLOCK, ModerationAction.DELETE]:
            self.blocked_hashes.add(file_hash)

        # Save result
        self.moderation_history.append(result)
        self._save_config()

        logger.info(f"Moderated {file_path}: {result.action.value} (categories: {list(result.categories.keys())})")
        return result

    # Rule Management

    def create_rule(self, name: str, category: ContentCategory, action: ModerationAction,
                   threshold: float = 0.5) -> ModerationRule:
        """Create custom moderation rule."""
        rule_id = f"rule_{len(self.rules)}"
        rule = ModerationRule(rule_id, name, category, action, threshold)
        self.rules[rule_id] = rule
        self._save_config()
        logger.info(f"Created moderation rule: {name}")
        return rule

    def get_rule(self, rule_id: str) -> Optional[ModerationRule]:
        """Get rule by ID."""
        return self.rules.get(rule_id)

    def list_rules(self) -> List[ModerationRule]:
        """List all rules."""
        return list(self.rules.values())

    def update_rule(self, rule_id: str, **kwargs) -> bool:
        """Update rule settings."""
        rule = self.rules.get(rule_id)
        if not rule:
            return False

        if "name" in kwargs:
            rule.name = kwargs["name"]
        if "threshold" in kwargs:
            rule.threshold = kwargs["threshold"]
        if "action" in kwargs:
            rule.action = ModerationAction(kwargs["action"])
        if "enabled" in kwargs:
            rule.enabled = kwargs["enabled"]

        self._save_config()
        logger.info(f"Updated rule: {rule_id}")
        return True

    def delete_rule(self, rule_id: str) -> bool:
        """Delete custom rule."""
        if rule_id in self.rules:
            del self.rules[rule_id]
            self._save_config()
            logger.info(f"Deleted rule: {rule_id}")
            return True
        return False

    # History and Statistics

    def get_moderation_history(self, limit: int = 100) -> List[ModerationResult]:
        """Get recent moderation history."""
        return self.moderation_history[-limit:]

    def get_statistics(self) -> Dict[str, Any]:
        """Get moderation statistics."""
        total = len(self.moderation_history)
        blocked = sum(1 for r in self.moderation_history if not r.is_safe)

        category_counts = {}
        for result in self.moderation_history:
            for category in result.categories:
                category_counts[category.value] = category_counts.get(category.value, 0) + 1

        action_counts = {}
        for result in self.moderation_history:
            action_counts[result.action.value] = action_counts.get(result.action.value, 0) + 1

        return {
            "total_moderated": total,
            "blocked_count": blocked,
            "safe_count": total - blocked,
            "blocked_rate": blocked / total if total > 0 else 0,
            "category_counts": category_counts,
            "action_counts": action_counts,
            "blocked_hashes": len(self.blocked_hashes)
        }

    # Whitelist/Blacklist Management

    def block_hash(self, file_hash: str):
        """Add file hash to block list."""
        self.blocked_hashes.add(file_hash)
        self._save_config()

    def unblock_hash(self, file_hash: str):
        """Remove file hash from block list."""
        self.blocked_hashes.discard(file_hash)
        self._save_config()


# Usage example:
"""
# Initialize content moderator
moderator = ContentModerator(Path("moderation_config.json"))

# Moderate a file
result = await moderator.moderate_content(
    Path("/path/to/image.jpg"),
    metadata={"caption": "Some text"}
)

if result.is_safe:
    print("Content is safe")
else:
    print(f"Content blocked: {result.action}")
    print(f"Reasons: {result.reasons}")

# Create custom rule
moderator.create_rule(
    name="Strict NSFW Filter",
    category=ContentCategory.NSFW,
    action=ModerationAction.DELETE,
    threshold=0.5
)

# Get statistics
stats = moderator.get_statistics()
print(f"Blocked rate: {stats['blocked_rate']:.2%}")
"""
