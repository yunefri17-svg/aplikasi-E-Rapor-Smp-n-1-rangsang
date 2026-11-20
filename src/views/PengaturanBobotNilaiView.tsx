import React, { useEffect, useMemo, useState } from 'react';
import { AssessmentPolicyConfig, SasNotConductedPolicy, User } from '../types/erapor';
import {
  DEFAULT_ASSESSMENT_POLICY,
  normalizeAssessmentPolicy
} from '../utils/tpAnalysisAndDescription';
import { computeStudentReportScore, formatScoreDecimal } from '../utils/assessmentCalculation';
import {
  Scale,
  Save,
  Lock,
  CheckCircle2,
  Sliders,
  AlertCircle,
  Calculator,
  Info,
  ShieldCheck
} from 'lucide-react';

interface PengaturanBobotNilaiViewProps {
  assessmentPolicy?: AssessmentPolicyConfig;
  currentUser: User;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  onSaveAssessmentPolicy?: (policy: AssessmentPolicyConfig) => void;
  embedded?: boolean;
}

const WEIGHT_PRESETS: Array<{ label: string; lm: number; sas: number }> = [
  { label: '70% : 30% (Bawaan)', lm: 70, sas: 30 },
  { label: '60% : 40%', lm: 60, sas: 40 },
  { label: '80% : 20%', lm: 80, sas: 20 },
  { label: '50% : 50%', lm: 50, sas: 50 },
  { label: '100% : 0%', lm: 100, sas: 0 }
];

export const PengaturanBobotNilaiView: React.FC<PengaturanBobotNilaiViewProps> = ({
  assessmentPolicy,
  currentUser,
  academicYear,
  semester,
  onSaveAssessmentPolicy,
  embedded = false
}) => {
  const isAdmin = currentUser.role === 'admin';
  const normalizedCurrent = useMemo(
    () => normalizeAssessmentPolicy(assessmentPolicy || DEFAULT_ASSESSMENT_POLICY),
    [assessmentPolicy]
  );

  const [lmWeight, setLmWeight] = useState<number>(
    normalizedCurrent.lingkupMateriWeightPercent ?? 70
  );
  const [sasWeight, setSasWeight] = useState<number>(
    normalizedCurrent.sasWeightPercent ?? 30
  );
  const [sasConducted, setSasConducted] = useState<boolean>(
    normalizedCurrent.sasConducted ?? true
  );
  const [sasNotConductedPolicy, setSasNotConductedPolicy] = useState<SasNotConductedPolicy>(
    normalizedCurrent.sasNotConductedPolicy ?? 'lingkup_materi_100'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sample simulation inputs for Admin/Guru clarity
  const [sampleLmAvg, setSampleLmAvg] = useState<number>(85);
  const [sampleSasScore, setSampleSasScore] = useState<number>(80);

  useEffect(() => {
    setLmWeight(normalizedCurrent.lingkupMateriWeightPercent ?? 70);
    setSasWeight(normalizedCurrent.sasWeightPercent ?? 30);
    setSasConducted(normalizedCurrent.sasConducted ?? true);
    setSasNotConductedPolicy(
      normalizedCurrent.sasNotConductedPolicy ?? 'lingkup_materi_100'
    );
  }, [normalizedCurrent]);

  const clampPct = (val: number) => {
    if (!Number.isFinite(val)) return 0;
    return Math.min(100, Math.max(0, Math.round(val)));
  };

  const handleLmChange = (rawVal: number) => {
    if (!isAdmin) return;
    const clamped = clampPct(rawVal);
    setLmWeight(clamped);
    setSasWeight(100 - clamped);
    setErrorMsg(null);
  };

  const handleSasChange = (rawVal: number) => {
    if (!isAdmin) return;
    const clamped = clampPct(rawVal);
    setSasWeight(clamped);
    setLmWeight(100 - clamped);
    setErrorMsg(null);
  };

  const handleApplyPreset = (lm: number, sas: number) => {
    if (!isAdmin) return;
    setLmWeight(lm);
    setSasWeight(sas);
    setErrorMsg(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !onSaveAssessmentPolicy) return;

    if (lmWeight + sasWeight !== 100) {
      setErrorMsg('Total bobot Sumatif Lingkup Materi + SAS harus selalu tepat 100%.');
      return;
    }

    const updated = normalizeAssessmentPolicy({
      ...normalizedCurrent,
      lingkupMateriWeightPercent: lmWeight,
      sasWeightPercent: sasWeight,
      sasConducted,
      sasNotConductedPolicy,
      confirmedFormulaNote:
        !sasConducted && sasNotConductedPolicy === 'lingkup_materi_100'
          ? 'SAS tidak dilaksanakan: Nilai Rapor = 100% × Rata-rata Sumatif Lingkup Materi.'
          : `Nilai Rapor = (Rata-rata Sumatif Lingkup Materi × ${lmWeight}%) + (Nilai SAS × ${sasWeight}%).`,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name
    });

    onSaveAssessmentPolicy(updated);
    setErrorMsg(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const effectiveLmDisplay =
    !sasConducted && sasNotConductedPolicy === 'lingkup_materi_100' ? 100 : lmWeight;
  const effectiveSasDisplay =
    !sasConducted && sasNotConductedPolicy === 'lingkup_materi_100' ? 0 : sasWeight;

  const previewCalc = useMemo(() => {
    return computeStudentReportScore({
      chapters: [
        {
          id: 'preview-bab-1',
          code: 'BAB 1',
          orderIndex: 1,
          title: 'Contoh BAB',
          subjectId: 'preview',
          classId: 'preview',
          gradeLevel: '7',
          teacherId: 'preview',
          academicYear,
          semester,
          createdAt: '',
          updatedAt: ''
        }
      ],
      chapterScores: { 'preview-bab-1': sampleLmAvg },
      sasScore: sasConducted ? sampleSasScore : undefined,
      lingkupMateriWeightPercent: lmWeight,
      sasWeightPercent: sasWeight,
      sasConducted,
      sasNotConductedPolicy
    });
  }, [sampleLmAvg, sampleSasScore, lmWeight, sasWeight, sasConducted, sasNotConductedPolicy, academicYear, semester]);

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200'}>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              PENGATURAN BOBOT NILAI RAPOR
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfigurasi persentase Sumatif Lingkup Materi, Sumatif Akhir Semester (SAS), serta kebijakan jika SAS tidak dilaksanakan ({academicYear} • Semester {semester}).
            </p>
          </div>
          {!isAdmin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              Mode Lihat Saja (Ditetapkan Admin)
            </span>
          )}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
                PENGATURAN BOBOT NILAI RAPOR
              </h2>
              <p className="text-[11px] text-indigo-200">
                Tersinkronisasi otomatis via Firebase ke seluruh guru, Cetak Rapor, Leger, dan Rekapitulasi Nilai.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Total Bobot: {lmWeight + sasWeight}%
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6 text-xs">
          {!isAdmin && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block">Akses Baca Saja untuk {currentUser.role.toUpperCase()}</strong>
                <span>
                  Hanya Administrator yang dapat mengubah bobot persentase nilai rapor. Di bawah ini adalah persentase resmi yang sedang berlaku.
                </span>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pengaturan Bobot Nilai Rapor berhasil disimpan ke Firebase dan langsung berlaku di semua perangkat.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Presets */}
          {isAdmin && (
            <div>
              <label className="block font-bold text-slate-700 mb-2">
                Pilihan Cepat Rasio Bobot (Lingkup Materi : SAS)
              </label>
              <div className="flex flex-wrap gap-2">
                {WEIGHT_PRESETS.map((preset) => {
                  const isActive = lmWeight === preset.lm && sasWeight === preset.sas;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset.lm, preset.sas)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Coupled Weight Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-950 text-sm">
                  1. Sumatif Lingkup Materi (BAB)
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-black text-sm">
                  {lmWeight}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={!isAdmin}
                value={lmWeight}
                onChange={(e) => handleLmChange(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-semibold">Input Persentase (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={!isAdmin}
                  value={lmWeight}
                  onChange={(e) => handleLmChange(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-indigo-300 bg-white font-extrabold text-slate-900 text-center disabled:bg-slate-100"
                />
                <span className="text-slate-500 text-[11px]">
                  (Otomatis menyesuaikan SAS menjadi {100 - lmWeight}%)
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sky-950 text-sm">
                  2. Sumatif Akhir Semester (SAS)
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-sky-600 text-white font-black text-sm">
                  {sasWeight}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={!isAdmin}
                value={sasWeight}
                onChange={(e) => handleSasChange(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-semibold">Input Persentase (%):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={!isAdmin}
                  value={sasWeight}
                  onChange={(e) => handleSasChange(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-sky-300 bg-white font-extrabold text-slate-900 text-center disabled:bg-slate-100"
                />
                <span className="text-slate-500 text-[11px]">
                  (Otomatis menyesuaikan Lingkup Materi menjadi {100 - sasWeight}%)
                </span>
              </div>
            </div>
          </div>

          {/* SAS Execution & Policy When Not Conducted */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Kebijakan Pelaksanaan Sumatif Akhir Semester (SAS)
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Jika sekolah tidak melaksanakan SAS pada periode ini, nilai SAS tidak akan otomatis dianggap 0. Pilih aturan resmi sekolah di bawah ini.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setSasConducted(true)}
                  className={`px-3 py-2 rounded-lg border font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed ${
                    sasConducted
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  SAS Dilaksanakan
                </button>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setSasConducted(false)}
                  className={`px-3 py-2 rounded-lg border font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed ${
                    !sasConducted
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  SAS Tidak Dilaksanakan
                </button>
              </div>
            </div>

            {!sasConducted && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                <div className="font-bold text-amber-950 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Pengaturan Kebijakan Saat SAS Tidak Dilaksanakan:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      sasNotConductedPolicy === 'lingkup_materi_100'
                        ? 'bg-white border-amber-500 ring-2 ring-amber-400/40'
                        : 'bg-white/60 border-amber-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sasNotConductedPolicy"
                      disabled={!isAdmin}
                      checked={sasNotConductedPolicy === 'lingkup_materi_100'}
                      onChange={() => setSasNotConductedPolicy('lingkup_materi_100')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span className="font-extrabold text-slate-900 block">
                        Gunakan Bobot Lingkup Materi 100%
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Untuk periode tanpa SAS, Nilai Rapor dihitung 100% dari Rata-rata Sumatif Lingkup Materi (SAS = 0%).
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      sasNotConductedPolicy === 'keep_weight_mark_incomplete'
                        ? 'bg-white border-amber-500 ring-2 ring-amber-400/40'
                        : 'bg-white/60 border-amber-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sasNotConductedPolicy"
                      disabled={!isAdmin}
                      checked={sasNotConductedPolicy === 'keep_weight_mark_incomplete'}
                      onChange={() => setSasNotConductedPolicy('keep_weight_mark_incomplete')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span className="font-extrabold text-slate-900 block">
                        Pertahankan Bobot ({lmWeight}% : {sasWeight}%) & Tandai Belum Lengkap
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Bobot tetap {lmWeight}% LM + {sasWeight}% SAS; nilai SAS kosong tidak dianggap 0 dan status siswa ditandai menunggu SAS.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Formula & Live Simulation Box */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 font-extrabold text-emerald-950">
              <Calculator className="w-4 h-4 text-emerald-700" />
              <span>Rumus Aktif & Simulasi Perhitungan Nilai Rapor</span>
            </div>
            <div className="p-3 rounded-lg bg-white border border-emerald-200 font-mono text-xs font-bold text-emerald-900">
              Nilai Rapor = (Rata-rata Sumatif Lingkup Materi × {effectiveLmDisplay}%) + (Nilai SAS × {effectiveSasDisplay}%)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Simulasi Rata-rata BAB
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={sampleLmAvg}
                  onChange={(e) => setSampleLmAvg(clampPct(Number(e.target.value)))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Simulasi Nilai Akhir SAS
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={!sasConducted}
                  value={sasConducted ? sampleSasScore : ''}
                  placeholder={!sasConducted ? 'SAS Tidak Dilaksanakan' : '0-100'}
                  onChange={(e) => setSampleSasScore(clampPct(Number(e.target.value)))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-900 disabled:bg-slate-100"
                />
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-600 text-white flex flex-col justify-center">
                <span className="text-[10px] uppercase tracking-wider text-emerald-100 font-semibold">
                  Hasil Simulasi Nilai Rapor
                </span>
                <div className="text-lg font-black">
                  {previewCalc.finalScore ?? '-'}{' '}
                  <span className="text-xs font-semibold text-emerald-100">
                    (Desimal: {previewCalc.rawFinalScore !== undefined ? formatScoreDecimal(previewCalc.rawFinalScore) : '-'})
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              Rincian: {previewCalc.breakdownText}
            </p>
          </div>

          {/* Info Note about Formatif vs Sumatif + Historical Data */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
            <strong className="block font-bold mb-0.5">Perlindungan Data & Arsip Rapor Lama:</strong>
            Asesmen Formatif hanya menyusun deskripsi capaian TP rapor, sedangkan Nilai Rapor dihitung murni dari Asesmen Sumatif sesuai bobot di atas. Nilai dan arsip rapor periode lama yang berstatus Terkunci/Arsip tetap terjaga dan tidak diubah otomatis.
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan Pengaturan Bobot Nilai Rapor ke Firebase
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
