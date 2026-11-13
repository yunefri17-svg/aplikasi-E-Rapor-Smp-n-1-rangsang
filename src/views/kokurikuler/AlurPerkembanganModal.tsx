import React, { useState } from 'react';
import { KokurikulerDimensionMaster } from '../../types/erapor';
import { OFFICIAL_KOKURIKULER_DIMENSIONS } from '../../data/kokurikulerMaster';
import { BookOpenCheck, X, CheckCircle2, Sparkles, Compass } from 'lucide-react';

interface AlurPerkembanganModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions?: KokurikulerDimensionMaster[];
  focusDimensionIds?: string[];
  focusSubdimensionIds?: string[];
  title?: string;
}

export const AlurPerkembanganModal: React.FC<AlurPerkembanganModalProps> = ({
  isOpen,
  onClose,
  dimensions,
  focusDimensionIds,
  focusSubdimensionIds,
  title = 'Alur Perkembangan Kompetensi Kokurikuler — SMP (Fase D)'
}) => {
  const sourceDims =
    dimensions && dimensions.length > 0 ? dimensions : OFFICIAL_KOKURIKULER_DIMENSIONS;

  const [showOnlyFocused, setShowOnlyFocused] = useState(
    Boolean(focusDimensionIds && focusDimensionIds.length > 0)
  );
  const [activeDimId, setActiveDimId] = useState<string>(
    (focusDimensionIds && focusDimensionIds[0]) || sourceDims[0]?.id || 'dim-1'
  );

  if (!isOpen) return null;

  const visibleDims =
    showOnlyFocused && focusDimensionIds && focusDimensionIds.length > 0
      ? sourceDims.filter((d) => focusDimensionIds.includes(d.id))
      : sourceDims;

  const activeDim = visibleDims.find((d) => d.id === activeDimId) || visibleDims[0] || sourceDims[0];
  const targetSubSet = new Set(focusSubdimensionIds || []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Referensi Resmi Keputusan Kepala BSKAP No. 058/H/KR/2025 &bull; Jenjang SMP (Fase D)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-2.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {visibleDims.map((dim) => (
              <button
                key={dim.id}
                type="button"
                onClick={() => setActiveDimId(dim.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap border transition ${
                  activeDim?.id === dim.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {dim.order}. {dim.shortName}
              </button>
            ))}
          </div>

          {focusDimensionIds && focusDimensionIds.length > 0 && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={showOnlyFocused}
                onChange={(e) => {
                  const next = e.target.checked;
                  setShowOnlyFocused(next);
                  if (next && focusDimensionIds.length > 0) {
                    setActiveDimId(focusDimensionIds[0]);
                  }
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Tampilkan dimensi kegiatan aktif saja ({focusDimensionIds.length})
            </label>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {activeDim && (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide">
                  <Compass className="w-4 h-4" />
                  Dimensi {activeDim.order} Profil Lulusan
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{activeDim.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeDim.description}</p>
              </div>

              <div className="space-y-3">
                {activeDim.subdimensions.map((sub) => {
                  const isTargeted = targetSubSet.has(sub.id);
                  return (
                    <div
                      key={sub.id}
                      className={`bg-white rounded-lg border overflow-hidden ${
                        isTargeted ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-200'
                      }`}
                    >
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded">
                            {sub.code}
                          </span>
                          <span className="text-sm font-bold text-slate-900">{sub.name}</span>
                        </div>
                        {isTargeted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Subdimensi Target Kegiatan
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        <div className="p-3.5 bg-amber-50/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                              1 &bull; Berkembang
                            </span>
                            <span className="text-[11px] font-medium text-amber-700">Tahap Awal</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {sub.levelDescriptions.Berkembang}
                          </p>
                        </div>

                        <div className="p-3.5 bg-emerald-50/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                              2 &bull; Cakap
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Standar Kelulusan SMP
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {sub.levelDescriptions.Cakap}
                          </p>
                        </div>

                        <div className="p-3.5 bg-blue-50/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                              3 &bull; Mahir
                            </span>
                            <span className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Melampaui Standar
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {sub.levelDescriptions.Mahir}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            Catatan: Penilaian kokurikuler menggunakan 3 tingkatan (Berkembang, Cakap, Mahir) tanpa konversi angka 0–100.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            Tutup Referensi
          </button>
        </div>
      </div>
    </div>
  );
};
