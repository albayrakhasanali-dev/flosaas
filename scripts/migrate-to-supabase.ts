/**
 * Neon → Supabase veri taşıma (pg_dump'sız).
 *
 * İki PrismaClient: kaynak (NEON_URL) ve hedef (SUPA_URL). Aynı schema.
 * - Hedef tablolar TRUNCATE ... RESTART IDENTITY CASCADE ile temizlenir (tekrar çalıştırılabilir).
 * - Veriler FK-güvenli sırayla, ID'ler KORUNARAK kopyalanır.
 * - t_belge (bytea evraklar) küçük partiler halinde taşınır (payload limiti için).
 * - Sequence'lar setval ile düzeltilir.
 * - Sonunda her iki tarafta satır sayısı + bytea toplam + fingerprint karşılaştırılır.
 *
 * Çalıştırma (PowerShell):
 *   $env:NEON_URL="<neon-direct-url>"; $env:SUPA_URL="<supabase-session-pooler-5432-url>"; npx tsx scripts/migrate-to-supabase.ts
 */
import { PrismaClient } from "@prisma/client";

const NEON_URL = process.env.NEON_URL;
const SUPA_URL = process.env.SUPA_URL;

if (!NEON_URL || !SUPA_URL) {
  console.error("HATA: NEON_URL ve SUPA_URL ortam değişkenleri zorunlu.");
  process.exit(1);
}

const neon = new PrismaClient({ datasources: { db: { url: NEON_URL } } });
const supa = new PrismaClient({ datasources: { db: { url: SUPA_URL } } });

// FK-güvenli sıra: ebeveynler önce. Prisma client accessor adlarıyla.
const COPY_ORDER: { accessor: string; table: string; batch: number }[] = [
  { accessor: "t_Sirket", table: "t_sirket", batch: 500 },
  { accessor: "t_Lokasyon", table: "t_lokasyon", batch: 500 },
  { accessor: "t_Durum", table: "t_durum", batch: 500 },
  { accessor: "user", table: "users", batch: 500 },
  { accessor: "t_Arac_Master", table: "t_arac_master", batch: 200 },
  { accessor: "userLokasyon", table: "user_lokasyon", batch: 500 },
  { accessor: "t_Belge", table: "t_belge", batch: 15 }, // bytea — küçük parti
  { accessor: "t_Ceza", table: "t_ceza", batch: 200 },
  { accessor: "t_Muayene", table: "t_muayene", batch: 200 },
  { accessor: "t_Sigorta", table: "t_sigorta", batch: 200 },
  { accessor: "t_Yapilacak", table: "t_yapilacak", batch: 500 },
  { accessor: "cronLog", table: "cron_logs", batch: 500 },
  { accessor: "t_Mail_Ayarlari", table: "t_mail_ayarlari", batch: 500 },
];

// TRUNCATE sırası: çocuklar önce (CASCADE zaten hallediyor ama açık olalım)
const TRUNCATE_LIST = COPY_ORDER.map((c) => `"${c.table}"`).join(", ");

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function main() {
  console.log("== Bağlantı testi ==");
  await neon.$queryRaw`SELECT 1`;
  await supa.$queryRaw`SELECT 1`;
  console.log("Neon ve Supabase erişilebilir.\n");

  console.log("== Hedef tablolar temizleniyor (TRUNCATE RESTART IDENTITY CASCADE) ==");
  await supa.$executeRawUnsafe(`TRUNCATE ${TRUNCATE_LIST} RESTART IDENTITY CASCADE;`);
  console.log("Temizlendi.\n");

  console.log("== Kopyalama ==");
  for (const { accessor, table, batch } of COPY_ORDER) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srcModel = (neon as any)[accessor];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dstModel = (supa as any)[accessor];
    const rows = await srcModel.findMany();
    if (rows.length === 0) {
      console.log(`  ${table}: 0 satır (atlandı)`);
      continue;
    }
    let written = 0;
    for (const part of chunk(rows, batch)) {
      const res = await dstModel.createMany({ data: part, skipDuplicates: true });
      written += res.count;
    }
    console.log(`  ${table}: ${written}/${rows.length} satır kopyalandı`);
  }

  console.log("\n== Sequence'lar düzeltiliyor ==");
  await supa.$executeRawUnsafe(`
    DO $$
    DECLARE r record; maxid bigint;
    BEGIN
      FOR r IN
        SELECT s.relname AS seq, t.relname AS tbl, a.attname AS col
        FROM pg_class s
        JOIN pg_depend d   ON d.objid = s.oid AND d.deptype = 'a'
        JOIN pg_class t    ON t.oid = d.refobjid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE s.relkind = 'S' AND n.nspname = 'public'
      LOOP
        EXECUTE format('SELECT COALESCE(MAX(%I),0) FROM public.%I', r.col, r.tbl) INTO maxid;
        IF maxid > 0 THEN
          EXECUTE format('SELECT setval(%L, %s, true)', 'public.'||r.seq, maxid);
        ELSE
          EXECUTE format('SELECT setval(%L, 1, false)', 'public.'||r.seq);
        END IF;
      END LOOP;
    END $$;
  `);
  console.log("Sequence'lar ayarlandı.\n");

  console.log("== DOĞRULAMA ==");
  const tables = COPY_ORDER.map((c) => c.table);
  let allOk = true;
  for (const t of tables) {
    const [[srcC], [dstC]] = await Promise.all([
      neon.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(*)::bigint AS c FROM "${t}"`),
      supa.$queryRawUnsafe<{ c: bigint }[]>(`SELECT count(*)::bigint AS c FROM "${t}"`),
    ]);
    const ok = srcC.c === dstC.c;
    if (!ok) allOk = false;
    console.log(`  ${t}: Neon ${srcC.c} | Supa ${dstC.c} ${ok ? "✓" : "✗ FARK"}`);
  }

  // bytea evrak bütünlüğü — fingerprint
  const fp = (db: PrismaClient) =>
    db.$queryRawUnsafe<{ rows: bigint; bytes: bigint; fp: string }[]>(
      `SELECT count(*)::bigint AS rows, COALESCE(sum(length(icerik)),0)::bigint AS bytes,
              COALESCE(md5(string_agg(md5(icerik), ',' ORDER BY id)),'-') AS fp FROM t_belge`
    );
  const [[ns], [ss]] = await Promise.all([fp(neon), fp(supa)]);
  const fpOk = ns.rows === ss.rows && ns.bytes === ss.bytes && ns.fp === ss.fp;
  if (!fpOk) allOk = false;
  console.log("\n== EVRAK BÜTÜNLÜĞÜ (t_belge) ==");
  console.log(`  Neon: ${ns.rows} dosya, ${ns.bytes} byte, fp ${ns.fp.slice(0, 12)}`);
  console.log(`  Supa: ${ss.rows} dosya, ${ss.bytes} byte, fp ${ss.fp.slice(0, 12)}`);
  console.log(`  ${fpOk ? "✓ BİREBİR AYNI" : "✗ FARK VAR"}`);

  console.log(`\n== SONUÇ: ${allOk ? "TÜM VERİ BİREBİR TAŞINDI ✅" : "FARK VAR ⚠️ — incele"} ==`);
}

main()
  .catch((e) => {
    console.error("MIGRATION HATASI:", e);
    process.exit(1);
  })
  .finally(async () => {
    await neon.$disconnect();
    await supa.$disconnect();
  });
