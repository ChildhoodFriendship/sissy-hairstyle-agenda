from __future__ import annotations

import argparse
import html
import re
import sys
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


ROOT = Path(__file__).resolve().parents[1]
MANUAL_MARKDOWN = ROOT / "docs" / "manual" / "user-manual-it.md"
DEFAULT_TEMPLATE = ROOT / "docs" / "manual" / "templates" / "user-manual-template.dotx"
DEFAULT_OUTPUT_DIR = ROOT / "docs" / "manual" / "generated"
MANUAL_SOURCE_BLOCKS: tuple[tuple[str, str], ...] = (
    ("docs/wiki/overview.md", "intro"),
    ("docs/wiki/backend-integration/supabase-authentication-and-storage.md", "getting-started"),
    ("docs/wiki/agenda/overview.md", "interface"),
    ("docs/wiki/agenda/appointments.md", "appointments"),
    ("docs/wiki/agenda/clients.md", "clients"),
    ("docs/wiki/agenda/employees.md", "employees"),
    ("docs/wiki/agenda/salon-settings.md", "settings"),
    ("docs/wiki/agenda/reminders-and-theme.md", "reminders"),
    ("docs/wiki/overview.md", "support"),
)

DOCX_MAIN_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
DOTX_MAIN_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml"
INLINE_PATTERN = re.compile(
    r"\[(?P<link>[^\]]+)\]\([^)]+\)|\*\*(?P<strong>.+?)\*\*|"
    r"(?<!\*)\*(?P<emphasis>[^*]+)\*(?!\*)|`(?P<code>[^`]+)`"
)
HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
LIST_PATTERN = re.compile(r"^(\s*)([-+*]|\d+[.)])\s+(.*)$")
TABLE_SEPARATOR_PATTERN = re.compile(r"^:?-{3,}:?$")


class ManualGenerationError(RuntimeError):
    """A deterministic manual source or output could not be produced."""


@dataclass(frozen=True)
class MarkdownBlock:
    kind: str
    text: str = ""
    level: int = 0
    items: tuple[str, ...] = ()
    ordered: bool = False
    rows: tuple[tuple[str, ...], ...] = ()


def build_manual_markdown(
    root: Path = ROOT,
    sources: Sequence[tuple[str, str]] = MANUAL_SOURCE_BLOCKS,
) -> str:
    """Concatenate only the explicitly marked wiki source blocks, in fixed order."""
    repository_root = root.resolve()
    sections: list[str] = []
    for relative_path, block_id in sources:
        source_path = (repository_root / relative_path).resolve()
        try:
            source_path.relative_to(repository_root)
        except ValueError as error:
            raise ManualGenerationError(f"Manual source escapes repository: {relative_path}") from error
        if not source_path.is_file():
            raise ManualGenerationError(f"Manual source page is missing: {relative_path}")
        try:
            page = source_path.read_text(encoding="utf-8")
        except OSError as error:
            raise ManualGenerationError(f"Unable to read {relative_path}: {error}") from error
        section = extract_manual_block(page, relative_path, block_id)
        sections.append(section)
    result = "\n\n".join(sections).strip() + "\n"
    if not result.strip():
        raise ManualGenerationError("The wiki did not provide any Italian manual content.")
    return result


def extract_manual_block(page: str, relative_path: str, block_id: str) -> str:
    marker = re.escape(block_id)
    pattern = re.compile(
        rf"<!--\s*user-manual-it:start:{marker}\s*-->(.*?)"
        rf"<!--\s*user-manual-it:end:{marker}\s*-->",
        re.DOTALL,
    )
    matches = list(pattern.finditer(page))
    if len(matches) != 1:
        raise ManualGenerationError(
            f"Expected exactly one user-manual block '{block_id}' in {relative_path}; found {len(matches)}."
        )
    section = matches[0].group(1).strip()
    if not section:
        raise ManualGenerationError(f"The user-manual block '{block_id}' in {relative_path} is empty.")
    return section


def parse_markdown(markdown: str) -> list[MarkdownBlock]:
    """Parse the deliberately small Markdown subset used by the manual sources."""
    source = re.sub(r"<!--.*?-->", "", markdown, flags=re.DOTALL)
    lines = source.splitlines()
    blocks: list[MarkdownBlock] = []
    index = 0

    while index < len(lines):
        line = lines[index].strip()
        if not line or line == "---":
            index += 1
            continue

        heading = HEADING_PATTERN.match(line)
        if heading:
            blocks.append(MarkdownBlock("heading", heading.group(2).strip(), len(heading.group(1))))
            index += 1
            continue

        if line.startswith("|"):
            table_lines: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index].strip())
                index += 1
            rows: list[tuple[str, ...]] = []
            for table_line in table_lines:
                cells = tuple(cell.strip() for cell in table_line.strip("|").split("|"))
                if cells and all(TABLE_SEPARATOR_PATTERN.fullmatch(cell.replace(" ", "")) for cell in cells):
                    continue
                rows.append(cells)
            if rows:
                width = max(len(row) for row in rows)
                padded = tuple(row + ("",) * (width - len(row)) for row in rows)
                blocks.append(MarkdownBlock("table", rows=padded))
            continue

        list_match = LIST_PATTERN.match(lines[index])
        if list_match:
            indent = len(list_match.group(1).expandtabs(4))
            ordered = list_match.group(2)[0].isdigit()
            items: list[str] = []
            while index < len(lines):
                current = LIST_PATTERN.match(lines[index])
                if not current or len(current.group(1).expandtabs(4)) != indent:
                    break
                is_ordered = current.group(2)[0].isdigit()
                if is_ordered != ordered:
                    break
                item_text = current.group(3).strip()
                if ordered:
                    number = current.group(2)[:-1]
                    item_text = f"{number}. {item_text}"
                items.append(item_text)
                index += 1
            blocks.append(MarkdownBlock("list", items=tuple(items), ordered=ordered))
            continue

        paragraph_lines = [line]
        index += 1
        while index < len(lines):
            candidate = lines[index].strip()
            if not candidate or candidate == "---" or HEADING_PATTERN.match(candidate):
                break
            if candidate.startswith("|") or LIST_PATTERN.match(lines[index]):
                break
            paragraph_lines.append(candidate)
            index += 1
        blocks.append(MarkdownBlock("paragraph", " ".join(paragraph_lines)))

    return blocks


def inline_to_plain_text(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        for group in ("link", "strong", "emphasis", "code"):
            value = match.group(group)
            if value is not None:
                return value
        return match.group(0)

    return INLINE_PATTERN.sub(replace, text).replace("\\|", "|").strip()


def blocks_to_plain_text(blocks: Sequence[MarkdownBlock]) -> str:
    return "\n".join(canonical_content_lines(blocks))


def canonical_content_lines(blocks: Sequence[MarkdownBlock]) -> list[str]:
    content: list[str] = []
    for block in blocks:
        if block.kind in {"heading", "paragraph"}:
            content.append(inline_to_plain_text(block.text))
        elif block.kind == "list":
            content.extend(inline_to_plain_text(item) for item in block.items)
        elif block.kind == "table":
            content.extend("\t".join(inline_to_plain_text(cell) for cell in row) for row in block.rows)
    return content


def create_dotx_template(template_path: Path = DEFAULT_TEMPLATE) -> Path:
    try:
        from docx import Document
        from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        from docx.shared import Cm, Pt, RGBColor
    except ImportError as error:
        raise _dependency_error("python-docx") from error

    template_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sissy-manual-template-") as temporary:
        source_docx = Path(temporary) / "template.docx"
        document = Document()
        section = document.sections[0]
        section.page_width = Cm(21)
        section.page_height = Cm(29.7)
        section.top_margin = Cm(2.1)
        section.bottom_margin = Cm(2.0)
        section.left_margin = Cm(2.2)
        section.right_margin = Cm(2.0)
        section.header_distance = Cm(0.9)
        section.footer_distance = Cm(0.9)

        _style_template(document, Pt, RGBColor)
        header = section.header.paragraphs[0]
        header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        _add_bottom_border(header, OxmlElement, qn, "D9D0CA")
        footer = section.footer.paragraphs[0]
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        footer.add_run("Pagina ").font.size = Pt(8)
        field = OxmlElement("w:fldSimple")
        field.set(qn("w:instr"), "PAGE")
        field_run = OxmlElement("w:r")
        field_text = OxmlElement("w:t")
        field_text.text = "1"
        field_run.append(field_text)
        field.append(field_run)
        footer._p.append(field)

        document.add_paragraph("{{TITOLO DEL MANUALE}}", style="Title")
        document.add_paragraph("{{NOME DEL PRODOTTO}}", style="Subtitle")
        document.add_paragraph("{{VERSIONE}}  ·  {{LINGUA}}", style="Subtitle")
        document.add_page_break()
        document.add_heading("{{CAPITOLO}}", level=1)
        document.add_paragraph("{{Descrizione introduttiva e scopo della sezione.}}")
        document.add_heading("{{Procedura}}", level=2)
        document.add_paragraph("{{Passaggio operativo e risultato atteso.}}", style="List Number")
        table = document.add_table(rows=2, cols=2)
        table.style = "Table Grid"
        table.cell(0, 0).text = "{{Campo}}"
        table.cell(0, 1).text = "{{Descrizione}}"
        table.cell(1, 0).text = "{{Valore}}"
        table.cell(1, 1).text = "{{Informazione}}"
        for cell in table.rows[0].cells:
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            for run in cell.paragraphs[0].runs:
                run.bold = True
        document.add_paragraph("{{NOTE, LIMITI E SUPPORTO}}")
        document.core_properties.title = "Template generico per manuale utente"
        document.core_properties.subject = "Modello sostituibile; il generatore usa solo gli stili e l'impaginazione."
        document.core_properties.author = "Sissy Hairstyle Agenda"
        document.save(source_docx)
        _convert_docx_package_to_dotx(source_docx, template_path)

    _validate_dotx(template_path)
    return template_path


def _style_template(document, Pt, RGBColor) -> None:
    normal = document.styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor(45, 43, 42)
    normal.paragraph_format.space_after = Pt(7)
    normal.paragraph_format.line_spacing = 1.12

    title = document.styles["Title"]
    title.font.name = "Aptos Display"
    title.font.size = Pt(30)
    title.font.bold = True
    title.font.color.rgb = RGBColor(125, 63, 76)
    title.paragraph_format.space_after = Pt(12)

    subtitle = document.styles["Subtitle"]
    subtitle.font.name = "Aptos"
    subtitle.font.size = Pt(13)
    subtitle.font.color.rgb = RGBColor(105, 97, 93)
    subtitle.paragraph_format.space_after = Pt(8)

    for name, size in (("Heading 1", 20), ("Heading 2", 15), ("Heading 3", 12)):
        style = document.styles[name]
        style.font.name = "Aptos Display"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(125, 63, 76)
        style.paragraph_format.keep_with_next = True
        style.paragraph_format.space_before = Pt(15 if name == "Heading 1" else 10)
        style.paragraph_format.space_after = Pt(5)

    for name in ("List Bullet", "List Number"):
        document.styles[name].font.name = "Aptos"
        document.styles[name].font.size = Pt(10.5)


def _add_bottom_border(paragraph, OxmlElement, qn, color: str) -> None:
    paragraph_properties = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "5")
    bottom.set(qn("w:space"), "5")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    paragraph_properties.append(borders)


def _convert_docx_package_to_dotx(source_docx: Path, template_path: Path) -> None:
    template_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(source_docx, "r") as source, zipfile.ZipFile(
        template_path, "w", compression=zipfile.ZIP_DEFLATED
    ) as target:
        for entry in source.infolist():
            contents = source.read(entry.filename)
            if entry.filename == "[Content_Types].xml":
                xml = contents.decode("utf-8")
                if DOCX_MAIN_CONTENT_TYPE not in xml:
                    raise ManualGenerationError("The source document has no Word main document content type.")
                contents = xml.replace(DOCX_MAIN_CONTENT_TYPE, DOTX_MAIN_CONTENT_TYPE).encode("utf-8")
            target.writestr(entry, contents)


def _validate_dotx(template_path: Path) -> None:
    if not zipfile.is_zipfile(template_path):
        raise ManualGenerationError(f"The Word template is not a valid Open XML package: {template_path}")
    with zipfile.ZipFile(template_path) as package:
        try:
            content_types = package.read("[Content_Types].xml").decode("utf-8")
        except KeyError as error:
            raise ManualGenerationError("The Word template is missing [Content_Types].xml.") from error
        if DOTX_MAIN_CONTENT_TYPE not in content_types:
            raise ManualGenerationError("The Word template does not declare the .dotx main document content type.")
        if "word/document.xml" not in package.namelist():
            raise ManualGenerationError("The Word template is missing word/document.xml.")


def generate_docx(markdown: str, template_path: Path, output_path: Path) -> Path:
    try:
        from docx import Document
        from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        from docx.shared import Pt, RGBColor
        from docx.table import Table as DocxTable
        from docx.text.paragraph import Paragraph
    except ImportError as error:
        raise _dependency_error("python-docx") from error

    _validate_dotx(template_path)
    blocks = parse_markdown(markdown)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sissy-manual-docx-") as temporary:
        normalized_template = Path(temporary) / "template.docx"
        _convert_dotx_package_to_docx(template_path, normalized_template)
        document = Document(normalized_template)
        _clear_document_body(document, qn)
        _style_template(document, Pt, RGBColor)

        first_title_written = False
        for block in blocks:
            if block.kind == "heading":
                if block.level == 1 and not first_title_written:
                    paragraph = document.add_paragraph(style="Title")
                    _add_docx_inline(paragraph, block.text, Pt, RGBColor)
                    first_title_written = True
                else:
                    level = min(max(block.level - 1, 1), 3)
                    paragraph = document.add_heading(level=level)
                    _add_docx_inline(paragraph, block.text, Pt, RGBColor)
            elif block.kind == "paragraph":
                paragraph = document.add_paragraph()
                _add_docx_inline(paragraph, block.text, Pt, RGBColor)
            elif block.kind == "list":
                for item in block.items:
                    style = "List Bullet" if not block.ordered else "Normal"
                    paragraph = document.add_paragraph(style=style)
                    if block.ordered:
                        paragraph.paragraph_format.left_indent = Pt(18)
                    _add_docx_inline(paragraph, item, Pt, RGBColor)
            elif block.kind == "table":
                _add_docx_table(
                    document, block.rows, OxmlElement, qn, Pt, RGBColor, WD_CELL_VERTICAL_ALIGNMENT
                )

        properties = document.core_properties
        properties.title = "Sissy Hairstyle Agenda — Manuale utente"
        properties.subject = "Contenuto generato dal Markdown del manuale."
        properties.author = "Sissy Hairstyle Agenda"
        properties.last_modified_by = "Manual generator"
        _write_docx(document, output_path)
        saved_document = Document(output_path)
        actual = _extract_docx_content_lines(saved_document, qn, Paragraph, DocxTable)
        expected = canonical_content_lines(blocks)
        if actual != expected:
            raise ManualGenerationError("DOCX text verification failed: the body differs from user-manual-it.md.")
    return output_path


def _convert_dotx_package_to_docx(template_path: Path, output_path: Path) -> None:
    with zipfile.ZipFile(template_path, "r") as source, zipfile.ZipFile(
        output_path, "w", compression=zipfile.ZIP_DEFLATED
    ) as target:
        for entry in source.infolist():
            contents = source.read(entry.filename)
            if entry.filename == "[Content_Types].xml":
                xml = contents.decode("utf-8")
                if DOTX_MAIN_CONTENT_TYPE not in xml:
                    raise ManualGenerationError("The template package is not a .dotx file.")
                contents = xml.replace(DOTX_MAIN_CONTENT_TYPE, DOCX_MAIN_CONTENT_TYPE).encode("utf-8")
            target.writestr(entry, contents)


def _clear_document_body(document, qn) -> None:
    body = document._element.body
    for child in list(body):
        if child.tag != qn("w:sectPr"):
            body.remove(child)


def _add_docx_inline(paragraph, text: str, Pt, RGBColor) -> None:
    position = 0
    for match in INLINE_PATTERN.finditer(text):
        if match.start() > position:
            paragraph.add_run(text[position:match.start()])
        if match.group("link") is not None:
            run = paragraph.add_run(match.group("link"))
            run.underline = True
            run.font.color.rgb = RGBColor(125, 63, 76)
        elif match.group("strong") is not None:
            run = paragraph.add_run(match.group("strong"))
            run.bold = True
        elif match.group("emphasis") is not None:
            run = paragraph.add_run(match.group("emphasis"))
            run.italic = True
        else:
            run = paragraph.add_run(match.group("code"))
            run.font.name = "Consolas"
            run.font.size = Pt(9)
        position = match.end()
    if position < len(text):
        paragraph.add_run(text[position:])


def _add_docx_table(document, rows, OxmlElement, qn, Pt, RGBColor, vertical_alignment) -> None:
    table = document.add_table(rows=len(rows), cols=len(rows[0]))
    table.style = "Table Grid"
    table.autofit = True
    for row_index, row in enumerate(rows):
        for column_index, text in enumerate(row):
            cell = table.cell(row_index, column_index)
            cell.text = ""
            cell.vertical_alignment = vertical_alignment.CENTER
            paragraph = cell.paragraphs[0]
            _add_docx_inline(paragraph, text, Pt, RGBColor)
            if row_index == 0:
                for run in paragraph.runs:
                    run.bold = True
                shading = OxmlElement("w:shd")
                shading.set(qn("w:fill"), "F2E9E6")
                cell._tc.get_or_add_tcPr().append(shading)
    header_properties = OxmlElement("w:tblHeader")
    header_properties.set(qn("w:val"), "true")
    table.rows[0]._tr.get_or_add_trPr().append(header_properties)


def _write_docx(document, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document.save(output_path)


def _extract_docx_content_lines(document, qn, Paragraph, DocxTable) -> list[str]:
    lines: list[str] = []
    for child in document._element.body:
        if child.tag == qn("w:p"):
            text = Paragraph(child, document).text.strip()
            if text:
                lines.append(text)
        elif child.tag == qn("w:tbl"):
            table = DocxTable(child, document)
            for row in table.rows:
                lines.append("\t".join(cell.text.replace("\n", " ").strip() for cell in row.cells))
    return lines


def generate_pdf(markdown: str, output_path: Path) -> Path:
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_LEFT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.pdfgen import canvas
        from reportlab.platypus import (
            ListFlowable,
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
    except ImportError as error:
        raise _dependency_error("reportlab") from error
    try:
        from pypdf import PdfReader
    except ImportError as error:
        raise _dependency_error("pypdf") from error

    blocks = parse_markdown(markdown)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    burgundy = colors.HexColor("#7D3F4C")
    body_style = ParagraphStyle(
        "ManualBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5,
        leading=14, textColor=colors.HexColor("#2D2B2A"), spaceAfter=7,
    )
    title_style = ParagraphStyle(
        "ManualTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=27,
        leading=32, textColor=burgundy, alignment=TA_LEFT, spaceAfter=15,
    )
    heading_styles = {
        1: ParagraphStyle("ManualH1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=18,
                          leading=23, textColor=burgundy, spaceBefore=14, spaceAfter=7, keepWithNext=True),
        2: ParagraphStyle("ManualH2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=14,
                          leading=18, textColor=burgundy, spaceBefore=11, spaceAfter=5, keepWithNext=True),
        3: ParagraphStyle("ManualH3", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=11,
                          leading=14, textColor=burgundy, spaceBefore=8, spaceAfter=4, keepWithNext=True),
    }
    list_style = ParagraphStyle("ManualList", parent=body_style, leftIndent=0, firstLineIndent=0, spaceAfter=3)
    table_style = ParagraphStyle("ManualTable", parent=body_style, fontSize=8.5, leading=11, spaceAfter=0)
    story = []
    for block in blocks:
        if block.kind == "heading":
            if block.level == 1:
                story.append(Paragraph(_reportlab_inline(block.text), title_style))
            else:
                story.append(Paragraph(_reportlab_inline(block.text), heading_styles[min(block.level - 1, 3)]))
        elif block.kind == "paragraph":
            story.append(Paragraph(_reportlab_inline(block.text), body_style))
        elif block.kind == "list":
            if block.ordered:
                story.extend(Paragraph(_reportlab_inline(item), list_style) for item in block.items)
            else:
                items = [Paragraph(_reportlab_inline(item), list_style) for item in block.items]
                story.append(ListFlowable(items, bulletType="bullet", start="circle", leftIndent=15,
                                          bulletFontName="Helvetica", bulletFontSize=7, spaceAfter=7))
        elif block.kind == "table":
            table_data = [[Paragraph(_reportlab_inline(cell), table_style) for cell in row] for row in block.rows]
            available_width = A4[0] - 4.2 * cm
            table = Table(table_data, colWidths=[available_width / len(block.rows[0])] * len(block.rows[0]), repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F2E9E6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), burgundy),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9D0CA")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            story.extend((table, Spacer(1, 8)))

    if not story:
        raise ManualGenerationError("The Markdown parser did not find any printable content.")

    def page_decoration(pdf_canvas, document) -> None:
        page_number = pdf_canvas.getPageNumber()
        pdf_canvas.saveState()
        pdf_canvas.setStrokeColor(colors.HexColor("#D9D0CA"))
        pdf_canvas.setLineWidth(0.5)
        pdf_canvas.line(2.1 * cm, 1.35 * cm, A4[0] - 2.1 * cm, 1.35 * cm)
        pdf_canvas.setFont("Helvetica", 8)
        pdf_canvas.setFillColor(colors.HexColor("#69615D"))
        label = f"Pagina {page_number}"
        pdf_canvas.drawCentredString(A4[0] / 2, 0.85 * cm, label)
        pdf_canvas.restoreState()

    document = SimpleDocTemplate(
        str(output_path), pagesize=A4, rightMargin=2.0 * cm, leftMargin=2.2 * cm,
        topMargin=2.0 * cm, bottomMargin=1.8 * cm,
        title="Sissy Hairstyle Agenda — Manuale utente",
        author="Sissy Hairstyle Agenda",
        subject="Manuale generato dal Markdown creato dalle fonti wiki.",
    )
    document.build(
        story,
        onFirstPage=page_decoration,
        onLaterPages=page_decoration,
        canvasmaker=lambda *args, **kwargs: canvas.Canvas(*args, **{**kwargs, "invariant": 1}),
    )
    if not output_path.is_file() or output_path.stat().st_size < 500:
        raise ManualGenerationError("The generated PDF is missing or unexpectedly small.")
    with output_path.open("rb") as pdf_file:
        if not pdf_file.read(5) == b"%PDF-":
            raise ManualGenerationError("The generated PDF does not have a PDF file signature.")
    extracted = " ".join((page.extract_text() or "") for page in PdfReader(str(output_path)).pages)
    normalized_pdf = re.sub(r"\s+", " ", extracted).strip()
    for line in canonical_content_lines(blocks):
        normalized_line = re.sub(r"\s+", " ", line).strip()
        if normalized_line and normalized_line not in normalized_pdf:
            raise ManualGenerationError("PDF text verification failed: the body differs from user-manual-it.md.")
    return output_path


def _reportlab_inline(text: str) -> str:
    result: list[str] = []
    position = 0
    for match in INLINE_PATTERN.finditer(text):
        result.append(html.escape(text[position:match.start()]))
        if match.group("link") is not None:
            result.append(html.escape(match.group("link")))
        elif match.group("strong") is not None:
            result.append(f"<b>{html.escape(match.group('strong'))}</b>")
        elif match.group("emphasis") is not None:
            result.append(f"<i>{html.escape(match.group('emphasis'))}</i>")
        else:
            result.append(f'<font name="Courier">{html.escape(match.group("code"))}</font>')
        position = match.end()
    result.append(html.escape(text[position:]))
    return "".join(result)


def _dependency_error(package: str) -> ManualGenerationError:
    return ManualGenerationError(
        f"Missing document-generation dependency '{package}'. Install the pinned packages with "
        "python -m pip install -r docs/manual/requirements.txt."
    )


def _write_markdown(markdown: str, output_path: Path = MANUAL_MARKDOWN) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown, encoding="utf-8", newline="\n")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate the Italian manual deterministically from marked wiki source blocks."
    )
    parser.add_argument("--markdown-only", action="store_true", help="Regenerate only docs/manual/user-manual-it.md.")
    parser.add_argument("--check", action="store_true", help="Fail if the generated Markdown differs from the checked-in file.")
    parser.add_argument("--create-template", action="store_true", help="Create the replaceable generic .dotx template.")
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE, help="Replaceable .dotx style template for DOCX output.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Directory for generated DOCX/PDF files.")
    arguments = parser.parse_args(argv)

    try:
        if arguments.create_template:
            created = create_dotx_template(arguments.template)
            print(f"Created Word template: {created.relative_to(ROOT) if created.is_relative_to(ROOT) else created}")
            return 0

        markdown = build_manual_markdown()
        if arguments.check:
            if not MANUAL_MARKDOWN.is_file() or MANUAL_MARKDOWN.read_text(encoding="utf-8") != markdown:
                print("Generated Markdown is stale; run python scripts/generate_user_manual.py --markdown-only.", file=sys.stderr)
                return 1
            print("Generated user-manual Markdown is up to date.")
            return 0

        _write_markdown(markdown)
        print(f"Generated Markdown: {MANUAL_MARKDOWN.relative_to(ROOT)}")
        if arguments.markdown_only:
            return 0

        template_path = arguments.template.resolve()
        if not template_path.is_file():
            raise ManualGenerationError(
                f"Word template not found: {template_path}. Create it with "
                "python scripts/generate_user_manual.py --create-template."
            )
        docx_path = arguments.output_dir.resolve() / "user-manual-it.docx"
        pdf_path = arguments.output_dir.resolve() / "user-manual-it.pdf"
        generate_docx(markdown, template_path, docx_path)
        generate_pdf(markdown, pdf_path)
        print(f"Generated DOCX: {docx_path}")
        print(f"Generated PDF: {pdf_path}")
        return 0
    except (ManualGenerationError, OSError, zipfile.BadZipFile) as error:
        print(f"Manual generation failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
