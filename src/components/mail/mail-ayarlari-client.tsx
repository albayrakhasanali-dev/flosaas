"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Save,
  Send,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  ClipboardCheck,
  ListTodo,
} from "lucide-react";

interface MailAyarForm {
  modulTipi: string;
  aktif: boolean;
  frekans: string;
  haftaninGunu: number;
  gonderimSaati: number;
  alicilar: string[];
  kriterler: string[];
  esikGunleri: number[];
  yoneticilereGonder: boolean;
  sonGonderimTarihi: string | null;
}

const defaultForm = (modul: string): MailAyarForm => ({
  modulTipi: modul,
  aktif: false,
  frekans: "haftalik",
  haftaninGunu: 1,
  gonderimSaati: 8,
  alicilar: [],
  kriterler: ["suresi_gecmis", "yaklasan_30"],
  esikGunleri: [30, 15, 7],
  yoneticilereGonder: true,
  sonGonderimTarihi: null,
});

const gunler = [
  { value: 0, label: "Pazar" },
  { value: 1, label: "Pazartesi" },
  { value: 2, label: "Sali" },
  { value: 3, label: "Carsamba" },
  { value: 4, label: "Persembe" },
  { value: 5, label: "Cuma" },
  { value: 6, label: "Cumartesi" },
];

const kriterOptions: Record<string, { key: string; label: string; color: string }[]> = {
  muayene: [
    { key: "suresi_gecmis", label: "Suresi Gecmis", color: "text-red-600" },
    { key: "yaklasan_30", label: "30 Gun Icinde Yaklasan", color: "text-amber-600" },
    { key: "yaklasan_15", label: "15 Gun Icinde Yaklasan", color: "text-orange-600" },
    { key: "yaklasan_7", label: "7 Gun Icinde Yaklasan", color: "text-red-500" },
  ],
  sigorta: [
    { key: "suresi_gecmis", label: "Suresi Gecmis", color: "text-red-600" },
    { key: "yaklasan_30", label: "30 Gun Icinde Yaklasan", color: "text-amber-600" },
    { key: "yaklasan_15", label: "15 Gun Icinde Yaklasan", color: "text-orange-600" },
    { key: "yaklasan_7", label: "7 Gun Icinde Yaklasan", color: "text-red-500" },
  ],
  yapilacaklar: [
    { key: "gecikmis", label: "Gecikmis Gorevler", color: "text-red-600" },
    { key: "yaklasan_7", label: "7 Gun Icinde Yaklasan", color: "text-red-500" },
    { key: "yaklasan_15", label: "15 Gun Icinde Yaklasan", color: "text-orange-600" },
    { key: "yaklasan_30", label: "30 Gun Icinde Yaklasan", color: "text-amber-600" },
    { key: "acik", label: "Acik Gorevler (Son tarihi olmayan)", color: "text-blue-600" },
  ],
};

const formatDate = (d: string | null) => {
  if (!d) return "Henuz gonderilmedi";
  return new Date(d).toLocaleString("tr-TR");
};

export default function MailAyarlariClient() {
  const [muayeneForm, setMuayeneForm] = useState<MailAyarForm>(defaultForm("muayene"));
  const [sigortaForm, setSigortaForm] = useState<MailAyarForm>(defaultForm("sigorta"));
  const [yapilacaklarForm, setYapilacaklarForm] = useState<MailAyarForm>({
    ...defaultForm("yapilacaklar"),
    kriterler: ["gecikmis", "yaklasan_7"],
  });
  const [activeTab, setActiveTab] = useState<"muayene" | "sigorta" | "yapilacaklar">("muayene");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ type: string; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/mail-ayarlari");
      const data = await res.json();
      if (Array.isArray(data)) {
        const muayene = data.find((d: MailAyarForm) => d.modulTipi === "muayene");
        const sigorta = data.find((d: MailAyarForm) => d.modulTipi === "sigorta");
        const yapilacaklar = data.find((d: MailAyarForm) => d.modulTipi === "yapilacaklar");
        if (muayene) setMuayeneForm(muayene);
        if (sigorta) setSigortaForm(sigorta);
        if (yapilacaklar) setYapilacaklarForm(yapilacaklar);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentForm = activeTab === "muayene" ? muayeneForm : activeTab === "sigorta" ? sigortaForm : yapilacaklarForm;
  const setCurrentForm = activeTab === "muayene" ? setMuayeneForm : activeTab === "sigorta" ? setSigortaForm : setYapilacaklarForm;

  const updateField = <K extends keyof MailAyarForm>(key: K, value: MailAyarForm[K]) => {
    setCurrentForm((prev) => ({ ...prev, [key]: value }));
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: "error", text: "Gecersiz email adresi" });
      return;
    }
    if (currentForm.alicilar.includes(email)) {
      setMessage({ type: "error", text: "Bu email zaten ekli" });
      return;
    }
    updateField("alicilar", [...currentForm.alicilar, email]);
    setNewEmail("");
    setMessage(null);
  };

  const removeEmail = (email: string) => {
    updateField("alicilar", currentForm.alicilar.filter((e) => e !== email));
  };

  const toggleKriter = (key: string) => {
    const current = currentForm.kriterler;
    if (current.includes(key)) {
      updateField("kriterler", current.filter((k) => k !== key));
    } else {
      updateField("kriterler", [...current, key]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/mail-ayarlari", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([muayeneForm, sigortaForm, yapilacaklarForm]),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Ayarlar basariyla kaydedildi" });
      } else {
        setMessage({ type: "error", text: data.error || "Kaydetme hatasi" });
      }
    } catch {
      setMessage({ type: "error", text: "Baglanti hatasi" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/mail-ayarlari/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modulTipi: activeTab, testEmail: testEmail.trim() }),
      });
      const data = await res.json();
      setTestResult({
        type: data.success ? "success" : "error",
        text: data.message || data.error,
      });
    } catch {
      setTestResult({ type: "error", text: "Test email gonderilemedi" });
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Mail size={24} />
            Mail Ayarlari
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Muayene, sigorta ve yapilacaklar bildirim emaillerini yapilandir
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Save size={16} />
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("muayene")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "muayene"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <ClipboardCheck size={16} />
          Muayene Mail
          {muayeneForm.aktif && <span className="w-2 h-2 rounded-full bg-green-500" />}
        </button>
        <button
          onClick={() => setActiveTab("sigorta")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "sigorta"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <Shield size={16} />
          Sigorta Mail
          {sigortaForm.aktif && <span className="w-2 h-2 rounded-full bg-green-500" />}
        </button>
        <button
          onClick={() => setActiveTab("yapilacaklar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "yapilacaklar"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <ListTodo size={16} />
          Yapilacaklar Mail
          {yapilacaklarForm.aktif && <span className="w-2 h-2 rounded-full bg-green-500" />}
        </button>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          {/* Aktif Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Bildirim Durumu</p>
              <p className="text-xs text-slate-400 mt-0.5">Otomatik emailleri ac/kapat</p>
            </div>
            <button
              onClick={() => updateField("aktif", !currentForm.aktif)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                currentForm.aktif ? "bg-green-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  currentForm.aktif ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Frekans */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Gonderim Frekansi</label>
              <select
                value={currentForm.frekans}
                onChange={(e) => updateField("frekans", e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="haftalik">Haftalik</option>
                <option value="gunluk">Gunluk</option>
              </select>
            </div>
            {currentForm.frekans === "haftalik" && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Gonderim Gunu</label>
                <select
                  value={currentForm.haftaninGunu}
                  onChange={(e) => updateField("haftaninGunu", parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {gunler.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Gonderim Saati (UTC)</label>
              <select
                value={currentForm.gonderimSaati}
                onChange={(e) => updateField("gonderimSaati", parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Yoneticilere gonder */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Yoneticilere Gonder</p>
              <p className="text-xs text-slate-400 mt-0.5">Admin ve sirket yoneticilerine otomatik gonder</p>
            </div>
            <button
              onClick={() => updateField("yoneticilereGonder", !currentForm.yoneticilereGonder)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                currentForm.yoneticilereGonder ? "bg-green-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  currentForm.yoneticilereGonder ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Bildirim Kriterleri */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Bildirim Kriterleri</label>
            <div className="space-y-2">
              {(kriterOptions[activeTab] || []).map((k) => (
                <label key={k.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentForm.kriterler.includes(k.key)}
                    onChange={() => toggleKriter(k.key)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className={`text-sm font-medium ${k.color}`}>{k.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Son gonderim */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
            <Clock size={14} />
            Son gonderim: {formatDate(currentForm.sonGonderimTarihi)}
          </div>
        </div>

        {/* Right: Recipients + Test */}
        <div className="space-y-4">
          {/* Alicilar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Email Alicilari</h3>

            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEmail()}
                placeholder="ornek@sirket.com"
                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={addEmail}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                Ekle
              </button>
            </div>

            {currentForm.alicilar.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Henuz alici eklenmedi. {currentForm.yoneticilereGonder && "Yoneticiler otomatik dahil edilecek."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {currentForm.alicilar.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                  >
                    <Mail size={12} />
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {currentForm.yoneticilereGonder && (
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Admin ve sirket yoneticileri otomatik olarak dahil edilecek
              </p>
            )}
          </div>

          {/* Test Email */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Test Emaili Gonder</h3>
            <p className="text-xs text-slate-400 mb-3">
              Ornek veriyle bir test emaili gondererek yapilandirmayi dogrulayin
            </p>

            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@ornek.com"
                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={handleTestEmail}
                disabled={testSending || !testEmail.trim()}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Send size={14} />
                {testSending ? "Gonderiliyor..." : "Test Gonder"}
              </button>
            </div>

            {testResult && (
              <div
                className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-xs ${
                  testResult.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {testResult.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {testResult.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
