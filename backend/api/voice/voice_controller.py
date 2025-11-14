"""
Voice Control System for Telegram Saver
Handles voice commands, speech recognition, and text-to-speech
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import re


class VoiceCommand(Enum):
    """Available voice commands"""
    START_DOWNLOAD = "start_download"
    PAUSE_DOWNLOAD = "pause_download"
    RESUME_DOWNLOAD = "resume_download"
    CANCEL_DOWNLOAD = "cancel_download"
    SEARCH = "search"
    PLAY_MEDIA = "play_media"
    PAUSE_MEDIA = "pause_media"
    STOP_MEDIA = "stop_media"
    NEXT_MEDIA = "next_media"
    PREVIOUS_MEDIA = "previous_media"
    VOLUME_UP = "volume_up"
    VOLUME_DOWN = "volume_down"
    OPEN_SETTINGS = "open_settings"
    SHOW_STATS = "show_stats"
    HELP = "help"
    UNKNOWN = "unknown"


class TTSVoice(Enum):
    """Text-to-speech voice types"""
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"


class TTSLanguage(Enum):
    """Supported TTS languages"""
    ENGLISH = "en"
    TURKISH = "tr"
    GERMAN = "de"
    FRENCH = "fr"
    SPANISH = "es"


@dataclass
class VoiceCommandResult:
    """Voice command processing result"""
    id: str
    command: str
    original_text: str
    parameters: Dict[str, Any]
    confidence: float
    executed: bool
    result: Optional[str]
    timestamp: str


@dataclass
class TTSRequest:
    """Text-to-speech request"""
    id: str
    text: str
    language: str
    voice: str
    speed: float
    audio_url: Optional[str]
    created_at: str


class VoiceController:
    """Manages voice control features"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.data_dir = "data/voice"
            os.makedirs(self.data_dir, exist_ok=True)

            self.commands_file = os.path.join(self.data_dir, "commands.json")
            self.tts_file = os.path.join(self.data_dir, "tts_requests.json")
            self.audio_dir = os.path.join(self.data_dir, "audio")
            os.makedirs(self.audio_dir, exist_ok=True)

            self.command_history: List[VoiceCommandResult] = []
            self.tts_history: List[TTSRequest] = []

            # Command patterns for recognition
            self.command_patterns = {
                VoiceCommand.START_DOWNLOAD: [
                    r"start download",
                    r"begin download",
                    r"download.*",
                    r"indir.*",
                    r"indirmeyi başlat"
                ],
                VoiceCommand.PAUSE_DOWNLOAD: [
                    r"pause download",
                    r"duraklat",
                    r"indirmeyi duraklat"
                ],
                VoiceCommand.RESUME_DOWNLOAD: [
                    r"resume download",
                    r"devam et",
                    r"indirmeye devam"
                ],
                VoiceCommand.CANCEL_DOWNLOAD: [
                    r"cancel download",
                    r"stop download",
                    r"iptal et",
                    r"indirmeyi iptal"
                ],
                VoiceCommand.SEARCH: [
                    r"search for (.*)",
                    r"find (.*)",
                    r"ara (.*)",
                    r"bul (.*)"
                ],
                VoiceCommand.PLAY_MEDIA: [
                    r"play",
                    r"oynat",
                    r"başlat"
                ],
                VoiceCommand.PAUSE_MEDIA: [
                    r"pause",
                    r"durdur"
                ],
                VoiceCommand.STOP_MEDIA: [
                    r"stop",
                    r"bitir"
                ],
                VoiceCommand.NEXT_MEDIA: [
                    r"next",
                    r"sonraki"
                ],
                VoiceCommand.PREVIOUS_MEDIA: [
                    r"previous",
                    r"önceki"
                ],
                VoiceCommand.VOLUME_UP: [
                    r"volume up",
                    r"increase volume",
                    r"ses aç",
                    r"sesi artır"
                ],
                VoiceCommand.VOLUME_DOWN: [
                    r"volume down",
                    r"decrease volume",
                    r"ses kıs",
                    r"sesi azalt"
                ],
                VoiceCommand.OPEN_SETTINGS: [
                    r"open settings",
                    r"settings",
                    r"ayarlar",
                    r"ayarları aç"
                ],
                VoiceCommand.SHOW_STATS: [
                    r"show stats",
                    r"statistics",
                    r"istatistik",
                    r"istatistikleri göster"
                ],
                VoiceCommand.HELP: [
                    r"help",
                    r"yardım"
                ]
            }

            self._load_data()
            self.initialized = True

    def _load_data(self):
        """Load voice control data from files"""
        try:
            if os.path.exists(self.commands_file):
                with open(self.commands_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.command_history = [
                        VoiceCommandResult(**cmd) for cmd in data
                    ]

            if os.path.exists(self.tts_file):
                with open(self.tts_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.tts_history = [
                        TTSRequest(**req) for req in data
                    ]
        except Exception as e:
            print(f"Error loading voice data: {e}")

    def _save_data(self):
        """Save voice control data to files"""
        try:
            with open(self.commands_file, 'w', encoding='utf-8') as f:
                json.dump(
                    [asdict(cmd) for cmd in self.command_history[-1000:]],
                    f,
                    indent=2,
                    ensure_ascii=False
                )

            with open(self.tts_file, 'w', encoding='utf-8') as f:
                json.dump(
                    [asdict(req) for req in self.tts_history[-1000:]],
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving voice data: {e}")

    def recognize_speech(self, audio_data: bytes) -> Dict:
        """
        Recognize speech from audio data
        In production, this would use Google Speech API, Whisper, or similar
        """
        # Mock speech recognition
        # In production: use speech_recognition library or Whisper API

        mock_transcriptions = [
            "start download from telegram",
            "search for cat videos",
            "play the next video",
            "increase volume",
            "show statistics"
        ]

        # Simulate recognition result
        transcription = mock_transcriptions[0]  # Mock result
        confidence = 0.95

        return {
            'success': True,
            'transcription': transcription,
            'confidence': confidence,
            'language': 'en'
        }

    def parse_command(self, text: str) -> Tuple[VoiceCommand, Dict, float]:
        """Parse text into a voice command"""
        text_lower = text.lower().strip()

        # Try to match against command patterns
        for command, patterns in self.command_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    # Extract parameters from match groups
                    parameters = {}
                    if match.groups():
                        if command == VoiceCommand.SEARCH:
                            parameters['query'] = match.group(1).strip()

                    confidence = 0.9  # Pattern match confidence

                    return command, parameters, confidence

        return VoiceCommand.UNKNOWN, {}, 0.0

    def execute_command(
        self,
        command: VoiceCommand,
        parameters: Dict[str, Any]
    ) -> Dict:
        """Execute a voice command"""
        import uuid

        # Command execution logic
        result = None
        executed = False

        if command == VoiceCommand.START_DOWNLOAD:
            result = "Download started"
            executed = True

        elif command == VoiceCommand.PAUSE_DOWNLOAD:
            result = "Download paused"
            executed = True

        elif command == VoiceCommand.RESUME_DOWNLOAD:
            result = "Download resumed"
            executed = True

        elif command == VoiceCommand.CANCEL_DOWNLOAD:
            result = "Download cancelled"
            executed = True

        elif command == VoiceCommand.SEARCH:
            query = parameters.get('query', '')
            result = f"Searching for: {query}"
            executed = True

        elif command == VoiceCommand.PLAY_MEDIA:
            result = "Playing media"
            executed = True

        elif command == VoiceCommand.PAUSE_MEDIA:
            result = "Media paused"
            executed = True

        elif command == VoiceCommand.STOP_MEDIA:
            result = "Media stopped"
            executed = True

        elif command == VoiceCommand.NEXT_MEDIA:
            result = "Playing next media"
            executed = True

        elif command == VoiceCommand.PREVIOUS_MEDIA:
            result = "Playing previous media"
            executed = True

        elif command == VoiceCommand.VOLUME_UP:
            result = "Volume increased"
            executed = True

        elif command == VoiceCommand.VOLUME_DOWN:
            result = "Volume decreased"
            executed = True

        elif command == VoiceCommand.OPEN_SETTINGS:
            result = "Opening settings"
            executed = True

        elif command == VoiceCommand.SHOW_STATS:
            result = "Showing statistics"
            executed = True

        elif command == VoiceCommand.HELP:
            result = "Available commands: download, pause, play, search, volume, settings"
            executed = True

        else:
            result = "Command not recognized"
            executed = False

        return {
            'success': executed,
            'result': result,
            'command': command.value
        }

    def process_voice_command(self, text: str) -> Dict:
        """Process a voice command from text"""
        import uuid

        # Parse the command
        command, parameters, confidence = self.parse_command(text)

        # Execute the command
        execution_result = self.execute_command(command, parameters)

        # Create result record
        result = VoiceCommandResult(
            id=str(uuid.uuid4()),
            command=command.value,
            original_text=text,
            parameters=parameters,
            confidence=confidence,
            executed=execution_result['success'],
            result=execution_result.get('result'),
            timestamp=datetime.now().isoformat()
        )

        self.command_history.append(result)
        self._save_data()

        return {
            'success': True,
            'result': asdict(result)
        }

    def text_to_speech(
        self,
        text: str,
        language: str = 'en',
        voice: str = 'female',
        speed: float = 1.0
    ) -> Dict:
        """
        Convert text to speech
        In production, this would use Google TTS, Amazon Polly, or similar
        """
        import uuid

        # Mock TTS generation
        # In production: use gTTS, pyttsx3, or cloud TTS API

        request_id = str(uuid.uuid4())
        audio_filename = f"tts_{request_id}.mp3"
        audio_path = os.path.join(self.audio_dir, audio_filename)

        # Simulate audio file creation (in production, generate actual audio)
        # with open(audio_path, 'wb') as f:
        #     f.write(b'mock_audio_data')

        request = TTSRequest(
            id=request_id,
            text=text,
            language=language,
            voice=voice,
            speed=speed,
            audio_url=f"/audio/{audio_filename}",
            created_at=datetime.now().isoformat()
        )

        self.tts_history.append(request)
        self._save_data()

        return {
            'success': True,
            'request': asdict(request),
            'audio_url': request.audio_url
        }

    def get_command_history(self, limit: int = 100) -> Dict:
        """Get voice command history"""
        commands = self.command_history[-limit:]

        return {
            'success': True,
            'commands': [asdict(cmd) for cmd in commands],
            'count': len(commands)
        }

    def get_tts_history(self, limit: int = 100) -> Dict:
        """Get TTS request history"""
        requests = self.tts_history[-limit:]

        return {
            'success': True,
            'requests': [asdict(req) for req in requests],
            'count': len(requests)
        }

    def get_available_commands(self) -> Dict:
        """Get list of available voice commands"""
        commands = []

        for command in VoiceCommand:
            if command == VoiceCommand.UNKNOWN:
                continue

            patterns = self.command_patterns.get(command, [])
            examples = []

            # Get a few example patterns
            for pattern in patterns[:3]:
                # Convert regex pattern to example phrase
                example = pattern.replace(r'\.*', '').replace('.*', '')
                example = example.replace('(', '').replace(')', '')
                example = example.replace(r'\s+', ' ')
                examples.append(example)

            commands.append({
                'command': command.value,
                'name': command.name.replace('_', ' ').title(),
                'examples': examples
            })

        return {
            'success': True,
            'commands': commands,
            'count': len(commands)
        }

    def get_statistics(self) -> Dict:
        """Get voice control statistics"""
        if not self.command_history:
            return {
                'success': True,
                'statistics': {
                    'total_commands': 0,
                    'executed_commands': 0,
                    'failed_commands': 0,
                    'avg_confidence': 0,
                    'by_command': {},
                    'total_tts_requests': len(self.tts_history)
                }
            }

        total_commands = len(self.command_history)
        executed = sum(1 for cmd in self.command_history if cmd.executed)
        failed = total_commands - executed
        avg_confidence = sum(cmd.confidence for cmd in self.command_history) / total_commands

        # By command type
        by_command = {}
        for cmd in self.command_history:
            cmd_type = cmd.command
            by_command[cmd_type] = by_command.get(cmd_type, 0) + 1

        return {
            'success': True,
            'statistics': {
                'total_commands': total_commands,
                'executed_commands': executed,
                'failed_commands': failed,
                'avg_confidence': round(avg_confidence, 2),
                'by_command': by_command,
                'total_tts_requests': len(self.tts_history)
            }
        }

    def detect_language(self, text: str) -> str:
        """Detect language from text"""
        # Simple heuristic-based detection
        # In production: use langdetect

        # Check for Turkish characters
        if any(char in text for char in 'ğüşıöçĞÜŞİÖÇ'):
            return 'tr'

        # Check for German
        if any(char in text for char in 'äöüßÄÖÜ'):
            return 'de'

        # Default to English
        return 'en'


# Singleton instance
voice_controller = VoiceController()
