"""
AI Contact Intelligence Service
Advanced contact profiling with LinkedIn integration, job title extraction, and career path analysis
"""

import logging
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class ContactProfile:
    """Contact profile with AI-generated insights"""
    contact_id: int
    name: str
    username: Optional[str]
    phone: Optional[str]

    # AI-detected fields
    profession: Optional[str] = None
    sector: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    seniority_level: Optional[str] = None  # Junior/Mid/Senior/Lead/C-Level

    # Career path analysis
    career_stage: Optional[str] = None
    estimated_experience_years: Optional[int] = None
    career_trajectory: Optional[str] = None  # Rising/Stable/Declining

    # LinkedIn data (if available)
    linkedin_url: Optional[str] = None
    linkedin_headline: Optional[str] = None
    linkedin_summary: Optional[str] = None

    # Confidence and evidence
    confidence: float = 0.0
    evidence_keywords: List[str] = None
    message_count: int = 0
    last_activity: Optional[datetime] = None

    # Engagement metrics
    avg_response_time_hours: Optional[float] = None
    message_frequency_per_week: Optional[float] = None
    engagement_score: float = 0.0

    # Topic analysis
    top_topics: List[str] = None
    interests: List[str] = None

    def __post_init__(self):
        if self.evidence_keywords is None:
            self.evidence_keywords = []
        if self.top_topics is None:
            self.top_topics = []
        if self.interests is None:
            self.interests = []


class ProfessionDetector:
    """Detects profession from text messages using keyword matching and patterns"""

    # Profession keywords database
    PROFESSION_KEYWORDS = {
        "Software Engineer": ["developer", "programmer", "software engineer", "backend", "frontend", "fullstack", "coding", "python", "javascript", "react", "node.js"],
        "Data Scientist": ["data scientist", "machine learning", "deep learning", "ml", "ai", "tensorflow", "pytorch", "data analysis", "statistics"],
        "Product Manager": ["product manager", "pm", "product owner", "roadmap", "sprint", "agile", "scrum", "stakeholder"],
        "Designer": ["designer", "ui", "ux", "figma", "sketch", "adobe", "creative", "design thinking", "wireframe"],
        "Marketing": ["marketing", "seo", "sem", "social media", "campaign", "content marketing", "brand", "advertising"],
        "Sales": ["sales", "business development", "bd", "lead generation", "crm", "pipeline", "quota", "closing"],
        "Doctor": ["doctor", "physician", "medical", "patient", "diagnosis", "treatment", "hospital", "clinic"],
        "Teacher": ["teacher", "professor", "lecturer", "education", "teaching", "student", "curriculum", "lesson"],
        "Lawyer": ["lawyer", "attorney", "legal", "law", "court", "case", "litigation", "contract"],
        "Entrepreneur": ["entrepreneur", "startup", "founder", "ceo", "business owner", "venture", "fundraising"],
        "Consultant": ["consultant", "consulting", "advisory", "strategy", "implementation", "assessment"],
        "Accountant": ["accountant", "accounting", "finance", "tax", "audit", "bookkeeping", "financial"],
        "HR Manager": ["hr", "human resources", "recruitment", "talent", "hiring", "employee", "onboarding"],
        "Photographer": ["photographer", "photography", "camera", "photoshoot", "portfolio", "lightroom"],
        "Writer": ["writer", "author", "journalist", "content writer", "copywriter", "blogger", "editor"],
    }

    # Sector keywords
    SECTOR_KEYWORDS = {
        "Technology": ["tech", "software", "hardware", "it", "saas", "cloud", "ai", "blockchain"],
        "Finance": ["finance", "banking", "investment", "trading", "fintech", "insurance", "wealth"],
        "Healthcare": ["healthcare", "medical", "pharma", "biotech", "hospital", "clinic", "health"],
        "Education": ["education", "edtech", "university", "school", "training", "learning"],
        "E-commerce": ["ecommerce", "retail", "shopping", "marketplace", "online store"],
        "Media": ["media", "journalism", "publishing", "entertainment", "broadcasting"],
        "Manufacturing": ["manufacturing", "production", "factory", "industrial", "engineering"],
        "Real Estate": ["real estate", "property", "construction", "architecture"],
        "Consulting": ["consulting", "advisory", "professional services"],
        "Non-profit": ["non-profit", "ngo", "charity", "foundation", "social"],
    }

    # Seniority indicators
    SENIORITY_KEYWORDS = {
        "Junior": ["junior", "associate", "trainee", "intern", "entry-level", "graduate"],
        "Mid": ["mid-level", "specialist", "analyst", "coordinator"],
        "Senior": ["senior", "lead", "principal", "staff", "expert"],
        "Lead": ["lead", "team lead", "tech lead", "head of"],
        "C-Level": ["ceo", "cto", "cfo", "coo", "cmo", "chief", "founder", "co-founder", "president", "vp", "vice president"],
    }

    def detect_profession(self, messages: List[str]) -> Tuple[Optional[str], float, List[str]]:
        """
        Detect profession from messages
        Returns: (profession, confidence, evidence_keywords)
        """
        if not messages:
            return None, 0.0, []

        # Combine all messages
        text = " ".join(messages).lower()

        # Score each profession
        profession_scores = {}
        evidence_map = {}

        for profession, keywords in self.PROFESSION_KEYWORDS.items():
            score = 0
            evidence = []

            for keyword in keywords:
                if keyword.lower() in text:
                    score += text.count(keyword.lower())
                    evidence.append(keyword)

            if score > 0:
                profession_scores[profession] = score
                evidence_map[profession] = evidence

        if not profession_scores:
            return None, 0.0, []

        # Get top profession
        top_profession = max(profession_scores, key=profession_scores.get)
        max_score = profession_scores[top_profession]

        # Calculate confidence (normalize to 0-1)
        total_words = len(text.split())
        confidence = min(max_score / (total_words * 0.05), 1.0)  # 5% keyword density = 100% confidence

        return top_profession, confidence, evidence_map[top_profession][:10]  # Top 10 keywords

    def detect_sector(self, messages: List[str]) -> Tuple[Optional[str], List[str]]:
        """Detect sector from messages"""
        if not messages:
            return None, []

        text = " ".join(messages).lower()

        sector_scores = {}
        evidence_map = {}

        for sector, keywords in self.SECTOR_KEYWORDS.items():
            score = 0
            evidence = []

            for keyword in keywords:
                if keyword.lower() in text:
                    score += text.count(keyword.lower())
                    evidence.append(keyword)

            if score > 0:
                sector_scores[sector] = score
                evidence_map[sector] = evidence

        if not sector_scores:
            return None, []

        top_sector = max(sector_scores, key=sector_scores.get)
        return top_sector, evidence_map[top_sector][:5]

    def detect_seniority(self, messages: List[str]) -> Optional[str]:
        """Detect seniority level"""
        if not messages:
            return None

        text = " ".join(messages).lower()

        for seniority, keywords in self.SENIORITY_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    return seniority

        return "Mid"  # Default to Mid if no indicators found

    def extract_company_names(self, messages: List[str]) -> List[str]:
        """Extract company names using patterns"""
        companies = []

        # Common patterns: "at Company", "work at Company", "working for Company"
        patterns = [
            r"(?:at|for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
            r"(?:company|employer):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        ]

        text = " ".join(messages)

        for pattern in patterns:
            matches = re.findall(pattern, text)
            companies.extend(matches)

        # Filter common words
        common_words = {"The", "A", "An", "This", "That"}
        companies = [c for c in companies if c not in common_words]

        return list(set(companies))[:3]  # Top 3 unique companies


class CareerAnalyzer:
    """Analyzes career path and trajectory"""

    def analyze_career_path(self, profile: ContactProfile, messages: List[str]) -> Dict:
        """Analyze career trajectory and stage"""

        # Estimate experience based on seniority
        experience_map = {
            "Junior": 1,
            "Mid": 3,
            "Senior": 7,
            "Lead": 10,
            "C-Level": 15,
        }

        estimated_years = experience_map.get(profile.seniority_level, 5)

        # Determine career stage
        if estimated_years < 3:
            career_stage = "Early Career"
        elif estimated_years < 7:
            career_stage = "Mid Career"
        elif estimated_years < 15:
            career_stage = "Senior Career"
        else:
            career_stage = "Executive/Leadership"

        # Analyze trajectory from message content
        trajectory = self._detect_trajectory(messages)

        return {
            "career_stage": career_stage,
            "estimated_experience_years": estimated_years,
            "career_trajectory": trajectory,
        }

    def _detect_trajectory(self, messages: List[str]) -> str:
        """Detect career trajectory from message sentiment"""
        text = " ".join(messages).lower()

        # Rising indicators
        rising_keywords = ["promotion", "new role", "advanced", "growth", "opportunity", "hired", "joined"]
        # Stable indicators
        stable_keywords = ["continue", "maintain", "steady", "consistent"]
        # Declining indicators (note: usually people don't share this)
        declining_keywords = ["looking for", "job search", "unemployed", "laid off"]

        rising_score = sum(text.count(k) for k in rising_keywords)
        stable_score = sum(text.count(k) for k in stable_keywords)
        declining_score = sum(text.count(k) for k in declining_keywords)

        if rising_score > stable_score and rising_score > declining_score:
            return "Rising"
        elif declining_score > 0:
            return "Transitioning"
        else:
            return "Stable"


class LinkedInIntegration:
    """LinkedIn profile integration (placeholder for API integration)"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.enabled = api_key is not None

    async def search_by_name_phone(self, name: str, phone: Optional[str] = None) -> Optional[Dict]:
        """
        Search LinkedIn by name and phone
        Note: This is a placeholder. Real implementation would use LinkedIn API or web scraping
        """
        if not self.enabled:
            return None

        # TODO: Implement actual LinkedIn API call
        # For now, return None
        logger.info(f"LinkedIn search for {name} (API not implemented)")
        return None

    async def enrich_profile(self, profile: ContactProfile) -> ContactProfile:
        """Enrich profile with LinkedIn data"""
        if not self.enabled:
            return profile

        # Search LinkedIn
        linkedin_data = await self.search_by_name_phone(profile.name, profile.phone)

        if linkedin_data:
            profile.linkedin_url = linkedin_data.get("url")
            profile.linkedin_headline = linkedin_data.get("headline")
            profile.linkedin_summary = linkedin_data.get("summary")

            # Override AI detection with LinkedIn data if available
            if linkedin_data.get("job_title"):
                profile.job_title = linkedin_data["job_title"]
            if linkedin_data.get("company"):
                profile.company = linkedin_data["company"]

        return profile


class AIContactIntelligence:
    """Main AI Contact Intelligence service"""

    def __init__(self, linkedin_api_key: Optional[str] = None):
        self.profession_detector = ProfessionDetector()
        self.career_analyzer = CareerAnalyzer()
        self.linkedin = LinkedInIntegration(linkedin_api_key)

    async def analyze_contact(
        self,
        contact_id: int,
        name: str,
        username: Optional[str],
        phone: Optional[str],
        messages: List[str],
        message_timestamps: List[datetime],
    ) -> ContactProfile:
        """
        Comprehensive contact analysis

        Args:
            contact_id: Contact ID
            name: Contact name
            username: Telegram username
            phone: Phone number
            messages: List of message texts
            message_timestamps: List of message timestamps

        Returns:
            ContactProfile with AI-generated insights
        """

        # Basic profile
        profile = ContactProfile(
            contact_id=contact_id,
            name=name,
            username=username,
            phone=phone,
            message_count=len(messages),
            last_activity=max(message_timestamps) if message_timestamps else None,
        )

        # Detect profession
        profession, confidence, evidence = self.profession_detector.detect_profession(messages)
        profile.profession = profession
        profile.confidence = confidence
        profile.evidence_keywords = evidence

        # Detect sector
        sector, sector_evidence = self.profession_detector.detect_sector(messages)
        profile.sector = sector
        if sector_evidence:
            profile.evidence_keywords.extend(sector_evidence)

        # Detect seniority
        profile.seniority_level = self.profession_detector.detect_seniority(messages)

        # Extract companies
        companies = self.profession_detector.extract_company_names(messages)
        if companies:
            profile.company = companies[0]  # Use first/most mentioned

        # Career path analysis
        career_data = self.career_analyzer.analyze_career_path(profile, messages)
        profile.career_stage = career_data["career_stage"]
        profile.estimated_experience_years = career_data["estimated_experience_years"]
        profile.career_trajectory = career_data["career_trajectory"]

        # Calculate engagement metrics
        profile = self._calculate_engagement(profile, messages, message_timestamps)

        # Analyze topics
        profile.top_topics = self._extract_topics(messages)[:5]
        profile.interests = self._extract_interests(messages)[:5]

        # LinkedIn enrichment (async)
        try:
            profile = await self.linkedin.enrich_profile(profile)
        except Exception as e:
            logger.error(f"LinkedIn enrichment failed: {e}")

        return profile

    def _calculate_engagement(
        self,
        profile: ContactProfile,
        messages: List[str],
        timestamps: List[datetime]
    ) -> ContactProfile:
        """Calculate engagement metrics"""

        if len(timestamps) < 2:
            profile.engagement_score = 0.0
            return profile

        # Calculate message frequency (messages per week)
        time_span = (max(timestamps) - min(timestamps)).total_seconds() / (7 * 24 * 3600)  # weeks
        if time_span > 0:
            profile.message_frequency_per_week = len(messages) / time_span

        # Calculate average response time (simplified - would need request/response pairs)
        # For now, just use average time between messages
        time_diffs = []
        for i in range(1, len(timestamps)):
            diff = (timestamps[i] - timestamps[i-1]).total_seconds() / 3600  # hours
            if diff < 168:  # Less than a week
                time_diffs.append(diff)

        if time_diffs:
            profile.avg_response_time_hours = sum(time_diffs) / len(time_diffs)

        # Engagement score (0-1)
        # Based on: message frequency, recency, avg response time
        score = 0.0

        # Frequency component (0-0.4)
        if profile.message_frequency_per_week:
            score += min(profile.message_frequency_per_week / 10, 0.4)

        # Recency component (0-0.3)
        if profile.last_activity:
            days_since = (datetime.now() - profile.last_activity).days
            recency_score = max(0, 0.3 - (days_since / 100))
            score += recency_score

        # Response time component (0-0.3)
        if profile.avg_response_time_hours:
            # Faster response = higher score
            response_score = max(0, 0.3 - (profile.avg_response_time_hours / 100))
            score += response_score

        profile.engagement_score = min(score, 1.0)

        return profile

    def _extract_topics(self, messages: List[str]) -> List[str]:
        """Extract main topics from messages"""
        # Simplified topic extraction (would use NLP in production)
        text = " ".join(messages).lower()

        # Common topics
        topics = {
            "Technology": ["tech", "software", "ai", "ml", "code", "programming"],
            "Business": ["business", "market", "strategy", "growth", "revenue"],
            "Finance": ["money", "investment", "stock", "crypto", "trading"],
            "Travel": ["travel", "trip", "vacation", "hotel", "flight"],
            "Food": ["food", "restaurant", "cooking", "recipe"],
            "Sports": ["sports", "game", "match", "fitness", "workout"],
            "Entertainment": ["movie", "music", "concert", "show", "game"],
            "Health": ["health", "medical", "doctor", "fitness"],
        }

        detected_topics = []
        for topic, keywords in topics.items():
            if any(kw in text for kw in keywords):
                detected_topics.append(topic)

        return detected_topics

    def _extract_interests(self, messages: List[str]) -> List[str]:
        """Extract personal interests"""
        text = " ".join(messages).lower()

        interests = {
            "Photography": ["photo", "camera", "lens"],
            "Gaming": ["game", "gaming", "gamer", "ps5", "xbox"],
            "Reading": ["book", "reading", "novel", "author"],
            "Music": ["music", "song", "album", "concert"],
            "Cooking": ["cooking", "recipe", "chef"],
            "Travel": ["travel", "trip", "country"],
            "Fitness": ["gym", "workout", "fitness", "running"],
            "Art": ["art", "painting", "drawing", "artist"],
        }

        detected = []
        for interest, keywords in interests.items():
            if any(kw in text for kw in keywords):
                detected.append(interest)

        return detected


# Singleton instance
_ai_intelligence = None


def get_ai_intelligence(linkedin_api_key: Optional[str] = None) -> AIContactIntelligence:
    """Get singleton AI intelligence instance"""
    global _ai_intelligence
    if _ai_intelligence is None:
        _ai_intelligence = AIContactIntelligence(linkedin_api_key)
    return _ai_intelligence
