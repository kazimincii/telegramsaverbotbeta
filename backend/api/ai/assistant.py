"""
AI Chat Assistant with GPT-4 Integration
Provides natural language command parsing and context-aware assistance
"""

import os
import json
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# OpenAI will be optional - only import if available
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI library not available. AI features will be disabled.")


class AIAssistant:
    """AI Assistant for natural language processing and command parsing"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.enabled = OPENAI_AVAILABLE and bool(self.api_key)

        if self.enabled:
            openai.api_key = self.api_key

        self.conversation_history = []
        self.max_history = 10

    def is_enabled(self) -> bool:
        """Check if AI assistant is enabled and configured"""
        return self.enabled

    async def chat(self, message: str, context: Optional[Dict] = None) -> Dict:
        """
        Process chat message and return AI response

        Args:
            message: User message
            context: Optional context (current config, download status, etc.)

        Returns:
            Dict with response, action, and parameters
        """
        if not self.enabled:
            return {
                'success': False,
                'error': 'AI assistant is not enabled. Please configure OpenAI API key.',
                'response': 'AI features are currently disabled. Please add your OpenAI API key in settings.'
            }

        try:
            # Build system prompt with context
            system_prompt = self._build_system_prompt(context)

            # Add user message to history
            self.conversation_history.append({
                'role': 'user',
                'content': message
            })

            # Keep only recent history
            if len(self.conversation_history) > self.max_history * 2:
                self.conversation_history = self.conversation_history[-self.max_history * 2:]

            # Call GPT-4
            response = await self._call_gpt4(system_prompt, self.conversation_history)

            # Add assistant response to history
            self.conversation_history.append({
                'role': 'assistant',
                'content': response['response']
            })

            return response

        except Exception as e:
            logger.error(f"AI chat error: {e}")
            return {
                'success': False,
                'error': str(e),
                'response': f'Sorry, I encountered an error: {str(e)}'
            }

    def _build_system_prompt(self, context: Optional[Dict]) -> str:
        """Build system prompt with context information"""
        base_prompt = """You are an AI assistant for a Telegram Media Archiver application.
You help users manage their Telegram downloads and media archive.

Your capabilities:
1. Parse natural language commands into structured actions
2. Provide helpful suggestions for downloads and searches
3. Explain features and answer questions
4. Auto-categorize and tag media

When users give commands, respond with:
- A friendly natural language response
- An "action" field with the command type (download, search, filter, etc.)
- A "parameters" field with structured parameters

Example commands you understand:
- "Download all images from this month" → action: download, parameters: {types: ['photos'], date_filter: 'this_month'}
- "Find videos about cats" → action: search, parameters: {query: 'cats', type: 'videos'}
- "Show me my download history" → action: view_history
- "Summarize this chat" → action: summarize

Always be helpful, friendly, and concise."""

        if context:
            base_prompt += f"\n\nCurrent context:\n{json.dumps(context, indent=2)}"

        return base_prompt

    async def _call_gpt4(self, system_prompt: str, messages: List[Dict]) -> Dict:
        """Call GPT-4 API"""
        try:
            # Prepare messages
            api_messages = [
                {'role': 'system', 'content': system_prompt}
            ] + messages

            # Call OpenAI API
            response = openai.ChatCompletion.create(
                model='gpt-4',
                messages=api_messages,
                temperature=0.7,
                max_tokens=500,
                response_format={'type': 'json_object'}
            )

            # Parse response
            content = response.choices[0].message.content
            parsed = json.loads(content)

            return {
                'success': True,
                'response': parsed.get('response', ''),
                'action': parsed.get('action'),
                'parameters': parsed.get('parameters', {})
            }

        except json.JSONDecodeError:
            # Fallback if response is not valid JSON
            return {
                'success': True,
                'response': content,
                'action': None,
                'parameters': {}
            }

    def parse_natural_language_command(self, command: str) -> Optional[Dict]:
        """
        Parse natural language command into structured parameters
        This is a simple rule-based parser (can be enhanced with GPT-4)
        """
        command_lower = command.lower()
        result = {'action': None, 'parameters': {}}

        # Download commands
        if any(word in command_lower for word in ['download', 'get', 'fetch']):
            result['action'] = 'download'

            # Media types
            if 'image' in command_lower or 'photo' in command_lower:
                result['parameters']['types'] = ['photos']
            elif 'video' in command_lower:
                result['parameters']['types'] = ['videos']
            elif 'document' in command_lower or 'file' in command_lower:
                result['parameters']['types'] = ['documents']
            elif 'audio' in command_lower or 'music' in command_lower:
                result['parameters']['types'] = ['audio']

            # Date filters
            if 'today' in command_lower:
                result['parameters']['date_filter'] = 'today'
            elif 'this week' in command_lower or 'week' in command_lower:
                result['parameters']['date_filter'] = 'this_week'
            elif 'this month' in command_lower or 'month' in command_lower:
                result['parameters']['date_filter'] = 'this_month'
            elif 'this year' in command_lower or 'year' in command_lower:
                result['parameters']['date_filter'] = 'this_year'

        # Search commands
        elif any(word in command_lower for word in ['find', 'search', 'look for']):
            result['action'] = 'search'
            # Extract search query (simplified)
            for word in ['find', 'search', 'look for']:
                if word in command_lower:
                    query_start = command_lower.index(word) + len(word)
                    result['parameters']['query'] = command[query_start:].strip()
                    break

        # Summary commands
        elif 'summarize' in command_lower or 'summary' in command_lower:
            result['action'] = 'summarize'

        # History commands
        elif 'history' in command_lower or 'recent' in command_lower:
            result['action'] = 'view_history'

        return result if result['action'] else None

    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []

    def get_suggestions(self, context: Optional[Dict] = None) -> List[str]:
        """Get AI-powered suggestions based on context"""
        suggestions = [
            "Download all images from this month",
            "Find videos about travel",
            "Show me my download history",
            "Summarize recent downloads",
            "Search for documents from this week"
        ]

        if context and context.get('recent_chats'):
            recent_chat = context['recent_chats'][0] if context['recent_chats'] else None
            if recent_chat:
                suggestions.insert(0, f"Download media from {recent_chat}")

        return suggestions


# Global assistant instance
_assistant_instance: Optional[AIAssistant] = None


def get_assistant(api_key: Optional[str] = None) -> AIAssistant:
    """Get or create AI assistant instance"""
    global _assistant_instance

    if _assistant_instance is None or (api_key and api_key != _assistant_instance.api_key):
        _assistant_instance = AIAssistant(api_key)

    return _assistant_instance
