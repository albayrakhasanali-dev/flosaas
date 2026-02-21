import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause, canCreate } from "@/lib/rbac";
import { enrichAracWithComputed } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  // Advanced filters
  const lokasyonId = searchParams.get("lokasyonId");
  const sirketId = searchParams.get("sirketId");
  const durumId = searchParams.get("durumId");
  const kullanimSekli = searchParams.get("kullanimSekli");
  const mulkiyetTipi = searchParams.get("mulkiyetTipi");
  const uttsDurumFilter = searchParams.get("uttsDurum");

  const rbacWhere = buildWhereClause(user);
  let filterWhere: Record<string, unknown> = {};

  switch (filter) {
    case "aktif":
      filterWhere = { durum: { durumAdi: "🟢 AKTİF" } };
      break;
    case "pasif":
      filterWhere = { durum: { durumAdi: { in: ["⚫ YATAN", "🟡 BAKIMDA"] } } };
      break;
    case "hukuki":
      filterWhere = { durum: { durumAdi: "🔴 HUKUKİ" } };
      break;
    case "utts_eksik":
      filterWhere = { uttsDurum: "Eksik" };
      break;
  }

  // Build advanced filter conditions
  const advancedFilters: Record<string, unknown>[] = [];
  if (lokasyonId) advancedFilters.push({ lokasyonId: parseInt(lokasyonId) });
  if (sirketId) advancedFilters.push({ sirketId: parseInt(sirketId) });
  if (durumId) advancedFilters.push({ durumId: parseInt(durumId) });
  if (kullanimSekli) advancedFilters.push({ kullanimSekli });
  if (mulkiyetTipi) advancedFilters.push({ mulkiyetTipi });
  if (uttsDurumFilter) advancedFilters.push({ uttsDurum: uttsDurumFilter });

  let searchWhere: Record<string, unknown> = {};
  if (search) {
    searchWhere = {
      OR: [
        { plaka: { contains: search } },
        { markaModelTicariAdi: { contains: search } },
        { aracKimligi: { contains: search } },
      ],
    };
  }

  const where = { AND: [rbacWhere, filterWhere, searchWhere, ...advancedFilters] };

  const [araclar, total] = await Promise.all([
    prisma.t_Arac_Master.findMany({
      where,
      include: { durum: true, sirket: true, lokasyon: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { plaka: "asc" },
    }),
    prisma.t_Arac_Master.count({ where }),
  ]);

  const enriched = araclar.map((a) => enrichAracWithComputed(a));

  return NextResponse.json({
    data: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreate(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const arac = await prisma.t_Arac_Master.create({
    data: {
      plaka: body.plaka,
      durumId: body.durumId,
      sirketId: user.role === "sirket_yoneticisi" ? user.sirketId : body.sirketId,
      lokasyonId: body.lokasyonId,
      mulkiyetTipi: body.mulkiyetTipi,
      markaModelTicariAdi: body.markaModelTicariAdi,
      kullanimSekli: body.kullanimSekli,
      modelYili: body.modelYili,
      sasiNo: body.sasiNo,
      motorNo: body.motorNo,
      guncelKmSaat: body.guncelKmSaat,
      zimmetMasrafMerkezi: body.zimmetMasrafMerkezi,
      uttsDurum: body.uttsDurum,
      seyirTakipCihazNo: body.seyirTakipCihazNo,
      hgsEtiketNo: body.hgsEtiketNo,
      tescilTarihi: body.tescilTarihi ? new Date(body.tescilTarihi) : null,
      muayeneBitisTarihi: body.muayeneBitisTarihi ? new Date(body.muayeneBitisTarihi) : null,
      sigortaBitisTarihi: body.sigortaBitisTarihi ? new Date(body.sigortaBitisTarihi) : null,
      kaskoBitisTarihi: body.kaskoBitisTarihi ? new Date(body.kaskoBitisTarihi) : null,
    },
    include: { durum: true, sirket: true, lokasyon: true },
  });

  return NextResponse.json(enrichAracWithComputed(arac), { status: 201 });
}
