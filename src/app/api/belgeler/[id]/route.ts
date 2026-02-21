import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

// GET - Download a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const belge = await prisma.t_Belge.findUnique({
    where: { id: parseInt(id) },
  });

  if (!belge) {
    return NextResponse.json(
      { error: "Belge bulunamadı" },
      { status: 404 }
    );
  }

  const uint8 = new Uint8Array(belge.icerik);
  return new NextResponse(uint8, {
    headers: {
      "Content-Type": belge.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(belge.dosyaAdi)}"`,
      "Content-Length": String(belge.dosyaBoyut),
    },
  });
}

// DELETE - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only super_admin and sirket_yoneticisi can delete
  if (user.role === "lokasyon_sefi") {
    return NextResponse.json(
      { error: "Belge silme yetkiniz yok" },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    await prisma.t_Belge.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Belge silinirken hata oluştu" },
      { status: 500 }
    );
  }
}
