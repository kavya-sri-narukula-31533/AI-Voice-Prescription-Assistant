// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole = "doctor" | "pharmacist" | "patient" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  profile_picture?: string;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  role: UserRole;
  full_name: string;
}

// ── Patient ───────────────────────────────────────────────────────────────────
export type Gender = "male" | "female" | "other";

export interface Patient {
  id: string;
  user_id?: string;
  full_name: string;
  age?: number;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  blood_group?: string;
  allergies?: string;
  chronic_conditions?: string;
  medical_history?: string;
}

export interface PatientCreate {
  full_name: string;
  age?: number;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  blood_group?: string;
  allergies?: string;
  chronic_conditions?: string;
  medical_history?: string;
}

// ── Prescription ──────────────────────────────────────────────────────────────
export type PrescriptionStatus =
  | "draft"
  | "approved"
  | "sent_to_pharmacy"
  | "preparing"
  | "ready"
  | "dispensed"
  | "cancelled";

export interface Medicine {
  id?: string;
  medicine_name: string;
  generic_name?: string;
  strength?: string;
  quantity?: number;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  patient_instructions?: string;
  is_available?: boolean;
  sort_order?: number;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: PrescriptionStatus;
  diagnosis?: string;
  notes?: string;
  voice_transcript?: string;
  ai_summary?: string;
  drug_interaction_warnings?: string[];
  qr_code_url?: string;
  pdf_url?: string;
  pharmacist_notes?: string;
  medicines: Medicine[];
  created_at: string;
  updated_at: string;
  approved_at?: string;
  dispensed_at?: string;
  // Joined fields (from API includes)
  patient?: Patient;
  doctor?: { id: string; specialization: string; hospital?: string; registration_number: string; user?: User };
}

export interface NLPExtractionResult {
  patient_name?: string;
  medicines: Medicine[];
  diagnosis?: string;
  notes?: string;
  confidence_score: number;
  warnings: string[];
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_prescriptions: number;
  total_patients: number;
  by_status: Record<PrescriptionStatus, number>;
  top_medicines: { name: string; count: number }[];
  daily_prescriptions: { date: string; count: number }[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, unknown>;
  timestamp: string;
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
export interface SelectOption {
  value: string;
  label: string;
}
