from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_user_manual import (  # noqa: E402
    ManualGenerationError,
    MANUAL_MARKDOWN,
    blocks_to_plain_text,
    build_manual_markdown,
    create_dotx_template,
    generate_docx,
    generate_pdf,
    parse_markdown,
)


class ManualSourceTests(unittest.TestCase):
    def test_builds_markdown_from_ordered_wiki_blocks_deterministically(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            wiki = root / "docs" / "wiki"
            wiki.mkdir(parents=True)
            (wiki / "first.md").write_text(
                "Before\n<!-- user-manual-it:start:intro -->\n# Primo\n\nTesto 1.\n"
                "<!-- user-manual-it:end:intro -->\nAfter\n",
                encoding="utf-8",
            )
            (wiki / "second.md").write_text(
                "<!-- user-manual-it:start:secondo -->\n## Secondo\n\nTesto 2.\n"
                "<!-- user-manual-it:end:secondo -->\n",
                encoding="utf-8",
            )
            paths = (("docs/wiki/first.md", "intro"), ("docs/wiki/second.md", "secondo"))

            first = build_manual_markdown(root, paths)
            second = build_manual_markdown(root, paths)

            self.assertEqual(first, second)
            self.assertEqual(first, "# Primo\n\nTesto 1.\n\n## Secondo\n\nTesto 2.\n")

    def test_checked_in_manual_is_generated_from_the_wiki_blocks(self) -> None:
        self.assertEqual(MANUAL_MARKDOWN.read_text(encoding="utf-8"), build_manual_markdown())

    def test_rejects_missing_or_duplicate_manual_source_blocks(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "page.md"
            source.write_text("No manual source here.\n", encoding="utf-8")
            with self.assertRaises(ManualGenerationError):
                build_manual_markdown(root, (("page.md", "main"),))

            source.write_text(
                "<!-- user-manual-it:start:main -->A<!-- user-manual-it:end:main -->\n"
                "<!-- user-manual-it:start:main -->B<!-- user-manual-it:end:main -->",
                encoding="utf-8",
            )
            with self.assertRaises(ManualGenerationError):
                build_manual_markdown(root, (("page.md", "main"),))

    def test_parses_manual_headings_paragraphs_lists_and_tables(self) -> None:
        markdown = (
            "# Manuale\n\nParagrafo **importante** con `codice`.\n\n"
            "- voce A\n- voce B\n\n1. Primo\n2. Secondo\n\n"
            "| Campo | Valore |\n|---|---|\n| Nome | Sissy |\n"
        )
        blocks = parse_markdown(markdown)

        self.assertEqual([block.kind for block in blocks], ["heading", "paragraph", "list", "list", "table"])
        self.assertEqual(blocks[0].level, 1)
        self.assertEqual(blocks[2].items, ("voce A", "voce B"))
        self.assertTrue(blocks[3].ordered)
        self.assertEqual(blocks[3].items, ("1. Primo", "2. Secondo"))
        self.assertEqual(blocks[4].rows, (("Campo", "Valore"), ("Nome", "Sissy")))
        self.assertIn("Paragrafo importante con codice.", blocks_to_plain_text(blocks))
        self.assertIn("1. Primo", blocks_to_plain_text(blocks))

    @unittest.skipUnless(
        all(importlib.util.find_spec(package) for package in ("docx", "reportlab", "pypdf")),
        "Document-generation dependencies are not installed in this Python environment.",
    )
    def test_generates_docx_and_pdf_without_changing_markdown_text(self) -> None:
        markdown = build_manual_markdown()
        with tempfile.TemporaryDirectory() as temporary:
            output_dir = Path(temporary)
            template = create_dotx_template(output_dir / "template.dotx")
            docx = generate_docx(markdown, template, output_dir / "manual.docx")
            pdf = generate_pdf(markdown, output_dir / "manual.pdf")

            self.assertGreater(docx.stat().st_size, 0)
            self.assertGreater(pdf.stat().st_size, 500)


if __name__ == "__main__":
    unittest.main()
