import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { PrescriptionStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = "dd MMM yyyy") {
  return format(new Date(date), fmt);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "dd MMM yyyy, hh:mm a");
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const STATUS_CONFIG: Record<
  PrescriptionStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  draft:             { label: "Draft",             color: "text-gray-600",   bg: "bg-gray-100",   dot: "bg-gray-400"   },
  approved:          { label: "Approved",          color: "text-blue-600",   bg: "bg-blue-50",    dot: "bg-blue-500"   },
  sent_to_pharmacy:  { label: "Sent to Pharmacy",  color: "text-purple-600", bg: "bg-purple-50",  dot: "bg-purple-500" },
  preparing:         { label: "Preparing",         color: "text-amber-600",  bg: "bg-amber-50",   dot: "bg-amber-500"  },
  ready:             { label: "Ready",             color: "text-green-600",  bg: "bg-green-50",   dot: "bg-green-500"  },
  dispensed:         { label: "Dispensed",         color: "text-emerald-600",bg: "bg-emerald-50", dot: "bg-emerald-500"},
  cancelled:         { label: "Cancelled",         color: "text-red-600",    bg: "bg-red-50",     dot: "bg-red-500"    },
};

export function getStatusConfig(status: PrescriptionStatus) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
}

export function generateInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
