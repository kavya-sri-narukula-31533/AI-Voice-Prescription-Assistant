"""
Medical NLP Extractor — uses OpenAI GPT-4o to extract structured prescription data
from a voice transcript. Falls back to regex-based extraction when AI is unavailable.
"""
import re
import json
import logging
from typing import Optional
from app.core.config import settings
from app.schemas.prescription import NLPExtractionResponse, MedicineCreate

logger = logging.getLogger(__name__)

# Prompt template for GPT-based extraction
EXTRACTION_SYSTEM_PROMPT = """You are a medical NLP assistant specialized in extracting structured
prescription information from doctor's voice transcripts.

Extract the following fields from the transcript and return ONLY valid JSON:
{
  "patient_name": "string or null",
  "diagnosis": "string or null",
  "notes": "string or null",
  "medicines": [
    {
      "medicine_name": "string",
      "generic_name": "string or null",
      "strength": "string (e.g. '500mg', '250mg') or null",
      "quantity": "integer or null",
      "dosage": "string (e.g. '1 tablet', '5ml') or null",
      "frequency": "string (e.g. 'twice daily', 'three times a day') or null",
      "duration": "string (e.g. '5 days', '1 week') or null",
      "instructions": "string (e.g. 'after food', 'before sleep') or null",
      "sort_order": "integer (order in prescription)"
    }
  ]
}

Rules:
- Normalize medicine names (capitalize properly, fix common misspellings)
- Convert frequency synonyms: "BD" → "twice daily", "TDS" → "three times a day", "OD" → "once daily"
- Extract strength from medicine name if combined (e.g. "Paracetamol 500mg")
- If quantity is mentioned as "10 tablets", set quantity=10
- Keep instructions concise
- Return empty medicines array if none found
"""


class MedicalNLPExtractor:
    """Extracts structured prescription data from voice transcripts."""

    async def extract(self, transcript: str, language: str = "en") -> NLPExtractionResponse:
         return self._extract_with_regex(transcript)
    async def _extract_with_gpt(self, transcript: str, language: str) -> NLPExtractionResponse:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        # If not English, translate first
        if language != "en":
            translate_response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Translate the following medical prescription transcript to English. Keep medicine names, dosages, and medical terms intact."},
                    {"role": "user", "content": transcript},
                ],
                temperature=0.1,
            )
            transcript = translate_response.choices[0].message.content

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": f"Extract prescription from:\n\n{transcript}"},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        raw = json.loads(response.choices[0].message.content)
        medicines = [MedicineCreate(**m) for m in raw.get("medicines", [])]

        # Check for drug interactions
        warnings = await self._check_drug_interactions([m.medicine_name for m in medicines])

        return NLPExtractionResponse(
            patient_name=raw.get("patient_name"),
            medicines=medicines,
            diagnosis=raw.get("diagnosis"),
            notes=raw.get("notes"),
            confidence_score=0.92,
            warnings=warnings,
        )

    def _extract_with_regex(self, transcript: str) -> NLPExtractionResponse:
        """Fallback regex-based extraction for common prescription patterns."""
        transcript = re.sub(r"\s+", " ", transcript).strip()
        medicines = []
        warnings = []

        # Extract patient name
        patient_match = re.search(
            r"patient\s+(?:name\s+)?(.+?)(?=\s+age\b|\s+diagnosis\b|\s+prescribe\b|\s+advise\b|$)",
            transcript,
            re.IGNORECASE | re.DOTALL,
        )

        patient_name = patient_match.group(1).strip(" ,.!?") if patient_match else None
        # Extract diagnosis
        diagnosis = None

        diagnosis_match = re.search(
           r"diagnosis[\.:]?\s*(.+?)(?=prescribe|advise|$)",
           transcript,
           re.IGNORECASE | re.DOTALL,
        )

        if diagnosis_match:
            diagnosis = diagnosis_match.group(1).strip(" ,.!?")
        # Common medicine patterns: "Medicine Strength, Quantity, Dosage Frequency for Duration"
                # -----------------------------
        # Medicine extraction
        # -----------------------------

        # Split transcript into separate medicine sections.
        # This prevents one medicine from consuming information
        # belonging to the next medicine.
        medicine_sections = re.split(
            r"\b(?:prescribe|prescribed|give|start|take|use)\s+",
            transcript,
            flags=re.IGNORECASE,
        )

        number_words = {
            "one": "1",
            "two": "2",
            "three": "3",
            "four": "4",
            "five": "5",
            "six": "6",
            "seven": "7",
            "eight": "8",
            "nine": "9",
            "ten": "10",
        }

        medicine_corrections = {
            "citricin": "Cetirizine",
            "seterazine": "Cetirizine",
            "seterizine": "Cetirizine",
            "cetrizine": "Cetirizine",
            "parasitimal": "Paracetamol",
        }

        frequency_map = {
            "once a day": "once daily",
            "one time a day": "once daily",
            "twice a day": "twice daily",
            "two times a day": "twice daily",
            "three times a day": "three times daily",
            "three times daily": "three times daily",
            "od": "once daily",
            "bd": "twice daily",
            "tds": "three times daily",
            "at night": "at bedtime",
            "before sleep": "at bedtime",
        }

        medicine_pattern = re.compile(
            r"^"
            r"([A-Za-z]+(?:\s+[A-Za-z]+)?)"
            r"(?:\s+(\d+(?:\.\d+)?)\s*"
            r"(mg|milligrams?|ml|milliliters?|mcg|micrograms?|g|grams?))?"
            r"(?:\s*,?\s*(\d+)\s*"
            r"(tablet|tablets|tab|tabs|capsule|capsules))?"
            r".*?"
            r"(once\s+daily|once\s+a\s+day|"
            r"twice\s+daily|twice\s+a\s+day|"
            r"two\s+times\s+a\s+day|"
            r"three\s+times\s+daily|"
            r"three\s+times\s+a\s+day|"
            r"at\s+bedtime|before\s+sleep|at\s+night|"
            r"OD|BD|TDS)"
            r"(?:.*?\bfor\s+"
            r"((?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)"
            r"\s+(?:days?|weeks?|months?)))?"
            r"(?:.*)?$",
            re.IGNORECASE,
        )

        for idx, section in enumerate(medicine_sections[1:]):

            # Stop at the next obvious non-medicine section
            section = re.split(
                r"\b(?:advise|advice|notes?|return|review)\b",
                section,
                maxsplit=1,
                flags=re.IGNORECASE,
            )[0].strip(" ,.!?")

            if not section:
                continue

            match = medicine_pattern.search(section)

            if not match:
                continue

            (
                name,
                strength,
                strength_unit,
                quantity,
                quantity_unit,
                frequency,
                duration,
            ) = match.groups()

            # Normalize medicine name
            clean_name = name.strip()

            corrected_name = medicine_corrections.get(
                clean_name.lower(),
                clean_name.title(),
            )

            # Normalize strength
            normalized_strength = None

            if strength:
                unit = strength_unit.lower()

                if unit in ("milligram", "milligrams"):
                    unit = "mg"
                elif unit in ("milliliter", "milliliters"):
                    unit = "ml"
                elif unit in ("microgram", "micrograms"):
                    unit = "mcg"
                elif unit in ("gram", "grams"):
                    unit = "g"

                normalized_strength = f"{strength} {unit}"

            # Normalize duration
            normalized_duration = None

            if duration:
                normalized_duration = duration.lower().strip()

                for word, digit in number_words.items():
                    normalized_duration = re.sub(
                        rf"\b{word}\b",
                        digit,
                        normalized_duration,
                    )

            # Normalize frequency
            normalized_frequency = frequency.lower().strip()

            normalized_frequency = frequency_map.get(
                normalized_frequency,
                normalized_frequency,
            )

            # Normalize quantity
            normalized_quantity = (
                int(quantity)
                if quantity
                else None
            )

            # Dosage
            normalized_dosage = None

            if quantity:
                normalized_dosage = (
                    f"{quantity} {quantity_unit}"
                )
            elif re.search(
                r"\b(?:tablet|tab|capsule|cap)\b",
                section,
                re.IGNORECASE,
            ):
                normalized_dosage = "1 tablet"

            # Instructions
            instructions = None

            if re.search(
                r"\bafter\s+(?:food|meal|meals|eating)\b",
                section,
                re.IGNORECASE,
            ):
                instructions = "After food"

            elif re.search(
                r"\bbefore\s+(?:food|meal|meals)\b",
                section,
                re.IGNORECASE,
            ):
                instructions = "Before food"

            elif re.search(
                r"\b(?:at\s+bedtime|before\s+sleep|at\s+night)\b",
                section,
                re.IGNORECASE,
            ):
                instructions = "At bedtime"
                        # Warning when medicine strength is missing
            if not normalized_strength:
                warnings.append(
                    f"⚠️ Strength not specified for {corrected_name}"
                )
            medicines.append(
                MedicineCreate(
                    medicine_name=corrected_name,
                    strength=normalized_strength,
                    quantity=normalized_quantity,
                    dosage=normalized_dosage,
                    frequency=normalized_frequency,
                    duration=normalized_duration,
                    instructions=instructions,
                    sort_order=len(medicines),
                )
            )

        # -----------------------------
        # Confidence
        # -----------------------------

        if medicines:
            confidence = 0.9
        elif diagnosis or patient_name:
            confidence = 0.4
        else:
            confidence = 0.2

        return NLPExtractionResponse(
            patient_name=patient_name,
            diagnosis=diagnosis,
            medicines=medicines,
            confidence_score=confidence,
            warnings=warnings,
        )

    async def _check_drug_interactions(self, medicine_names: list[str]) -> list[str]:
        """Check for common drug interactions using GPT or a local rule set."""
        if len(medicine_names) < 2:
            return []

        # Basic known interactions (expand with a real drug DB in production)
        KNOWN_INTERACTIONS: list[tuple[str, str, str]] = [
            ("warfarin", "aspirin", "Increased bleeding risk"),
            ("metformin", "alcohol", "Risk of lactic acidosis"),
            ("ssri", "maoi", "Serotonin syndrome risk"),
        ]

        warnings = []
        lower_names = [n.lower() for n in medicine_names]
        for drug_a, drug_b, warning in KNOWN_INTERACTIONS:
            if any(drug_a in n for n in lower_names) and any(drug_b in n for n in lower_names):
                warnings.append(f"⚠️ Interaction: {drug_a.title()} + {drug_b.title()} — {warning}")

        return warnings

    async def generate_patient_instructions(self, medicine: MedicineCreate) -> str:
        """Generate patient-friendly instructions for a medicine using GPT."""
        if not settings.OPENAI_API_KEY:
            parts = []
            if medicine.dosage:
                parts.append(f"Take {medicine.dosage}")
            if medicine.frequency:
                parts.append(medicine.frequency)
            if medicine.duration:
                parts.append(f"for {medicine.duration}")
            if medicine.instructions:
                parts.append(medicine.instructions)
            return " ".join(parts) if parts else "Follow doctor's instructions."

        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = (
            f"Generate simple, patient-friendly instructions for:\n"
            f"Medicine: {medicine.medicine_name} {medicine.strength or ''}\n"
            f"Dosage: {medicine.dosage}, Frequency: {medicine.frequency}, "
            f"Duration: {medicine.duration}, Instructions: {medicine.instructions}\n"
            f"Write in 1-2 clear sentences a patient can understand."
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=150,
        )
        return response.choices[0].message.content.strip()

    async def generate_summary(self, transcript: str, medicines: list) -> str:
        """Generate a clinical summary of the prescription."""
        if not settings.OPENAI_API_KEY:
            return f"Prescription with {len(medicines)} medicine(s)."

        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        med_list = ", ".join(
            f"{m.medicine_name} {m.strength or ''}".strip() for m in medicines
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": (
                    f"Summarize this prescription in 2-3 sentences for medical records:\n"
                    f"Medicines: {med_list}\nTranscript: {transcript}"
                )
            }],
            temperature=0.2,
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()


nlp_extractor = MedicalNLPExtractor()
