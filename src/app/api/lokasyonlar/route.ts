import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

// DELETE - Remove lokasyon
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Lokasyon ID zorunludur" }, { status: 400 });
    }

    const lokasyonId = parseInt(id);

    // Check if any vehicles are assigned to this lokasyon
    const aracCount = await prisma.t_Arac_Master.count({
      where: { lokasyonId },
    });

    if (aracCount > 0) {
      return NextResponse.json(
        { error: `Bu lokasyonda ${aracCount} arac bulunuyor. Once araclari baska lokasyona tasiyin.` },
        { status: 409 }
      );
    }

    // Check if any users are assigned to this lokasyon
    const userCount = await prisma.user.count({
      where: { lokasyonId },
    });

    if (userCount > 0) {
      return NextResponse.json(
        { error: `Bu lokasyonda ${userCount} kullanici bulunuyor. Once kullanicilari baska lokasyona tasiyin.` },
        { status: 409 }
      );
    }

    await prisma.t_Lokasyon.delete({
      where: { id: lokasyonId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Lokasyon bulunamadi" }, { status: 404 });
    }
    return NextResponse.json({ error: "Lokasyon silinirken hata olustu" }, { status: 500 });
  }
}

// POST - Create new lokasyon
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const lokasyonAdi = body.lokasyonAdi?.trim();

    if (!lokasyonAdi) {
      return NextResponse.json({ error: "Lokasyon adi zorunludur" }, { status: 400 });
    }

    const lokasyon = await prisma.t_Lokasyon.create({
      data: {
        lokasyonAdi,
        sorumluEmail: body.sorumluEmail?.trim() || null,
      },
    });

    return NextResponse.json(lokasyon, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Bu lokasyon zaten mevcut" }, { status: 409 });
    }
    return NextResponse.json({ error: "Lokasyon olusturulurken hata olustu" }, { status: 500 });
  }
}
