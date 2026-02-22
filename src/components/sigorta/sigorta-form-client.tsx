"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Upload, X } from "lucide-react";

interface AracOption {
  id: number;
  plaka: string;
}

interface SigortaData {
  aracId: string;
  sigortaTuru: string;
  policeNo: string;
  sigortaSirketi: string;
  acenteAdi: string;
  acenteTelefon: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  primTutari: string;
  odemeSekli: string;
  taksitSayisi: string;
  odemeDurumu: string;
  odemeTarihi: string;
  teminatBilgi: string;
  notlar: string;
  plaka: string;
}

const emptySigorta: SigortaData = {
  aracId: "",
  sigortaTuru: "trafik",
  policeNo: "",
  sigortaSirketi: "",
  acenteAdi: "",
  acenteTelefon: "",
  baslangicTarihi: "",
  bitisTarihi: "",
  primTutari: "",
  odemeSekli: "",
  taksitSayisi: "",
  odemeDurumu: "odenmedi",
  odemeTarihi: "",
  teminatBilgi: "",
  notlar: "",
  plaka: "",
};

const sigortaTurleri = [
  { value: "trafik", label: "Zorunlu Trafik Sigortasi" },
  { value: "kasko", label: "Kasko" },
  { value: "imm", label: "IMM (Ihtiyari Mali Mesuliyet)" },
];

const formatDateForInput = (dateStr: string | null) => {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
};

export default function SigortaFormClient({ sigortaId }: { sigortaId?: string }) {
  const router = useRouter();
  const isNew = !sigortaId || sigortaId === "new";
  const [form, setForm] = useState<SigortaData>(emptySigorta);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [araclar, setAraclar] = useState<AracOption[]>([]);
  const [aracSearch, setAracSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"police" | "odeme" | "teminat">("police");
  const [policeFile, setPoliceFile] = useState<File | null>(null);
  const [showAracDropdown, setShowAracDropdown] = useState(false);
  const aracDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aracDropdownRef.current && !aracDropdownRef.current.contains(e.target as Node)) {
        setShowAracDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load arac list
  useEffect(() => {
    fetch("/api/araclar?limit=500")
      .then((r) => r.json())
      .then((data) => {
        setAraclar(
          data.data.map((a: { id: number; plaka: string }) => ({
            id: a.id,
            plaka: a.plaka,
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Load existing sigorta
  useEffect(() => {
    if (!isNew) {
      fetch(`/api/sigortalar/${sigortaId}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            aracId: String(data.aracId),
            sigortaTuru: data.sigortaTuru || "trafik",
            policeNo: data.policeNo || "",
            sigortaSirketi: data.sigortaSirketi || "",
            acenteAdi: data.acenteAdi || "",
            acenteTelefon: data.acenteTelefon || "",
            baslangicTarihi: formatDateForInput(data.baslangicTarihi),
            bitisTarihi: formatDateForInput(data.bitisTarihi),
            primTutari: data.primTutari ? String(data.primTutari) : "",
            odemeSekli: data.odemeSekli || "",
            taksitSayisi: data.taksitSayisi ? String(data.taksitSayisi) : "",
            odemeDurumu: data.odemeDurumu || "odenmedi",
            odemeTarihi: formatDateForInput(data.odemeTarihi),
            teminatBilgi: data.teminatBilgi || "",
            notlar: data.notlar || "",
            plaka: data.arac?.plaka || "",
          });
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [sigortaId, isNew]);

  const handleChange = (field: keyof SigortaData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "aracId" && value) {
      const selected = araclar.find((a) => String(a.id) === value);
      if (selected) setForm((prev) => ({ ...prev, [field]: value, plaka: selected.plaka }));
    }
  };

  const handleSave = async () => {
    if (!form.aracId || !form.baslangicTarihi || !form.bitisTarihi) {
      alert("Arac, baslangic tarihi ve bitis tarihi zorunludur");
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? "/api/sigortalar" : `/api/sigortalar/${sigortaId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        if (policeFile && form.aracId) {
          const belgeTipi = form.sigortaTuru === "kasko" ? "kasko" : "sigorta";
          const fd = new FormData();
          fd.append("file", policeFile);
          fd.append("aracId", form.aracId);
          fd.append("belgeTipi", belgeTipi);
          fd.append("aciklama", `${sigortaTurleri.find(t => t.value === form.sigortaTuru)?.label || "Sigorta"} Police - ${form.policeNo || form.plaka || "Belirtilmedi"}`);
          await fetch("/api/belgeler", { method: "POST", body: fd });
        }
        router.push("/sigorta-takip");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Bir hata olustu");
      }
    } catch {
      alert("Kaydetme hatasi");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Bu sigorta kaydini silmek istediginizden emin misiniz?")) return;
    try {
      const res = await fetch(`/api/sigortalar/${sigortaId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/sigorta-takip");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Silme hatasi");
      }
    } catch {
      alert("Silme hatasi");
    }
  };

  const filteredAraclar = aracSearch
    ? araclar.filter((a) => a.plaka.toLowerCase().includes(aracSearch.toLowerCase()))
    : araclar;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const tabs = [
    { key: "police" as const, label: "Police Bilgileri" },
    { key: "odeme" as const, label: "Odeme Bilgileri" },
    { key: "teminat" as const, label: "Teminat & Notlar" },
  ];

  const inputClass =
    "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none";
  const labelClass = "block text-xs font-medium text-slate-500 mb-1";

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/sigorta-takip")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isNew ? "Yeni Sigorta Policesi" : `Sigorta Detay - ${form.plaka}`}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isNew ? "Yeni sigorta policesi ekle" : "Sigorta bilgilerini duzenle"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={16} />
              Sil
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* POLICE TAB */}
        {activeTab === "police" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arac Secimi */}
            <div className="md:col-span-2">
              <label className={labelClass}>Arac (Plaka) *</label>
              <div className="relative" ref={aracDropdownRef}>
                <input
                  type="text"
                  value={aracSearch}
                  onChange={(e) => {
                    setAracSearch(e.target.value);
                    setShowAracDropdown(true);
                  }}
                  onFocus={() => setShowAracDropdown(true)}
                  placeholder={form.aracId ? `Secili: ${form.plaka}` : "Plaka yazarak arac arayin..."}
                  className={`${inputClass} ${form.aracId ? "border-green-400 bg-green-50" : ""}`}
                />
                {form.aracId && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">{form.plaka}</span>
                    <button
                      type="button"
                      onClick={() => { handleChange("aracId", ""); setForm(prev => ({...prev, plaka: ""})); setAracSearch(""); }}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {showAracDropdown && filteredAraclar.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredAraclar.slice(0, 20).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          handleChange("aracId", String(a.id));
                          setAracSearch("");
                          setShowAracDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                          String(a.id) === form.aracId ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"
                        }`}
                      >
                        {a.plaka}
                      </button>
                    ))}
                    {filteredAraclar.length > 20 && (
                      <p className="px-4 py-2 text-xs text-slate-400 border-t">
                        {filteredAraclar.length - 20} arac daha var, aramayi daraltin...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Sigorta Turu *</label>
              <select
                value={form.sigortaTuru}
                onChange={(e) => handleChange("sigortaTuru", e.target.value)}
                className={inputClass}
              >
                {sigortaTurleri.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Police No</label>
              <input
                type="text"
                value={form.policeNo}
                onChange={(e) => handleChange("policeNo", e.target.value)}
                placeholder="Police numarasi"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sigorta Sirketi</label>
              <input
                type="text"
                value={form.sigortaSirketi}
                onChange={(e) => handleChange("sigortaSirketi", e.target.value)}
                placeholder="Orn: Axa Sigorta, Allianz..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Acente Adi</label>
              <input
                type="text"
                value={form.acenteAdi}
                onChange={(e) => handleChange("acenteAdi", e.target.value)}
                placeholder="Acente / broker adi"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Acente Telefon</label>
              <input
                type="text"
                value={form.acenteTelefon}
                onChange={(e) => handleChange("acenteTelefon", e.target.value)}
                placeholder="0 (5xx) xxx xx xx"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Baslangic Tarihi *</label>
              <input
                type="date"
                value={form.baslangicTarihi}
                onChange={(e) => handleChange("baslangicTarihi", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Bitis Tarihi *</label>
              <input
                type="date"
                value={form.bitisTarihi}
                onChange={(e) => handleChange("bitisTarihi", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Police Dosyasi */}
            <div className="md:col-span-2">
              <label className={labelClass}>Police Belgesi (PDF/Gorsel)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors">
                  <Upload size={16} />
                  {policeFile ? policeFile.name : "Police dosyasi sec"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => setPoliceFile(e.target.files?.[0] || null)}
                  />
                </label>
                {policeFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {(policeFile.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setPoliceFile(null)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ODEME TAB */}
        {activeTab === "odeme" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prim Tutari (TL)</label>
              <input
                type="number"
                step="0.01"
                value={form.primTutari}
                onChange={(e) => handleChange("primTutari", e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Odeme Sekli</label>
              <select
                value={form.odemeSekli}
                onChange={(e) => handleChange("odemeSekli", e.target.value)}
                className={inputClass}
              >
                <option value="">Secin</option>
                <option value="pesin">Pesin</option>
                <option value="taksit">Taksitli</option>
              </select>
            </div>
            {form.odemeSekli === "taksit" && (
              <div>
                <label className={labelClass}>Taksit Sayisi</label>
                <input
                  type="number"
                  value={form.taksitSayisi}
                  onChange={(e) => handleChange("taksitSayisi", e.target.value)}
                  placeholder="Orn: 4, 6, 12"
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Odeme Durumu</label>
              <select
                value={form.odemeDurumu}
                onChange={(e) => handleChange("odemeDurumu", e.target.value)}
                className={inputClass}
              >
                <option value="odenmedi">Odenmedi</option>
                <option value="odendi">Odendi</option>
                <option value="kismen_odendi">Kismen Odendi</option>
              </select>
            </div>
            {form.odemeDurumu !== "odenmedi" && (
              <div>
                <label className={labelClass}>Odeme Tarihi</label>
                <input
                  type="date"
                  value={form.odemeTarihi}
                  onChange={(e) => handleChange("odemeTarihi", e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {/* Odeme Ozeti */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-500">Prim Tutari</p>
                  <p className="text-lg font-bold text-slate-800">
                    {form.primTutari ? `${parseFloat(form.primTutari).toLocaleString("tr-TR")} TL` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Odeme Sekli</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {form.odemeSekli === "pesin" ? "Pesin" : form.odemeSekli === "taksit" ? `${form.taksitSayisi || "-"} Taksit` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Durum</p>
                  <p className={`text-lg font-bold ${
                    form.odemeDurumu === "odendi" ? "text-green-600" :
                    form.odemeDurumu === "kismen_odendi" ? "text-amber-600" : "text-red-600"
                  }`}>
                    {form.odemeDurumu === "odendi" ? "Odendi" :
                     form.odemeDurumu === "kismen_odendi" ? "Kismen" : "Odenmedi"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sigorta Turu</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {sigortaTurleri.find(t => t.value === form.sigortaTuru)?.label || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEMINAT TAB */}
        {activeTab === "teminat" && (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>Teminat Bilgileri</label>
              <textarea
                value={form.teminatBilgi}
                onChange={(e) => handleChange("teminatBilgi", e.target.value)}
                rows={4}
                placeholder="Police teminat detaylari, kapsam bilgileri..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Notlar</label>
              <textarea
                value={form.notlar}
                onChange={(e) => handleChange("notlar", e.target.value)}
                rows={3}
                placeholder="Ek notlar..."
                className={inputClass}
              />
            </div>

            {/* Sigorta bilgi ozeti */}
            {form.sigortaSirketi && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <span className="font-semibold">Sigorta Sirketi:</span> {form.sigortaSirketi}
                  {form.acenteAdi && ` | Acente: ${form.acenteAdi}`}
                  {form.acenteTelefon && ` | Tel: ${form.acenteTelefon}`}
                </p>
                {form.baslangicTarihi && form.bitisTarihi && (
                  <p className="text-xs text-blue-600 mt-1">
                    Sure: {new Date(form.baslangicTarihi).toLocaleDateString("tr-TR")} - {new Date(form.bitisTarihi).toLocaleDateString("tr-TR")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
