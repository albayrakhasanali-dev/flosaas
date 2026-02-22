import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause, canDelete, getEditableFields } from "@/lib/rbac";
import { enrichAracWithComputed } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rbacWhere = buildWhereClause(user);

  const arac = await prisma.t_Arac_Master.findFirst({
    where: { id: parseInt(id), ...rbacWhere },
    include: { durum: true, sirket: true, lokasyon: true },
  });

  if (!arac) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(enrichAracWithComputed(arac));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rbacWhere = buildWhereClause(user);

  const existing = await prisma.t_Arac_Master.findFirst({
    where: { id: parseInt(id), ...rbacWhere },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const editableFields = getEditableFields(user);

  let updateData: Record<string, unknown> = {};

  if (editableFields === null) {
    // Full access
    updateData = {
      durumId: body.durumId,
      sirketId: body.sirketId,
      lokasyonId: body.lokasyonId,
      mulkiyetTipi: body.mulkiyetTipi,
      markaModelTicariAdi: body.markaModelTicariAdi,
      kullanimSekli: body.kullanimSekli,
      modelYili: body.modelYili,
      sasiNo: body.sasiNo,
      motorNo: body.motorNo,
      guncelKmSaat: body.guncelKmSaat,
      zimmetMasrafMerkezi: body.zimmetMasrafMerkezi,
      uttsDurum: body.uttsDurum,
      seyirTakipCihazNo: body.seyirTakipCihazNo,
      hgsEtiketNo: body.hgsEtiketNo,
      tescilTarihi: body.tescilTarihi ? new Date(body.tescilTarihi) : undefined,
      muayeneGerekli: body.muayeneGerekli !== undefined ? body.muayeneGerekli : undefined,
      sigortaGerekli: body.sigortaGerekli !== undefined ? body.sigortaGerekli : undefined,
      // muayeneBitisTarihi, sigortaBitisTarihi, kaskoBitisTarihi
      // are managed by Takip Modulleri (Muayene/Sigorta APIs) — not editable here
    };
    // Remove undefined values
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);
  } else {
    // Limited access
    for (const field of editableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }
  }

  const updated = await prisma.t_Arac_Master.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: { durum: true, sirket: true, lokasyon: true },
  });

  return NextResponse.json(enrichAracWithComputed(updated));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canDelete(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.t_Arac_Master.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
