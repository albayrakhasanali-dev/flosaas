import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdmin, buildWhereClause } from "@/lib/rbac";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// GET - Get single yapilacak detail. RBAC: a personel may only see tasks
// that are unassigned to a vehicle (general tasks), assigned to themselves,
// or attached to a vehicle in their assigned lokasyon.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsedId = parseId(id);
  if (parsedId === null) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  const accessFilter = isAdmin(user)
    ? {}
    : {
        OR: [
          { arac: buildWhereClause(user) },
          { aracId: null },
          { atananKullaniciId: parseInt(user.id) },
          { ekleyenId: parseInt(user.id) },
        ],
      };

  const yapilacak = await prisma.t_Yapilacak.findFirst({
    where: { id: parsedId, ...accessFilter },
    include: {
      arac: {
        select: {
          id: true,
          plaka: true,
          sirket: { select: { sirketAdi: true } },
          lokasyon: { select: { lokasyonAdi: true } },
          markaModelTicariAdi: true,
        },
      },
      atanan: {
        select: { id: true, name: true, email: true },
      },
      ekleyen: {
        select: { id: true, name: true },
      },
    },
  });

  if (!yapilacak) {
    return NextResponse.json({ error: "Gorev bulunamadi" }, { status: 404 });
  }

  return NextResponse.json(yapilacak);
}

// PUT - Update yapilacak
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsedId = parseId(id);
  if (parsedId === null) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  try {
    const body = await request.json();

    // Auto-set tamamlanmaTarihi based on durum changes
    let tamamlanmaTarihi: Date | null | undefined = undefined;
    if (body.durum === "tamamlandi") {
      // Check current record to see if it was already tamamlandi
      const existing = await prisma.t_Yapilacak.findUnique({
        where: { id: parsedId },
        select: { durum: true, tamamlanmaTarihi: true },
      });
      if (existing && existing.durum !== "tamamlandi") {
        tamamlanmaTarihi = new Date();
      }
    } else if (body.durum && body.durum !== "tamamlandi") {
      tamamlanmaTarihi = null;
    }

    const yapilacak = await prisma.t_Yapilacak.update({
      where: { id: parsedId },
      data: {
        baslik: body.baslik,
        aciklama: body.aciklama !== undefined ? (body.aciklama || null) : undefined,
        durum: body.durum,
        oncelik: body.oncelik,
        aracId: body.aracId !== undefined ? (body.aracId ? parseInt(body.aracId) : null) : undefined,
        atananKullaniciId: body.atananKullaniciId !== undefined
          ? (body.atananKullaniciId ? parseInt(body.atananKullaniciId) : null)
          : undefined,
        sonTarih: body.sonTarih !== undefined ? (body.sonTarih ? new Date(body.sonTarih) : null) : undefined,
        tamamlanmaTarihi,
        kategori: body.kategori !== undefined ? (body.kategori || null) : undefined,
        notlar: body.notlar !== undefined ? (body.notlar || null) : undefined,
      },
      include: {
        arac: { select: { plaka: true } },
        atanan: { select: { id: true, name: true } },
        ekleyen: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(yapilacak);
  } catch (error) {
    console.error("Yapilacak update error:", error);
    return NextResponse.json({ error: "Gorev guncellenirken hata olustu" }, { status: 500 });
  }
}

// DELETE - Delete yapilacak
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Gorev silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  const parsedId = parseId(id);
  if (parsedId === null) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  try {
    await prisma.t_Yapilacak.delete({ where: { id: parsedId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gorev silinirken hata olustu" }, { status: 500 });
  }
}
