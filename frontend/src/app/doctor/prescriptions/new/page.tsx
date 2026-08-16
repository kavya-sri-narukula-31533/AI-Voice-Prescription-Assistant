"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { prescriptionApi } from "@/lib/api";
import { Patient, NLPExtractionResult } from "@/types";
import { VoiceRecorder } from "@/components/doctor/VoiceRecorder";
import { MedicineForm, PrescriptionFormValues } from "@/components/doctor/MedicineForm";
import { PatientSearch } from "@/components/doctor/PatientSearch";
import { PatientModal } from "@/components/doctor/PatientModal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Mic, Wand2, User, Pill, FileCheck, ChevronRight, Loader2,
  AlertTriangle, CheckCircle2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  patient_id: z.string().min(1, "Please select a patient"),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  medicines: z.array(z.object({
    medicine_name: z.string().min(1, "Medicine name required"),
    generic_name: z.string().optional(),
    strength: z.string().optional(),
    quantity: z.number().optional(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    instructions: z.string().optional(),
  })).min(1, "Add at least one medicine"),
});

type Step = "patient" | "voice" | "review" | "confirm";

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "patient", label: "Select Patient", icon: User },
  { id: "voice",   label: "Record Voice",   icon: Mic },
  { id: "review",  label: "Review & Edit",  icon: Pill },
  { id: "confirm", label: "Approve",        icon: FileCheck },
];

export default function NewPrescriptionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("patient");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [nlpResult, setNlpResult] = useState<NLPExtractionResult | null>(null);

  const form = useForm<PrescriptionFormValues>({
    defaultValues: { patient_id: "", diagnosis: "", notes: "", medicines: [] },
  });

  // Step 1 → 2
  const handlePatientSelected = (patient: Patient) => {
    setSelectedPatient(patient);
    form.setValue("patient_id", patient.id);
  };

  const goToVoice = () => {
    if (!selectedPatient) { toast.error("Please select a patient first"); return; }
    setStep("voice");
  };

  // Step 2 → 3: transcript received, run NLP
  const handleTranscript = async (text: string, language: string) => {
    setTranscript(text);
    setIsExtracting(true);
    try {
      const res = await prescriptionApi.extractNLP(text, language);
      const result: NLPExtractionResult = res.data;
      setNlpResult(result);
      setWarnings(result.warnings ?? []);

      // Pre-fill form
      if (result.diagnosis) form.setValue("diagnosis", result.diagnosis);
      if (result.notes) form.setValue("notes", result.notes);
      if (result.medicines.length > 0) {
        form.setValue("medicines", result.medicines.map(m => ({
          medicine_name: m.medicine_name,
          generic_name: m.generic_name ?? "",
          strength: m.strength ?? "",
          quantity: m.quantity ?? undefined,
          dosage: m.dosage ?? "",
          frequency: m.frequency ?? "",
          duration: m.duration ?? "",
          instructions: m.instructions ?? "",
        })));
      }

      toast.success(`Extracted ${result.medicines.length} medicine(s) from your voice!`);
      setStep("review");
    } catch {
      toast.error("NLP extraction failed. Please fill the form manually.");
      setStep("review");
    } finally {
      setIsExtracting(false);
    }
  };

  // Step 3 → 4: save draft
  const saveDraftMutation = useMutation({
    mutationFn: async (data: PrescriptionFormValues) => {
      const res = await prescriptionApi.create({
        patient_id: data.patient_id,
        diagnosis: data.diagnosis,
        notes: data.notes,
        medicines: data.medicines,
        voice_transcript: transcript,
      });
      return res.data;
    },
    onSuccess: (rx) => {
      toast.success("Prescription saved!");
      form.setValue("patient_id", rx.id); // repurpose field to track rx id
      setStep("confirm");
      router.push(`/doctor/prescriptions/${rx.id}?approve=true`);
    },
    onError: () => toast.error("Failed to save prescription"),
  });

  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Prescription</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record your voice and let AI extract the prescription details</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < currentStepIndex;
          const active = s.id === step;
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  done  ? "bg-green-500 text-white shadow-sm shadow-green-200"
                       : active ? "bg-primary-600 text-white shadow-sm shadow-primary-200 scale-110"
                       : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                )}>
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:block",
                  active ? "text-primary-600" : done ? "text-green-600" : "text-gray-400"
                )}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mb-5 transition-all",
                  i < currentStepIndex ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      {step === "patient" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Patient</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <PatientSearch
              selectedPatient={selectedPatient}
              onSelect={handlePatientSelected}
              onClear={() => { setSelectedPatient(null); form.setValue("patient_id", ""); }}
              onCreateNew={() => setShowPatientModal(true)}
            />
            {selectedPatient && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedPatient.allergies && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-xs font-semibold text-red-600 mb-0.5">⚠️ Allergies</p>
                    <p className="text-gray-700 dark:text-gray-300">{selectedPatient.allergies}</p>
                  </div>
                )}
                {selectedPatient.chronic_conditions && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-semibold text-amber-600 mb-0.5">📋 Chronic conditions</p>
                    <p className="text-gray-700 dark:text-gray-300">{selectedPatient.chronic_conditions}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={goToVoice} icon={<ChevronRight className="h-4 w-4" />}>
                Continue
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === "voice" && (
        <Card>
          <CardHeader>
            <CardTitle>Record Prescription</CardTitle>
            <Badge variant="info">AI Transcription</Badge>
          </CardHeader>
          <VoiceRecorder onTranscript={handleTranscript} onProcessing={setIsExtracting} />
          {isExtracting && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-3.5 w-3.5 inline mr-1" />
                  AI is extracting prescription data...
                </p>
                <p className="text-xs text-purple-500">Running medical NLP on your transcript</p>
              </div>
            </div>
          )}
          <div className="flex justify-between mt-4">
            <Button variant="ghost" onClick={() => setStep("patient")}>Back</Button>
            <Button
              variant="outline"
              onClick={() => setStep("review")}
              icon={<Wand2 className="h-4 w-4" />}
            >
              Skip to manual entry
            </Button>
          </div>
        </Card>
      )}

      {step === "review" && (
        <form onSubmit={form.handleSubmit((d) => saveDraftMutation.mutate(d))} className="space-y-4">
          {/* NLP confidence */}
          {nlpResult && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-xl border text-sm",
              nlpResult.confidence_score >= 0.8
                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800"
                : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800"
            )}>
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                AI extraction confidence: <strong>{Math.round(nlpResult.confidence_score * 100)}%</strong>
                {nlpResult.confidence_score < 0.8 && " — please review fields carefully"}
              </span>
            </div>
          )}

          {/* Diagnosis & Notes */}
          <Card>
            <CardTitle className="mb-4">Clinical Information</CardTitle>
            <div className="space-y-3">
              <Input
                label="Diagnosis"
                placeholder="e.g. Acute upper respiratory tract infection"
                {...form.register("diagnosis")}
              />
              <Textarea
                label="Doctor's notes"
                placeholder="Additional instructions or observations..."
                rows={2}
                {...form.register("notes")}
              />
            </div>
          </Card>

          {/* Medicines */}
          <Card>
            <CardTitle className="mb-4">
              Prescribed Medicines
              {form.watch("medicines")?.length > 0 && (
                <Badge variant="info" className="ml-2">{form.watch("medicines").length}</Badge>
              )}
            </CardTitle>
            <MedicineForm form={form} warnings={warnings} />
            {form.formState.errors.medicines?.root && (
              <p className="text-sm text-red-500 mt-2">
                {form.formState.errors.medicines.root.message}
              </p>
            )}
          </Card>

          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep("voice")}>Back</Button>
            <Button
              type="submit"
              loading={saveDraftMutation.isPending}
              icon={<FileCheck className="h-4 w-4" />}
            >
              Save & Review
            </Button>
          </div>
        </form>
      )}

      <PatientModal
        isOpen={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        onCreated={(p) => { handlePatientSelected(p); setShowPatientModal(false); }}
      />
    </div>
  );
}
