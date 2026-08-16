"""
Generate prescription PDFs using ReportLab.
"""
import io
import qrcode
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def generate_prescription_pdf(prescription_data: dict) -> bytes:
    """
    Generate a professionally formatted prescription PDF.
    prescription_data keys: id, patient, doctor, medicines, diagnosis, notes,
    ai_summary, created_at, qr_code_url
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    header_style = ParagraphStyle(
        "header", fontSize=18, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#1a56db"), alignment=TA_CENTER
    )
    sub_style = ParagraphStyle(
        "sub", fontSize=10, fontName="Helvetica", alignment=TA_CENTER,
        textColor=colors.HexColor("#4b5563")
    )
    label_style = ParagraphStyle(
        "label", fontSize=9, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#374151")
    )
    value_style = ParagraphStyle(
        "value", fontSize=9, fontName="Helvetica",
        textColor=colors.HexColor("#1f2937")
    )

    doctor = prescription_data.get("doctor", {})
    patient = prescription_data.get("patient", {})
    medicines = prescription_data.get("medicines", [])

    story.append(Paragraph("AI Voice Prescription Assistant", header_style))
    story.append(Paragraph("Digital Medical Prescription", sub_style))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1a56db")))
    story.append(Spacer(1, 4 * mm))

    # ── Doctor / Prescription Info ───────────────────────────────────────────
    date_str = prescription_data.get("created_at", datetime.utcnow().isoformat())
    if isinstance(date_str, datetime):
        date_str = date_str.strftime("%d %B %Y, %I:%M %p")

    info_data = [
        [
            Paragraph(f"<b>Dr. {doctor.get('name', 'N/A')}</b>", label_style),
            Paragraph(f"<b>Prescription ID:</b> {prescription_data.get('id', 'N/A')[:8].upper()}", label_style),
        ],
        [
            Paragraph(doctor.get('specialization', ''), value_style),
            Paragraph(f"<b>Date:</b> {date_str}", value_style),
        ],
        [
            Paragraph(doctor.get('hospital', ''), value_style),
            Paragraph(f"<b>Reg. No.:</b> {doctor.get('registration_number', 'N/A')}", value_style),
        ],
    ]
    info_table = Table(info_data, colWidths=[95 * mm, 85 * mm])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#d1d5db")))
    story.append(Spacer(1, 3 * mm))

    # ── Patient Info ─────────────────────────────────────────────────────────
    story.append(Paragraph("<b>Patient Information</b>", label_style))
    story.append(Spacer(1, 2 * mm))

    pat_data = [
        ["Name", patient.get("full_name", "N/A"), "Age/Gender",
         f"{patient.get('age', 'N/A')} / {patient.get('gender', 'N/A').title() if patient.get('gender') else 'N/A'}"],
        ["Phone", patient.get("phone", "N/A"), "Blood Group", patient.get("blood_group", "N/A")],
    ]
    pat_table = Table(pat_data, colWidths=[25 * mm, 65 * mm, 30 * mm, 60 * mm])
    pat_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#374151")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#374151")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#f9fafb"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(pat_table)

    if prescription_data.get("diagnosis"):
        story.append(Spacer(1, 2 * mm))
        story.append(Paragraph(f"<b>Diagnosis:</b> {prescription_data['diagnosis']}", value_style))

    story.append(Spacer(1, 4 * mm))

    # ── Medicines Table ───────────────────────────────────────────────────────
    story.append(Paragraph("<b>Prescribed Medicines</b>", label_style))
    story.append(Spacer(1, 2 * mm))

    med_headers = ["#", "Medicine", "Strength", "Qty", "Dosage", "Frequency", "Duration", "Instructions"]
    med_rows = [med_headers]
    for i, med in enumerate(medicines, 1):
        med_rows.append([
            str(i),
            med.get("medicine_name", ""),
            med.get("strength", "-") or "-",
            str(med.get("quantity", "-") or "-"),
            med.get("dosage", "-") or "-",
            med.get("frequency", "-") or "-",
            med.get("duration", "-") or "-",
            med.get("instructions", "-") or "-",
        ])

    col_widths = [8, 35, 18, 12, 20, 25, 20, 42]
    col_widths = [w * mm for w in col_widths]

    med_table = Table(med_rows, colWidths=col_widths)
    med_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a56db")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f9ff")]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(med_table)

    # ── Patient Instructions ─────────────────────────────────────────────────
    for med in medicines:
        if med.get("patient_instructions"):
            story.append(Spacer(1, 2 * mm))
            story.append(Paragraph(
                f"💊 <b>{med['medicine_name']}:</b> {med['patient_instructions']}",
                ParagraphStyle("inst", fontSize=8, fontName="Helvetica",
                               textColor=colors.HexColor("#374151"), leftIndent=5)
            ))

    story.append(Spacer(1, 4 * mm))

    # ── Notes / AI Summary ───────────────────────────────────────────────────
    if prescription_data.get("notes"):
        story.append(Paragraph(f"<b>Doctor's Notes:</b> {prescription_data['notes']}", value_style))
        story.append(Spacer(1, 2 * mm))

    if prescription_data.get("ai_summary"):
        summary_style = ParagraphStyle(
            "summary", fontSize=8, fontName="Helvetica-Oblique",
            textColor=colors.HexColor("#6b7280"),
            backColor=colors.HexColor("#f9fafb"),
            borderPad=4, leftIndent=4, rightIndent=4
        )
        story.append(Paragraph(f"<i>AI Summary: {prescription_data['ai_summary']}</i>", summary_style))
        story.append(Spacer(1, 2 * mm))

    # ── Footer ───────────────────────────────────────────────────────────────
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#d1d5db")))
    story.append(Spacer(1, 2 * mm))

    footer_style = ParagraphStyle(
        "footer", fontSize=7, fontName="Helvetica",
        textColor=colors.HexColor("#9ca3af"), alignment=TA_CENTER
    )
    story.append(Paragraph(
        "This is a digitally generated prescription. Verify with prescribing doctor before dispensing. "
        "Generated by AI Voice Prescription Assistant.",
        footer_style
    ))

    doc.build(story)
    return buffer.getvalue()


def generate_qr_code(data: str) -> bytes:
    """Generate a QR code image for the given data string."""
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1a56db", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
