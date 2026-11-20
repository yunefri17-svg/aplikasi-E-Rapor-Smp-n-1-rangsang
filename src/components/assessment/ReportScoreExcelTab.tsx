import React, { useState } from 'react';
import {
  AssessmentScore,
  Classroom,
  LearningChapter,
  Student,
  Subject,
  SummativeAssessment,
  User
} from '../../types/erapor';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Check,
  RefreshCw,
  Lock
} from 'lucide-react';
import {
  ParsedReportScoreExcelResult,
  parseAndValidateReportScoreExcel,
  downloadReportScoreExcelTemplate
} from '../../services/assessmentExcelService';
import {
  buildDeterministicChapterSummativeId,
  buildDeterministicScoreId,
  computeStudentReportScore,
  getEffectiveSasScore,
  ResolvedSchoolWeights
} from '../../utils/assessmentCalculation';
import { normalizeAcademicYearValue, normalizeSemesterValue } from '../../utils/electiveSubjectHelper';

interface ReportScoreExcelTabProps {
  schoolName: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  subject: Subject;
  classroom: Classroom;
  students: Student[];
  chapters: LearningChapter[];
  scores: AssessmentScore[];
  summativeAssessments: SummativeAssessment[];
  weights: ResolvedSchoolWeights;
  currentUser: User;
  isReadOnly: boolean;
  onConfirmImport: (payload: {
    scoresToSave: AssessmentScore[];
    summativesToSave: SummativeAssessment[];
    notificationMessage: string;
  }) => void;
}

export const ReportScoreExcelTab: React.FC<ReportScoreExcelTabProps> = ({
  schoolName,
  academicYear,
  semester,
  subject,
  classroom,
  students,
  chapters,
  scores,
  summativeAssessments,
  weights,
  currentUser,
  isReadOnly,
  onConfirmImport
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedReportScoreExcelResult | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    downloadReportScoreExcelTemplate({
      schoolName,
      academicYear,
      semester,
      subject,
      classroom,
      students,
      chapters,
      scores,
      summativeAssessments,
      weights
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setParseResult(null);
    try {
      const res = await parseAndValidateReportScoreExcel(file, {
        academicYear,
        semester,
        subject,
        classroom,
        students,
        chapters,
        scores,
        weights
      });
      setParseResult(res);
    } catch (err: any) {
      alert(`Gagal memindai berkas Excel: ${err?.message || err}`);
    } finally {
      setIsUploading(false);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleConfirmSave = () => {
    if (!parseResult || parseResult.hasBlockingErrors || isReadOnly) return;

    const scoresToSave: AssessmentScore[] = [];
    const summativesToSave: SummativeAssessment[] = [];
    const nowIso = new Date().toISOString();
    const targetYear = normalizeAcademicYearValue(academicYear);
    const targetSem = normalizeSemesterValue(semester);
    let skippedLockedCount = 0;

    parseResult.validRows.forEach((row) => {
      if (!row.studentId) return;
      const std = students.find((s) => s.id === row.studentId);
      if (!std) return;

      const existing = scores.find(
        (sc) =>
          sc.studentId === std.id &&
          sc.subjectId === subject.id &&
          normalizeAcademicYearValue(sc.academicYear) === targetYear &&
          normalizeSemesterValue(sc.semester) === targetSem
      );

      if (existing?.status === 'TERKUNCI') {
        skippedLockedCount++;
        return;
      }

      const calc = computeStudentReportScore({
        chapters,
        chapterScores: row.chapterScores,
        sasScore: weights.sasConducted ? row.sasScore : undefined,
        formatifScores: existing?.formatifScores,
        lingkupMateriWeightPercent: weights.configuredLingkupMateriWeightPercent,
        sasWeightPercent: weights.configuredSasWeightPercent,
        sasConducted: weights.sasConducted,
        sasNotConductedPolicy: weights.sasNotConductedPolicy,
        passingCriteria: subject.kkm || weights.passingCriteria
      });

      const prevSas = getEffectiveSasScore(existing);
      const sasChanged = row.sasScore !== prevSas;
      const resolvedFinal = calc.finalScore ?? existing?.finalScore ?? 0;

      // Build updated AssessmentScore preserving existing Formatif KKTP/Show & descriptions
      const updatedScore: AssessmentScore = {
        ...(existing || {}),
        id: existing?.id || buildDeterministicScoreId(std.id, subject.id, academicYear, semester),
        studentId: std.id,
        studentName: std.name,
        subjectId: subject.id,
        subjectName: subject.name,
        classId: classroom.id,
        className: classroom.name,
        academicYear,
        semester,
        formatifScores: existing?.formatifScores || {},
        formatifAverage: existing?.formatifAverage,
        chapterScores: calc.chapterScores,
        sumatifMateriScores: {
          ...(existing?.sumatifMateriScores || {}),
          ...calc.chapterScores
        },
        babAverage: calc.babAverage,
        sumatifAverage: calc.sumatifAverage,
        sumatifAkhirSemester: row.sasScore ?? 0,
        hasSasScore: row.sasScore !== undefined,
        sasNonTes: sasChanged ? undefined : existing?.sasNonTes,
        sasTes: sasChanged ? row.sasScore : existing?.sasTes,
        naSas: row.sasScore,
        rawFinalScore: calc.rawFinalScore,
        manualFinalScore: undefined,
        finalScore: resolvedFinal,
        predicate: calc.predicate || row.predicate || 'D',
        completenessStatus: calc.completenessStatus,
        hasMissingComponents: calc.hasMissingComponents,
        missingComponentNote: calc.missingComponentNote,
        finalScoreBreakdown: calc.breakdownText,
        selectedOptimalTpIds: existing?.selectedOptimalTpIds || [],
        selectedImprovementTpIds: existing?.selectedImprovementTpIds || [],
        highestCompetenceDesc: existing?.highestCompetenceDesc || '',
        lowestCompetenceDesc: existing?.lowestCompetenceDesc || '',
        finalDescription: existing?.finalDescription || '',
        descriptionStatus: existing?.descriptionStatus || 'Belum dibuat',
        updatedAt: nowIso,
        updatedBy: currentUser.name,
        updatedById: currentUser.id,
        status: 'SELESAI'
      };
      scoresToSave.push(updatedScore);

      // Also generate individual chapter SummativeAssessments so Sumatif module stays in sync
      Object.entries(calc.chapterScores).forEach(([chId, val]) => {
        const ch = chapters.find((c) => c.id === chId);
        if (!ch) return;
        const saId = buildDeterministicChapterSummativeId(chId, std.id);
        const summativeItem: SummativeAssessment = {
          id: saId,
          studentId: std.id,
          teacherId: currentUser.teacherId || 'admin',
          subjectId: subject.id,
          classId: classroom.id,
          chapterId: ch.id,
          chapterCode: ch.code,
          chapterTitle: ch.title,
          tpId: ch.linkedTpIds?.[0] || 'tp-general',
          tpIds: ch.linkedTpIds?.length ? ch.linkedTpIds : ['tp-general'],
          assessmentTitle: `[Excel] ${ch.code}: ${ch.title}`,
          date: nowIso.split('T')[0],
          technique: 'tes tertulis',
          score: val,
          academicYear,
          semester,
          updatedAt: nowIso
        };
        summativesToSave.push(summativeItem);
      });
    });

    if (scoresToSave.length === 0) {
      setSuccessNotice(
        skippedLockedCount > 0
          ? `${skippedLockedCount} siswa berstatus TERKUNCI dilewati; tidak ada data yang diperbarui.`
          : 'Tidak ada baris nilai valid untuk disimpan.'
      );
      setTimeout(() => setSuccessNotice(null), 4000);
      return;
    }

    onConfirmImport({
      scoresToSave,
      summativesToSave,
      notificationMessage: `Berhasil mengimpor dan menghitung nilai rapor untuk ${scoresToSave.length} siswa melalui Excel.`
    });

    setSuccessNotice(
      `Berhasil menyimpan ${scoresToSave.length} data nilai dari Excel.${
        skippedLockedCount > 0 ? ` (${skippedLockedCount} siswa terkunci dilewati).` : ''
      }`
    );
    setParseResult(null);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Pengisian Nilai Rapor Melalui Excel (.xlsx)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unduh format Excel sesuai rombel dan mapel, isi nilai BAB dan SAS (0–100), lalu unggah kembali untuk kalkulasi dan penyimpanan otomatis.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={chapters.length === 0 || students.length === 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            Unduh Template Excel Rapor
          </button>
        </div>

        {chapters.length === 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Perhatian:</strong> Belum ada BAB Materi yang dibuat pada menu <strong>Asesmen Sumatif (BAB Materi)</strong> untuk mapel ini. Buat minimal 1 BAB terlebih dahulu agar kolom Excel dapat digenerate.
            </span>
          </div>
        )}

        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Upload Box */}
        {!isReadOnly && chapters.length > 0 && (
          <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Unggah Berkas Excel yang Telah Diisi</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pilih atau letakkan berkas .xlsx hasil pengisian nilai Anda</p>
            </div>
            <div>
              <label className="inline-block cursor-pointer px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition">
                <span>{isUploading ? 'Memproses Berkas...' : 'Pilih Berkas Excel (.xlsx)'}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  disabled={isUploading}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Pratinjau Hasil Impor Excel */}
      {parseResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Pratinjau Hasil Pembacaan Excel</h3>
              <p className="text-xs text-slate-500">
                Ditemukan {parseResult.rows.length} baris siswa ({parseResult.validRows.length} valid siap simpan).
              </p>
            </div>
            <button
              onClick={() => setParseResult(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error & Warning Banners */}
          {parseResult.metadataErrors.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Kesalahan Metadata / Header Berkas Excel:
              </div>
              <ul className="list-disc ml-5 space-y-0.5">
                {parseResult.metadataErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parseResult.errorRows.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Kesalahan Validasi Baris Siswa ({parseResult.errorRows.length} baris):
              </div>
              <ul className="list-disc ml-5 space-y-0.5">
                {parseResult.errorRows.flatMap((r) => r.errors).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parseResult.columnWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="font-bold">Peringatan Kolom:</div>
              <ul className="list-disc ml-5 space-y-0.5">
                {parseResult.columnWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 text-center w-10">No</th>
                  <th className="px-3 py-2.5">Nama Siswa</th>
                  <th className="px-3 py-2.5 text-center">NISN</th>
                  {chapters.map((ch) => (
                    <th key={ch.id} className="px-3 py-2.5 text-center">
                      {ch.code}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center bg-indigo-50">SAS</th>
                  <th className="px-3 py-2.5 text-center bg-emerald-50">Nilai Akhir</th>
                  <th className="px-3 py-2.5">Rincian Perhitungan</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parseResult.rows.map((row) => {
                  const hasErr = row.errors.length > 0;
                  return (
                    <tr
                      key={row.rowNumber}
                      className={hasErr ? 'bg-rose-50/50' : 'hover:bg-slate-50/50 transition'}
                    >
                      <td className="px-3 py-2.5 text-center text-slate-400">{row.rowNumber}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-800">{row.studentName}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-500 text-center">{row.nisn || '-'}</td>
                      {chapters.map((ch) => (
                        <td key={ch.id} className="px-3 py-2.5 text-center font-semibold">
                          {row.chapterScores[ch.id] !== undefined ? row.chapterScores[ch.id] : '--'}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-bold bg-indigo-50/30 text-indigo-900">
                        {row.sasScore !== undefined ? row.sasScore : '--'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-black bg-emerald-50/40 text-emerald-900">
                        {row.computedFinalScore !== undefined ? row.computedFinalScore : '--'}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-600 leading-tight">
                        {row.breakdownText}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {hasErr ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                            Error
                          </span>
                        ) : row.hasChanges ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            Valid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">
                            Kosong
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setParseResult(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs"
            >
              Batalkan Pratinjau
            </button>
            <button
              type="button"
              disabled={parseResult.hasBlockingErrors || parseResult.validRows.length === 0 || isReadOnly}
              onClick={handleConfirmSave}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
            >
              <Check className="w-4 h-4" />
              Konfirmasi &amp; Simpan {parseResult.validRows.length} Nilai ke Rapor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
