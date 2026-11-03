import React from 'react';
import { BookOpen, Award, CheckCircle2, Sparkles, Scale, Info, Layers } from 'lucide-react';

export const DataReferensiView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Data Referensi & Pedoman Penilaian Kemendikbud
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Panduan teknis dan acuan regulasi pelaksanaan penilaian e-Rapor resmi bagi jenjang Sekolah Menengah Pertama (SMP).
        </p>
      </div>

      {/* Grid of reference modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Kurikulum Merdeka Fase D */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-blue-700">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-bold text-sm text-slate-800">
              Prinsip Kurikulum Merdeka (Fase D SMP)
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Kurikulum Merdeka mengedepankan pembelajaran berpusat pada siswa dengan pembagian Fase D untuk kelas VII, VIII, dan IX.
            Penilaian tidak sekadar angka ujian, melainkan umpan balik menyeluruh terhadap pencapaian Tujuan Pembelajaran (TP).
          </p>
          <ul className="text-xs space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Formatif:</strong> Penilaian sepanjang proses pembelajaran untuk perbaikan cara belajar siswa.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Sumatif Lingkup Materi:</strong> Mengukur ketercapaian seluruh TP pada setiap unit/bab materi.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Sumatif Akhir Semester (SAS):</strong> Pengukuran komprehensif pada akhir masa semester.</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Interval Predikat & Nilai Akhir */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-indigo-700">
            <Scale className="w-5 h-5" />
            <h2 className="font-bold text-sm text-slate-800">
              Interval Predikat & Kriteria Ketercapaian
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Konversi interval nilai rapor SMP Negeri 1 Rangsang mengacu pada rentang capaian standar nasional:
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2">Rentang Nilai</th>
                  <th className="px-3 py-2 text-center">Predikat</th>
                  <th className="px-3 py-2">Keterangan Capaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="px-3 py-2 font-semibold">90 - 100</td>
                  <td className="px-3 py-2 text-center font-bold text-blue-700">A</td>
                  <td className="px-3 py-2">Sangat Baik / Menguasai dengan Istimewa</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-semibold">80 - 89</td>
                  <td className="px-3 py-2 text-center font-bold text-emerald-700">B</td>
                  <td className="px-3 py-2">Baik / Menguasai Kompetensi</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-semibold">75 - 79</td>
                  <td className="px-3 py-2 text-center font-bold text-amber-700">C</td>
                  <td className="px-3 py-2">Cukup / Memenuhi Kriteria Minimal</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-semibold">&lt; 75</td>
                  <td className="px-3 py-2 text-center font-bold text-rose-700">D</td>
                  <td className="px-3 py-2">Perlu Bimbingan & Remidial Khusus</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 3: Struktur Mata Pelajaran SMP */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-purple-700">
            <Layers className="w-5 h-5" />
            <h2 className="font-bold text-sm text-slate-800">
              Struktur Kelompok Mata Pelajaran
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Struktur kurikulum SMP membagi mata pelajaran ke dalam:
          </p>
          <ul className="text-xs space-y-2 text-slate-600">
            <li>
              <strong>Kelompok A (Inti):</strong> PAIBP, Pendidikan Pancasila, Bahasa Indonesia, Matematika, IPA, IPS, Bahasa Inggris.
            </li>
            <li>
              <strong>Kelompok B:</strong> PJOK, Informatika, Seni Budaya & Prakarya.
            </li>
            <li>
              <strong>Muatan Lokal Wajib Daerah:</strong> Budaya Melayu Riau (BMR) sesuai Perda & Pergub Provinsi Riau untuk pelestarian sastra, adat resam, dan aksara Arab Melayu.
            </li>
          </ul>
        </div>

        {/* Card 4: Tata Cara Deskripsi Rapor */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-amber-700">
            <Info className="w-5 h-5" />
            <h2 className="font-bold text-sm text-slate-800">
              Kaidah Deskripsi Capaian Kompetensi
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Dalam e-Rapor resmi Kemendikbud, kolom deskripsi rapor terdiri dari dua bagian pokok yang dirangkum otomatis dari penilaian guru:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
              <span className="font-bold block text-emerald-800">1. Capaian Tertinggi:</span>
              Menjelaskan Tujuan Pembelajaran yang paling dikuasai siswa dengan frasa positif (&ldquo;Menunjukkan penguasaan sangat baik dalam...&rdquo;).
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
              <span className="font-bold block text-amber-800">2. Capaian Terendah / Perlu Peningkatan:</span>
              Menjelaskan Tujuan Pembelajaran yang membutuhkan pendampingan lebih lanjut (&ldquo;Perlu bimbingan dalam...&rdquo;).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
