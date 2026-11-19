import React, { useState } from 'react';
import { Curriculum, User } from '../types/erapor';
import { Sparkles, Save, Check, Scale, BookOpen } from 'lucide-react';

interface DataKurikulumViewProps {
  curricula: Curriculum[];
  onSaveCurricula: (updated: Curriculum[]) => void;
  currentUser: User;
}

export const DataKurikulumView: React.FC<DataKurikulumViewProps> = ({
  curricula,
  onSaveCurricula,
  currentUser
}) => {
  const [list, setList] = useState<Curriculum[]>([...curricula]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onSaveCurricula(list);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Konfigurasi Struktur Kurikulum &amp; KKTP
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengaturan kurikulum resmi SMP Negeri 1 Rangsang, model pengolahan nilai rapor E-Rapor SMP, dan ambang batas ketercapaian (KKTP).
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <Check className="w-4 h-4" />
            Konfigurasi Kurikulum Berhasil Disimpan!
          </div>
        )}
      </div>

      <div className="space-y-6">
        {list.map((cur) => (
          <div
            key={cur.id}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  {cur.code}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">{cur.name}</h2>
                <p className="text-xs text-slate-500">{cur.phase} &bull; {cur.description}</p>
              </div>
            </div>

            {/* Active E-Rapor Policy + KKTP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <Scale className="w-4 h-4 text-blue-600" />
                    Model Pengolahan Nilai E-Rapor SMP
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                    Aktif
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                  <div className="p-2.5 rounded-lg bg-white border border-blue-100">
                    <div className="font-bold text-teal-800">1. Asesmen Formatif (KKTP 0/1 &amp; Deskripsi)</div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Digunakan untuk mencatat ketercapaian Tujuan Pembelajaran (<strong>KKTP 0/1</strong> &amp; pilihan <strong>Tampil/Tidak</strong>) serta menyusun deskripsi capaian tertinggi dan terendah pada rapor. Tidak dihitung sebagai komponen persentase angka rapor.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-blue-100">
                    <div className="font-bold text-blue-800">2. Asesmen Sumatif (Nilai Angka Rapor)</div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Nilai Rapor dihitung dari rata-rata <strong>Sumatif Lingkup Materi</strong> yang terisi, ditambah <strong>SAS</strong> (tidak wajib) apabila dilaksanakan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Kriteria Ketercapaian */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ambang Batas Nilai Ketuntasan Minimal (KKTP Satuan Pendidikan):
                    </label>
                    <input
                      type="number"
                      value={cur.passingCriteria}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setList(
                          list.map((c) => (c.id === cur.id ? { ...c, passingCriteria: val } : c))
                        );
                      }}
                      disabled={currentUser.role !== 'admin'}
                      className="w-32 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-bold bg-white"
                      min={60}
                      max={90}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Siswa dengan nilai &ge; {cur.passingCriteria} dinyatakan Mencapai Tujuan Pembelajaran (Tuntas), sedangkan &lt; {cur.passingCriteria} memerlukan bimbingan remidial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {currentUser.role === 'admin' && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              Simpan Konfigurasi Kurikulum
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
