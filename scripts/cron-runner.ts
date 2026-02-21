/**
 * Muayene ve Sigorta Kontrol Botu
 *
 * Zamanlama: Her gun gece saat 01:00
 *
 * Bu script cron job olarak calistirilir:
 *   node-cron veya sistem crontab ile:
 *   0 1 * * * npx tsx scripts/cron-runner.ts
 *
 * Ya da Windows Task Scheduler ile her gece 01:00'de calistirilabilir.
 *
 * Alternatif: Vercel Cron, Railway Cron veya benzer servisler uzerinden
 *   POST /api/cron endpoint'ine Bearer token ile istek atilabilir.
 */

import cron from "node-cron";

const CRON_SECRET = process.env.CRON_SECRET || "flosaas-cron-secret";
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

async function runExpiredVehicleCheck() {
  console.log(`[${new Date().toISOString()}] Muayene/Sigorta kontrol botu calisiyor...`);

  try {
    const res = await fetch(`${BASE_URL}/api/cron`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    console.log(`[${new Date().toISOString()}] Sonuc:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Hata:`, error);
  }
}

// Schedule: Her gun gece 01:00
cron.schedule("0 1 * * *", () => {
  runExpiredVehicleCheck();
});

console.log("🤖 Muayene/Sigorta Kontrol Botu baslatildi");
console.log("⏰ Zamanlama: Her gun 01:00");
console.log("🔗 Hedef: POST /api/cron");

// Also run immediately for testing
if (process.argv.includes("--now")) {
  runExpiredVehicleCheck();
}
