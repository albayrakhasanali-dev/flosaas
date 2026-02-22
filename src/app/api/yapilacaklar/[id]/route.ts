import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

// GET - Get single yapilacak detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const yapilacak = await prisma.t_Yapilacak.findUnique({
    where: { id: parseInt(id) },
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

  const { id } = await params;
  try {
    const body = await request.json();

    // Auto-set tamamlanmaTarihi based on durum changes
    let tamamlanmaTarihi: Date | null | undefined = undefined;
    if (body.durum === "tamamlandi") {
      // Check current record to see if it was already tamamlandi
      const existing = await prisma.t_Yapilacak.findUnique({
        where: { id: parseInt(id) },
        select: { durum: true, tamamlanmaTarihi: true },
      });
      if (existing && existing.durum !== "tamamlandi") {
        tamamlanmaTarihi = new Date();
      }
    } else if (body.durum && body.durum !== "tamamlandi") {
      tamamlanmaTarihi = null;
    }

    const yapilacak = await prisma.t_Yapilacak.update({
      where: { id: parseInt(id) },
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

  if (user.role === "lokasyon_sefi") {
    return NextResponse.json({ error: "Gorev silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.t_Yapilacak.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gorev silinirken hata olustu" }, { status: 500 });
  }
}
