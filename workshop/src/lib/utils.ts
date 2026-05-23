import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "0,00 kr";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("sv-SE").format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Utkast",
    sent: "Skickad",
    paid: "Betald",
    overdue: "Förfallen",
    cancelled: "Avbruten",
  };
  return map[status] ?? status;
}

export function itemTypeLabel(type: string): string {
  const map: Record<string, string> = {
    part: "Reservdel",
    labor: "Arbete",
    oil: "Olja",
    tire_fee: "Däckavgift",
    environmental_fee: "Miljöavgift",
    diagnostic: "Diagnos",
    fixed_price: "Fastpris",
    discount: "Rabatt",
    other: "Övrigt",
  };
  return map[type] ?? type;
}

export function monthName(month: number): string {
  const names = ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
  return names[(month - 1) % 12] ?? String(month);
}
