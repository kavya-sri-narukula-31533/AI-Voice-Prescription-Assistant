# AI Voice Prescription Assistant

A production-ready full-stack AI healthcare application that digitizes the prescription process using voice recognition and Natural Language Processing.

---

## Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Backend     | FastAPI (Python 3.11), SQLAlchemy, Alembic    |
| Database    | PostgreSQL 16                                 |
| AI / ML     | OpenAI Whisper API, GPT-4o NLP extraction     |
| Auth        | JWT (access + refresh tokens)                 |
| PDF         | ReportLab                                     |
| QR Code     | qrcode library                                |
| Storage     | Local / AWS S3 / Firebase Storage             |
| Cache       | Redis (Celery tasks)                          |
| Deploy      | Docker Compose                                |

---

## Project Structure

```
ai-prescription-assistant/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # auth, patients, prescriptions, analytics
│   │   ├── ai/               # speech_to_text.py, nlp_extractor.py
│   │   ├── core/             # config, database, security, deps
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── utils/            # pdf_generator.py, storage.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/       # login, register
│   │   │   ├── doctor/       # dashboard, patients, prescriptions, analytics
│   │   │   ├── pharmacist/   # dashboard, orders, completed
│   │   │   └── patient/      # prescriptions, orders, profile
│   │   ├── components/
│   │   │   ├── doctor/       # VoiceRecorder, MedicineForm, PatientSearch, PatientModal
│   │   │   ├── shared/       # Navbar, Sidebar, LoadingSpinner, QueryProvider
│   │   │   └── ui/           # Button, Input, Card, Badge, Modal, Select
│   │   ├── lib/              # api.ts, utils.ts
│   │   ├── store/            # auth.store.ts (Zustand)
│   │   └── types/            # TypeScript interfaces
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 16
- Redis (optional, for background tasks)
- OpenAI API key (for voice transcription + NLP)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — add OPENAI_API_KEY and DATABASE_URL

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open **http://localhost:3000**

### 4. Docker (recommended)

```bash
cp backend/.env.example backend/.env
# Fill in OPENAI_API_KEY in backend/.env

docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable               | Description                           |
|------------------------|---------------------------------------|
| `DATABASE_URL`         | PostgreSQL connection string          |
| `SECRET_KEY`           | JWT signing key (change in prod!)     |
| `OPENAI_API_KEY`       | OpenAI API key for Whisper + GPT-4o   |
| `FIREBASE_*`           | Firebase config (optional)            |
| `AWS_*` / `S3_*`       | AWS S3 config (optional)              |

---

## User Roles & Workflow

### Doctor
1. **Login** → redirected to Doctor Dashboard
2. **Select or register a patient**
3. **Click microphone** → speak prescription naturally
4. AI transcribes via **Whisper** → runs **GPT-4o NLP extraction**
5. Review extracted medicines in editable form
6. **Approve** → prescription sent to pharmacy

### Pharmacist
1. **Login** → see real-time incoming orders
2. Open order → verify medicines, mark availability
3. Progress: **Incoming → Preparing → Ready → Dispensed**

### Patient
1. **Login** → view prescription history
2. Expand any prescription for medicine instructions (AI-generated)
3. **Download PDF** with QR code
4. Track pharmacy order status in real time

---

## AI Features

| Feature                        | Implementation                         |
|--------------------------------|----------------------------------------|
| Speech-to-Text                 | OpenAI Whisper API (cloud) or faster-whisper (local) |
| Medical NLP extraction         | GPT-4o with structured JSON output    |
| Multi-language support         | English, Hindi, Telugu, Tamil, Kannada, Marathi |
| Drug interaction warnings      | GPT-4o + local rule base              |
| Duplicate medicine detection   | Client-side real-time check           |
| Patient-friendly instructions  | GPT-4o plain-language generation      |
| Prescription AI summary        | GPT-4o 2-3 sentence clinical summary  |

---

## API Endpoints

| Method | Path                                    | Role         |
|--------|-----------------------------------------|--------------|
| POST   | `/api/v1/auth/login`                    | Public       |
| POST   | `/api/v1/auth/register/doctor`          | Public       |
| POST   | `/api/v1/prescriptions/transcribe`      | Doctor       |
| POST   | `/api/v1/prescriptions/extract-nlp`     | Doctor       |
| POST   | `/api/v1/prescriptions`                 | Doctor       |
| POST   | `/api/v1/prescriptions/{id}/approve`    | Doctor       |
| PATCH  | `/api/v1/prescriptions/{id}/pharmacy-status` | Pharmacist |
| GET    | `/api/v1/prescriptions/{id}/pdf`        | All roles    |
| GET    | `/api/v1/analytics/dashboard`           | Doctor       |
| GET    | `/api/v1/analytics/audit-logs`          | Doctor       |

Full Swagger UI available at `/docs`.

---

## Security

- JWT with access + refresh tokens
- Role-based access control (Doctor / Pharmacist / Patient)
- Doctor approval required before pharmacy receives prescription
- Complete audit trail for all prescription changes
- Encrypted passwords (bcrypt)
- CORS restricted to configured origins

---

## License

MIT
