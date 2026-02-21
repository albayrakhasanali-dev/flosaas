import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

// POST - Upload a document for a vehicle
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const aracId = formData.get("aracId") as string;
    const belgeTipi = formData.get("belgeTipi") as string;
    const aciklama = formData.get("aciklama") as string | null;

    if (!file || !aracId || !belgeTipi) {
      return NextResponse.json(
        { error: "file, aracId ve belgeTipi zorunlu" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Sadece PDF, JPEG, PNG ve WebP dosyaları yüklenebilir" },
        { status: 400 }
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Dosya boyutu en fazla 5MB olabilir" },
        { status: 400 }
      );
    }

    // Valid belgeTipi
    const validTypes = ["ruhsat", "sigorta", "kasko", "muayene", "diger"];
    if (!validTypes.includes(belgeTipi)) {
      return NextResponse.json(
        { error: "Geçersiz belge tipi" },
        { status: 400 }
      );
    }

    // Check vehicle exists
    const arac = await prisma.t_Arac_Master.findUnique({
      where: { id: parseInt(aracId) },
    });
    if (!arac) {
      return NextResponse.json(
        { error: "Araç bulunamadı" },
        { status: 404 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const belge = await prisma.t_Belge.create({
      data: {
        aracId: parseInt(aracId),
        belgeTipi,
        dosyaAdi: file.name,
        dosyaBoyut: file.size,
        mimeType: file.type,
        icerik: buffer,
        yukleyenId: parseInt(user.id),
        aciklama: aciklama || null,
      },
    });

    return NextResponse.json({
      id: belge.id,
      belgeTipi: belge.belgeTipi,
      dosyaAdi: belge.dosyaAdi,
      dosyaBoyut: belge.dosyaBoyut,
      mimeType: belge.mimeType,
      createdAt: belge.createdAt,
      aciklama: belge.aciklama,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Dosya yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

// GET - List documents for a vehicle
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const aracId = searchParams.get("aracId");

  if (!aracId) {
    return NextResponse.json(
      { error: "aracId parametresi zorunlu" },
      { status: 400 }
    );
  }

  const belgeler = await prisma.t_Belge.findMany({
    where: { aracId: parseInt(aracId) },
    select: {
      id: true,
      belgeTipi: true,
      dosyaAdi: true,
      dosyaBoyut: true,
      mimeType: true,
      yukleyenId: true,
      aciklama: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(belgeler);
}
