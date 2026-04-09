import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause, isAdmin, type SessionUser } from "@/lib/rbac";

// Helper: validate ceza belongs to a vehicle accessible by user
async function validateCezaAccess(cezaId: number, user: SessionUser) {
  const rbacWhere = buildWhereClause(user);
  const ceza = await prisma.t_Ceza.findFirst({
    where: {
      id: cezaId,
      arac: rbacWhere,
    },
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
  return ceza;
}

// GET - Get single ceza detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  const ceza = await validateCezaAccess(parsedId, user);
  if (!ceza) return NextResponse.json({ error: "Ceza bulunamadi" }, { status: 404 });

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
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  // Only admin can update cezalar
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // RBAC: check user can access the ceza's vehicle
  const existing = await validateCezaAccess(parsedId, user);
  if (!existing) return NextResponse.json({ error: "Ceza bulunamadi" }, { status: 404 });

  try {
    const body = await request.json();

    // Validate numeric fields
    const cezaTutari = body.cezaTutari !== undefined ? parseFloat(body.cezaTutari) : undefined;
    if (cezaTutari !== undefined && (isNaN(cezaTutari) || cezaTutari < 0)) {
      return NextResponse.json({ error: "Gecersiz ceza tutari" }, { status: 400 });
    }

    const ceza = await prisma.t_Ceza.update({
      where: { id: parsedId },
      data: {
        tutanakNo: body.tutanakNo,
        cezaTarihi: body.cezaTarihi ? new Date(body.cezaTarihi) : undefined,
        tebligTarihi: body.tebligTarihi ? new Date(body.tebligTarihi) : null,
        sonOdemeTarihi: body.sonOdemeTarihi ? new Date(body.sonOdemeTarihi) : null,
        cezaTuru: body.cezaTuru,
        aciklama: body.aciklama || null,
        cezaTutari,
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

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Ceza silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  // RBAC: check user can access the ceza's vehicle
  const existing = await validateCezaAccess(parsedId, user);
  if (!existing) return NextResponse.json({ error: "Ceza bulunamadi" }, { status: 404 });

  try {
    await prisma.t_Ceza.delete({ where: { id: parsedId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Ceza silinirken hata olustu" }, { status: 500 });
  }
}
