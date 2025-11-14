"""
Telegram Premium Features Manager for Telegram Saver
Handles premium features including larger file limits, priority downloads, voice transcription, and premium badges
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import uuid


class PremiumTier(Enum):
    """Premium subscription tiers"""
    FREE = "free"
    PREMIUM = "premium"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class PremiumFeature(Enum):
    """Available premium features"""
    LARGE_FILES = "large_files"  # Up to 4GB files
    PRIORITY_DOWNLOADS = "priority_downloads"  # Faster downloads
    VOICE_TRANSCRIPTION = "voice_transcription"  # Voice-to-text
    UNLIMITED_STORAGE = "unlimited_storage"  # No storage limits
    ADVANCED_SEARCH = "advanced_search"  # Enhanced search
    CUSTOM_THEMES = "custom_themes"  # Premium themes
    NO_ADS = "no_ads"  # Ad-free experience
    PREMIUM_SUPPORT = "premium_support"  # Priority support
    BATCH_OPERATIONS = "batch_operations"  # Bulk operations
    API_ACCESS = "api_access"  # API access
    TEAM_COLLABORATION = "team_collaboration"  # Team features
    ADVANCED_ANALYTICS = "advanced_analytics"  # Enhanced analytics


@dataclass
class PremiumLimits:
    """Limits for different premium tiers"""
    tier: str
    max_file_size_mb: int
    max_storage_gb: int
    max_downloads_per_day: int
    max_concurrent_downloads: int
    max_voice_transcriptions_per_day: int
    max_team_members: int
    api_rate_limit_per_minute: int
    features: List[str]


@dataclass
class PremiumSubscription:
    """Premium subscription information"""
    id: str
    user_id: str
    tier: str
    status: str  # active, expired, cancelled, trial
    start_date: str
    end_date: str
    auto_renew: bool
    payment_method: str
    features: List[str]
    limits: Dict[str, Any]
    created_at: str
    updated_at: str


@dataclass
class VoiceTranscription:
    """Voice message transcription result"""
    id: str
    file_path: str
    duration: float
    language: str
    transcribed_text: str
    confidence: float
    created_at: str


@dataclass
class PremiumUsage:
    """Track premium feature usage"""
    id: str
    user_id: str
    feature: str
    usage_count: int
    last_used: str
    metadata: Dict[str, Any]


class PremiumManager:
    """Manages Telegram Premium features"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.data_dir = "data/premium"
            os.makedirs(self.data_dir, exist_ok=True)

            self.subscriptions_file = os.path.join(self.data_dir, "subscriptions.json")
            self.transcriptions_file = os.path.join(self.data_dir, "transcriptions.json")
            self.usage_file = os.path.join(self.data_dir, "usage.json")

            self.subscriptions: Dict[str, PremiumSubscription] = {}
            self.transcriptions: Dict[str, VoiceTranscription] = {}
            self.usage: Dict[str, PremiumUsage] = {}

            self._define_tier_limits()
            self._load_data()
            self.initialized = True

    def _define_tier_limits(self):
        """Define limits for each premium tier"""
        self.tier_limits = {
            PremiumTier.FREE.value: PremiumLimits(
                tier=PremiumTier.FREE.value,
                max_file_size_mb=2048,  # 2GB
                max_storage_gb=15,
                max_downloads_per_day=100,
                max_concurrent_downloads=2,
                max_voice_transcriptions_per_day=10,
                max_team_members=1,
                api_rate_limit_per_minute=60,
                features=[
                    PremiumFeature.LARGE_FILES.value,
                ]
            ),
            PremiumTier.PREMIUM.value: PremiumLimits(
                tier=PremiumTier.PREMIUM.value,
                max_file_size_mb=4096,  # 4GB
                max_storage_gb=100,
                max_downloads_per_day=500,
                max_concurrent_downloads=5,
                max_voice_transcriptions_per_day=100,
                max_team_members=5,
                api_rate_limit_per_minute=120,
                features=[
                    PremiumFeature.LARGE_FILES.value,
                    PremiumFeature.PRIORITY_DOWNLOADS.value,
                    PremiumFeature.VOICE_TRANSCRIPTION.value,
                    PremiumFeature.ADVANCED_SEARCH.value,
                    PremiumFeature.CUSTOM_THEMES.value,
                    PremiumFeature.NO_ADS.value,
                ]
            ),
            PremiumTier.BUSINESS.value: PremiumLimits(
                tier=PremiumTier.BUSINESS.value,
                max_file_size_mb=8192,  # 8GB
                max_storage_gb=500,
                max_downloads_per_day=2000,
                max_concurrent_downloads=10,
                max_voice_transcriptions_per_day=500,
                max_team_members=25,
                api_rate_limit_per_minute=300,
                features=[
                    PremiumFeature.LARGE_FILES.value,
                    PremiumFeature.PRIORITY_DOWNLOADS.value,
                    PremiumFeature.VOICE_TRANSCRIPTION.value,
                    PremiumFeature.UNLIMITED_STORAGE.value,
                    PremiumFeature.ADVANCED_SEARCH.value,
                    PremiumFeature.CUSTOM_THEMES.value,
                    PremiumFeature.NO_ADS.value,
                    PremiumFeature.PREMIUM_SUPPORT.value,
                    PremiumFeature.BATCH_OPERATIONS.value,
                    PremiumFeature.API_ACCESS.value,
                    PremiumFeature.TEAM_COLLABORATION.value,
                ]
            ),
            PremiumTier.ENTERPRISE.value: PremiumLimits(
                tier=PremiumTier.ENTERPRISE.value,
                max_file_size_mb=-1,  # Unlimited
                max_storage_gb=-1,  # Unlimited
                max_downloads_per_day=-1,  # Unlimited
                max_concurrent_downloads=50,
                max_voice_transcriptions_per_day=-1,  # Unlimited
                max_team_members=-1,  # Unlimited
                api_rate_limit_per_minute=1000,
                features=[feature.value for feature in PremiumFeature]
            )
        }

    def _load_data(self):
        """Load premium data from files"""
        try:
            # Load subscriptions
            if os.path.exists(self.subscriptions_file):
                with open(self.subscriptions_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.subscriptions = {
                        sub_id: PremiumSubscription(**sub_data)
                        for sub_id, sub_data in data.items()
                    }

            # Load transcriptions
            if os.path.exists(self.transcriptions_file):
                with open(self.transcriptions_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.transcriptions = {
                        trans_id: VoiceTranscription(**trans_data)
                        for trans_id, trans_data in data.items()
                    }

            # Load usage
            if os.path.exists(self.usage_file):
                with open(self.usage_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.usage = {
                        usage_id: PremiumUsage(**usage_data)
                        for usage_id, usage_data in data.items()
                    }

        except Exception as e:
            print(f"Error loading premium data: {e}")

    def _save_subscriptions(self):
        """Save subscriptions to file"""
        try:
            with open(self.subscriptions_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {sid: asdict(sub) for sid, sub in self.subscriptions.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving subscriptions: {e}")

    def _save_transcriptions(self):
        """Save transcriptions to file"""
        try:
            with open(self.transcriptions_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {tid: asdict(trans) for tid, trans in self.transcriptions.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving transcriptions: {e}")

    def _save_usage(self):
        """Save usage data to file"""
        try:
            with open(self.usage_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {uid: asdict(usage) for uid, usage in self.usage.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving usage: {e}")

    def get_tier_limits(self, tier: str) -> Dict:
        """Get limits for a specific tier"""
        if tier not in self.tier_limits:
            return {'success': False, 'error': 'Invalid tier'}

        limits = self.tier_limits[tier]
        return {
            'success': True,
            'limits': asdict(limits)
        }

    def get_all_tiers(self) -> Dict:
        """Get all available tiers with their limits"""
        return {
            'success': True,
            'tiers': {
                tier: asdict(limits)
                for tier, limits in self.tier_limits.items()
            }
        }

    def create_subscription(
        self,
        user_id: str,
        tier: str,
        duration_days: int = 30,
        payment_method: str = "credit_card",
        auto_renew: bool = True
    ) -> Dict:
        """Create a new premium subscription"""
        if tier not in self.tier_limits:
            return {'success': False, 'error': 'Invalid tier'}

        # Check if user already has an active subscription
        for sub in self.subscriptions.values():
            if sub.user_id == user_id and sub.status == 'active':
                return {'success': False, 'error': 'User already has an active subscription'}

        limits = self.tier_limits[tier]
        now = datetime.now()
        end_date = now + timedelta(days=duration_days)

        subscription = PremiumSubscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            tier=tier,
            status='active',
            start_date=now.isoformat(),
            end_date=end_date.isoformat(),
            auto_renew=auto_renew,
            payment_method=payment_method,
            features=limits.features,
            limits=asdict(limits),
            created_at=now.isoformat(),
            updated_at=now.isoformat()
        )

        self.subscriptions[subscription.id] = subscription
        self._save_subscriptions()

        return {
            'success': True,
            'subscription': asdict(subscription)
        }

    def get_user_subscription(self, user_id: str) -> Dict:
        """Get user's current subscription"""
        for sub in self.subscriptions.values():
            if sub.user_id == user_id:
                # Check if subscription is expired
                if sub.status == 'active':
                    end_date = datetime.fromisoformat(sub.end_date)
                    if datetime.now() > end_date:
                        sub.status = 'expired'
                        sub.updated_at = datetime.now().isoformat()
                        self._save_subscriptions()

                return {
                    'success': True,
                    'subscription': asdict(sub)
                }

        # Return free tier if no subscription found
        return {
            'success': True,
            'subscription': {
                'tier': PremiumTier.FREE.value,
                'status': 'active',
                'features': self.tier_limits[PremiumTier.FREE.value].features,
                'limits': asdict(self.tier_limits[PremiumTier.FREE.value])
            }
        }

    def check_feature_access(self, user_id: str, feature: str) -> Dict:
        """Check if user has access to a specific feature"""
        user_sub = self.get_user_subscription(user_id)
        if not user_sub['success']:
            return {'success': False, 'error': 'Could not fetch subscription'}

        subscription = user_sub['subscription']
        has_access = feature in subscription.get('features', [])

        return {
            'success': True,
            'has_access': has_access,
            'tier': subscription.get('tier', 'free')
        }

    def upgrade_subscription(self, user_id: str, new_tier: str) -> Dict:
        """Upgrade user's subscription to a higher tier"""
        if new_tier not in self.tier_limits:
            return {'success': False, 'error': 'Invalid tier'}

        current_sub = self.get_user_subscription(user_id)
        if not current_sub['success']:
            return {'success': False, 'error': 'Could not fetch current subscription'}

        # Find actual subscription object
        subscription = None
        for sub in self.subscriptions.values():
            if sub.user_id == user_id and sub.status == 'active':
                subscription = sub
                break

        if subscription:
            # Update existing subscription
            subscription.tier = new_tier
            subscription.features = self.tier_limits[new_tier].features
            subscription.limits = asdict(self.tier_limits[new_tier])
            subscription.updated_at = datetime.now().isoformat()
            self._save_subscriptions()

            return {
                'success': True,
                'subscription': asdict(subscription)
            }
        else:
            # Create new subscription
            return self.create_subscription(user_id, new_tier)

    def cancel_subscription(self, user_id: str) -> Dict:
        """Cancel user's subscription"""
        for sub in self.subscriptions.values():
            if sub.user_id == user_id and sub.status == 'active':
                sub.status = 'cancelled'
                sub.auto_renew = False
                sub.updated_at = datetime.now().isoformat()
                self._save_subscriptions()

                return {
                    'success': True,
                    'message': 'Subscription cancelled successfully'
                }

        return {'success': False, 'error': 'No active subscription found'}

    def transcribe_voice_message(
        self,
        file_path: str,
        language: str = 'en-US',
        user_id: Optional[str] = None
    ) -> Dict:
        """Transcribe a voice message to text"""
        if not os.path.exists(file_path):
            return {'success': False, 'error': 'File not found'}

        # Check feature access if user_id provided
        if user_id:
            access = self.check_feature_access(user_id, PremiumFeature.VOICE_TRANSCRIPTION.value)
            if not access['success'] or not access['has_access']:
                return {
                    'success': False,
                    'error': 'Voice transcription requires premium subscription'
                }

        # Mock transcription - In production, use Google Speech-to-Text or similar
        # This would integrate with speech recognition APIs
        mock_transcriptions = {
            'en-US': 'This is a sample transcription of the voice message in English.',
            'tr-TR': 'Bu, Türkçe sesli mesajın örnek bir transkripsiyonudur.',
            'de-DE': 'Dies ist eine Beispieltranskription der Sprachnachricht auf Deutsch.',
            'fr-FR': 'Ceci est un exemple de transcription du message vocal en français.',
            'es-ES': 'Esta es una transcripción de ejemplo del mensaje de voz en español.'
        }

        transcribed_text = mock_transcriptions.get(language, mock_transcriptions['en-US'])
        confidence = 0.92

        # Get file duration (mock)
        duration = 15.5  # seconds

        transcription = VoiceTranscription(
            id=str(uuid.uuid4()),
            file_path=file_path,
            duration=duration,
            language=language,
            transcribed_text=transcribed_text,
            confidence=confidence,
            created_at=datetime.now().isoformat()
        )

        self.transcriptions[transcription.id] = transcription
        self._save_transcriptions()

        # Track usage
        if user_id:
            self._track_usage(user_id, PremiumFeature.VOICE_TRANSCRIPTION.value)

        return {
            'success': True,
            'transcription': asdict(transcription)
        }

    def get_transcription(self, transcription_id: str) -> Dict:
        """Get a transcription by ID"""
        if transcription_id not in self.transcriptions:
            return {'success': False, 'error': 'Transcription not found'}

        return {
            'success': True,
            'transcription': asdict(self.transcriptions[transcription_id])
        }

    def get_all_transcriptions(self, user_id: Optional[str] = None, limit: int = 50) -> Dict:
        """Get all transcriptions, optionally filtered by user"""
        transcriptions = list(self.transcriptions.values())
        transcriptions = sorted(transcriptions, key=lambda x: x.created_at, reverse=True)
        transcriptions = transcriptions[:limit]

        return {
            'success': True,
            'transcriptions': [asdict(t) for t in transcriptions],
            'count': len(transcriptions)
        }

    def _track_usage(self, user_id: str, feature: str):
        """Track feature usage"""
        usage_key = f"{user_id}_{feature}"

        if usage_key in self.usage:
            usage = self.usage[usage_key]
            usage.usage_count += 1
            usage.last_used = datetime.now().isoformat()
        else:
            usage = PremiumUsage(
                id=str(uuid.uuid4()),
                user_id=user_id,
                feature=feature,
                usage_count=1,
                last_used=datetime.now().isoformat(),
                metadata={}
            )
            self.usage[usage_key] = usage

        self._save_usage()

    def get_usage_statistics(self, user_id: str) -> Dict:
        """Get usage statistics for a user"""
        user_usage = {}
        for key, usage in self.usage.items():
            if usage.user_id == user_id:
                user_usage[usage.feature] = {
                    'count': usage.usage_count,
                    'last_used': usage.last_used
                }

        return {
            'success': True,
            'statistics': user_usage
        }

    def validate_file_size(self, user_id: str, file_size_mb: int) -> Dict:
        """Validate if user can download/upload a file of given size"""
        user_sub = self.get_user_subscription(user_id)
        if not user_sub['success']:
            return {'success': False, 'error': 'Could not fetch subscription'}

        subscription = user_sub['subscription']
        limits = subscription.get('limits', {})
        max_size = limits.get('max_file_size_mb', 2048)

        if max_size == -1:  # Unlimited
            return {
                'success': True,
                'allowed': True,
                'max_size_mb': -1
            }

        allowed = file_size_mb <= max_size

        return {
            'success': True,
            'allowed': allowed,
            'max_size_mb': max_size,
            'file_size_mb': file_size_mb
        }

    def get_premium_statistics(self) -> Dict:
        """Get overall premium statistics"""
        total_subscribers = len(self.subscriptions)
        active_subscribers = sum(1 for sub in self.subscriptions.values() if sub.status == 'active')

        # By tier
        by_tier = {}
        for sub in self.subscriptions.values():
            tier = sub.tier
            by_tier[tier] = by_tier.get(tier, 0) + 1

        # Total transcriptions
        total_transcriptions = len(self.transcriptions)

        # Feature usage
        feature_usage = {}
        for usage in self.usage.values():
            feature = usage.feature
            feature_usage[feature] = feature_usage.get(feature, 0) + usage.usage_count

        return {
            'success': True,
            'statistics': {
                'total_subscribers': total_subscribers,
                'active_subscribers': active_subscribers,
                'subscribers_by_tier': by_tier,
                'total_transcriptions': total_transcriptions,
                'feature_usage': feature_usage
            }
        }


# Singleton instance
premium_manager = PremiumManager()
