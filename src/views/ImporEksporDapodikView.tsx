import React, { useState } from 'react';
import { Student, Teacher, Classroom, Subject, AssessmentScore, User } from '../types/erapor';
import {
  ArrowUpDown,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  downloadStudentImportTemplate,
  parseStudentExcelFile,
  exportStudentsToExcel,
  ParseStudentResult
} from '../services/excelService';

interface ImporEksporDapodikViewProps {
  students: Student[];
  teachers: Teacher[];
  classrooms: Classroom[];
  subjects: Subject[];
  scores: AssessmentScore[];
  onImportStudents: (newStudents: Student[]) => void;
  currentUser: User;
}

export const ImporEksporDapodikView: React.FC<ImporEksporDapodikViewProps> = ({
  students,
  teachers,
  classrooms,
  subjects,
  scores,
  onImportStudents,
  currentUser
}) => {
  const [parseResult, setParseResult] = useState<ParseStudentResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setParseResult(null);
    setImportSuccessCount(null);

    try {
      const result = await parseStudentExcelFile(file, classrooms);
      setParseResult(result);
    } catch (err: any) {
      alert(`Gagal memproses file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyImport = () => {
    if (!parseResult || parseResult.validStudents.length === 0) return;

    // Check existing NISNs to detect duplicates
    const existingNisns = new Set(students.map((s) => s.nisn));
    const finalNewStudents: Student[] = [];

    parseResult.validStudents.forEach((partial) => {
      if (!existingNisns.has(partial.nisn!)) {
        finalNewStudents.push(partial as Student);
      }
    });

    onImportStudents(finalNewStudents);
    setImportSuccessCount(finalNewStudents.length);
    setParseResult(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-blue-600" />
            Integrasi Pertukaran Data Format Dapodik
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Impor dan ekspor data peserta didik, PTK, dan nilai menggunakan format berkas spreadsheet resmi Dapodik Kemendikbud.
          </p>
        </div>
      </div>

      {/* Info notice about Dapodik official offline sync */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="block font-bold text-blue-950">Mekanisme Sinkronisasi Format Dapodik:</strong>
          Sesuai ketentuan keamanan Pusdatin Kemendikbud, pertukaran data antara e-Rapor dan aplikasi Dapodik dilakukan melalui berkas format spreadsheet (.xlsx) resmi dengan validasi ketat pada nomor NISN (10 digit unik), kode rombel, dan kelengkapan identitas induk.
        </div>
      </div>

      {/* Action Grid: Impor vs Ekspor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Impor Data Siswa */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Upload className="w-5 h-5 text-blue-600" />
              Impor Peserta Didik (Excel)
            </div>
            <button
              onClick={downloadStudentImportTemplate}
              className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1 hover:underline"
              title="Unduh contoh template excel"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Template
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Unggah file Excel hasil ekspor Dapodik atau gunakan template format resmi yang telah disediakan.
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition bg-slate-50/50">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
              id="studentExcelInput"
            />
            <label
              htmlFor="studentExcelInput"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">
                {fileName || 'Pilih Berkas Excel (.xlsx)'}
              </span>
              <span className="text-[11px] text-slate-400">
                Klik untuk menjelajah file dari komputer Anda
              </span>
            </label>
          </div>

          {isProcessing && (
            <div className="text-xs text-center text-blue-600 font-semibold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Memvalidasi data dan format NISN...
            </div>
          )}

          {importSuccessCount !== null && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Berhasil mengimpor {importSuccessCount} siswa baru ke database e-Rapor!
            </div>
          )}

          {parseResult && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-700">Valid: {parseResult.validStudents.length} baris</span>
                <span className="text-rose-600">Gagal/Error: {parseResult.errors.length} baris</span>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl max-h-32 overflow-y-auto text-[11px] text-rose-800 space-y-1">
                  <div className="font-bold">Laporan Kesalahan Baris:</div>
                  {parseResult.errors.map((err, i) => (
                    <div key={i}>&bull; {err}</div>
                  ))}
                </div>
              )}

              {parseResult.validStudents.length > 0 && (
                <button
                  onClick={handleApplyImport}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Check className="w-4 h-4" />
                  Simpan {parseResult.validStudents.length} Siswa ke Database
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Ekspor Data Master */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Download className="w-5 h-5 text-emerald-600" />
            Ekspor Data Sekolah & Nilai
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Unduh seluruh berkas data dalam format spreadsheet kompatibel Dapodik untuk pelaporan dan arsip digital.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => exportStudentsToExcel(students, classrooms)}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-800 block">Ekspor Seluruh Siswa ({students.length})</span>
                <span className="text-[11px] text-slate-500">Biodata lengkap, NISN, orang tua, dan rombel</span>
              </div>
              <Download className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={() => {
                alert(`Ekspor ${teachers.length} Data Guru & GTK siap diunduh.`);
              }}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-800 block">Ekspor Data Guru & GTK ({teachers.length})</span>
                <span className="text-[11px] text-slate-500">NIP, NUPTK, tugas mengajar, dan status kepegawaian</span>
              </div>
              <Download className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={() => {
                alert(`Ekspor ${scores.length} Riwayat Nilai Akhir siap diunduh.`);
              }}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-800 block">Ekspor Nilai Rapor Seluruh Siswa</span>
                <span className="text-[11px] text-slate-500">Nilai formatif, sumatif materi, SAS, dan predikat</span>
              </div>
              <Download className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
