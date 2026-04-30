import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdmin, buildWhereClause } from "@/lib/rbac";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

// GET - Get single muayene detail (RBAC: must belong to an accessible vehicle)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsedId = parseId(id);
  if (parsedId === null) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  const muayene = await prisma.t_Muayene.findFirst({
    where: { id: parsedId, arac: buildWhereClause(user) },
    include: {
      arac: {
        select: {
          id: true,
          plaka: true,
          ruhsatSeriNo: true,
          k1YetkiBelgesi: true,
          sirket: { select: { sirketAdi: true } },
          lokasyon: { select: { lokasyonAdi: true } },
          markaModelTicariAdi: true,
        },
      },
    },
  });

  if (!muayene) {
    return NextResponse.json({ error: "Muayene bulunamadi" }, { status: 404 });
  }

  return NextResponse.json(muayene);
}

// PUT - Update muayene (RBAC: must belong to an accessible vehicle)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsedId = parseId(id);
  if (parsedId === null) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  // Verify access via the related vehicle BEFORE updating.
  const existing = await prisma.t_Muayene.findFirst({
    where: { id: parsedId, arac: buildWhereClause(user) },
    select: { id: true, aracId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Muayene bulunamadi" }, { status: 404 });
  }

  try {
    const body = await request.json();

    if (body.muayeneTarihi && parseDateOrNull(body.muayeneTarihi) === null) {
      return NextResponse.json({ error: "Gecersiz muayeneTarihi" }, { status: 400 });
    }
    if (body.gecerlilikBitisTarihi && parseDateOrNull(body.gecerlilikBitisTarihi) === null) {
      return NextResponse.json({ error: "Gecersiz gecerlilikBitisTarihi" }, { status: 400 });
    }

    const muayene = await prisma.t_Muayene.update({
      where: { id: parsedId },
      data: {
        muayeneTarihi: body.muayeneTarihi ? new Date(body.muayeneTarihi) : undefined,
        gecerlilikBitisTarihi: body.gecerlilikBitisTarihi ? new Date(body.gecerlilikBitisTarihi) : undefined,
        sonuc: body.sonuc,
        muayeneIstasyonu: body.muayeneIstasyonu || null,
        muayeneIstasyonuIl: body.muayeneIstasyonuIl || null,
        raporNo: body.raporNo || null,
        muayeneTipi: body.muayeneTipi || "periyodik",
        muayeneUcreti: body.muayeneUcreti ? parseFloat(body.muayeneUcreti) : null,
        basarisizNeden: body.basarisizNeden || null,
        basarisizDetay: body.basarisizDetay || null,
        notlar: body.notlar || null,
      },
      include: {
        arac: { select: { plaka: true } },
      },
    });

    // Re-sync muayeneBitisTarihi with latest passing inspection
    if (body.sonuc === "gecti" && body.gecerlilikBitisTarihi) {
      const latest = await prisma.t_Muayene.findFirst({
        where: { aracId: muayene.aracId, sonuc: "gecti" },
        orderBy: { gecerlilikBitisTarihi: "desc" },
      });
      if (latest) {
        await prisma.t_Arac_Master.update({
          where: { id: muayene.aracId },
          data: { muayeneBitisTarihi: latest.gecerlilikBitisTarihi },
        });
      }
    }

    return NextResponse.json(muayene);
  } catch (error) {
    console.error("Muayene update error:", error);
    return NextResponse.json({ error: "Muayene guncellenirken hata olustu" }, { status: 500 });
  }
}

// DELETE - Delete muayene (admin only, RBAC enforced)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Muayene silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  const parsedId = parseId(id);
  if (parsedId === null) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  try {
    const deleted = await prisma.t_Muayene.delete({ where: { id: parsedId } });

    // Re-sync muayeneBitisTarihi
    const latest = await prisma.t_Muayene.findFirst({
      where: { aracId: deleted.aracId, sonuc: "gecti" },
      orderBy: { gecerlilikBitisTarihi: "desc" },
    });
    await prisma.t_Arac_Master.update({
      where: { id: deleted.aracId },
      data: { muayeneBitisTarihi: latest?.gecerlilikBitisTarihi || null },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Muayene silinirken hata olustu" }, { status: 500 });
  }
}
