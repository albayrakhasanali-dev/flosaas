import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause, isAdmin } from "@/lib/rbac";
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

  // Only admin can edit vehicles
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const updateData: Record<string, unknown> = {
    durumId: body.durumId,
    sirketId: body.sirketId,
    lokasyonId: body.lokasyonId,
    mulkiyetTipi: body.mulkiyetTipi,
    markaModelTicariAdi: body.markaModelTicariAdi,
    kullanimSekli: body.kullanimSekli,
    modelYili: body.modelYili,
    ruhsatSeriNo: body.ruhsatSeriNo,
    sasiNo: body.sasiNo,
    motorNo: body.motorNo,
    guncelKmSaat: body.guncelKmSaat,
    zimmetMasrafMerkezi: body.zimmetMasrafMerkezi,
    uttsDurum: body.uttsDurum,
    seyirTakipCihazNo: body.seyirTakipCihazNo,
    hgsEtiketNo: body.hgsEtiketNo,
    otomatikVar: body.otomatikVar !== undefined ? body.otomatikVar : undefined,
    otomatikFirma: body.otomatikFirma,
    otomatikKod: body.otomatikKod,
    etiketSinifi: body.etiketSinifi !== undefined ? body.etiketSinifi : undefined,
    hgsKimeAit: body.hgsKimeAit,
    takograf: body.takograf,
    taahhutname: body.taahhutname,
    kabisVar: body.kabisVar !== undefined ? body.kabisVar : undefined,
    kabisSirket: body.kabisSirket,
    tescilTarihi: body.tescilTarihi ? new Date(body.tescilTarihi) : undefined,
    k1YetkiBelgesi: body.k1YetkiBelgesi !== undefined ? body.k1YetkiBelgesi : undefined,
    muayeneGerekli: body.muayeneGerekli !== undefined ? body.muayeneGerekli : undefined,
    sigortaGerekli: body.sigortaGerekli !== undefined ? body.sigortaGerekli : undefined,
    // muayeneBitisTarihi, sigortaBitisTarihi, kaskoBitisTarihi
    // are managed by Takip Modulleri (Muayene/Sigorta APIs) — not editable here
  };
  // Remove undefined values
  Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

  const updated = await prisma.t_Arac_Master.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: { durum: true, sirket: true, lokasyon: true },
  });

  return NextResponse.json(enrichAracWithComputed(updated));
}

// PATCH: Araç Satış / Satış Geri Alma İşlemi
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admin can sell/unsell vehicles
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const rbacWhere = buildWhereClause(user);
  const existing = await prisma.t_Arac_Master.findFirst({
    where: { id: parseInt(id), ...rbacWhere },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Geri Al (undo sell) — revert to AKTİF, clear sale data
  if (body.action === "geri_al") {
    const aktifDurum = await prisma.t_Durum.findUnique({
      where: { durumAdi: "🟢 AKTİF" },
    });
    if (!aktifDurum) {
      return NextResponse.json({ error: "AKTİF durumu bulunamadi" }, { status: 500 });
    }

    const updated = await prisma.t_Arac_Master.update({
      where: { id: parseInt(id) },
      data: {
        durumId: aktifDurum.id,
        satisTarihi: null,
        satisNotu: null,
      },
      include: { durum: true, sirket: true, lokasyon: true },
    });
    return NextResponse.json(enrichAracWithComputed(updated));
  }

  // Satış işlemi — mark as SATILDI
  const satildiDurum = await prisma.t_Durum.findUnique({
    where: { durumAdi: "🟣 SATILDI" },
  });
  if (!satildiDurum) {
    return NextResponse.json({ error: "SATILDI durumu bulunamadi" }, { status: 500 });
  }

  const updated = await prisma.t_Arac_Master.update({
    where: { id: parseInt(id) },
    data: {
      durumId: satildiDurum.id,
      satisTarihi: body.satisTarihi ? new Date(body.satisTarihi) : new Date(),
      satisNotu: body.satisNotu || null,
    },
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
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.t_Arac_Master.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
