import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function computeMuayeneKalanGun(muayeneBitisTarihi: Date | null): number | null {
  if (!muayeneBitisTarihi) return null;
  return differenceInDays(new Date(muayeneBitisTarihi), new Date());
}

export function computeSigortaKalanGun(sigortaBitisTarihi: Date | null): number | null {
  if (!sigortaBitisTarihi) return null;
  return differenceInDays(new Date(sigortaBitisTarihi), new Date());
}

export function computeKaskoKalanGun(kaskoBitisTarihi: Date | null): number | null {
  if (!kaskoBitisTarihi) return null;
  return differenceInDays(new Date(kaskoBitisTarihi), new Date());
}

export function computeMuayeneAlarm(muayeneBitisTarihi: Date | null): string {
  if (!muayeneBitisTarihi) return "⚪ Veri Yok";
  const kalanGun = differenceInDays(new Date(muayeneBitisTarihi), new Date());
  if (kalanGun < 0) return "🔴 SÜRESİ GEÇTİ";
  if (kalanGun <= 30) return "🟡 YAKLAŞIYOR";
  return "🟢 GEÇERLİ";
}

export function computeSigortaAlarm(sigortaBitisTarihi: Date | null): string {
  if (!sigortaBitisTarihi) return "⚪ Veri Yok";
  const kalanGun = differenceInDays(new Date(sigortaBitisTarihi), new Date());
  if (kalanGun < 0) return "🔴 SÜRESİ GEÇTİ";
  if (kalanGun <= 30) return "🟡 YAKLAŞIYOR";
  return "🟢 GEÇERLİ";
}

export type AracWithComputed = {
  id: number;
  plaka: string;
  durumId: number | null;
  durum: { id: number; durumAdi: string } | null;
  sirketId: number | null;
  sirket: { id: number; sirketAdi: string } | null;
  lokasyonId: number | null;
  lokasyon: { id: number; lokasyonAdi: string; sorumluEmail: string | null } | null;
  mulkiyetTipi: string | null;
  markaModelTicariAdi: string | null;
  kullanimSekli: string | null;
  modelYili: number | null;
  kapasite: string | null;
  aracMarka: string | null;
  kasaMarka: string | null;
  sasiNo: string | null;
  motorNo: string | null;
  guncelKmSaat: number | null;
  zimmetMasrafMerkezi: string | null;
  uttsDurum: string | null;
  seyirTakipCihazNo: string | null;
  hgsEtiketNo: string | null;
  hgsSinif: number | null;
  tescilTarihi: Date | null;
  muayeneBitisTarihi: Date | null;
  sigortaBitisTarihi: Date | null;
  kaskoBitisTarihi: Date | null;
  aracKimligi: string | null;
  ruhsatSeriNo: string | null;
  aciklamaNot: string | null;
  tekerSayisi: number | null;
  aracKategorisi: string | null;
  belgelerDosyalar: string | null;
  // Computed
  muayeneKalanGun: number | null;
  sigortaKalanGun: number | null;
  kaskoKalanGun: number | null;
  muayeneAlarm: string;
  sigortaAlarm: string;
};

export function enrichAracWithComputed(arac: Record<string, unknown>): AracWithComputed {
  const a = arac as AracWithComputed;
  return {
    ...a,
    muayeneKalanGun: computeMuayeneKalanGun(a.muayeneBitisTarihi),
    sigortaKalanGun: computeSigortaKalanGun(a.sigortaBitisTarihi),
    kaskoKalanGun: computeKaskoKalanGun(a.kaskoBitisTarihi),
    muayeneAlarm: computeMuayeneAlarm(a.muayeneBitisTarihi),
    sigortaAlarm: computeSigortaAlarm(a.sigortaBitisTarihi),
  };
}
