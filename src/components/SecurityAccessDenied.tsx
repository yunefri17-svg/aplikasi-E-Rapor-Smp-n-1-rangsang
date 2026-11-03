import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
import { User, Classroom } from '../types/erapor';

interface SecurityAccessDeniedProps {
  currentUser: User | null;
  targetClassroom?: Classroom | null;
  authorizedClassroom?: Classroom | null;
  onResetToAuthorizedClass?: () => void;
  customMessage?: string;
}

export const SecurityAccessDenied: React.FC<SecurityAccessDeniedProps> = ({
  currentUser,
  targetClassroom,
  authorizedClassroom,
  onResetToAuthorizedClass,
  customMessage
}) => {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-red-200 overflow-hidden text-center p-8">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-red-50">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 uppercase tracking-wider mb-3">
          <Lock className="w-3.5 h-3.5" /> Pelanggaran Hak Akses (RBAC)
        </span>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {customMessage || "AKSES DITOLAK. Anda tidak memiliki kewenangan untuk mengakses data kelas ini."}
        </h2>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Sistem keamanan E-Rapor SMP Negeri 1 Rangsang membatasi akses setiap Wali Kelas hanya untuk rombongan belajar yang ditugaskan resmi oleh Administrator.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200 text-left space-y-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-gray-100">
            <span className="text-gray-500">Akun Pengguna:</span>
            <span className="font-semibold text-gray-800">{currentUser?.name} (@{currentUser?.username})</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-100">
            <span className="text-gray-500">Peran Sistem:</span>
            <span className="font-semibold text-blue-700 capitalize">{currentUser?.role}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-100">
            <span className="text-gray-500">Kelas Kewenangan Anda:</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {authorizedClassroom?.name || 'Belum Terhubung'}
            </span>
          </div>
          {targetClassroom && (
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500">Kelas yang Dicoba Diakses:</span>
              <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 line-through">
                {targetClassroom.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onResetToAuthorizedClass && authorizedClassroom && (
            <button
              onClick={onResetToAuthorizedClass}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 transition shadow-sm text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Buka {authorizedClassroom.name}
            </button>
          )}
        </div>

        <p className="text-[11px] text-gray-400 mt-5">
          Percobaan akses di luar hak akses dicatat dalam log audit sistem keamanan sekolah.
        </p>
      </div>
    </div>
  );
};
