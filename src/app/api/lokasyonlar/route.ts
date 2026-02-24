import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

// POST - Create new lokasyon
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "lokasyon_sefi") {
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
