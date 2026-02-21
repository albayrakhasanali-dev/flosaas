import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { computeMuayeneKalanGun, computeSigortaKalanGun } from "@/lib/utils";
import { sendExpiredVehicleAlert } from "@/lib/email";

// Cron secret for security
const CRON_SECRET = process.env.CRON_SECRET || "flosaas-cron-secret";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find active vehicles with expired muayene or sigorta
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
