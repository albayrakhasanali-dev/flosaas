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

// GET - Get single sigorta detail (RBAC: must belong to an accessible vehicle)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsedId = parseId(id);
  if (parsedId === null) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  const sigorta = await prisma.t_Sigorta.findFirst({
    where: { id: parsedId, arac: buildWhereClause(user) },
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

// PUT - Update sigorta (RBAC: must belong to an accessible vehicle)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsedId = parseId(id);
  if (parsedId === null) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  const existing = await prisma.t_Sigorta.findFirst({
    where: { id: parsedId, arac: buildWhereClause(user) },
    select: { id: true, aracId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Sigorta bulunamadi" }, { status: 404 });
  }

  try {
    const body = await request.json();

    if (body.baslangicTarihi && parseDateOrNull(body.baslangicTarihi) === null) {
      return NextResponse.json({ error: "Gecersiz baslangicTarihi" }, { status: 400 });
    }
    if (body.bitisTarihi && parseDateOrNull(body.bitisTarihi) === null) {
      return NextResponse.json({ error: "Gecersiz bitisTarihi" }, { status: 400 });
    }

    const sigorta = await prisma.t_Sigorta.update({
      where: { id: parsedId },
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

// DELETE - Delete sigorta (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Sigorta silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  const parsedId = parseId(id);
  if (parsedId === null) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  try {
    const deleted = await prisma.t_Sigorta.delete({ where: { id: parsedId } });

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
