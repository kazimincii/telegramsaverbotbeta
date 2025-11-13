"""
Smart Content Summarization Engine
Provides article, message, video, and audio summarization using GPT-4 and Whisper
"""

import os
import json
from typing import Dict, List, Optional, Union
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# OpenAI will be optional - only import if available
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI library not available. Summarization features will be disabled.")


class SummarizationEngine:
    """Content summarization engine with support for multiple content types"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.enabled = OPENAI_AVAILABLE and bool(self.api_key)

        if self.enabled:
            openai.api_key = self.api_key

        # Summary settings
        self.max_length = 500  # Maximum summary length in words
        self.style = 'concise'  # concise, detailed, bullet-points
        self.language = 'auto'  # auto-detect or specific language

    def is_enabled(self) -> bool:
        """Check if summarization engine is enabled"""
        return self.enabled

    async def summarize_text(
        self,
        text: str,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Summarize text content (articles, messages, documents)

        Args:
            text: Text content to summarize
            options: Optional summarization options
                - style: 'concise', 'detailed', 'bullet-points'
                - max_length: Maximum summary length
                - language: Target language for summary
                - extract_keywords: Extract key points (bool)

        Returns:
            Dict with summary, key points, metadata
        """
        if not self.enabled:
            return {
                'success': False,
                'error': 'Summarization engine is not enabled'
            }

        try:
            options = options or {}
            style = options.get('style', self.style)
            max_length = options.get('max_length', self.max_length)
            extract_keywords = options.get('extract_keywords', True)

            # Build prompt based on style
            prompt = self._build_summarization_prompt(text, style, max_length)

            # Call GPT-4
            response = await self._call_gpt4(prompt, system_prompt=self._get_system_prompt())

            # Parse response
            result = json.loads(response)

            return {
                'success': True,
                'summary': result.get('summary', ''),
                'key_points': result.get('key_points', []) if extract_keywords else [],
                'language': result.get('language', 'unknown'),
                'word_count': len(text.split()),
                'summary_word_count': len(result.get('summary', '').split()),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Text summarization error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def summarize_messages(
        self,
        messages: List[Dict],
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Summarize chat messages

        Args:
            messages: List of message dicts with 'text', 'sender', 'timestamp'
            options: Summarization options

        Returns:
            Dict with conversation summary and insights
        """
        if not self.enabled:
            return {
                'success': False,
                'error': 'Summarization engine is not enabled'
            }

        try:
            # Format messages into conversation text
            conversation_text = self._format_messages(messages)

            # Build prompt for conversation summary
            prompt = f"""Summarize this conversation:

{conversation_text}

Provide:
1. A brief summary of the main topics discussed
2. Key decisions or action items
3. Sentiment analysis
4. Main participants and their roles
"""

            # Call GPT-4
            response = await self._call_gpt4(
                prompt,
                system_prompt="You are an expert at analyzing and summarizing conversations."
            )

            result = json.loads(response)

            return {
                'success': True,
                'summary': result.get('summary', ''),
                'topics': result.get('topics', []),
                'action_items': result.get('action_items', []),
                'sentiment': result.get('sentiment', 'neutral'),
                'participants': result.get('participants', []),
                'message_count': len(messages),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Message summarization error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def transcribe_audio(
        self,
        audio_file_path: str,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Transcribe audio file to text using Whisper

        Args:
            audio_file_path: Path to audio file
            options: Optional transcription options
                - language: Target language (optional)
                - translate: Translate to English (bool)

        Returns:
            Dict with transcript and metadata
        """
        if not self.enabled:
            return {
                'success': False,
                'error': 'Transcription is not enabled'
            }

        try:
            options = options or {}
            translate = options.get('translate', False)
            language = options.get('language')

            # Open audio file
            with open(audio_file_path, 'rb') as audio_file:
                # Transcribe with Whisper
                if translate:
                    transcript = openai.Audio.translate(
                        model="whisper-1",
                        file=audio_file
                    )
                else:
                    transcript = openai.Audio.transcribe(
                        model="whisper-1",
                        file=audio_file,
                        language=language
                    )

            return {
                'success': True,
                'text': transcript['text'],
                'language': transcript.get('language', 'unknown'),
                'duration': transcript.get('duration'),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Audio transcription error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def summarize_video(
        self,
        video_file_path: str,
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Generate video summary (extract audio, transcribe, summarize)

        Args:
            video_file_path: Path to video file
            options: Summarization options

        Returns:
            Dict with transcript and summary
        """
        if not self.enabled:
            return {
                'success': False,
                'error': 'Video summarization is not enabled'
            }

        try:
            # Extract audio from video (using ffmpeg if available)
            audio_path = await self._extract_audio_from_video(video_file_path)

            if not audio_path:
                return {
                    'success': False,
                    'error': 'Failed to extract audio from video'
                }

            # Transcribe audio
            transcript_result = await self.transcribe_audio(audio_path, options)

            if not transcript_result['success']:
                return transcript_result

            # Summarize transcript
            summary_result = await self.summarize_text(
                transcript_result['text'],
                options
            )

            # Combine results
            return {
                'success': True,
                'transcript': transcript_result['text'],
                'summary': summary_result.get('summary', ''),
                'key_points': summary_result.get('key_points', []),
                'language': transcript_result.get('language'),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Video summarization error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            # Cleanup temporary audio file
            if audio_path and Path(audio_path).exists():
                try:
                    os.remove(audio_path)
                except:
                    pass

    def _build_summarization_prompt(
        self,
        text: str,
        style: str,
        max_length: int
    ) -> str:
        """Build summarization prompt based on style"""

        if style == 'bullet-points':
            return f"""Summarize the following text in bullet points (max {max_length} words):

{text}

Provide:
1. Summary in bullet points
2. Key takeaways
3. Important keywords
"""
        elif style == 'detailed':
            return f"""Provide a detailed summary of the following text (max {max_length} words):

{text}

Include:
1. Main themes and arguments
2. Supporting details
3. Key conclusions
"""
        else:  # concise
            return f"""Provide a concise summary of the following text (max {max_length} words):

{text}

Focus on:
1. Main idea
2. Key points
3. Essential information only
"""

    def _get_system_prompt(self) -> str:
        """Get system prompt for summarization"""
        return """You are an expert content summarizer. Your summaries are:
- Clear and concise
- Accurate and faithful to the original
- Well-structured
- Easy to understand
- Focus on key information

Always respond in valid JSON format with these fields:
- summary: The main summary text
- key_points: List of key points (optional)
- language: Detected language
"""

    def _format_messages(self, messages: List[Dict]) -> str:
        """Format messages into conversation text"""
        formatted = []

        for msg in messages:
            sender = msg.get('sender', 'Unknown')
            text = msg.get('text', '')
            timestamp = msg.get('timestamp', '')

            formatted.append(f"[{timestamp}] {sender}: {text}")

        return '\n'.join(formatted)

    async def _extract_audio_from_video(self, video_path: str) -> Optional[str]:
        """Extract audio from video file using ffmpeg"""
        try:
            import subprocess

            # Check if ffmpeg is available
            try:
                subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
            except (FileNotFoundError, subprocess.CalledProcessError):
                logger.error("ffmpeg not found. Cannot extract audio from video.")
                return None

            # Generate temporary audio file path
            video_file = Path(video_path)
            audio_path = video_file.parent / f"{video_file.stem}_audio.mp3"

            # Extract audio with ffmpeg
            command = [
                'ffmpeg',
                '-i', str(video_path),
                '-vn',  # No video
                '-acodec', 'libmp3lame',  # MP3 codec
                '-ab', '128k',  # Audio bitrate
                '-ar', '44100',  # Sample rate
                '-y',  # Overwrite output
                str(audio_path)
            ]

            subprocess.run(command, capture_output=True, check=True)

            return str(audio_path)

        except Exception as e:
            logger.error(f"Audio extraction error: {e}")
            return None

    async def _call_gpt4(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """Call GPT-4 API"""
        try:
            messages = []

            if system_prompt:
                messages.append({'role': 'system', 'content': system_prompt})

            messages.append({'role': 'user', 'content': prompt})

            # Call OpenAI API
            response = openai.ChatCompletion.create(
                model='gpt-4',
                messages=messages,
                temperature=0.5,
                max_tokens=1000,
                response_format={'type': 'json_object'}
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"GPT-4 API error: {e}")
            raise


# Global summarization engine instance
_engine_instance: Optional[SummarizationEngine] = None


def get_engine(api_key: Optional[str] = None) -> SummarizationEngine:
    """Get or create summarization engine instance"""
    global _engine_instance

    if _engine_instance is None or (api_key and api_key != _engine_instance.api_key):
        _engine_instance = SummarizationEngine(api_key)

    return _engine_instance
