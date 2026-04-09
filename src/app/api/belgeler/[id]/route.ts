import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, buildWhereClause, isAdmin, type SessionUser } from "@/lib/rbac";

// Helper: validate belge belongs to an accessible vehicle
async function validateBelgeAccess(belgeId: number, user: SessionUser) {
  const rbacWhere = buildWhereClause(user);
  const belge = await prisma.t_Belge.findFirst({
    where: {
      id: belgeId,
      arac: rbacWhere,
    },
  });
  return belge;
}

// GET - Download a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  // RBAC check via vehicle ownership
  const belgeAccess = await validateBelgeAccess(parsedId, user);
  if (!belgeAccess) return NextResponse.json({ error: "Belge bulunamadi" }, { status: 404 });

  // Fetch full belge with content
  const belge = await prisma.t_Belge.findUnique({
    where: { id: parsedId },
  });
  if (!belge) return NextResponse.json({ error: "Belge bulunamadi" }, { status: 404 });

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Belge silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  const parsedId = parseInt(id);
  if (isNaN(parsedId)) return NextResponse.json({ error: "Gecersiz ID" }, { status: 400 });

  // RBAC check via vehicle ownership
  const belge = await validateBelgeAccess(parsedId, user);
  if (!belge) return NextResponse.json({ error: "Belge bulunamadi" }, { status: 404 });

  try {
    await prisma.t_Belge.delete({ where: { id: parsedId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Belge silinirken hata olustu" }, { status: 500 });
  }
}
