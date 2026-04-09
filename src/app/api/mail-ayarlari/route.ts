import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/rbac";

const DEFAULT_KRITERLER = JSON.stringify(["suresi_gecmis", "yaklasan_30"]);
const DEFAULT_ESIK = JSON.stringify([30, 15, 7]);
const DEFAULT_ALICILAR = JSON.stringify([]);

const DEFAULT_YAPILACAK_KRITERLER = JSON.stringify(["gecikmis", "yaklasan_7"]);

async function ensureDefaults() {
  for (const modul of ["muayene", "sigorta", "yapilacaklar"]) {
    await prisma.t_Mail_Ayarlari.upsert({
      where: { modulTipi: modul },
      update: {},
      create: {
        modulTipi: modul,
        aktif: false,
        frekans: "haftalik",
        haftaninGunu: 1,
        gonderimSaati: 8,
        alicilar: DEFAULT_ALICILAR,
        kriterler: modul === "yapilacaklar" ? DEFAULT_YAPILACAK_KRITERLER : DEFAULT_KRITERLER,
        esikGunleri: DEFAULT_ESIK,
        yoneticilereGonder: true,
      },
    });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  await ensureDefaults();

  const ayarlar = await prisma.t_Mail_Ayarlari.findMany({
    orderBy: { modulTipi: "asc" },
  });

  const parsed = ayarlar.map((a) => ({
    ...a,
    alicilar: JSON.parse(a.alicilar),
    kriterler: JSON.parse(a.kriterler),
    esikGunleri: JSON.parse(a.esikGunleri),
  }));

  return NextResponse.json(parsed);
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    for (const item of items) {
      if (!item.modulTipi || !["muayene", "sigorta", "yapilacaklar"].includes(item.modulTipi)) {
        return NextResponse.json({ error: "Gecersiz modul tipi" }, { status: 400 });
      }

      const alicilar = Array.isArray(item.alicilar) ? item.alicilar : [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of alicilar) {
        if (!emailRegex.test(email)) {
          return NextResponse.json({ error: `Gecersiz email: ${email}` }, { status: 400 });
        }
      }

      await prisma.t_Mail_Ayarlari.update({
        where: { modulTipi: item.modulTipi },
        data: {
          aktif: Boolean(item.aktif),
          frekans: item.frekans || "haftalik",
          haftaninGunu: parseInt(item.haftaninGunu) || 1,
          gonderimSaati: parseInt(item.gonderimSaati) || 8,
          alicilar: JSON.stringify(alicilar),
          kriterler: JSON.stringify(item.kriterler || []),
          esikGunleri: JSON.stringify(item.esikGunleri || [30, 15, 7]),
          yoneticilereGonder: item.yoneticilereGonder !== false,
        },
      });
    }

    return NextResponse.json({ message: "Mail ayarlari guncellendi" });
  } catch (error) {
    console.error("Mail ayarlari update error:", error);
    return NextResponse.json({ error: "Guncelleme hatasi" }, { status: 500 });
  }
}
