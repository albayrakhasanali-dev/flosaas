import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { createHash } from "crypto";
import * as path from "path";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

const prisma = new PrismaClient();

const EXCEL_PATH = path.resolve(
  __dirname,
  "../../Harman_Grup_Filo_Kokpit_Operasyonel_Finansal_26Ocak2026.xlsx"
);

async function main() {
  console.log("🚀 Seeding database...");

  // 1. Seed T_Durum
  const durumlar = ["🟢 AKTİF", "⚫ YATAN", "🔴 HUKUKİ", "🟡 BAKIMDA"];
  for (const d of durumlar) {
    await prisma.t_Durum.upsert({
      where: { durumAdi: d },
      update: {},
      create: { durumAdi: d },
    });
  }
  console.log("✅ T_Durum seeded");

  // 2. Read Excel
  const workbook = XLSX.readFile(EXCEL_PATH);
  const masterSheet = workbook.Sheets["MASTER"];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(masterSheet, { defval: null });
  console.log(`📊 Found ${rows.length} rows in MASTER sheet`);

  // 3. Extract unique companies and locations
  const sirketSet = new Set<string>();
  const lokasyonSet = new Set<string>();

  for (const row of rows) {
    const sirket = row["RUHSAT SAHİBİ"] as string;
    const lokasyon = row["LOKASYON"] as string;
    if (sirket) sirketSet.add(sirket.trim());
    if (lokasyon) lokasyonSet.add(lokasyon.trim());
  }

  // 4. Seed T_Sirket
  for (const s of sirketSet) {
    await prisma.t_Sirket.upsert({
      where: { sirketAdi: s },
      update: {},
      create: { sirketAdi: s },
    });
  }
  console.log(`✅ T_Sirket seeded (${sirketSet.size} companies)`);

  // 5. Seed T_Lokasyon
  for (const l of lokasyonSet) {
    await prisma.t_Lokasyon.upsert({
      where: { lokasyonAdi: l },
      update: {},
      create: { lokasyonAdi: l },
    });
  }
  console.log(`✅ T_Lokasyon seeded (${lokasyonSet.size} locations)`);

  // 6. Load lookup maps
  const allDurum = await prisma.t_Durum.findMany();
  const durumMap = new Map(allDurum.map((d) => [d.durumAdi, d.id]));

  const allSirket = await prisma.t_Sirket.findMany();
  const sirketMap = new Map(allSirket.map((s) => [s.sirketAdi, s.id]));

  const allLokasyon = await prisma.t_Lokasyon.findMany();
  const lokasyonMap = new Map(allLokasyon.map((l) => [l.lokasyonAdi, l.id]));

  // 7. Seed T_Arac_Master
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const plaka = (row["PLAKA"] as string)?.trim();
    if (!plaka) {
      skipped++;
      continue;
    }

    const durumStr = (row["DURUM"] as string)?.trim();
    const sirketStr = (row["RUHSAT SAHİBİ"] as string)?.trim();
    const lokasyonStr = (row["LOKASYON"] as string)?.trim();

    const parseDate = (val: unknown): Date | null => {
      if (!val) return null;
      // Handle Excel serial numbers
      if (typeof val === "number") {
        const epoch = new Date(1899, 11, 30);
        const d = new Date(epoch.getTime() + val * 86400000);
        if (d.getFullYear() < 1990 || d.getFullYear() > 2099) return null;
        return d;
      }
      if (val instanceof Date) {
        if (val.getFullYear() < 1990 || val.getFullYear() > 2099) return null;
        return val;
      }
      const str = String(val);
      const d = new Date(str);
      if (isNaN(d.getTime())) return null;
      if (d.getFullYear() < 1990 || d.getFullYear() > 2099) return null;
      return d;
    };

    const parseNum = (val: unknown): number | null => {
      if (val === null || val === undefined || val === "") return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const parseStr = (val: unknown): string | null => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s === "" ? null : s;
    };

    try {
      await prisma.t_Arac_Master.upsert({
        where: { plaka },
        update: {},
        create: {
          plaka,
          durumId: durumStr ? durumMap.get(durumStr) ?? null : null,
          sirketId: sirketStr ? sirketMap.get(sirketStr) ?? null : null,
          lokasyonId: lokasyonStr ? lokasyonMap.get(lokasyonStr) ?? null : null,
          mulkiyetTipi: parseStr(row["MÜLKİYET"]),
          markaModelTicariAdi: parseStr(row["MARKA MODEL TİCARİ ADI"]),
          kullanimSekli: parseStr(row["KULLANIM ŞEKLİ"]),
          modelYili: parseNum(row["MODEL"]) as number | null,
          kapasite: parseStr(row["KAPASİTESİ"]),
          aracMarka: parseStr(row["ARAÇ MARKA"]),
          kasaMarka: parseStr(row["KASA MARKA"]),
          sasiNo: parseStr(row["ŞASİ NO"]),
          motorNo: parseStr(row["MOTOR NO"]),
          guncelKmSaat: parseNum(row["KM/SAAT"]),
          zimmetMasrafMerkezi: parseStr(row["MASRAF MERKEZİ"]),
          uttsDurum: parseStr(row["UTTS DURUM"]),
          seyirTakipCihazNo: parseStr(row["SEYİR TAKİP CİHAZ NO"]),
          hgsEtiketNo: parseStr(row["HGS/OGS ETİKET NO"]),
          hgsSinif: parseNum(row["HGS SINIF"]) as number | null,
          tescilTarihi: parseDate(row["TESCİL TARİHİ"]),
          muayeneBitisTarihi: parseDate(row["MUAYENE BİTİŞ"]),
          sigortaBitisTarihi: parseDate(row["SİGORTA BİTİŞ"]),
          kaskoBitisTarihi: parseDate(row["KASKO BİTİŞ"]),
          aracKimligi: parseStr(row["ARAÇ KİMLİĞİ"]),
          ruhsatSeriNo: parseStr(row["RUSAT S.NO"]),
          aciklamaNot: parseStr(row["AÇIKLAMA / NOT"]),
          tekerSayisi: parseNum(row["TEKER SAYISI"]) as number | null,
          aracKategorisi: parseStr(row["ARAÇ KATAGORİSİ ( SINIF )"]),
        },
      });
      imported++;
    } catch (err) {
      console.error(`❌ Error importing ${plaka}:`, err);
      skipped++;
    }
  }

  console.log(`✅ T_Arac_Master seeded: ${imported} imported, ${skipped} skipped`);

  // 8. Create default users
  const hash = hashPassword("Admin123!");

  await prisma.user.upsert({
    where: { email: "admin@harmangroup.com" },
    update: {},
    create: {
      email: "admin@harmangroup.com",
      password: hash,
      name: "Süper Admin",
      role: "super_admin",
    },
  });

  const sirket3s = await prisma.t_Sirket.findUnique({ where: { sirketAdi: "3S ÇEVRE" } });
  if (sirket3s) {
    await prisma.user.upsert({
      where: { email: "yonetici@3scevre.com" },
      update: {},
      create: {
        email: "yonetici@3scevre.com",
        password: hash,
        name: "3S Çevre Yöneticisi",
        role: "sirket_yoneticisi",
        sirketId: sirket3s.id,
      },
    });
  }

  const lokasyonEsenyurt = await prisma.t_Lokasyon.findUnique({
    where: { lokasyonAdi: "ESENYURT - OTOPARK" },
  });
  if (lokasyonEsenyurt) {
    await prisma.user.upsert({
      where: { email: "sef@esenyurt.com" },
      update: {},
      create: {
        email: "sef@esenyurt.com",
        password: hash,
        name: "Esenyurt Lokasyon Şefi",
        role: "lokasyon_sefi",
        lokasyonId: lokasyonEsenyurt.id,
      },
    });
  }

  console.log("✅ Default users created");
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
