import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause } from "@/lib/rbac";

// GET - List all cezalar with filters
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const odemeDurumu = searchParams.get("odemeDurumu");
  const cezaTuru = searchParams.get("cezaTuru");
  const aracId = searchParams.get("aracId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  // Build RBAC-aware where clause via arac relation
  const rbacWhere = buildWhereClause(user);
  const filters: Record<string, unknown>[] = [];

  if (odemeDurumu) filters.push({ odemeDurumu });
  if (cezaTuru) filters.push({ cezaTuru });
  if (aracId) filters.push({ aracId: parseInt(aracId) });

  if (search) {
    filters.push({
      OR: [
        { plaka: { contains: search, mode: "insensitive" } },
        { tutanakNo: { contains: search, mode: "insensitive" } },
        { sorumluKisi: { contains: search, mode: "insensitive" } },
        { ihlalYeri: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const where = {
    AND: [
      { arac: rbacWhere },
      ...filters,
    ],
  };

  const [cezalar, total] = await Promise.all([
    prisma.t_Ceza.findMany({
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
      orderBy: { cezaTarihi: "desc" },
    }),
    prisma.t_Ceza.count({ where }),
  ]);

  // Summary stats
  const stats = await prisma.t_Ceza.aggregate({
    where: { arac: rbacWhere },
    _sum: { cezaTutari: true },
    _count: true,
  });

  const odenmemis = await prisma.t_Ceza.aggregate({
    where: { arac: rbacWhere, odemeDurumu: "odenmedi" },
    _sum: { cezaTutari: true },
    _count: true,
  });

  const itirazEdilen = await prisma.t_Ceza.count({
    where: { arac: rbacWhere, odemeDurumu: "itiraz_edildi" },
  });

  return NextResponse.json({
    data: cezalar,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      toplamCeza: stats._count,
      toplamTutar: stats._sum.cezaTutari || 0,
      odenmemisCeza: odenmemis._count,
      odenmemisTutar: odenmemis._sum.cezaTutari || 0,
      itirazEdilen,
    },
  });
}

// POST - Create a new ceza
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.aracId || !body.cezaTarihi || !body.cezaTuru || body.cezaTutari === undefined) {
      return NextResponse.json(
        { error: "aracId, cezaTarihi, cezaTuru ve cezaTutari zorunlu" },
        { status: 400 }
      );
    }

    // Check vehicle exists
    const arac = await prisma.t_Arac_Master.findUnique({
      where: { id: parseInt(body.aracId) },
    });
    if (!arac) {
      return NextResponse.json({ error: "Arac bulunamadi" }, { status: 404 });
    }

    const ceza = await prisma.t_Ceza.create({
      data: {
        aracId: parseInt(body.aracId),
        tutanakNo: body.tutanakNo || null,
        cezaTarihi: new Date(body.cezaTarihi),
        tebligTarihi: body.tebligTarihi ? new Date(body.tebligTarihi) : null,
        sonOdemeTarihi: body.sonOdemeTarihi ? new Date(body.sonOdemeTarihi) : null,
        cezaTuru: body.cezaTuru,
        aciklama: body.aciklama || null,
        cezaTutari: parseFloat(body.cezaTutari),
        indirimlitutar: body.indirimlitutar ? parseFloat(body.indirimlitutar) : null,
        odemeDurumu: body.odemeDurumu || "odenmedi",
        odemeTarihi: body.odemeTarihi ? new Date(body.odemeTarihi) : null,
        tahsilatYontemi: body.tahsilatYontemi || null,
        tahsilatNotu: body.tahsilatNotu || null,
        sorumluKisi: body.sorumluKisi || null,
        sorumluTc: body.sorumluTc || null,
        plaka: body.plaka || arac.plaka,
        ihlalYeri: body.ihlalYeri || null,
        ihlalHizi: body.ihlalHizi ? parseInt(body.ihlalHizi) : null,
        sinirHizi: body.sinirHizi ? parseInt(body.sinirHizi) : null,
        itirazDurumu: body.itirazDurumu || "yapilmadi",
        itirazTarihi: body.itirazTarihi ? new Date(body.itirazTarihi) : null,
        itirazNotu: body.itirazNotu || null,
        kaynakKurum: body.kaynakKurum || null,
        ekleyenId: parseInt(user.id),
        notlar: body.notlar || null,
      },
      include: {
        arac: { select: { plaka: true } },
      },
    });

    return NextResponse.json(ceza, { status: 201 });
  } catch (error) {
    console.error("Ceza create error:", error);
    return NextResponse.json({ error: "Ceza eklenirken hata olustu" }, { status: 500 });
  }
}
