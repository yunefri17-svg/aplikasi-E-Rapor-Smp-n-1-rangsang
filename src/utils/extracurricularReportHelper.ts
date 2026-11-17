import { Extracurricular, StudentExtracurricular } from '../types/erapor';

export interface ResolvedExtracurricularRow {
  id: string;
  extracurricularId: string;
  no: number;
  activityName: string;
  predicate: string;
  description: string;
}

const NON_PARTICIPATION_MARKERS = new Set([
  '-',
  'tidak mengikuti',
  'tidak aktif',
  'non-aktif',
  'nonaktif',
  'tidak ada'
]);

const normalizeText = (value?: string | null): string => (value ?? '').trim();

const isNonParticipationRecord = (se: StudentExtracurricular): boolean => {
  const pred = normalizeText(se.predicate).toLowerCase();
  const desc = normalizeText(se.description).toLowerCase();
  if (pred && NON_PARTICIPATION_MARKERS.has(pred) && (!desc || NON_PARTICIPATION_MARKERS.has(desc))) {
    return true;
  }
  if (desc === 'tidak mengikuti' || desc === 'tidak mengikuti kegiatan ekstrakurikuler') {
    return true;
  }
  return false;
};

/**
 * Resolves extracurricular rows strictly for a single student, academicYear, and semester.
 * Never fabricates default Pramuka participation or borrows records from other students/periods.
 */
export function resolveStudentExtracurricularRows(params: {
  studentId?: string;
  academicYear?: string;
  semester?: 'Ganjil' | 'Genap' | string;
  extracurriculars: Extracurricular[];
  studentExtracurriculars: StudentExtracurricular[];
}): ResolvedExtracurricularRow[] {
  const targetStudentId = normalizeText(params.studentId);
  const targetYear = normalizeText(params.academicYear);
  const targetSemester = normalizeText(params.semester);

  if (!targetStudentId || !targetYear || !targetSemester) {
    return [];
  }

  const ekskulById = new Map<string, { name: string; order: number }>();
  (params.extracurriculars || []).forEach((ekskul, index) => {
    const id = normalizeText(ekskul.id);
    const name = normalizeText(ekskul.name);
    if (id && name && name !== '-') {
      ekskulById.set(id, { name, order: index });
    }
  });

  // Deduplicate by extracurricularId (keeping latest entry for the student & period)
  const dedupedByActivity = new Map<string, StudentExtracurricular>();
  (params.studentExtracurriculars || []).forEach((se) => {
    if (normalizeText(se.studentId) !== targetStudentId) return;
    if (normalizeText(se.academicYear) !== targetYear) return;
    if (normalizeText(se.semester) !== targetSemester) return;

    const activityId = normalizeText(se.extracurricularId);
    if (!activityId || !ekskulById.has(activityId)) return;
    if (isNonParticipationRecord(se)) return;

    dedupedByActivity.set(activityId, se);
  });

  const sortedEntries = Array.from(dedupedByActivity.values()).sort((a, b) => {
    const orderA = ekskulById.get(normalizeText(a.extracurricularId))?.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = ekskulById.get(normalizeText(b.extracurricularId))?.order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  return sortedEntries.map((se, idx) => {
    const activityId = normalizeText(se.extracurricularId);
    const activityName = ekskulById.get(activityId)?.name || '';
    const rawPredicate = normalizeText(se.predicate);
    const rawDescription = normalizeText(se.description);

    return {
      id: se.id || `${targetStudentId}-${activityId}-${idx}`,
      extracurricularId: activityId,
      no: idx + 1,
      activityName,
      predicate: NON_PARTICIPATION_MARKERS.has(rawPredicate.toLowerCase()) ? '' : rawPredicate,
      description: NON_PARTICIPATION_MARKERS.has(rawDescription.toLowerCase()) ? '' : rawDescription
    };
  });
}

/**
 * Builds the 4-column PDF autoTable body for section "C. Kegiatan Ekstrakurikuler".
 * When the student participates in no extracurriculars, returns one empty row so the
 * table structure stays intact while all cells remain blank.
 */
export function buildPdfExtracurricularTableBody(
  rows: ResolvedExtracurricularRow[]
): Array<[string | number, string, string, string]> {
  if (rows.length === 0) {
    return [['', '', '', '']];
  }
  return rows.map((row) => [
    row.no,
    row.activityName,
    row.predicate,
    row.description
  ]);
}
