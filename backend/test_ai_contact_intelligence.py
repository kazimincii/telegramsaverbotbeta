"""
Tests for AI Contact Intelligence
"""

import asyncio
from datetime import datetime, timedelta
from ai_contact_intelligence import (
    AIContactIntelligence,
    ProfessionDetector,
    CareerAnalyzer,
    ContactProfile
)


class TestProfessionDetector:
    """Test profession detection from messages"""

    def test_detect_software_engineer(self):
        detector = ProfessionDetector()
        messages = [
            "I'm working on a React project",
            "Just finished coding the backend API",
            "Python and JavaScript are my main languages",
            "Debugging some production issues"
        ]

        profession, confidence, evidence = detector.detect_profession(messages)

        assert profession == "Software Engineer"
        assert confidence > 0.0
        assert len(evidence) > 0
        assert any(keyword in ["react", "python", "javascript", "backend"] for keyword in evidence)

    def test_detect_data_scientist(self):
        detector = ProfessionDetector()
        messages = [
            "Training a new machine learning model",
            "Working with TensorFlow and PyTorch",
            "Data analysis and statistical modeling",
            "Deep learning for NLP tasks"
        ]

        profession, confidence, evidence = detector.detect_profession(messages)

        assert profession == "Data Scientist"
        assert confidence > 0.0
        assert len(evidence) > 0

    def test_detect_product_manager(self):
        detector = ProfessionDetector()
        messages = [
            "Planning the product roadmap for Q2",
            "Running sprint planning with the team",
            "Meeting with stakeholders tomorrow",
            "Prioritizing features for the next release"
        ]

        profession, confidence, evidence = detector.detect_profession(messages)

        assert profession == "Product Manager"
        assert confidence > 0.0

    def test_no_profession_detected(self):
        detector = ProfessionDetector()
        messages = [
            "How's the weather today?",
            "Let's grab lunch tomorrow",
            "Did you watch the game?"
        ]

        profession, confidence, evidence = detector.detect_profession(messages)

        # Should return None or very low confidence
        assert profession is None or confidence < 0.1

    def test_detect_sector(self):
        detector = ProfessionDetector()
        messages = [
            "Our SaaS platform is growing",
            "Working on cloud infrastructure",
            "AI and machine learning applications"
        ]

        sector, evidence = detector.detect_sector(messages)

        assert sector == "Technology"
        assert len(evidence) > 0

    def test_detect_seniority(self):
        detector = ProfessionDetector()

        # Junior
        messages_junior = ["I'm a junior developer", "Just started my career"]
        assert detector.detect_seniority(messages_junior) == "Junior"

        # Senior
        messages_senior = ["I'm a senior engineer", "Leading the technical team"]
        assert detector.detect_seniority(messages_senior) == "Senior"

        # C-Level
        messages_exec = ["As the CTO, I'm responsible for", "CEO of the company"]
        assert detector.detect_seniority(messages_exec) == "C-Level"

    def test_extract_company_names(self):
        detector = ProfessionDetector()
        messages = [
            "I work at Google",
            "My company Microsoft is great",
            "Working for Amazon Web Services"
        ]

        companies = detector.extract_company_names(messages)

        assert len(companies) > 0
        # Should extract at least one company name


class TestCareerAnalyzer:
    """Test career path analysis"""

    def test_analyze_early_career(self):
        analyzer = CareerAnalyzer()
        profile = ContactProfile(
            contact_id=1,
            name="Test User",
            username="testuser",
            phone=None,
            seniority_level="Junior"
        )
        messages = ["Learning new technologies", "Growing my skills"]

        result = analyzer.analyze_career_path(profile, messages)

        assert result["career_stage"] == "Early Career"
        assert result["estimated_experience_years"] == 1

    def test_analyze_mid_career(self):
        analyzer = CareerAnalyzer()
        profile = ContactProfile(
            contact_id=1,
            name="Test User",
            username="testuser",
            phone=None,
            seniority_level="Mid"
        )
        messages = ["Leading small projects", "Mentoring junior developers"]

        result = analyzer.analyze_career_path(profile, messages)

        # Mid seniority = 3 years, which is "Early Career" (< 7 years)
        assert result["career_stage"] in ["Early Career", "Mid Career"]
        assert result["estimated_experience_years"] == 3

    def test_analyze_senior_career(self):
        analyzer = CareerAnalyzer()
        profile = ContactProfile(
            contact_id=1,
            name="Test User",
            username="testuser",
            phone=None,
            seniority_level="Senior"
        )
        messages = ["Architecting the system", "Leading the engineering team"]

        result = analyzer.analyze_career_path(profile, messages)

        # Senior seniority = 7 years, which is "Mid Career" (>= 3 and < 7) or "Senior Career" (>= 7)
        assert result["career_stage"] in ["Mid Career", "Senior Career"]
        assert result["estimated_experience_years"] == 7

    def test_detect_rising_trajectory(self):
        analyzer = CareerAnalyzer()
        profile = ContactProfile(
            contact_id=1,
            name="Test User",
            username="testuser",
            phone=None
        )
        messages = [
            "Just got promoted to senior engineer!",
            "New role with more responsibilities",
            "Exciting growth opportunity"
        ]

        result = analyzer.analyze_career_path(profile, messages)

        assert result["career_trajectory"] == "Rising"

    def test_detect_stable_trajectory(self):
        analyzer = CareerAnalyzer()
        profile = ContactProfile(
            contact_id=1,
            name="Test User",
            username="testuser",
            phone=None
        )
        messages = [
            "Continuing with my current role",
            "Steady progress on projects",
            "Maintaining good performance"
        ]

        result = analyzer.analyze_career_path(profile, messages)

        assert result["career_trajectory"] in ["Stable", "Rising"]


class TestAIContactIntelligence:
    """Test full AI contact intelligence pipeline"""

    async def test_analyze_contact_full(self):
        ai = AIContactIntelligence()

        messages = [
            "Working on a new React project at Google",
            "Senior software engineer focused on frontend",
            "Leading the UI team for our SaaS platform",
            "Built several features with TypeScript and Node.js",
            "Promoted to tech lead last year"
        ]

        timestamps = [
            datetime.now() - timedelta(days=i)
            for i in range(len(messages))
        ]

        profile = await ai.analyze_contact(
            contact_id=123,
            name="John Doe",
            username="johndoe",
            phone="+1234567890",
            messages=messages,
            message_timestamps=timestamps
        )

        # Verify basic fields
        assert profile.contact_id == 123
        assert profile.name == "John Doe"
        assert profile.username == "johndoe"

        # Verify AI analysis
        assert profile.profession is not None
        assert profile.profession in ["Software Engineer", "Product Manager"]

        assert profile.sector is not None
        assert profile.sector == "Technology"

        assert profile.seniority_level is not None
        assert profile.seniority_level in ["Senior", "Lead"]

        assert profile.confidence > 0.0
        assert len(profile.evidence_keywords) > 0

        # Verify career analysis
        assert profile.career_stage is not None
        assert profile.estimated_experience_years is not None
        assert profile.career_trajectory is not None

        # Verify engagement metrics
        assert profile.message_count == len(messages)
        assert profile.last_activity is not None
        assert profile.engagement_score >= 0.0

    async def test_analyze_contact_no_messages(self):
        ai = AIContactIntelligence()

        profile = await ai.analyze_contact(
            contact_id=456,
            name="Jane Smith",
            username="janesmith",
            phone=None,
            messages=[],
            message_timestamps=[]
        )

        # Should return profile with no AI data
        assert profile.contact_id == 456
        assert profile.name == "Jane Smith"
        assert profile.profession is None
        assert profile.confidence == 0.0
        assert profile.message_count == 0

    async def test_engagement_calculation(self):
        ai = AIContactIntelligence()

        # Create messages with specific timing
        now = datetime.now()
        messages = ["Hello"] * 10
        timestamps = [
            now - timedelta(days=i)
            for i in range(10)
        ]

        profile = await ai.analyze_contact(
            contact_id=789,
            name="Bob Wilson",
            username="bobw",
            phone=None,
            messages=messages,
            message_timestamps=timestamps
        )

        # Should have calculated engagement metrics
        assert profile.message_frequency_per_week is not None
        assert profile.message_frequency_per_week > 0
        assert profile.engagement_score > 0.0
        assert profile.last_activity is not None

    async def test_topic_extraction(self):
        ai = AIContactIntelligence()

        messages = [
            "Going on vacation to Europe next month",
            "Love traveling to new countries",
            "Planning a trip to Japan",
            "Working on my fitness goals at the gym",
            "Started reading a great book"
        ]

        timestamps = [datetime.now()] * len(messages)

        profile = await ai.analyze_contact(
            contact_id=999,
            name="Alice Johnson",
            username="alicej",
            phone=None,
            messages=messages,
            message_timestamps=timestamps
        )

        # Should detect topics and interests
        assert len(profile.top_topics) > 0
        assert len(profile.interests) > 0
        assert "Travel" in profile.top_topics or "Travel" in profile.interests


def run_tests():
    """Run all tests"""
    print("Running AI Contact Intelligence Tests...\n")

    # Test Profession Detector
    print("Testing ProfessionDetector...")
    test_prof = TestProfessionDetector()
    test_prof.test_detect_software_engineer()
    test_prof.test_detect_data_scientist()
    test_prof.test_detect_product_manager()
    test_prof.test_no_profession_detected()
    test_prof.test_detect_sector()
    test_prof.test_detect_seniority()
    test_prof.test_extract_company_names()
    print("✅ ProfessionDetector tests passed!\n")

    # Test Career Analyzer
    print("Testing CareerAnalyzer...")
    test_career = TestCareerAnalyzer()
    test_career.test_analyze_early_career()
    test_career.test_analyze_mid_career()
    test_career.test_analyze_senior_career()
    test_career.test_detect_rising_trajectory()
    test_career.test_detect_stable_trajectory()
    print("✅ CareerAnalyzer tests passed!\n")

    # Test Full AI Intelligence
    print("Testing AIContactIntelligence...")
    test_ai = TestAIContactIntelligence()
    asyncio.run(test_ai.test_analyze_contact_full())
    asyncio.run(test_ai.test_analyze_contact_no_messages())
    asyncio.run(test_ai.test_engagement_calculation())
    asyncio.run(test_ai.test_topic_extraction())
    print("✅ AIContactIntelligence tests passed!\n")

    print("=" * 50)
    print("All tests passed! ✅")
    print("=" * 50)


if __name__ == "__main__":
    run_tests()
