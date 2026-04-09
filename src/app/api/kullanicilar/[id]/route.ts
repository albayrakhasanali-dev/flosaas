import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";

// GET - Get single user detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(user)) {
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
      sirket: { select: { sirketAdi: true } },
      lokasyonlar: {
        select: { lokasyon: { select: { id: true, lokasyonAdi: true } } },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!kullanici) {
    return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
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

  if (!isAdmin(user)) {
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

    // Check email uniqueness if changed
    if (body.email && body.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (emailExists) {
        return NextResponse.json({ error: "Bu email adresi zaten kayitli" }, { status: 409 });
      }
    }

    // Validate role if provided
    if (body.role !== undefined) {
      const validRoles = ["admin", "personel"];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ error: "Gecersiz rol" }, { status: 400 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.email !== undefined) updateData.email = body.email;
    if (body.name !== undefined) updateData.name = body.name || null;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.sirketId !== undefined) updateData.sirketId = body.sirketId ? parseInt(body.sirketId) : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Password: only update if provided and non-empty
    if (body.password && body.password.trim() !== "") {
      updateData.password = hashPassword(body.password);
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
        sirket: { select: { sirketAdi: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Handle lokasyonIds: sync UserLokasyon join table
    if (body.lokasyonIds !== undefined && Array.isArray(body.lokasyonIds)) {
      // Delete all existing UserLokasyon for this user
      await prisma.userLokasyon.deleteMany({
        where: { userId: targetId },
      });
      // Create new ones
      if (body.lokasyonIds.length > 0) {
        await prisma.userLokasyon.createMany({
          data: body.lokasyonIds.map((lokId: number) => ({
            userId: targetId,
            lokasyonId: typeof lokId === "string" ? parseInt(lokId) : lokId,
          })),
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "Kullanici guncellenirken hata olustu" }, { status: 500 });
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(user)) {
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
