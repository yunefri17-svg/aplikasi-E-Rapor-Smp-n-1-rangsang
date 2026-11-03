import React, { useState } from 'react';
import { SchoolProfile, User } from '../types/erapor';
import { School, Save, RotateCcw, Check, Building2, MapPin, Mail, Phone, Globe, UserCheck, Calendar } from 'lucide-react';

interface DataSekolahViewProps {
  school: SchoolProfile;
  onSave: (updated: SchoolProfile) => void;
  currentUser: User;
}

export const DataSekolahView: React.FC<DataSekolahViewProps> = ({
  school,
  onSave,
  currentUser
}) => {
  const [form, setForm] = useState<SchoolProfile>({ ...school });
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <School className="w-5 h-5 text-blue-600" />
            Identitas & Data Satuan Pendidikan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola profil resmi sekolah yang dicetak pada halaman judul, kop surat, dan lembar rapor peserta didik.
          </p>
        </div>

        {isSaved && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-in fade-in">
            <Check className="w-4 h-4" />
            Data Profil Sekolah Berhasil Disimpan!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Utama */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Informasi Satuan Pendidikan (Dapodik)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NPSN</label>
              <input
                type="text"
                value={form.npsn}
                onChange={(e) => setForm({ ...form, npsn: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">NSS (No. Statistik Sekolah)</label>
              <input
                type="text"
                value={form.nss || ''}
                placeholder="201040101001"
                onChange={(e) => setForm({ ...form, nss: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Nama Resmi Sekolah</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jenjang Pendidikan</label>
              <select
                value={form.jenjang}
                onChange={(e) => setForm({ ...form, jenjang: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status Sekolah</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="Negeri">Negeri</option>
                <option value="Swasta">Swasta</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kode Pos</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Alamat & Wilayah */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Alamat & Lokasi Sekolah
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Alamat Jalan / Gedung</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Desa / Kelurahan</label>
              <input
                type="text"
                value={form.desa}
                onChange={(e) => setForm({ ...form, desa: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kecamatan</label>
              <input
                type="text"
                value={form.kecamatan}
                onChange={(e) => setForm({ ...form, kecamatan: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kabupaten / Kota</label>
              <input
                type="text"
                value={form.kabupaten}
                onChange={(e) => setForm({ ...form, kabupaten: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Provinsi</label>
              <input
                type="text"
                value={form.provinsi}
                onChange={(e) => setForm({ ...form, provinsi: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Kontak & Media */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-600" />
            Kontak & Kanal Komunikasi
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Sekolah</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Website Resmi</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Kepala Sekolah & Penandatanganan Rapor */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-600" />
            Kepala Sekolah & Legalisasi Rapor
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Kepala Sekolah (beserta Gelar)</label>
              <input
                type="text"
                value={form.headmasterName}
                onChange={(e) => setForm({ ...form, headmasterName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={form.headmasterNip}
                onChange={(e) => setForm({ ...form, headmasterNip: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tempat Penerbitan Rapor</label>
              <input
                type="text"
                value={form.reportPlace}
                onChange={(e) => setForm({ ...form, reportPlace: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Tanjung Samak"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Penerbitan / Pembagian Rapor</label>
              <input
                type="text"
                value={form.reportDate}
                onChange={(e) => setForm({ ...form, reportDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: 20 Desember 2024"
                required
              />
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setForm({ ...school })}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center gap-2 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Perubahan
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            Simpan Profil Sekolah
          </button>
        </div>
      </form>
    </div>
  );
};
