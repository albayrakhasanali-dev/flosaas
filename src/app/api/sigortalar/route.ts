import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause } from "@/lib/rbac";

// GET - List all sigorta records with filters
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const sigortaTuru = searchParams.get("sigortaTuru");
  const odemeDurumu = searchParams.get("odemeDurumu");
  const durum = searchParams.get("durum"); // gecerli, yaklasiyor, suresi_gecmis
  const aracId = searchParams.get("aracId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const rbacWhere = buildWhereClause(user);
  const filters: Record<string, unknown>[] = [];

  if (sigortaTuru) filters.push({ sigortaTuru });
  if (odemeDurumu) filters.push({ odemeDurumu });
  if (aracId) filters.push({ aracId: parseInt(aracId) });

  // Date-based status filter
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (durum === "suresi_gecmis") {
    filters.push({ bitisTarihi: { lt: now } });
  } else if (durum === "yaklasiyor") {
    filters.push({ bitisTarihi: { gte: now, lte: thirtyDaysFromNow } });
  } else if (durum === "gecerli") {
    filters.push({ bitisTarihi: { gt: thirtyDaysFromNow } });
  }

  if (search) {
    filters.push({
      OR: [
        { arac: { plaka: { contains: search, mode: "insensitive" } } },
        { policeNo: { contains: search, mode: "insensitive" } },
        { sigortaSirketi: { contains: search, mode: "insensitive" } },
        { acenteAdi: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  // Filter: only vehicles that require sigorta AND are not pasif/yatan
  const aracFilter = {
    ...rbacWhere,
    sigortaGerekli: true,
    durum: {
      ...((rbacWhere as Record<string, unknown>).durum as object || {}),
      durumAdi: { notIn: ["⚫ YATAN", "🟡 BAKIMDA"] },
    },
  };

  const where = {
    AND: [
      { arac: aracFilter },
      ...filters,
    ],
  };

  const [sigortalar, total] = await Promise.all([
    prisma.t_Sigorta.findMany({
      where,
      include: {
        arac: {
          select: {
            id: true,
            plaka: true,
            sirket: { select: { sirketAdi: true } },
            lokasyon: { select: { lokasyonAdi: true } },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { bitisTarihi: "desc" },
    }),
    prisma.t_Sigorta.count({ where }),
  ]);

  // Summary stats — also filter by sigortaGerekli + not pasif
  const allWhere = { arac: aracFilter };
  const [toplamPolice, suresiGecmis, yaklasiyor, primStats, odenmemisPrim] = await Promise.all([
    prisma.t_Sigorta.count({ where: allWhere }),
    prisma.t_Sigorta.count({ where: { ...allWhere, bitisTarihi: { lt: now } } }),
    prisma.t_Sigorta.count({ where: { ...allWhere, bitisTarihi: { gte: now, lte: thirtyDaysFromNow } } }),
    prisma.t_Sigorta.aggregate({ where: allWhere, _sum: { primTutari: true } }),
    prisma.t_Sigorta.aggregate({ where: { ...allWhere, odemeDurumu: { not: "odendi" } }, _sum: { primTutari: true } }),
  ]);

  return NextResponse.json({
    data: sigortalar,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      toplamPolice,
      suresiGecmis,
      yaklasiyor,
      toplamPrim: primStats._sum.primTutari || 0,
      odenmemisPrim: odenmemisPrim._sum.primTutari || 0,
    },
  });
}

// POST - Create a new sigorta record
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.aracId || !body.sigortaTuru || !body.baslangicTarihi || !body.bitisTarihi) {
      return NextResponse.json(
        { error: "aracId, sigortaTuru, baslangicTarihi ve bitisTarihi zorunlu" },
        { status: 400 }
      );
    }

    const arac = await prisma.t_Arac_Master.findUnique({
      where: { id: parseInt(body.aracId) },
    });
    if (!arac) {
      return NextResponse.json({ error: "Arac bulunamadi" }, { status: 404 });
    }

    const sigorta = await prisma.t_Sigorta.create({
      data: {
        aracId: parseInt(body.aracId),
        sigortaTuru: body.sigortaTuru,
        policeNo: body.policeNo || null,
        sigortaSirketi: body.sigortaSirketi || null,
        acenteAdi: body.acenteAdi || null,
        acenteTelefon: body.acenteTelefon || null,
        baslangicTarihi: new Date(body.baslangicTarihi),
        bitisTarihi: new Date(body.bitisTarihi),
        primTutari: body.primTutari ? parseFloat(body.primTutari) : null,
        odemeSekli: body.odemeSekli || null,
        taksitSayisi: body.taksitSayisi ? parseInt(body.taksitSayisi) : null,
        odemeDurumu: body.odemeDurumu || "odenmedi",
        odemeTarihi: body.odemeTarihi ? new Date(body.odemeTarihi) : null,
        teminatBilgi: body.teminatBilgi || null,
        ekleyenId: parseInt(user.id),
        notlar: body.notlar || null,
      },
      include: {
        arac: { select: { plaka: true } },
      },
    });

    // Sync dates on T_Arac_Master
    if (body.sigortaTuru === "trafik") {
      await prisma.t_Arac_Master.update({
        where: { id: parseInt(body.aracId) },
        data: { sigortaBitisTarihi: new Date(body.bitisTarihi) },
      });
    } else if (body.sigortaTuru === "kasko") {
      await prisma.t_Arac_Master.update({
        where: { id: parseInt(body.aracId) },
        data: { kaskoBitisTarihi: new Date(body.bitisTarihi) },
      });
    }

    return NextResponse.json(sigorta, { status: 201 });
  } catch (error) {
    console.error("Sigorta create error:", error);
    return NextResponse.json({ error: "Sigorta eklenirken hata olustu" }, { status: 500 });
  }
}
