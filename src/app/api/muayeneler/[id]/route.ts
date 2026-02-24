import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

// GET - Get single muayene detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const muayene = await prisma.t_Muayene.findUnique({
    where: { id: parseInt(id) },
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

// PUT - Update muayene
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();

    const muayene = await prisma.t_Muayene.update({
      where: { id: parseInt(id) },
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

// DELETE - Delete muayene
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "lokasyon_sefi") {
    return NextResponse.json({ error: "Muayene silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const deleted = await prisma.t_Muayene.delete({ where: { id: parseInt(id) } });

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
