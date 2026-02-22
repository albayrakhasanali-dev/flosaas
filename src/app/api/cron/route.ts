import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeMuayeneKalanGun, computeSigortaKalanGun } from "@/lib/utils";
import { sendExpiredVehicleAlert, sendWeeklyTrackingReport } from "@/lib/email";
import type { WeeklyReportData } from "@/lib/email";

// Cron secret for security
const CRON_SECRET = process.env.CRON_SECRET || "flosaas-cron-secret";

// Vercel cron uses GET requests
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret") || req.headers.get("authorization")?.replace("Bearer ", "");

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = searchParams.get("job") || "expired_vehicles";

  if (job === "weekly_report") {
    return handleWeeklyReport();
  }
  return handleExpiredVehicles();
}

// Keep POST for backward compatibility
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const job = (body as Record<string, string>).job || "expired_vehicles";

    if (job === "weekly_report") {
      return handleWeeklyReport();
    }
    return handleExpiredVehicles();
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ============================================
// JOB 1: Suresi gecen araclari YATAN yap
// ============================================
async function handleExpiredVehicles() {
  try {
    const activeAraclar = await prisma.t_Arac_Master.findMany({
      where: {
        durum: { durumAdi: "🟢 AKTİF" },
      },
      include: { durum: true, lokasyon: true },
    });

    const expiredAraclar = activeAraclar.filter((a) => {
      const mKalan = computeMuayeneKalanGun(a.muayeneBitisTarihi);
      const sKalan = computeSigortaKalanGun(a.sigortaBitisTarihi);
      return (mKalan !== null && mKalan < 0) || (sKalan !== null && sKalan < 0);
    });

    if (expiredAraclar.length === 0) {
      await prisma.cronLog.create({
        data: {
          jobName: "muayene_sigorta_kontrol",
          status: "success",
          message: "No expired vehicles found",
          affectedCount: 0,
        },
      });
      return NextResponse.json({ message: "No expired vehicles", count: 0 });
    }

    // Update status to YATAN
    const yatanDurum = await prisma.t_Durum.findUnique({
      where: { durumAdi: "⚫ YATAN" },
    });

    if (yatanDurum) {
      await prisma.t_Arac_Master.updateMany({
        where: { id: { in: expiredAraclar.map((a) => a.id) } },
        data: { durumId: yatanDurum.id },
      });
    }

    // Collect email recipients
    const emailTargets = new Set<string>();
    if (process.env.ADMIN_EMAIL) emailTargets.add(process.env.ADMIN_EMAIL);

    for (const a of expiredAraclar) {
      if (a.lokasyon?.sorumluEmail) emailTargets.add(a.lokasyon.sorumluEmail);
    }

    // Send email notification
    const alarmData = expiredAraclar.map((a) => ({
      plaka: a.plaka,
      lokasyon: a.lokasyon?.lokasyonAdi || "-",
      muayeneKalanGun: computeMuayeneKalanGun(a.muayeneBitisTarihi),
      sigortaKalanGun: computeSigortaKalanGun(a.sigortaBitisTarihi),
    }));

    if (emailTargets.size > 0) {
      await sendExpiredVehicleAlert(Array.from(emailTargets), alarmData);
    }

    // Log
    await prisma.cronLog.create({
      data: {
        jobName: "muayene_sigorta_kontrol",
        status: "success",
        message: `Updated ${expiredAraclar.length} vehicles to YATAN status`,
        affectedCount: expiredAraclar.length,
      },
    });

    return NextResponse.json({
      message: `Processed ${expiredAraclar.length} expired vehicles`,
      count: expiredAraclar.length,
      vehicles: alarmData,
    });
  } catch (error) {
    await prisma.cronLog.create({
      data: {
        jobName: "muayene_sigorta_kontrol",
        status: "error",
        message: String(error),
      },
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ============================================
// JOB 2: Haftalik muayene/sigorta raporu
// ============================================
async function handleWeeklyReport() {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Base filter: aktif araclar (pasif/yatan haric)
    const aracBaseWhere = {
      durum: { durumAdi: { notIn: ["⚫ YATAN", "🟡 BAKIMDA"] } },
    };

    // -- MUAYENE: suresi gecmis --
    const suresiGecmisMuayeneler = await prisma.t_Arac_Master.findMany({
      where: {
        ...aracBaseWhere,
        muayeneGerekli: true,
        muayeneBitisTarihi: { lt: now },
      },
      include: {
        sirket: { select: { sirketAdi: true } },
        lokasyon: { select: { lokasyonAdi: true } },
      },
      orderBy: { muayeneBitisTarihi: "asc" },
    });

    // -- MUAYENE: yaklasan (30 gun icinde) --
    const yaklasanMuayeneler = await prisma.t_Arac_Master.findMany({
      where: {
        ...aracBaseWhere,
        muayeneGerekli: true,
        muayeneBitisTarihi: { gte: now, lte: thirtyDaysFromNow },
      },
      include: {
        sirket: { select: { sirketAdi: true } },
        lokasyon: { select: { lokasyonAdi: true } },
      },
      orderBy: { muayeneBitisTarihi: "asc" },
    });

    // -- SIGORTA: suresi gecmis --
    const suresiGecmisSigortalar = await prisma.t_Sigorta.findMany({
      where: {
        arac: { ...aracBaseWhere, sigortaGerekli: true },
        bitisTarihi: { lt: now },
      },
      include: {
        arac: {
          select: {
            plaka: true,
            sirket: { select: { sirketAdi: true } },
            lokasyon: { select: { lokasyonAdi: true } },
          },
        },
      },
      orderBy: { bitisTarihi: "asc" },
    });

    // -- SIGORTA: yaklasan --
    const yaklasanSigortalar = await prisma.t_Sigorta.findMany({
      where: {
        arac: { ...aracBaseWhere, sigortaGerekli: true },
        bitisTarihi: { gte: now, lte: thirtyDaysFromNow },
      },
      include: {
        arac: {
          select: {
            plaka: true,
            sirket: { select: { sirketAdi: true } },
            lokasyon: { select: { lokasyonAdi: true } },
          },
        },
      },
      orderBy: { bitisTarihi: "asc" },
    });

    // Build report data
    const reportData: WeeklyReportData = {
      suresiGecmisMuayeneler: suresiGecmisMuayeneler.map((a) => ({
        plaka: a.plaka,
        sirket: a.sirket?.sirketAdi || "-",
        lokasyon: a.lokasyon?.lokasyonAdi || "-",
        bitisTarihi: a.muayeneBitisTarihi?.toISOString() || "",
        kalanGun: computeMuayeneKalanGun(a.muayeneBitisTarihi) || 0,
      })),
      yaklasanMuayeneler: yaklasanMuayeneler.map((a) => ({
        plaka: a.plaka,
        sirket: a.sirket?.sirketAdi || "-",
        lokasyon: a.lokasyon?.lokasyonAdi || "-",
        bitisTarihi: a.muayeneBitisTarihi?.toISOString() || "",
        kalanGun: computeMuayeneKalanGun(a.muayeneBitisTarihi) || 0,
      })),
      suresiGecmisSigortalar: suresiGecmisSigortalar.map((s) => ({
        plaka: s.arac.plaka,
        sigortaTuru: s.sigortaTuru,
        sirket: s.arac.sirket?.sirketAdi || "-",
        lokasyon: s.arac.lokasyon?.lokasyonAdi || "-",
        bitisTarihi: s.bitisTarihi.toISOString(),
        kalanGun: Math.ceil((s.bitisTarihi.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      yaklasanSigortalar: yaklasanSigortalar.map((s) => ({
        plaka: s.arac.plaka,
        sigortaTuru: s.sigortaTuru,
        sirket: s.arac.sirket?.sirketAdi || "-",
        lokasyon: s.arac.lokasyon?.lokasyonAdi || "-",
        bitisTarihi: s.bitisTarihi.toISOString(),
        kalanGun: Math.ceil((s.bitisTarihi.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    };

    // Get all admin/manager emails
    const yoneticiler = await prisma.user.findMany({
      where: {
        role: { in: ["super_admin", "sirket_yoneticisi"] },
        isActive: true,
      },
      select: { email: true },
    });

    const emailTargets = yoneticiler.map((u) => u.email);
    if (process.env.ADMIN_EMAIL && !emailTargets.includes(process.env.ADMIN_EMAIL)) {
      emailTargets.push(process.env.ADMIN_EMAIL);
    }

    let emailSent = false;
    if (emailTargets.length > 0) {
      emailSent = await sendWeeklyTrackingReport(emailTargets, reportData);
    }

    const totalIssues =
      reportData.suresiGecmisMuayeneler.length +
      reportData.yaklasanMuayeneler.length +
      reportData.suresiGecmisSigortalar.length +
      reportData.yaklasanSigortalar.length;

    // Log
    await prisma.cronLog.create({
      data: {
        jobName: "weekly_report",
        status: "success",
        message: `Rapor gonderildi: ${totalIssues} kayit, ${emailTargets.length} alici. Email: ${emailSent ? "basarili" : "gonderilemedi"}`,
        affectedCount: totalIssues,
      },
    });

    return NextResponse.json({
      message: `Weekly report sent to ${emailTargets.length} recipients`,
      emailSent,
      recipients: emailTargets.length,
      summary: {
        suresiGecmisMuayene: reportData.suresiGecmisMuayeneler.length,
        yaklasanMuayene: reportData.yaklasanMuayeneler.length,
        suresiGecmisSigorta: reportData.suresiGecmisSigortalar.length,
        yaklasanSigorta: reportData.yaklasanSigortalar.length,
      },
    });
  } catch (error) {
    await prisma.cronLog.create({
      data: {
        jobName: "weekly_report",
        status: "error",
        message: String(error),
      },
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
