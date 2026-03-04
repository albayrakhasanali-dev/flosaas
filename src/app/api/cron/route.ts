import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeMuayeneKalanGun, computeSigortaKalanGun } from "@/lib/utils";
import { sendExpiredVehicleAlert, sendWeeklyTrackingReport, sendYapilacakTrackingReport } from "@/lib/email";
import type { WeeklyReportData, YapilacakReportData } from "@/lib/email";

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
  const force = searchParams.get("force") === "true";

  if (job === "weekly_report") {
    return handleWeeklyReport(force);
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
// Reads settings from T_Mail_Ayarlari DB table
// ============================================
async function handleWeeklyReport(force = false) {
  try {
    // Read mail settings from DB
    const mailAyarlari = await prisma.t_Mail_Ayarlari.findMany({
      where: { aktif: true },
    });

    // If no active settings, fall back to default behavior
    if (mailAyarlari.length === 0) {
      return await handleWeeklyReportDefault();
    }

    const now = new Date();
    const currentDay = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const results: string[] = [];

    for (const ayar of mailAyarlari) {
      // Check frequency: skip if weekly and wrong day (unless force=true)
      if (!force && ayar.frekans === "haftalik" && currentDay !== ayar.haftaninGunu) {
        results.push(`${ayar.modulTipi}: skipped (not scheduled day)`);
        continue;
      }

      const kriterler: string[] = JSON.parse(ayar.kriterler);
      const esikGunleri: number[] = JSON.parse(ayar.esikGunleri);
      const maxEsik = Math.max(...esikGunleri, 30);
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + maxEsik);

      // Build recipients
      const alicilar: string[] = JSON.parse(ayar.alicilar);
      if (ayar.yoneticilereGonder) {
        const yoneticiler = await prisma.user.findMany({
          where: { role: { in: ["super_admin", "sirket_yoneticisi"] }, isActive: true },
          select: { email: true },
        });
        for (const y of yoneticiler) {
          if (!alicilar.includes(y.email)) alicilar.push(y.email);
        }
      }
      if (process.env.ADMIN_EMAIL && !alicilar.includes(process.env.ADMIN_EMAIL)) {
        alicilar.push(process.env.ADMIN_EMAIL);
      }

      if (alicilar.length === 0) {
        results.push(`${ayar.modulTipi}: skipped (no recipients)`);
        continue;
      }

      const aracBaseWhere = {
        durum: { durumAdi: { notIn: ["⚫ YATAN", "🟡 BAKIMDA"] } },
      };

      const reportData: WeeklyReportData = {
        suresiGecmisMuayeneler: [],
        yaklasanMuayeneler: [],
        suresiGecmisSigortalar: [],
        yaklasanSigortalar: [],
      };

      if (ayar.modulTipi === "muayene") {
        if (kriterler.includes("suresi_gecmis")) {
          const items = await prisma.t_Arac_Master.findMany({
            where: { ...aracBaseWhere, muayeneGerekli: true, muayeneBitisTarihi: { lt: now } },
            include: { sirket: { select: { sirketAdi: true } }, lokasyon: { select: { lokasyonAdi: true } } },
            orderBy: { muayeneBitisTarihi: "asc" },
          });
          reportData.suresiGecmisMuayeneler = items.map((a) => ({
            plaka: a.plaka, sirket: a.sirket?.sirketAdi || "-", lokasyon: a.lokasyon?.lokasyonAdi || "-",
            bitisTarihi: a.muayeneBitisTarihi?.toISOString() || "", kalanGun: computeMuayeneKalanGun(a.muayeneBitisTarihi) || 0,
          }));
        }
        const hasYaklasan = kriterler.some((k) => k.startsWith("yaklasan_"));
        if (hasYaklasan) {
          const items = await prisma.t_Arac_Master.findMany({
            where: { ...aracBaseWhere, muayeneGerekli: true, muayeneBitisTarihi: { gte: now, lte: thresholdDate } },
            include: { sirket: { select: { sirketAdi: true } }, lokasyon: { select: { lokasyonAdi: true } } },
            orderBy: { muayeneBitisTarihi: "asc" },
          });
          reportData.yaklasanMuayeneler = items.map((a) => ({
            plaka: a.plaka, sirket: a.sirket?.sirketAdi || "-", lokasyon: a.lokasyon?.lokasyonAdi || "-",
            bitisTarihi: a.muayeneBitisTarihi?.toISOString() || "", kalanGun: computeMuayeneKalanGun(a.muayeneBitisTarihi) || 0,
          }));
        }
      }

      if (ayar.modulTipi === "sigorta") {
        if (kriterler.includes("suresi_gecmis")) {
          const items = await prisma.t_Sigorta.findMany({
            where: { arac: { ...aracBaseWhere, sigortaGerekli: true }, bitisTarihi: { lt: now } },
            include: { arac: { select: { plaka: true, sirket: { select: { sirketAdi: true } }, lokasyon: { select: { lokasyonAdi: true } } } } },
            orderBy: { bitisTarihi: "asc" },
          });
          reportData.suresiGecmisSigortalar = items.map((s) => ({
            plaka: s.arac.plaka, sigortaTuru: s.sigortaTuru, sirket: s.arac.sirket?.sirketAdi || "-",
            lokasyon: s.arac.lokasyon?.lokasyonAdi || "-", bitisTarihi: s.bitisTarihi.toISOString(),
            kalanGun: Math.ceil((s.bitisTarihi.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          }));
        }
        const hasYaklasan = kriterler.some((k) => k.startsWith("yaklasan_"));
        if (hasYaklasan) {
          const items = await prisma.t_Sigorta.findMany({
            where: { arac: { ...aracBaseWhere, sigortaGerekli: true }, bitisTarihi: { gte: now, lte: thresholdDate } },
            include: { arac: { select: { plaka: true, sirket: { select: { sirketAdi: true } }, lokasyon: { select: { lokasyonAdi: true } } } } },
            orderBy: { bitisTarihi: "asc" },
          });
          reportData.yaklasanSigortalar = items.map((s) => ({
            plaka: s.arac.plaka, sigortaTuru: s.sigortaTuru, sirket: s.arac.sirket?.sirketAdi || "-",
            lokasyon: s.arac.lokasyon?.lokasyonAdi || "-", bitisTarihi: s.bitisTarihi.toISOString(),
            kalanGun: Math.ceil((s.bitisTarihi.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          }));
        }
      }

      if (ayar.modulTipi === "yapilacaklar") {
        const yapilacakData: YapilacakReportData = {
          gecmisGorevler: [],
          yaklasanGorevler: [],
          acikGorevler: [],
        };

        const yapilacakBaseWhere = {
          durum: { in: ["acik", "devam_ediyor"] },
        };

        if (kriterler.includes("gecikmis")) {
          const items = await prisma.t_Yapilacak.findMany({
            where: { ...yapilacakBaseWhere, sonTarih: { lt: now, not: null } },
            include: { arac: { select: { plaka: true } }, atanan: { select: { name: true } } },
            orderBy: { sonTarih: "asc" },
          });
          yapilacakData.gecmisGorevler = items.map((g) => ({
            baslik: g.baslik, plaka: g.arac?.plaka || "", kategori: g.kategori || "",
            oncelik: g.oncelik, atanan: g.atanan?.name || "-",
            sonTarih: g.sonTarih?.toISOString() || "",
            kalanGun: g.sonTarih ? Math.ceil((g.sonTarih.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
          }));
        }

        const hasYaklasan = kriterler.some((k) => k.startsWith("yaklasan_"));
        if (hasYaklasan) {
          const items = await prisma.t_Yapilacak.findMany({
            where: { ...yapilacakBaseWhere, sonTarih: { gte: now, lte: thresholdDate } },
            include: { arac: { select: { plaka: true } }, atanan: { select: { name: true } } },
            orderBy: { sonTarih: "asc" },
          });
          yapilacakData.yaklasanGorevler = items.map((g) => ({
            baslik: g.baslik, plaka: g.arac?.plaka || "", kategori: g.kategori || "",
            oncelik: g.oncelik, atanan: g.atanan?.name || "-",
            sonTarih: g.sonTarih?.toISOString() || "",
            kalanGun: g.sonTarih ? Math.ceil((g.sonTarih.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
          }));
        }

        if (kriterler.includes("acik")) {
          const items = await prisma.t_Yapilacak.findMany({
            where: { ...yapilacakBaseWhere, sonTarih: null },
            include: { arac: { select: { plaka: true } }, atanan: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          });
          yapilacakData.acikGorevler = items.map((g) => ({
            baslik: g.baslik, plaka: g.arac?.plaka || "", kategori: g.kategori || "",
            oncelik: g.oncelik, atanan: g.atanan?.name || "-",
            sonTarih: "", kalanGun: 0,
          }));
        }

        const emailSent = await sendYapilacakTrackingReport(alicilar, yapilacakData);
        await prisma.t_Mail_Ayarlari.update({
          where: { modulTipi: ayar.modulTipi },
          data: { sonGonderimTarihi: new Date() },
        });
        results.push(`${ayar.modulTipi}: sent to ${alicilar.length} recipients (${emailSent ? "ok" : "failed"})`);
        continue;
      }

      const emailSent = await sendWeeklyTrackingReport(alicilar, reportData);

      // Update last sent date
      await prisma.t_Mail_Ayarlari.update({
        where: { modulTipi: ayar.modulTipi },
        data: { sonGonderimTarihi: new Date() },
      });

      results.push(`${ayar.modulTipi}: sent to ${alicilar.length} recipients (${emailSent ? "ok" : "failed"})`);
    }

    await prisma.cronLog.create({
      data: {
        jobName: "weekly_report",
        status: "success",
        message: results.join("; "),
        affectedCount: mailAyarlari.length,
      },
    });

    return NextResponse.json({ message: "Report processed", results });
  } catch (error) {
    await prisma.cronLog.create({
      data: { jobName: "weekly_report", status: "error", message: String(error) },
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Fallback: original behavior when no DB settings exist
async function handleWeeklyReportDefault() {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const aracBaseWhere = {
    durum: { durumAdi: { notIn: ["⚫ YATAN", "🟡 BAKIMDA"] } },
  };

  const [suresiGecmisMuayeneler, yaklasanMuayeneler, suresiGecmisSigortalar, yaklasanSigortalar] = await Promise.all([
    prisma.t_Arac_Master.findMany({
      where: { ...aracBaseWhere, muayeneGerekli: true, muayeneBitisTarihi: { lt: now } },
      include: { sirket: { select: { sirketAdi: true } }, lokasyon: { select: { lokasyonAdi: true } } },
      orderBy: { muayeneBitisTarihi: "asc" },
    }),
    prisma.t_Arac_Master.findMany({
      where: { ...aracBaseWhere, muayeneGerekli: true, muayeneBitisTarihi: { gte: now, lte: thirtyDaysFromNow } },
      include: { sirket: { select: { sirketAdi: true } }, lokasyon: { select: { lokasyonAdi: true } } },
      orderBy: { muayeneBitisTarihi: "asc" },
    }),
    prisma.t_Sigorta.findMany({
      where: { arac: { ...aracBaseWhere, sigortaGerekli: true }, bitisTarihi: { lt: now } },
      include: { arac: { select: { plaka: true, sirket: { select: { sirketAdi: true } }, lokasyon: { select: { lokasyonAdi: true } } } } },
      orderBy: { bitisTarihi: "asc" },
    }),
    prisma.t_Sigorta.findMany({
      where: { arac: { ...aracBaseWhere, sigortaGerekli: true }, bitisTarihi: { gte: now, lte: thirtyDaysFromNow } },
      include: { arac: { select: { plaka: true, sirket: { select: { sirketAdi: true } }, lokasyon: { select: { lokasyonAdi: true } } } } },
      orderBy: { bitisTarihi: "asc" },
    }),
  ]);

  const reportData: WeeklyReportData = {
    suresiGecmisMuayeneler: suresiGecmisMuayeneler.map((a) => ({
      plaka: a.plaka, sirket: a.sirket?.sirketAdi || "-", lokasyon: a.lokasyon?.lokasyonAdi || "-",
      bitisTarihi: a.muayeneBitisTarihi?.toISOString() || "", kalanGun: computeMuayeneKalanGun(a.muayeneBitisTarihi) || 0,
    })),
    yaklasanMuayeneler: yaklasanMuayeneler.map((a) => ({
      plaka: a.plaka, sirket: a.sirket?.sirketAdi || "-", lokasyon: a.lokasyon?.lokasyonAdi || "-",
      bitisTarihi: a.muayeneBitisTarihi?.toISOString() || "", kalanGun: computeMuayeneKalanGun(a.muayeneBitisTarihi) || 0,
    })),
    suresiGecmisSigortalar: suresiGecmisSigortalar.map((s) => ({
      plaka: s.arac.plaka, sigortaTuru: s.sigortaTuru, sirket: s.arac.sirket?.sirketAdi || "-",
      lokasyon: s.arac.lokasyon?.lokasyonAdi || "-", bitisTarihi: s.bitisTarihi.toISOString(),
      kalanGun: Math.ceil((s.bitisTarihi.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    })),
    yaklasanSigortalar: yaklasanSigortalar.map((s) => ({
      plaka: s.arac.plaka, sigortaTuru: s.sigortaTuru, sirket: s.arac.sirket?.sirketAdi || "-",
      lokasyon: s.arac.lokasyon?.lokasyonAdi || "-", bitisTarihi: s.bitisTarihi.toISOString(),
      kalanGun: Math.ceil((s.bitisTarihi.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    })),
  };

  const yoneticiler = await prisma.user.findMany({
    where: { role: { in: ["super_admin", "sirket_yoneticisi"] }, isActive: true },
    select: { email: true },
  });
  const emailTargets = yoneticiler.map((u) => u.email);
  if (process.env.ADMIN_EMAIL && !emailTargets.includes(process.env.ADMIN_EMAIL)) {
    emailTargets.push(process.env.ADMIN_EMAIL);
  }

  const emailSent = emailTargets.length > 0 ? await sendWeeklyTrackingReport(emailTargets, reportData) : false;
  const totalIssues = reportData.suresiGecmisMuayeneler.length + reportData.yaklasanMuayeneler.length +
    reportData.suresiGecmisSigortalar.length + reportData.yaklasanSigortalar.length;

  await prisma.cronLog.create({
    data: {
      jobName: "weekly_report", status: "success",
      message: `Default rapor: ${totalIssues} kayit, ${emailTargets.length} alici. Email: ${emailSent ? "basarili" : "gonderilemedi"}`,
      affectedCount: totalIssues,
    },
  });

  return NextResponse.json({ message: `Default report sent`, emailSent, recipients: emailTargets.length });
}
