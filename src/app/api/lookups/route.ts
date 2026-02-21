import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [sirketler, lokasyonlar, durumlar, kullanimSekilleriRaw] = await Promise.all([
    prisma.t_Sirket.findMany({ orderBy: { sirketAdi: "asc" } }),
    prisma.t_Lokasyon.findMany({ orderBy: { lokasyonAdi: "asc" } }),
    prisma.t_Durum.findMany(),
    prisma.t_Arac_Master.findMany({
      where: { kullanimSekli: { not: null } },
      select: { kullanimSekli: true },
      distinct: ["kullanimSekli"],
      orderBy: { kullanimSekli: "asc" },
    }),
  ]);

  const kullanimSekilleri = kullanimSekilleriRaw
    .map((k) => k.kullanimSekli)
    .filter(Boolean) as string[];

  return NextResponse.json({ sirketler, lokasyonlar, durumlar, kullanimSekilleri });
}
