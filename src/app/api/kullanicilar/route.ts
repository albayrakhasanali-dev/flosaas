import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

// GET - List users for assignment dropdowns
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RBAC: filter users based on role
  const where: Record<string, unknown> = { isActive: true };

  if (user.role === "sirket_yoneticisi") {
    where.sirketId = user.sirketId;
  } else if (user.role === "lokasyon_sefi") {
    where.lokasyonId = user.lokasyonId;
  }
  // super_admin sees all users

  const kullanicilar = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(kullanicilar);
}
