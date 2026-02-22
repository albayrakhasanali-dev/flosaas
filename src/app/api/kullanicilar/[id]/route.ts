import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";

// GET - Get single user detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "lokasyon_sefi") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  const kullanici = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      sirketId: true,
      lokasyonId: true,
      sirket: { select: { sirketAdi: true } },
      lokasyon: { select: { lokasyonAdi: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!kullanici) {
    return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
  }

  // sirket_yoneticisi can only see users in their company
  if (user.role === "sirket_yoneticisi" && kullanici.sirketId !== user.sirketId) {
    return NextResponse.json({ error: "Bu kullaniciyi goruntuleme yetkiniz yok" }, { status: 403 });
  }

  return NextResponse.json(kullanici);
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "lokasyon_sefi") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  const targetId = parseInt(id);

  try {
    const body = await request.json();

    // Check user exists
    const existing = await prisma.user.findUnique({
      where: { id: targetId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
    }

    // sirket_yoneticisi can only edit users in their company
    if (user.role === "sirket_yoneticisi" && existing.sirketId !== user.sirketId) {
      return NextResponse.json({ error: "Bu kullaniciyi duzenleme yetkiniz yok" }, { status: 403 });
    }

    // sirket_yoneticisi cannot promote to super_admin
    if (user.role === "sirket_yoneticisi" && body.role === "super_admin") {
      return NextResponse.json({ error: "Super admin rolü atama yetkiniz yok" }, { status: 403 });
    }

    // Check email uniqueness if changed
    if (body.email && body.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (emailExists) {
        return NextResponse.json({ error: "Bu email adresi zaten kayitli" }, { status: 409 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.email !== undefined) updateData.email = body.email;
    if (body.name !== undefined) updateData.name = body.name || null;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.sirketId !== undefined) updateData.sirketId = body.sirketId ? parseInt(body.sirketId) : null;
    if (body.lokasyonId !== undefined) updateData.lokasyonId = body.lokasyonId ? parseInt(body.lokasyonId) : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Password: only update if provided and non-empty
    if (body.password && body.password.trim() !== "") {
      updateData.password = hashPassword(body.password);
    }

    // sirket_yoneticisi forces own company
    if (user.role === "sirket_yoneticisi") {
      updateData.sirketId = user.sirketId;
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        sirketId: true,
        lokasyonId: true,
        sirket: { select: { sirketAdi: true } },
        lokasyon: { select: { lokasyonAdi: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "Kullanici guncellenirken hata olustu" }, { status: 500 });
  }
}

// DELETE - Delete user (super_admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "super_admin") {
    return NextResponse.json({ error: "Kullanici silme yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;
  const targetId = parseInt(id);

  // Cannot delete self
  if (targetId === parseInt(user.id)) {
    return NextResponse.json({ error: "Kendinizi silemezsiniz" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: targetId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Kullanici silinirken hata olustu" }, { status: 500 });
  }
}
