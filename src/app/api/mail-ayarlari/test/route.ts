import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";
import { sendWeeklyTrackingReport, sendYapilacakTrackingReport } from "@/lib/email";
import type { WeeklyReportData, YapilacakReportData } from "@/lib/email";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "lokasyon_sefi") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { modulTipi, testEmail } = body;

    if (!testEmail) {
      return NextResponse.json({ error: "Test email adresi zorunlu" }, { status: 400 });
    }

    const now = new Date();

    try {
      let sent: boolean;

      if (modulTipi === "yapilacaklar") {
        const testData: YapilacakReportData = {
          gecmisGorevler: [
            { baslik: "Arac bakim yaptir", plaka: "34 TEST 001", kategori: "bakim", oncelik: "yuksek",
              atanan: "Test Kullanici", sonTarih: new Date(now.getTime() - 86400000 * 3).toISOString(), kalanGun: -3 },
          ],
          yaklasanGorevler: [
            { baslik: "Sigorta yenileme", plaka: "34 TEST 002", kategori: "idari", oncelik: "normal",
              atanan: "Test Kullanici", sonTarih: new Date(now.getTime() + 86400000 * 5).toISOString(), kalanGun: 5 },
          ],
          acikGorevler: [
            { baslik: "Lastik degisimi", plaka: "34 TEST 003", kategori: "bakim", oncelik: "dusuk",
              atanan: "-", sonTarih: "", kalanGun: 0 },
          ],
        };
        sent = await sendYapilacakTrackingReport([testEmail], testData);
      } else {
        const testData: WeeklyReportData = {
          suresiGecmisMuayeneler: modulTipi === "muayene" ? [
            { plaka: "34 TEST 001", sirket: "Test Sirket", lokasyon: "Test Lokasyon",
              bitisTarihi: new Date(now.getTime() - 86400000 * 5).toISOString(), kalanGun: -5 },
          ] : [],
          yaklasanMuayeneler: modulTipi === "muayene" ? [
            { plaka: "34 TEST 002", sirket: "Test Sirket", lokasyon: "Test Lokasyon",
              bitisTarihi: new Date(now.getTime() + 86400000 * 15).toISOString(), kalanGun: 15 },
          ] : [],
          suresiGecmisSigortalar: modulTipi === "sigorta" ? [
            { plaka: "34 TEST 003", sigortaTuru: "trafik", sirket: "Test Sirket",
              lokasyon: "Test Lokasyon", bitisTarihi: new Date(now.getTime() - 86400000 * 3).toISOString(), kalanGun: -3 },
          ] : [],
          yaklasanSigortalar: modulTipi === "sigorta" ? [
            { plaka: "34 TEST 004", sigortaTuru: "kasko", sirket: "Test Sirket",
              lokasyon: "Test Lokasyon", bitisTarihi: new Date(now.getTime() + 86400000 * 20).toISOString(), kalanGun: 20 },
          ] : [],
        };
        sent = await sendWeeklyTrackingReport([testEmail], testData);
      }

      return NextResponse.json({
        success: sent,
        message: sent ? "Test emaili gonderildi" : "Email gonderilemedi. SMTP ayarlarini kontrol edin.",
        smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      });
    } catch (emailError: unknown) {
      const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
      console.error("SMTP Error Detail:", errMsg);
      return NextResponse.json({
        success: false,
        message: `SMTP Hata: ${errMsg}`,
        smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      });
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Test email error:", errMsg);
    return NextResponse.json({ error: `Test email gonderilemedi: ${errMsg}` }, { status: 500 });
  }
}
