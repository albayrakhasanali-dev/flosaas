import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause } from "@/lib/rbac";

// GET - List all muayene records with filters
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const sonuc = searchParams.get("sonuc");
  const muayeneTipi = searchParams.get("muayeneTipi");
  const durum = searchParams.get("durum"); // gecerli, yaklasiyor, suresi_gecmis
  const aracId = searchParams.get("aracId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const rbacWhere = buildWhereClause(user);
  const filters: Record<string, unknown>[] = [];

  if (sonuc) filters.push({ sonuc });
  if (muayeneTipi) filters.push({ muayeneTipi });
  if (aracId) filters.push({ aracId: parseInt(aracId) });

  // Date-based status filter
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (durum === "suresi_gecmis") {
    filters.push({ gecerlilikBitisTarihi: { lt: now } });
  } else if (durum === "yaklasiyor") {
    filters.push({ gecerlilikBitisTarihi: { gte: now, lte: thirtyDaysFromNow } });
  } else if (durum === "gecerli") {
    filters.push({ gecerlilikBitisTarihi: { gt: thirtyDaysFromNow } });
  }

  if (search) {
    filters.push({
      OR: [
        { arac: { plaka: { contains: search, mode: "insensitive" } } },
        { muayeneIstasyonu: { contains: search, mode: "insensitive" } },
        { raporNo: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  // Filter: only vehicles that require muayene AND are not pasif/yatan
  const aracFilter = {
    ...rbacWhere,
    muayeneGerekli: true,
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

  const [muayeneler, total] = await Promise.all([
    prisma.t_Muayene.findMany({
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
      orderBy: { muayeneTarihi: "desc" },
    }),
    prisma.t_Muayene.count({ where }),
  ]);

  // Summary stats — also filter by muayeneGerekli + not pasif
  const allWhere = { arac: aracFilter };
  const [toplamMuayene, gecenMuayene, suresiGecmis, yaklasiyor] = await Promise.all([
    prisma.t_Muayene.count({ where: allWhere }),
    prisma.t_Muayene.count({ where: { ...allWhere, sonuc: "gecti" } }),
    prisma.t_Muayene.count({ where: { ...allWhere, gecerlilikBitisTarihi: { lt: now }, sonuc: "gecti" } }),
    prisma.t_Muayene.count({ where: { ...allWhere, gecerlilikBitisTarihi: { gte: now, lte: thirtyDaysFromNow }, sonuc: "gecti" } }),
  ]);

  return NextResponse.json({
    data: muayeneler,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      toplamMuayene,
      gecenMuayene,
      kalanMuayene: toplamMuayene - gecenMuayene,
      suresiGecmis,
      yaklasiyor,
      gecmeOrani: toplamMuayene > 0 ? Math.round((gecenMuayene / toplamMuayene) * 100) : 0,
    },
  });
}

// POST - Create a new muayene record
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.aracId || !body.muayeneTarihi || !body.gecerlilikBitisTarihi || !body.sonuc) {
      return NextResponse.json(
        { error: "aracId, muayeneTarihi, gecerlilikBitisTarihi ve sonuc zorunlu" },
        { status: 400 }
      );
    }

    const arac = await prisma.t_Arac_Master.findUnique({
      where: { id: parseInt(body.aracId) },
    });
    if (!arac) {
      return NextResponse.json({ error: "Arac bulunamadi" }, { status: 404 });
    }

    const muayene = await prisma.t_Muayene.create({
      data: {
        aracId: parseInt(body.aracId),
        muayeneTarihi: new Date(body.muayeneTarihi),
        gecerlilikBitisTarihi: new Date(body.gecerlilikBitisTarihi),
        sonuc: body.sonuc,
        muayeneIstasyonu: body.muayeneIstasyonu || null,
        muayeneIstasyonuIl: body.muayeneIstasyonuIl || null,
        raporNo: body.raporNo || null,
        muayeneTipi: body.muayeneTipi || "periyodik",
        muayeneUcreti: body.muayeneUcreti ? parseFloat(body.muayeneUcreti) : null,
        basarisizNeden: body.basarisizNeden || null,
        basarisizDetay: body.basarisizDetay || null,
        ekleyenId: parseInt(user.id),
        notlar: body.notlar || null,
      },
      include: {
        arac: { select: { plaka: true } },
      },
    });

    // Sync muayeneBitisTarihi on T_Arac_Master if passed
    if (body.sonuc === "gecti") {
      await prisma.t_Arac_Master.update({
        where: { id: parseInt(body.aracId) },
        data: { muayeneBitisTarihi: new Date(body.gecerlilikBitisTarihi) },
      });
    }

    return NextResponse.json(muayene, { status: 201 });
  } catch (error) {
    console.error("Muayene create error:", error);
    return NextResponse.json({ error: "Muayene eklenirken hata olustu" }, { status: 500 });
  }
}
