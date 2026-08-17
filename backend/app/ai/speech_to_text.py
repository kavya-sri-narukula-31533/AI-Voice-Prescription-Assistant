"""
Speech-to-Text using OpenAI Whisper API (cloud) or faster-whisper (local).
Falls back gracefully when dependencies are unavailable.
"""
import io
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class SpeechToTextService:
    """Handles audio transcription using OpenAI Whisper or faster-whisper."""

    SUPPORTED_LANGUAGES = {
        "en": "english",
        "hi": "hindi",
        "te": "telugu",
        "ta": "tamil",
        "kn": "kannada",
        "mr": "marathi",
    }

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        language: str = "en",
        use_local: bool = False,
    ) -> dict:
        """
        Transcribe audio bytes to text.

        Returns:
            dict with keys: text, language, duration, confidence
        """
        if use_local:
            return await self._transcribe_local(audio_bytes, language)
        return await self._transcribe_openai(audio_bytes, language)

    async def _transcribe_openai(self, audio_bytes: bytes, language: str) -> dict:
        """Use OpenAI Whisper API for transcription."""
        try:
            from openai import AsyncOpenAI

            
            
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = "recording.webm"

            lang_code = language if language in self.SUPPORTED_LANGUAGES else "en"

            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=lang_code,
                response_format="verbose_json",
            )

            return {
                "text": response.text,
                "language": response.language,
                "duration": getattr(response, "duration", None),
                "confidence": 0.95,  # Whisper API doesn't return confidence
            }
        except Exception as e:
            logger.error(f"OpenAI Whisper transcription failed: {e}")
            raise RuntimeError(f"Transcription failed: {str(e)}")

    async def _transcribe_local(self, audio_bytes: bytes, language: str) -> dict:
        """Use faster-whisper for local (offline) transcription."""
        try:
            import tempfile
            import os
            from faster_whisper import WhisperModel

            model = WhisperModel("small", device="cpu", compute_type="int8")

            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                segments, info = model.transcribe(
                    tmp_path,
                    language=language if language != "en" else None,
                    beam_size=5,
                )
                text = " ".join(segment.text for segment in segments).strip()
            finally:
                os.unlink(tmp_path)

            return {
                "text": text,
                "language": info.language,
                "duration": info.duration,
                "confidence": info.language_probability,
            }
        except ImportError:
            raise RuntimeError("faster-whisper not installed. Use pip install faster-whisper")
        except Exception as e:
            logger.error(f"Local Whisper transcription failed: {e}")
            raise RuntimeError(f"Local transcription failed: {str(e)}")


speech_service = SpeechToTextService()
