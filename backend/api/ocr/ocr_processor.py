"""
OCR & Document Processing System for Telegram Saver
Handles text extraction from images, PDFs, and documents with multi-language support
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import base64
from pathlib import Path
import re


class DocumentType(Enum):
    """Supported document types"""
    IMAGE = "image"  # PNG, JPG, etc.
    PDF = "pdf"
    SCANNED_PDF = "scanned_pdf"
    TEXT = "text"
    UNKNOWN = "unknown"


class OCRLanguage(Enum):
    """Supported OCR languages"""
    ENGLISH = "eng"
    TURKISH = "tur"
    GERMAN = "deu"
    FRENCH = "fra"
    SPANISH = "spa"
    RUSSIAN = "rus"
    ARABIC = "ara"
    CHINESE = "chi_sim"
    JAPANESE = "jpn"
    KOREAN = "kor"


@dataclass
class OCRResult:
    """OCR processing result"""
    id: str
    file_path: str
    file_type: str
    language: str
    extracted_text: str
    confidence: float
    word_count: int
    processing_time: float
    metadata: Dict[str, Any]
    created_at: str


@dataclass
class DocumentAnalysis:
    """Document analysis result"""
    document_type: str
    page_count: int
    has_text: bool
    has_images: bool
    text_percentage: float
    layout_info: Dict[str, Any]


class OCRProcessor:
    """Handles OCR and document processing"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.data_dir = "data/ocr"
            os.makedirs(self.data_dir, exist_ok=True)

            self.results_file = os.path.join(self.data_dir, "results.json")
            self.cache_dir = os.path.join(self.data_dir, "cache")
            os.makedirs(self.cache_dir, exist_ok=True)

            self.results: Dict[str, OCRResult] = {}

            self._load_data()
            self.initialized = True

    def _load_data(self):
        """Load OCR results from file"""
        try:
            if os.path.exists(self.results_file):
                with open(self.results_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.results = {
                        result_id: OCRResult(**result_data)
                        for result_id, result_data in data.items()
                    }
        except Exception as e:
            print(f"Error loading OCR data: {e}")

    def _save_data(self):
        """Save OCR results to file"""
        try:
            with open(self.results_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {rid: asdict(result) for rid, result in self.results.items()},
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        except Exception as e:
            print(f"Error saving OCR data: {e}")

    def detect_document_type(self, file_path: str) -> str:
        """Detect document type from file extension"""
        ext = Path(file_path).suffix.lower()

        image_extensions = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.gif']
        if ext in image_extensions:
            return DocumentType.IMAGE.value
        elif ext == '.pdf':
            return DocumentType.PDF.value
        elif ext == '.txt':
            return DocumentType.TEXT.value
        else:
            return DocumentType.UNKNOWN.value

    def analyze_document(self, file_path: str) -> Dict:
        """Analyze document structure"""
        if not os.path.exists(file_path):
            return {'success': False, 'error': 'File not found'}

        doc_type = self.detect_document_type(file_path)

        analysis = DocumentAnalysis(
            document_type=doc_type,
            page_count=1,
            has_text=False,
            has_images=False,
            text_percentage=0.0,
            layout_info={}
        )

        # Simple analysis based on file size and type
        file_size = os.path.getsize(file_path)

        if doc_type == DocumentType.IMAGE.value:
            analysis.has_images = True
            analysis.page_count = 1
        elif doc_type == DocumentType.PDF.value:
            # Placeholder - would use PyPDF2 or pdfplumber in production
            analysis.page_count = 1
            analysis.has_text = True
            analysis.text_percentage = 50.0
        elif doc_type == DocumentType.TEXT.value:
            analysis.has_text = True
            analysis.text_percentage = 100.0

        return {
            'success': True,
            'analysis': asdict(analysis),
            'file_size': file_size
        }

    def extract_text_from_image(
        self,
        image_path: str,
        language: str = 'eng'
    ) -> Tuple[str, float]:
        """
        Extract text from image using OCR
        In production, this would use Tesseract OCR
        """
        # Simulate OCR processing
        # In production: use pytesseract.image_to_string(image_path, lang=language)

        # Mock extracted text for demonstration
        mock_texts = {
            'eng': 'This is a sample text extracted from the image.',
            'tur': 'Bu, görüntüden çıkarılan örnek bir metindir.',
            'deu': 'Dies ist ein Beispieltext aus dem Bild.',
            'fra': 'Ceci est un exemple de texte extrait de l\'image.',
            'spa': 'Este es un texto de muestra extraído de la imagen.'
        }

        extracted_text = mock_texts.get(language, mock_texts['eng'])
        confidence = 0.92  # Mock confidence score

        return extracted_text, confidence

    def extract_text_from_pdf(
        self,
        pdf_path: str,
        language: str = 'eng'
    ) -> Tuple[str, float]:
        """
        Extract text from PDF
        In production, this would use PyPDF2 or pdfplumber
        """
        # Mock PDF text extraction
        # In production: use PyPDF2.PdfReader or pdfplumber

        mock_text = """
        Sample PDF Document

        This is a sample text extracted from a PDF document.
        It contains multiple paragraphs and formatting.

        Key Features:
        - Text extraction
        - Layout preservation
        - Multi-page support
        - Language detection

        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        """

        confidence = 0.98  # Text PDFs have higher confidence
        return mock_text.strip(), confidence

    def extract_text_from_scanned_pdf(
        self,
        pdf_path: str,
        language: str = 'eng'
    ) -> Tuple[str, float]:
        """
        Extract text from scanned PDF using OCR
        In production, this would use pdf2image + Tesseract
        """
        # Mock scanned PDF OCR
        # In production: convert PDF to images, then OCR each page

        extracted_text = "This is text extracted from a scanned PDF document."
        confidence = 0.85  # Scanned PDFs typically have lower confidence

        return extracted_text, confidence

    def process_document(
        self,
        file_path: str,
        language: str = 'eng',
        options: Optional[Dict] = None
    ) -> Dict:
        """Process document and extract text"""
        import uuid
        import time

        if not os.path.exists(file_path):
            return {'success': False, 'error': 'File not found'}

        start_time = time.time()

        # Detect document type
        doc_type = self.detect_document_type(file_path)

        # Extract text based on document type
        try:
            if doc_type == DocumentType.IMAGE.value:
                extracted_text, confidence = self.extract_text_from_image(
                    file_path, language
                )
            elif doc_type == DocumentType.PDF.value:
                # Check if it's a scanned PDF (mock check)
                is_scanned = options and options.get('is_scanned', False)
                if is_scanned:
                    extracted_text, confidence = self.extract_text_from_scanned_pdf(
                        file_path, language
                    )
                else:
                    extracted_text, confidence = self.extract_text_from_pdf(
                        file_path, language
                    )
            elif doc_type == DocumentType.TEXT.value:
                with open(file_path, 'r', encoding='utf-8') as f:
                    extracted_text = f.read()
                confidence = 1.0
            else:
                return {
                    'success': False,
                    'error': f'Unsupported document type: {doc_type}'
                }

            processing_time = time.time() - start_time

            # Count words
            word_count = len(extracted_text.split())

            # Create result
            result = OCRResult(
                id=str(uuid.uuid4()),
                file_path=file_path,
                file_type=doc_type,
                language=language,
                extracted_text=extracted_text,
                confidence=confidence,
                word_count=word_count,
                processing_time=processing_time,
                metadata={
                    'file_size': os.path.getsize(file_path),
                    'options': options or {}
                },
                created_at=datetime.now().isoformat()
            )

            self.results[result.id] = result
            self._save_data()

            return {
                'success': True,
                'result': asdict(result)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def batch_process(
        self,
        file_paths: List[str],
        language: str = 'eng',
        options: Optional[Dict] = None
    ) -> Dict:
        """Process multiple documents in batch"""
        results = []
        errors = []

        for file_path in file_paths:
            result = self.process_document(file_path, language, options)
            if result['success']:
                results.append(result['result'])
            else:
                errors.append({
                    'file': file_path,
                    'error': result['error']
                })

        return {
            'success': True,
            'processed': len(results),
            'failed': len(errors),
            'results': results,
            'errors': errors
        }

    def search_in_results(self, query: str, limit: int = 50) -> Dict:
        """Search extracted text in OCR results"""
        query_lower = query.lower()
        matches = []

        for result in self.results.values():
            if query_lower in result.extracted_text.lower():
                # Find context around match
                text_lower = result.extracted_text.lower()
                index = text_lower.find(query_lower)

                # Get surrounding context (50 chars before and after)
                start = max(0, index - 50)
                end = min(len(result.extracted_text), index + len(query) + 50)
                context = result.extracted_text[start:end]

                matches.append({
                    'id': result.id,
                    'file_path': result.file_path,
                    'context': context,
                    'confidence': result.confidence,
                    'created_at': result.created_at
                })

        matches = matches[:limit]

        return {
            'success': True,
            'query': query,
            'matches': matches,
            'count': len(matches)
        }

    def get_result(self, result_id: str) -> Dict:
        """Get OCR result by ID"""
        if result_id not in self.results:
            return {'success': False, 'error': 'Result not found'}

        return {
            'success': True,
            'result': asdict(self.results[result_id])
        }

    def get_all_results(self, limit: int = 100) -> Dict:
        """Get all OCR results"""
        results = list(self.results.values())
        results = sorted(results, key=lambda x: x.created_at, reverse=True)
        results = results[:limit]

        return {
            'success': True,
            'results': [asdict(r) for r in results],
            'count': len(results)
        }

    def delete_result(self, result_id: str) -> Dict:
        """Delete OCR result"""
        if result_id not in self.results:
            return {'success': False, 'error': 'Result not found'}

        del self.results[result_id]
        self._save_data()

        return {'success': True}

    def get_statistics(self) -> Dict:
        """Get OCR processing statistics"""
        if not self.results:
            return {
                'success': True,
                'statistics': {
                    'total_processed': 0,
                    'total_words': 0,
                    'avg_confidence': 0,
                    'by_language': {},
                    'by_type': {}
                }
            }

        total_processed = len(self.results)
        total_words = sum(r.word_count for r in self.results.values())
        avg_confidence = sum(r.confidence for r in self.results.values()) / total_processed

        # By language
        by_language = {}
        for result in self.results.values():
            lang = result.language
            by_language[lang] = by_language.get(lang, 0) + 1

        # By type
        by_type = {}
        for result in self.results.values():
            doc_type = result.file_type
            by_type[doc_type] = by_type.get(doc_type, 0) + 1

        return {
            'success': True,
            'statistics': {
                'total_processed': total_processed,
                'total_words': total_words,
                'avg_confidence': round(avg_confidence, 2),
                'by_language': by_language,
                'by_type': by_type
            }
        }

    def detect_language(self, text: str) -> str:
        """
        Detect language from text
        In production, this would use langdetect or similar
        """
        # Simple heuristic-based detection
        # In production: use langdetect.detect(text)

        # Check for Turkish characters
        if any(char in text for char in 'ğüşıöçĞÜŞİÖÇ'):
            return 'tur'

        # Check for Cyrillic
        if any('\u0400' <= char <= '\u04FF' for char in text):
            return 'rus'

        # Check for Arabic
        if any('\u0600' <= char <= '\u06FF' for char in text):
            return 'ara'

        # Check for Chinese
        if any('\u4e00' <= char <= '\u9fff' for char in text):
            return 'chi_sim'

        # Default to English
        return 'eng'

    def enhance_image(self, image_path: str, output_path: str) -> Dict:
        """
        Enhance image for better OCR results
        In production, this would use PIL/OpenCV
        """
        # Mock image enhancement
        # In production: apply filters, denoise, sharpen, etc.

        return {
            'success': True,
            'output_path': output_path,
            'enhancements': [
                'Contrast adjustment',
                'Denoising',
                'Sharpening'
            ]
        }


# Singleton instance
ocr_processor = OCRProcessor()
