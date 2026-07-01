from pathlib import Path

import fitz


class PDFService:
    def extract_pages(self, pdf_path: Path) -> list[tuple[int, str]]:
        pages: list[tuple[int, str]] = []

        with fitz.open(pdf_path) as document:
            for page_index, page in enumerate(document, start=1):
                text = page.get_text("text").strip()
                pages.append((page_index, text))

        return pages
