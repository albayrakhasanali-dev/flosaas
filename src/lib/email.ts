import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface AracAlarm {
  plaka: string;
  lokasyon: string;
  muayeneKalanGun: number | null;
  sigortaKalanGun: number | null;
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
    await transporter.sendMail({
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
