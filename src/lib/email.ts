import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import dns from "dns";

// Resolve SMTP hostname to IP to avoid getaddrinfo EBUSY in serverless
async function resolveHost(hostname: string): Promise<string> {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        resolve(hostname); // fallback to hostname
      } else {
        resolve(addresses[0]);
      }
    });
  });
}

async function createTransporter() {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const resolvedHost = await resolveHost(smtpHost);

  const opts: SMTPTransport.Options = {
    host: resolvedHost,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      servername: smtpHost, // use original hostname for TLS SNI
    },
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
  return nodemailer.createTransport(opts);
}

async function sendMailWithRetry(
  mailOptions: nodemailer.SendMailOptions,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transporter = await createTransporter();
      const result = await transporter.sendMail(mailOptions);
      transporter.close();
      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isRetryable = errMsg.includes("EBUSY") || errMsg.includes("ECONNRESET") || errMsg.includes("ETIMEDOUT") || errMsg.includes("getaddrinfo");
      if (attempt === maxRetries || !isRetryable) throw error;
      console.warn(`SMTP attempt ${attempt} failed (${errMsg}), retrying in ${attempt * 2}s...`);
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

interface AracAlarm {
  plaka: string;
  lokasyon: string;
  muayeneKalanGun: number | null;
  sigortaKalanGun: number | null;
}

interface MuayeneAlarm {
  plaka: string;
  sirket: string;
  lokasyon: string;
  bitisTarihi: string;
  kalanGun: number;
}

interface SigortaAlarm {
  plaka: string;
  sirket: string;
  lokasyon: string;
  sigortaTuru: string;
  bitisTarihi: string;
  kalanGun: number;
}

export interface YapilacakAlarm {
  baslik: string;
  plaka: string;
  kategori: string;
  oncelik: string;
  atanan: string;
  sonTarih: string;
  kalanGun: number;
}

export interface WeeklyReportData {
  suresiGecmisMuayeneler: MuayeneAlarm[];
  yaklasanMuayeneler: MuayeneAlarm[];
  suresiGecmisSigortalar: SigortaAlarm[];
  yaklasanSigortalar: SigortaAlarm[];
}

export interface YapilacakReportData {
  gecmisGorevler: YapilacakAlarm[];
  yaklasanGorevler: YapilacakAlarm[];
  acikGorevler: YapilacakAlarm[];
}

export async function sendExpiredVehicleAlert(
  toEmails: string[],
  araclar: AracAlarm[]
) {
  const rows = araclar
    .map(
      (a) =>
        `<tr>
          <td style="border:1px solid #ddd;padding:8px;font-weight:bold">${a.plaka}</td>
          <td style="border:1px solid #ddd;padding:8px">${a.lokasyon}</td>
          <td style="border:1px solid #ddd;padding:8px;color:${(a.muayeneKalanGun ?? 999) < 0 ? "red" : "inherit"}">${a.muayeneKalanGun ?? "N/A"} gun</td>
          <td style="border:1px solid #ddd;padding:8px;color:${(a.sigortaKalanGun ?? 999) < 0 ? "red" : "inherit"}">${a.sigortaKalanGun ?? "N/A"} gun</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto">
      <h2 style="color:#dc2626">🚨 Acil: Suresi Gecen Araclar Tespit Edildi</h2>
      <p>Asagidaki araclarin muayene veya sigorta suresi dolmus ve durumlari otomatik olarak <strong>⚫ YATAN</strong> olarak guncellenmistir.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="border:1px solid #ddd;padding:8px;text-align:left">Plaka</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left">Lokasyon</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left">Muayene</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left">Sigorta</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px">Bu e-posta FloSaaS Filo Yonetim Sistemi tarafindan otomatik olusturulmustur.</p>
    </div>
  `;

  try {
    await sendMailWithRetry({
      from: `"FloSaaS Filo Yonetim" <${process.env.SMTP_USER || "noreply@flosaas.com"}>`,
      to: toEmails.join(", "),
      subject: "🚨 Acil: Suresi Gecen Araclar Tespit Edildi",
      html,
    });
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

// ============================================
// HAFTALIK MUAYENE/SIGORTA TAKIP RAPORU
// ============================================

const sigortaTuruLabels: Record<string, string> = {
  trafik: "Zorunlu Trafik",
  kasko: "Kasko",
  imm: "IMM",
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR");
  } catch {
    return dateStr;
  }
}

function buildMuayeneTable(items: MuayeneAlarm[], title: string, color: string): string {
  if (items.length === 0) return "";
  const rows = items
    .map(
      (m) =>
        `<tr>
          <td style="border:1px solid #e2e8f0;padding:8px 12px;font-weight:600">${m.plaka}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${m.sirket}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${m.lokasyon}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${formatDate(m.bitisTarihi)}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px;font-weight:700;color:${m.kalanGun < 0 ? "#dc2626" : "#d97706"}">${m.kalanGun < 0 ? `${Math.abs(m.kalanGun)} gun gecmis` : `${m.kalanGun} gun`}</td>
        </tr>`
    )
    .join("");

  return `
    <h3 style="color:${color};margin:24px 0 8px;font-size:16px">${title} (${items.length})</h3>
    <table style="border-collapse:collapse;width:100%;margin-bottom:16px;font-size:13px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Plaka</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Sirket</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Lokasyon</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Bitis Tarihi</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Durum</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildSigortaTable(items: SigortaAlarm[], title: string, color: string): string {
  if (items.length === 0) return "";
  const rows = items
    .map(
      (s) =>
        `<tr>
          <td style="border:1px solid #e2e8f0;padding:8px 12px;font-weight:600">${s.plaka}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${sigortaTuruLabels[s.sigortaTuru] || s.sigortaTuru}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${s.sirket}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${s.lokasyon}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${formatDate(s.bitisTarihi)}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px;font-weight:700;color:${s.kalanGun < 0 ? "#dc2626" : "#d97706"}">${s.kalanGun < 0 ? `${Math.abs(s.kalanGun)} gun gecmis` : `${s.kalanGun} gun`}</td>
        </tr>`
    )
    .join("");

  return `
    <h3 style="color:${color};margin:24px 0 8px;font-size:16px">${title} (${items.length})</h3>
    <table style="border-collapse:collapse;width:100%;margin-bottom:16px;font-size:13px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Plaka</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Sigorta Turu</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Sirket</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Lokasyon</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Bitis Tarihi</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Durum</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export async function sendWeeklyTrackingReport(
  toEmails: string[],
  data: WeeklyReportData
) {
  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalIssues =
    data.suresiGecmisMuayeneler.length +
    data.yaklasanMuayeneler.length +
    data.suresiGecmisSigortalar.length +
    data.yaklasanSigortalar.length;

  const summaryCard = (label: string, count: number, bgColor: string, textColor: string) =>
    `<td style="padding:8px">
      <div style="background:${bgColor};border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:${textColor}">${count}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">${label}</div>
      </div>
    </td>`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:0 auto;background:#ffffff">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#ffffff;margin:0;font-size:22px">📊 Haftalik Muayene & Sigorta Takip Raporu</h1>
        <p style="color:#94a3b8;margin:6px 0 0;font-size:13px">${today}</p>
      </div>

      <div style="padding:24px 32px">
        <!-- Summary Cards -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr>
            ${summaryCard("Gecmis Muayene", data.suresiGecmisMuayeneler.length, "#fef2f2", "#dc2626")}
            ${summaryCard("Yaklasan Muayene", data.yaklasanMuayeneler.length, "#fffbeb", "#d97706")}
            ${summaryCard("Gecmis Sigorta", data.suresiGecmisSigortalar.length, "#fef2f2", "#dc2626")}
            ${summaryCard("Yaklasan Sigorta", data.yaklasanSigortalar.length, "#fffbeb", "#d97706")}
          </tr>
        </table>

        ${totalIssues === 0 ? '<div style="text-align:center;padding:32px;color:#16a34a;font-size:16px">✅ Tum araclar guncel! Suresi gecmis veya yaklasan kayit yok.</div>' : ""}

        <!-- Tables -->
        ${buildMuayeneTable(data.suresiGecmisMuayeneler, "🔴 Suresi Gecmis Muayeneler", "#dc2626")}
        ${buildMuayeneTable(data.yaklasanMuayeneler, "🟡 Yaklasan Muayeneler (30 gun icinde)", "#d97706")}
        ${buildSigortaTable(data.suresiGecmisSigortalar, "🔴 Suresi Gecmis Sigortalar", "#dc2626")}
        ${buildSigortaTable(data.yaklasanSigortalar, "🟡 Yaklasan Sigortalar (30 gun icinde)", "#d97706")}
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;padding:16px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0">
        <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center">
          Bu e-posta <strong>FloSaaS Filo Yonetim Sistemi</strong> tarafindan otomatik olusturulmustur. Her Pazartesi gonderilir.
        </p>
      </div>
    </div>
  `;

  await sendMailWithRetry({
    from: `"FloSaaS Filo Yonetim" <${process.env.SMTP_USER || "noreply@flosaas.com"}>`,
    to: toEmails.join(", "),
    subject: `📊 Haftalik Takip Raporu — ${data.suresiGecmisMuayeneler.length + data.suresiGecmisSigortalar.length} gecmis, ${data.yaklasanMuayeneler.length + data.yaklasanSigortalar.length} yaklasan`,
    html,
  });
  return true;
}

// ============================================
// HAFTALIK YAPILACAKLAR TAKIP RAPORU
// ============================================

const oncelikLabels: Record<string, string> = {
  dusuk: "Dusuk",
  normal: "Normal",
  yuksek: "Yuksek",
  kritik: "Kritik",
};

const kategoriLabels: Record<string, string> = {
  bakim: "Bakim",
  transfer: "Transfer",
  idari: "Idari",
  diger: "Diger",
};

function oncelikColor(oncelik: string): string {
  switch (oncelik) {
    case "kritik": return "#dc2626";
    case "yuksek": return "#ea580c";
    case "normal": return "#2563eb";
    default: return "#64748b";
  }
}

function buildYapilacakTable(items: YapilacakAlarm[], title: string, color: string): string {
  if (items.length === 0) return "";
  const rows = items
    .map(
      (g) =>
        `<tr>
          <td style="border:1px solid #e2e8f0;padding:8px 12px;font-weight:600">${g.baslik}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${g.plaka || "-"}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${kategoriLabels[g.kategori] || g.kategori || "-"}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px;color:${oncelikColor(g.oncelik)};font-weight:600">${oncelikLabels[g.oncelik] || g.oncelik}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${g.atanan || "-"}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px">${g.sonTarih ? formatDate(g.sonTarih) : "-"}</td>
          <td style="border:1px solid #e2e8f0;padding:8px 12px;font-weight:700;color:${g.kalanGun < 0 ? "#dc2626" : "#d97706"}">${g.kalanGun < 0 ? `${Math.abs(g.kalanGun)} gun gecmis` : `${g.kalanGun} gun`}</td>
        </tr>`
    )
    .join("");

  return `
    <h3 style="color:${color};margin:24px 0 8px;font-size:16px">${title} (${items.length})</h3>
    <table style="border-collapse:collapse;width:100%;margin-bottom:16px;font-size:13px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Gorev</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Plaka</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Kategori</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Oncelik</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Atanan</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Son Tarih</th>
          <th style="border:1px solid #e2e8f0;padding:8px 12px;text-align:left">Durum</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export async function sendYapilacakTrackingReport(
  toEmails: string[],
  data: YapilacakReportData
) {
  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalIssues =
    data.gecmisGorevler.length +
    data.yaklasanGorevler.length +
    data.acikGorevler.length;

  const summaryCard = (label: string, count: number, bgColor: string, textColor: string) =>
    `<td style="padding:8px">
      <div style="background:${bgColor};border-radius:8px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:${textColor}">${count}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">${label}</div>
      </div>
    </td>`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:0 auto;background:#ffffff">
      <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#ffffff;margin:0;font-size:22px">📋 Haftalik Yapilacaklar Takip Raporu</h1>
        <p style="color:#94a3b8;margin:6px 0 0;font-size:13px">${today}</p>
      </div>

      <div style="padding:24px 32px">
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr>
            ${summaryCard("Gecikmis Gorev", data.gecmisGorevler.length, "#fef2f2", "#dc2626")}
            ${summaryCard("Yaklasan Gorev", data.yaklasanGorevler.length, "#fffbeb", "#d97706")}
            ${summaryCard("Acik Gorev", data.acikGorevler.length, "#eff6ff", "#2563eb")}
          </tr>
        </table>

        ${totalIssues === 0 ? '<div style="text-align:center;padding:32px;color:#16a34a;font-size:16px">✅ Tum gorevler tamamlandi! Bekleyen gorev yok.</div>' : ""}

        ${buildYapilacakTable(data.gecmisGorevler, "🔴 Gecikmis Gorevler", "#dc2626")}
        ${buildYapilacakTable(data.yaklasanGorevler, "🟡 Yaklasan Gorevler", "#d97706")}
        ${buildYapilacakTable(data.acikGorevler, "🔵 Acik Gorevler (Son tarihi olmayan)", "#2563eb")}
      </div>

      <div style="background:#f8fafc;padding:16px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e2e8f0">
        <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center">
          Bu e-posta <strong>FloSaaS Filo Yonetim Sistemi</strong> tarafindan otomatik olusturulmustur.
        </p>
      </div>
    </div>
  `;

  await sendMailWithRetry({
    from: `"FloSaaS Filo Yonetim" <${process.env.SMTP_USER || "noreply@flosaas.com"}>`,
    to: toEmails.join(", "),
    subject: `📋 Yapilacaklar Raporu — ${data.gecmisGorevler.length} gecikmis, ${data.yaklasanGorevler.length} yaklasan, ${data.acikGorevler.length} acik`,
    html,
  });
  return true;
}
