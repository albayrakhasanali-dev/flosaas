import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

// GET - Get single ceza detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ceza = await prisma.t_Ceza.findUnique({
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
    },
  });

  if (!ceza) {
    return NextResponse.json({ error: "Ceza bulunamadi" }, { status: 404 });
  }

  return NextResponse.json(ceza);
}

// PUT - Update ceza
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();

    const ceza = await prisma.t_Ceza.update({
      where: { id: parseInt(id) },
      data: {
        tutanakNo: body.tutanakNo,
        cezaTarihi: body.cezaTarihi ? new Date(body.cezaTarihi) : undefined,
        tebligTarihi: body.tebligTarihi ? new Date(body.tebligTarihi) : null,
        sonOdemeTarihi: body.sonOdemeTarihi ? new Date(body.sonOdemeTarihi) : null,
        cezaTuru: body.cezaTuru,
        aciklama: body.aciklama || null,
        cezaTutari: body.cezaTutari !== undefined ? parseFloat(body.cezaTutari) : undefined,
        indirimlitutar: body.indirimlitutar ? parseFloat(body.indirimlitutar) : null,
        odemeDurumu: body.odemeDurumu,
        odemeTarihi: body.odemeTarihi ? new Date(body.odemeTarihi) : null,
        tahsilatYontemi: body.tahsilatYontemi || null,
        tahsilatNotu: body.tahsilatNotu || null,
        sorumluKisi: body.sorumluKisi || null,
        sorumluTc: body.sorumluTc || null,
        plaka: body.plaka || undefined,
        ihlalYeri: body.ihlalYeri || null,
        ihlalHizi: body.ihlalHizi ? parseInt(body.ihlalHizi) : null,
        sinirHizi: body.sinirHizi ? parseInt(body.sinirHizi) : null,
        itirazDurumu: body.itirazDurumu || null,
        itirazTarihi: body.itirazTarihi ? new Date(body.itirazTarihi) : null,
        itirazNotu: body.itirazNotu || null,
        kaynakKurum: body.kaynakKurum || null,
        notlar: body.notlar || null,
      },
      include: {
        arac: { select: { plaka: true } },
      },
    });

    return NextResponse.json(ceza);
  } catch (error) {
    console.error("Ceza update error:", error);
    return NextResponse.json({ error: "Ceza guncellenirken hata olustu" }, { status: 500 });
  }
}

// DELETE - Delete ceza
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only super_admin and sirket_yoneticisi can delete
  if (user.role === "lokasyon_sefi") {
    return NextResponse.json({ error: "Ceza silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.t_Ceza.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Ceza silinirken hata olustu" }, { status: 500 });
  }
}
