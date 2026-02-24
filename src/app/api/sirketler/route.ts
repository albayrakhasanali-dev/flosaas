import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

// POST - Create new sirket
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "lokasyon_sefi") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const sirketAdi = body.sirketAdi?.trim();

    if (!sirketAdi) {
      return NextResponse.json({ error: "Sirket adi zorunludur" }, { status: 400 });
    }

    const sirket = await prisma.t_Sirket.create({
      data: { sirketAdi },
    });

    return NextResponse.json(sirket, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Bu sirket zaten mevcut" }, { status: 409 });
    }
    return NextResponse.json({ error: "Sirket olusturulurken hata olustu" }, { status: 500 });
  }
}
