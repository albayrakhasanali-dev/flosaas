"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

interface Lookup {
  sirketler: { id: number; sirketAdi: string }[];
  lokasyonlar: { id: number; lokasyonAdi: string }[];
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
  sirketId: string;
  lokasyonId: string;
  isActive: boolean;
}

const emptyForm: FormData = {
  name: "",
  email: "",
  password: "",
  role: "lokasyon_sefi",
  sirketId: "",
  lokasyonId: "",
  isActive: true,
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  sirket_yoneticisi: "Sirket Yoneticisi",
  lokasyon_sefi: "Lokasyon Sefi",
};

export default function KullaniciFormClient({ kullaniciId }: { kullaniciId?: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isNew = !kullaniciId;
  const userRole = (session?.user as Record<string, unknown>)?.role as string;

  const [form, setForm] = useState<FormData>(emptyForm);
  const [lookups, setLookups] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Extra info for edit mode
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Load lookups
  useEffect(() => {
    fetch("/api/lookups")
      .then((r) => r.json())
      .then((data) => setLookups(data));
  }, []);

  // Load existing user
  useEffect(() => {
    if (!isNew && kullaniciId) {
      fetch(`/api/kullanicilar/${kullaniciId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && !data.error) {
            setForm({
              name: data.name || "",
              email: data.email || "",
              password: "", // Never show existing password
              role: data.role || "lokasyon_sefi",
              sirketId: data.sirketId ? String(data.sirketId) : "",
              lokasyonId: data.lokasyonId ? String(data.lokasyonId) : "",
              isActive: data.isActive !== false,
            });
            setCreatedAt(data.createdAt);
            setUpdatedAt(data.updatedAt);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [kullaniciId, isNew]);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.email.trim()) {
      setMessage({ type: "error", text: "Email adresi zorunlu" });
      return;
    }
    if (isNew && !form.password.trim()) {
      setMessage({ type: "error", text: "Sifre zorunlu" });
      return;
    }
    if (form.password && form.password.length < 6) {
      setMessage({ type: "error", text: "Sifre en az 6 karakter olmali" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const url = isNew ? "/api/kullanicilar" : `/api/kullanicilar/${kullaniciId}`;
      const method = isNew ? "POST" : "PUT";

      const payload: Record<string, unknown> = {
        name: form.name || null,
        email: form.email,
        role: form.role,
        sirketId: form.sirketId || null,
        lokasyonId: form.lokasyonId || null,
        isActive: form.isActive,
      };

      // Only include password if provided
      if (form.password.trim()) {
        payload.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({
          type: "success",
          text: isNew ? "Kullanici basariyla eklendi" : "Kullanici bilgileri guncellendi",
        });
        if (isNew) {
          router.push(`/kullanici/${data.id}`);
        } else {
          // Clear password field after successful update
          setForm((prev) => ({ ...prev, password: "" }));
          if (data.updatedAt) setUpdatedAt(data.updatedAt);
        }
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Hata olustu" });
      }
    } catch {
      setMessage({ type: "error", text: "Baglanti hatasi" });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Bu kullaniciyi silmek istediginize emin misiniz? Bu islem geri alinamaz.")) return;
    const res = await fetch(`/api/kullanicilar/${kullaniciId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/kullanicilar");
    } else {
      const err = await res.json();
      setMessage({ type: "error", text: err.error || "Silinirken hata olustu" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  const tabs = ["Kullanici Bilgileri", "Durum & Bilgi"];
  const inputClass = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none";
  const labelClass = "block text-xs font-medium text-slate-500 mb-1";

  // Available roles based on current user's role
  const availableRoles = userRole === "super_admin"
    ? Object.entries(roleLabels)
    : Object.entries(roleLabels).filter(([key]) => key !== "super_admin");

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/kullanicilar")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isNew ? "Yeni Kullanici Ekle" : form.name || form.email}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isNew ? "Sisteme yeni kullanici ekle" : `Kullanici #${kullaniciId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && userRole === "super_admin" && (
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
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === i
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* Tab 1: Kullanici Bilgileri */}
        {activeTab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ad Soyad */}
            <div>
              <label className={labelClass}>Ad Soyad</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ornek: Hasan Ali Bayrak"
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="ornek@sirket.com"
                className={inputClass}
              />
            </div>

            {/* Sifre */}
            <div>
              <label className={labelClass}>
                {isNew ? "Sifre *" : "Yeni Sifre"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder={isNew ? "En az 6 karakter" : "Bos birakirsaniz degismez"}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!isNew && (
                <p className="text-xs text-slate-400 mt-1">
                  Sifre degistirmek istemiyorsaniz bos birakin
                </p>
              )}
            </div>

            {/* Rol */}
            <div>
              <label className={labelClass}>Rol *</label>
              <select
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
                className={inputClass}
              >
                {availableRoles.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Sirket */}
            <div>
              <label className={labelClass}>Sirket</label>
              <select
                value={form.sirketId}
                onChange={(e) => handleChange("sirketId", e.target.value)}
                disabled={userRole === "sirket_yoneticisi"}
                className={`${inputClass} ${userRole === "sirket_yoneticisi" ? "bg-slate-50 cursor-not-allowed" : ""}`}
              >
                <option value="">Seciniz</option>
                {lookups?.sirketler.map((s) => (
                  <option key={s.id} value={s.id}>{s.sirketAdi}</option>
                ))}
              </select>
              {userRole === "sirket_yoneticisi" && (
                <p className="text-xs text-slate-400 mt-1">Sirket otomatik atanir</p>
              )}
            </div>

            {/* Lokasyon */}
            <div>
              <label className={labelClass}>Lokasyon</label>
              <select
                value={form.lokasyonId}
                onChange={(e) => handleChange("lokasyonId", e.target.value)}
                className={inputClass}
              >
                <option value="">Seciniz</option>
                {lookups?.lokasyonlar.map((l) => (
                  <option key={l.id} value={l.id}>{l.lokasyonAdi}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Tab 2: Durum & Bilgi */}
        {activeTab === 1 && (
          <div className="space-y-4">
            {/* Aktif/Pasif */}
            <div className="max-w-md">
              <label className={labelClass}>Kullanici Durumu</label>
              <select
                value={form.isActive ? "true" : "false"}
                onChange={(e) => handleChange("isActive", e.target.value === "true")}
                className={inputClass}
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>

            {/* Status banners */}
            {form.isActive ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Kullanici Aktif</p>
                  <p className="text-xs text-green-600 mt-0.5">Bu kullanici sisteme giris yapabilir</p>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">Kullanici Pasif</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Bu kullanici sisteme giris yapamaz. Email ve sifresi gecerli olsa bile erisim engellenir.
                  </p>
                </div>
              </div>
            )}

            {/* Info box */}
            {!isNew && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kullanici Bilgileri</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-400">Kullanici No:</span>{" "}
                    <span className="font-medium text-slate-700">#{kullaniciId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Rol:</span>{" "}
                    <span className="font-medium text-slate-700">{roleLabels[form.role] || form.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Kayit Tarihi:</span>{" "}
                    <span className="font-medium text-slate-700">
                      {createdAt ? new Date(createdAt).toLocaleDateString("tr-TR") : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Son Guncelleme:</span>{" "}
                    <span className="font-medium text-slate-700">
                      {updatedAt ? new Date(updatedAt).toLocaleString("tr-TR") : "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
