"""Video Processing - Thumbnails, Compression, Transcription"""
import logging
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class VideoProcessor:
    """Process videos: thumbnails, compression, transcription."""

    def __init__(self):
        self.available = self._check_dependencies()

    def _check_dependencies(self) -> bool:
        """Check if ffmpeg/opencv available."""
        try:
            import cv2
            return True
        except ImportError:
            logger.warning("OpenCV not installed. Install: pip install opencv-python")
            return False

    async def generate_thumbnail(self, video_path: Path, output_path: Optional[Path] = None) -> Optional[Path]:
        """Generate thumbnail from video."""
        if not self.available:
            return None

        try:
            import cv2

            if not output_path:
                output_path = video_path.with_suffix('.jpg')

            video = cv2.VideoCapture(str(video_path))
            success, frame = video.read()
            if success:
                cv2.imwrite(str(output_path), frame)
                video.release()
                logger.info(f"Generated thumbnail: {output_path}")
                return output_path
        except Exception as e:
            logger.error(f"Thumbnail generation failed: {e}")
        return None

    async def compress_video(self, video_path: Path, output_path: Optional[Path] = None) -> Optional[Path]:
        """Compress video using ffmpeg."""
        try:
            import ffmpeg

            if not output_path:
                output_path = video_path.parent / f"{video_path.stem}_compressed.mp4"

            stream = ffmpeg.input(str(video_path))
            stream = ffmpeg.output(stream, str(output_path), vcodec='libx264', crf=23, preset='fast')
            ffmpeg.run(stream, overwrite_output=True, quiet=True)

            logger.info(f"Compressed video: {output_path}")
            return output_path
        except ImportError:
            logger.error("ffmpeg-python not installed. Install: pip install ffmpeg-python")
        except Exception as e:
            logger.error(f"Compression failed: {e}")
        return None

    async def transcribe_audio(self, video_path: Path) -> Optional[str]:
        """Transcribe audio using Whisper AI."""
        try:
            import whisper

            model = whisper.load_model("base")
            result = model.transcribe(str(video_path))
            logger.info(f"Transcribed: {video_path}")
            return result["text"]
        except ImportError:
            logger.error("Whisper not installed. Install: pip install openai-whisper")
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
        return None

# Install: pip install opencv-python ffmpeg-python openai-whisper
