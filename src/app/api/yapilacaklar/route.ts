import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause } from "@/lib/rbac";

// GET - List all yapilacaklar with filters
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const durum = searchParams.get("durum");
  const oncelik = searchParams.get("oncelik");
  const kategori = searchParams.get("kategori");
  const atananId = searchParams.get("atananId");
  const aracId = searchParams.get("aracId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const rbacWhere = buildWhereClause(user);
  const filters: Record<string, unknown>[] = [];

  if (durum) filters.push({ durum });
  if (oncelik) filters.push({ oncelik });
  if (kategori) filters.push({ kategori });
  if (atananId) filters.push({ atananKullaniciId: parseInt(atananId) });
  if (aracId) filters.push({ aracId: parseInt(aracId) });

  if (search) {
    filters.push({
      OR: [
        { baslik: { contains: search, mode: "insensitive" } },
        { aciklama: { contains: search, mode: "insensitive" } },
        { arac: { plaka: { contains: search, mode: "insensitive" } } },
        { atanan: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  // RBAC: filter by arac relation OR gorevler without arac (general tasks)
  const where = {
    AND: [
      {
        OR: [
          { arac: rbacWhere },
          { aracId: null },
        ],
      },
      ...filters,
    ],
  };

  const [data, total] = await Promise.all([
    prisma.t_Yapilacak.findMany({
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
        atanan: {
          select: { id: true, name: true, email: true },
        },
        ekleyen: {
          select: { id: true, name: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ oncelik: "desc" }, { createdAt: "desc" }],
    }),
    prisma.t_Yapilacak.count({ where }),
  ]);

  // Summary stats
  const baseWhere = {
    OR: [
      { arac: rbacWhere },
      { aracId: null },
    ],
  };

  const [toplamGorev, acikGorev, devamEdenGorev, tamamlananGorev, gecikmisSayisi] =
    await Promise.all([
      prisma.t_Yapilacak.count({ where: baseWhere }),
      prisma.t_Yapilacak.count({ where: { ...baseWhere, durum: "acik" } }),
      prisma.t_Yapilacak.count({ where: { ...baseWhere, durum: "devam_ediyor" } }),
      prisma.t_Yapilacak.count({ where: { ...baseWhere, durum: "tamamlandi" } }),
      prisma.t_Yapilacak.count({
        where: {
          ...baseWhere,
          durum: { notIn: ["tamamlandi", "iptal"] },
          sonTarih: { lt: new Date() },
        },
      }),
    ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      toplamGorev,
      acikGorev,
      devamEdenGorev,
      tamamlananGorev,
      gecikmisSayisi,
    },
  });
}

// POST - Create a new yapilacak
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.baslik) {
      return NextResponse.json(
        { error: "Baslik zorunlu" },
        { status: 400 }
      );
    }

    // Check vehicle exists if provided
    if (body.aracId) {
      const arac = await prisma.t_Arac_Master.findUnique({
        where: { id: parseInt(body.aracId) },
      });
      if (!arac) {
        return NextResponse.json({ error: "Arac bulunamadi" }, { status: 404 });
      }
    }

    const yapilacak = await prisma.t_Yapilacak.create({
      data: {
        baslik: body.baslik,
        aciklama: body.aciklama || null,
        durum: body.durum || "acik",
        oncelik: body.oncelik || "normal",
        aracId: body.aracId ? parseInt(body.aracId) : null,
        atananKullaniciId: body.atananKullaniciId ? parseInt(body.atananKullaniciId) : null,
        sonTarih: body.sonTarih ? new Date(body.sonTarih) : null,
        kategori: body.kategori || null,
        ekleyenId: parseInt(user.id),
        notlar: body.notlar || null,
      },
      include: {
        arac: { select: { plaka: true } },
        atanan: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(yapilacak, { status: 201 });
  } catch (error) {
    console.error("Yapilacak create error:", error);
    return NextResponse.json({ error: "Gorev eklenirken hata olustu" }, { status: 500 });
  }
}
