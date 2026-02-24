import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

// GET - Get single sigorta detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sigorta = await prisma.t_Sigorta.findUnique({
    where: { id: parseInt(id) },
    include: {
      arac: {
        select: {
          id: true,
          plaka: true,
          ruhsatSeriNo: true,
          sirket: { select: { sirketAdi: true } },
          lokasyon: { select: { lokasyonAdi: true } },
          markaModelTicariAdi: true,
        },
      },
    },
  });

  if (!sigorta) {
    return NextResponse.json({ error: "Sigorta bulunamadi" }, { status: 404 });
  }

  return NextResponse.json(sigorta);
}

// PUT - Update sigorta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();

    const sigorta = await prisma.t_Sigorta.update({
      where: { id: parseInt(id) },
      data: {
        sigortaTuru: body.sigortaTuru,
        policeNo: body.policeNo || null,
        sigortaSirketi: body.sigortaSirketi || null,
        acenteAdi: body.acenteAdi || null,
        acenteTelefon: body.acenteTelefon || null,
        baslangicTarihi: body.baslangicTarihi ? new Date(body.baslangicTarihi) : undefined,
        bitisTarihi: body.bitisTarihi ? new Date(body.bitisTarihi) : undefined,
        primTutari: body.primTutari ? parseFloat(body.primTutari) : null,
        odemeSekli: body.odemeSekli || null,
        taksitSayisi: body.taksitSayisi ? parseInt(body.taksitSayisi) : null,
        odemeDurumu: body.odemeDurumu,
        odemeTarihi: body.odemeTarihi ? new Date(body.odemeTarihi) : null,
        teminatBilgi: body.teminatBilgi || null,
        notlar: body.notlar || null,
      },
      include: {
        arac: { select: { plaka: true } },
      },
    });

    // Re-sync dates on T_Arac_Master
    if (body.bitisTarihi) {
      if (sigorta.sigortaTuru === "trafik") {
        const latest = await prisma.t_Sigorta.findFirst({
          where: { aracId: sigorta.aracId, sigortaTuru: "trafik" },
          orderBy: { bitisTarihi: "desc" },
        });
        if (latest) {
          await prisma.t_Arac_Master.update({
            where: { id: sigorta.aracId },
            data: { sigortaBitisTarihi: latest.bitisTarihi },
          });
        }
      } else if (sigorta.sigortaTuru === "kasko") {
        const latest = await prisma.t_Sigorta.findFirst({
          where: { aracId: sigorta.aracId, sigortaTuru: "kasko" },
          orderBy: { bitisTarihi: "desc" },
        });
        if (latest) {
          await prisma.t_Arac_Master.update({
            where: { id: sigorta.aracId },
            data: { kaskoBitisTarihi: latest.bitisTarihi },
          });
        }
      }
    }

    return NextResponse.json(sigorta);
  } catch (error) {
    console.error("Sigorta update error:", error);
    return NextResponse.json({ error: "Sigorta guncellenirken hata olustu" }, { status: 500 });
  }
}

// DELETE - Delete sigorta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "lokasyon_sefi") {
    return NextResponse.json({ error: "Sigorta silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const deleted = await prisma.t_Sigorta.delete({ where: { id: parseInt(id) } });

    // Re-sync dates
    if (deleted.sigortaTuru === "trafik") {
      const latest = await prisma.t_Sigorta.findFirst({
        where: { aracId: deleted.aracId, sigortaTuru: "trafik" },
        orderBy: { bitisTarihi: "desc" },
      });
      await prisma.t_Arac_Master.update({
        where: { id: deleted.aracId },
        data: { sigortaBitisTarihi: latest?.bitisTarihi || null },
      });
    } else if (deleted.sigortaTuru === "kasko") {
      const latest = await prisma.t_Sigorta.findFirst({
        where: { aracId: deleted.aracId, sigortaTuru: "kasko" },
        orderBy: { bitisTarihi: "desc" },
      });
      await prisma.t_Arac_Master.update({
        where: { id: deleted.aracId },
        data: { kaskoBitisTarihi: latest?.bitisTarihi || null },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sigorta silinirken hata olustu" }, { status: 500 });
  }
}
