import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause } from "@/lib/rbac";
import { enrichAracWithComputed } from "@/lib/utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rbacWhere = buildWhereClause(user);

  // KPI counts
  const [toplam, aktif, yatan, uttsEksik, allAraclar] = await Promise.all([
    prisma.t_Arac_Master.count({ where: rbacWhere }),
    prisma.t_Arac_Master.count({
      where: { ...rbacWhere, durum: { durumAdi: "🟢 AKTİF" } },
    }),
    prisma.t_Arac_Master.count({
      where: { ...rbacWhere, durum: { durumAdi: "⚫ YATAN" } },
    }),
    prisma.t_Arac_Master.count({
      where: { ...rbacWhere, uttsDurum: "Eksik" },
    }),
    prisma.t_Arac_Master.findMany({
      where: rbacWhere,
      include: { durum: true, sirket: true, lokasyon: true },
    }),
  ]);

  // Pivot table: Sirket x Durum counts
  const sirketler = await prisma.t_Sirket.findMany({ orderBy: { sirketAdi: "asc" } });
  const durumlar = await prisma.t_Durum.findMany();

  const pivotData: Record<string, Record<string, number>> = {};
  for (const s of sirketler) {
    pivotData[s.sirketAdi] = {};
    for (const d of durumlar) {
      pivotData[s.sirketAdi][d.durumAdi] = 0;
    }
  }

  for (const a of allAraclar) {
    const sirketAdi = a.sirket?.sirketAdi;
    const durumAdi = a.durum?.durumAdi;
    if (sirketAdi && durumAdi && pivotData[sirketAdi]) {
      pivotData[sirketAdi][durumAdi] = (pivotData[sirketAdi][durumAdi] || 0) + 1;
    }
  }

  // Alarm table
  const enriched = allAraclar.map((a) => enrichAracWithComputed(a));
  const alarmAraclar = enriched.filter(
    (a) =>
      a.muayeneAlarm === "🔴 SÜRESİ GEÇTİ" ||
      a.muayeneAlarm === "🟡 YAKLAŞIYOR" ||
      a.sigortaAlarm === "🔴 SÜRESİ GEÇTİ" ||
      a.sigortaAlarm === "🟡 YAKLAŞIYOR"
  );

  return NextResponse.json({
    kpiCards: {
      toplamArac: toplam,
      aktifArac: aktif,
      yatanArac: yatan,
      uttsEksik,
    },
    pivotTable: {
      sirketler: sirketler.map((s) => s.sirketAdi),
      durumlar: durumlar.map((d) => d.durumAdi),
      data: pivotData,
    },
    alarmTable: alarmAraclar.map((a) => ({
      id: a.id,
      plaka: a.plaka,
      lokasyon: a.lokasyon?.lokasyonAdi || "-",
      muayeneAlarm: a.muayeneAlarm,
      sigortaAlarm: a.sigortaAlarm,
      muayeneKalanGun: a.muayeneKalanGun,
      sigortaKalanGun: a.sigortaKalanGun,
    })),
  });
}
