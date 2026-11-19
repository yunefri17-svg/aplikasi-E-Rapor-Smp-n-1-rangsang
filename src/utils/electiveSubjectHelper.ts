import {
  AssessmentScore,
  Classroom,
  Student,
  Subject,
  TeachingAssignment
} from '../types/erapor';
import { sortSubjects } from './subjectSort';
import { resolveRaporCompetenceDisplay } from './tpAnalysisAndDescription';

export const CODING_SUBJECT_ID = 'sub-ka';
export const CODING_SUBJECT_CODE = 'KKA';
export const CODING_SUBJECT_NAME = 'Koding dan Kecerdasan Artifisial';

export const CODING_SUBJECT_DEFAULT: Subject = {
  id: CODING_SUBJECT_ID,
  code: CODING_SUBJECT_CODE,
  name: CODING_SUBJECT_NAME,
  category: 'Pilihan',
  isElective: true,
  excludedFromOfficialTranscript: true,
  orderIndex: 10,
  kkm: 75
};

/**
 * Checks whether a subject is Koding dan Kecerdasan Artifisial (distinct from Informatika).
 */
export function isCodingSubject(
  subject?: Partial<Pick<Subject, 'id' | 'name' | 'code'>> | null
): boolean {
  if (!subject) return false;
  if (subject.id === CODING_SUBJECT_ID) return true;
  const code = String(subject.code || '').trim().toUpperCase();
  if (code === 'KKA' || code === 'KODING') return true;
  const name = String(subject.name || '').trim().toLowerCase();
  return name.includes('koding') && !name.includes('informatika');
}

/**
 * Checks whether a subject is an elective subject ("Pilihan") that should NOT
 * automatically appear for non-participating students or inside the official transcript table.
 */
export function isElectiveSubject(subject?: Partial<Subject> | null): boolean {
  if (!subject) return false;
  if (subject.category === 'Pilihan') return true;
  if (subject.isElective) return true;
  if (subject.excludedFromOfficialTranscript) return true;
  return isCodingSubject(subject);
}

/**
 * Non-destructively ensures "Koding dan Kecerdasan Artifisial" is registered in subjects
 * without modifying or overwriting any existing subjects, scores, or school settings.
 */
export function ensureElectiveCodingSubject(
  subjects: Subject[],
  isDeletedCheck?: (id: string) => boolean
): Subject[] {
  const list = Array.isArray(subjects) ? [...subjects] : [];
  const existingIdx = list.findIndex((s) => isCodingSubject(s));
  if (existingIdx >= 0) {
    const cur = list[existingIdx];
    list[existingIdx] = {
      ...cur,
      category: cur.category === 'Muatan Lokal' ? 'Pilihan' : cur.category || 'Pilihan',
      isElective: true,
      excludedFromOfficialTranscript: true
    };
    return list;
  }

  if (isDeletedCheck && isDeletedCheck(CODING_SUBJECT_ID)) {
    return list;
  }

  return [...list, { ...CODING_SUBJECT_DEFAULT }];
}

/**
 * Returns subjects eligible for the official 6-semester government transcript table.
 * Excludes elective/additional subjects such as Koding dan Kecerdasan Artifisial.
 */
export function getOfficialTranscriptSubjects(subjects: Subject[]): Subject[] {
  return sortSubjects(subjects).filter((sub) => !isElectiveSubject(sub));
}

/**
 * Determines whether an AssessmentScore record contains an actual teacher-entered grade
 * or competence description (as opposed to an ungraded empty placeholder).
 */
export function hasEnteredAssessmentScore(sc?: AssessmentScore | null): boolean {
  if (!sc) return false;
  if (typeof sc.manualFinalScore === 'number' && Number.isFinite(sc.manualFinalScore)) {
    return true;
  }
  const hasDesc = Boolean(
    (sc.finalDescription || '').trim() ||
      (sc.highestCompetenceDesc || '').trim() ||
      (sc.lowestCompetenceDesc || '').trim()
  );
  if (hasDesc) return true;
  if (sc.hasSasScore === true) return true;
  if (sc.chapterScores && Object.keys(sc.chapterScores).length > 0) return true;
  if (typeof sc.finalScore === 'number' && Number.isFinite(sc.finalScore) && sc.finalScore > 0) {
    return true;
  }
  if (sc.status === 'SELESAI' || sc.status === 'TERKUNCI') {
    return true;
  }
  return false;
}

/**
 * Determines whether an AssessmentScore record contains an actual numeric report grade
 * (including intentional 0 in Sumatif/SAS/Manual), excluding ungraded Formatives-only placeholders
 * where finalScore defaults to 0 solely to satisfy Firestore numeric rules.
 */
export function hasEnteredNumericScore(sc?: AssessmentScore | null): boolean {
  if (!sc) return false;
  if (typeof sc.manualFinalScore === 'number' && Number.isFinite(sc.manualFinalScore)) {
    return true;
  }
  if (sc.hasSasScore === true) return true;
  if (sc.chapterScores && Object.keys(sc.chapterScores).length > 0) return true;
  if (typeof sc.sumatifAverage === 'number' && Number.isFinite(sc.sumatifAverage)) {
    return true;
  }
  if (sc.sumatifMateriScores && Object.keys(sc.sumatifMateriScores).length > 0) {
    return true;
  }
  if (typeof sc.finalScore === 'number' && Number.isFinite(sc.finalScore) && sc.finalScore > 0) {
    return true;
  }
  return false;
}

export function normalizeAcademicYearValue(year?: string | null): string {
  return String(year || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/_/g, '/');
}

export function normalizeSemesterValue(sem?: string | null): string {
  const s = String(sem || '').trim().toLowerCase();
  if (s === 'ganjil' || s === '1') return 'ganjil';
  if (s === 'genap' || s === '2') return 'genap';
  if (s === 'semua' || s === 'all') return 'semua';
  return s;
}

export function matchesAssignmentPeriod(
  ta: TeachingAssignment,
  academicYear: string,
  semester: 'Ganjil' | 'Genap'
): boolean {
  if (ta.status === 'inactive') return false;
  const taYear = normalizeAcademicYearValue(ta.academicYear);
  const targetYear = normalizeAcademicYearValue(academicYear);
  if (taYear && targetYear && taYear !== targetYear) return false;

  const taSem = normalizeSemesterValue(ta.semester);
  const targetSem = normalizeSemesterValue(semester);
  if (taSem && taSem !== 'semua' && taSem !== targetSem) return false;
  return true;
}

/**
 * Checks whether a specific student participates in a given subject during the selected period.
 * Mandatory/Mulok subjects always return true.
 * Elective subjects (e.g., Koding dan Kecerdasan Artifisial) return true ONLY when:
 * - There is an active TeachingAssignment for that class & period AND the student is not excluded
 *   (and if enrolledStudentIds whitelist exists, the student is included), OR
 * - No active assignment exists for that period, yet the student has an actual entered AssessmentScore
 *   for that subject+period (preserves historical grades after class promotion or assignment changes).
 */
export function isStudentParticipatingInSubject(params: {
  subject: Subject;
  studentId?: string;
  classId?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  teachingAssignments?: TeachingAssignment[];
  scores?: AssessmentScore[];
}): boolean {
  const {
    subject,
    studentId,
    classId,
    academicYear,
    semester,
    teachingAssignments = [],
    scores = []
  } = params;

  if (!isElectiveSubject(subject)) {
    return true;
  }

  const matchingAssignments = teachingAssignments.filter(
    (ta) =>
      ta.subjectId === subject.id &&
      (!classId || ta.classId === classId) &&
      matchesAssignmentPeriod(ta, academicYear, semester)
  );

  if (matchingAssignments.length > 0 && studentId) {
    const anyExcluded = matchingAssignments.some(
      (ta) => Array.isArray(ta.excludedStudentIds) && ta.excludedStudentIds.includes(studentId)
    );
    if (anyExcluded) return false;

    const whitelistAssignments = matchingAssignments.filter((ta) =>
      Array.isArray(ta.enrolledStudentIds)
    );
    if (whitelistAssignments.length > 0) {
      return whitelistAssignments.some((ta) => ta.enrolledStudentIds!.includes(studentId));
    }

    return true;
  }

  if (matchingAssignments.length > 0 && !studentId) {
    return true;
  }

  // Fallback for historical semesters or recorded elective grades even if assignment was archived
  if (studentId) {
    const targetYear = normalizeAcademicYearValue(academicYear);
    const targetSem = normalizeSemesterValue(semester);
    return scores.some(
      (sc) =>
        sc.studentId === studentId &&
        sc.subjectId === subject.id &&
        normalizeAcademicYearValue(sc.academicYear) === targetYear &&
        normalizeSemesterValue(sc.semester) === targetSem &&
        hasEnteredAssessmentScore(sc)
    );
  }

  return false;
}

/**
 * Checks whether a classroom as a whole participates in a subject during the selected period.
 */
export function isClassParticipatingInSubject(params: {
  subject: Subject;
  classId: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  teachingAssignments?: TeachingAssignment[];
  scores?: AssessmentScore[];
  classStudentIds?: string[];
}): boolean {
  const {
    subject,
    classId,
    academicYear,
    semester,
    teachingAssignments = [],
    scores = [],
    classStudentIds = []
  } = params;

  if (!isElectiveSubject(subject)) {
    return true;
  }

  const hasAssignment = teachingAssignments.some(
    (ta) =>
      ta.subjectId === subject.id &&
      ta.classId === classId &&
      matchesAssignmentPeriod(ta, academicYear, semester)
  );
  if (hasAssignment) return true;

  const studentSet = new Set(classStudentIds);
  const targetYear = normalizeAcademicYearValue(academicYear);
  const targetSem = normalizeSemesterValue(semester);
  return scores.some(
    (sc) =>
      sc.subjectId === subject.id &&
      normalizeAcademicYearValue(sc.academicYear) === targetYear &&
      normalizeSemesterValue(sc.semester) === targetSem &&
      (sc.classId === classId || studentSet.has(sc.studentId)) &&
      hasEnteredAssessmentScore(sc)
  );
}

/**
 * Returns sorted subjects applicable to a specific student's report card in a given period.
 */
export function getReportSubjectsForStudent(params: {
  subjects: Subject[];
  studentId?: string;
  classId?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  teachingAssignments?: TeachingAssignment[];
  scores?: AssessmentScore[];
}): Subject[] {
  return sortSubjects(params.subjects).filter((subject) =>
    isStudentParticipatingInSubject({
      subject,
      studentId: params.studentId,
      classId: params.classId,
      academicYear: params.academicYear,
      semester: params.semester,
      teachingAssignments: params.teachingAssignments,
      scores: params.scores
    })
  );
}

/**
 * Returns sorted subjects applicable to a classroom in a given period.
 */
export function getSubjectsForClassPeriod(params: {
  subjects: Subject[];
  classId: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  teachingAssignments?: TeachingAssignment[];
  scores?: AssessmentScore[];
  classStudentIds?: string[];
}): Subject[] {
  return sortSubjects(params.subjects).filter((subject) =>
    isClassParticipatingInSubject({
      subject,
      classId: params.classId,
      academicYear: params.academicYear,
      semester: params.semester,
      teachingAssignments: params.teachingAssignments,
      scores: params.scores,
      classStudentIds: params.classStudentIds
    })
  );
}

export interface ElectiveHistoryRow {
  scoreId: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  semesterNumber: number | null;
  classId: string;
  className: string;
  finalScore: number;
  predicate: string;
  description: string;
  updatedAt?: string;
}

function inferSemesterNumber(
  gradeLevel: string | undefined,
  semester: 'Ganjil' | 'Genap'
): number | null {
  if (gradeLevel === '7') return semester === 'Ganjil' ? 1 : 2;
  if (gradeLevel === '8') return semester === 'Ganjil' ? 3 : 4;
  if (gradeLevel === '9') return semester === 'Ganjil' ? 5 : 6;
  return null;
}

/**
 * Collects chronological academic history of elective subjects (e.g., Koding dan Kecerdasan Artifisial)
 * strictly bound to a student's identity across all semesters and academic years.
 */
export function getElectiveHistoryRows(params: {
  student?: Student | null;
  subjects: Subject[];
  scores: AssessmentScore[];
  classrooms: Classroom[];
}): ElectiveHistoryRow[] {
  const { student, subjects, scores, classrooms } = params;
  if (!student) return [];

  const electiveSubjectsMap = new Map(
    subjects.filter((s) => isElectiveSubject(s)).map((s) => [s.id, s])
  );
  const classMap = new Map(classrooms.map((c) => [c.id, c]));

  const matchingScores = scores.filter(
    (sc) =>
      sc.studentId === student.id &&
      electiveSubjectsMap.has(sc.subjectId) &&
      hasEnteredNumericScore(sc)
  );

  // Deduplicate by subject + academicYear + semester keeping latest updatedAt
  const dedupMap = new Map<string, AssessmentScore>();
  matchingScores.forEach((sc) => {
    const key = `${sc.subjectId}__${sc.academicYear}__${sc.semester}`;
    const prev = dedupMap.get(key);
    if (!prev || (sc.updatedAt || '') >= (prev.updatedAt || '')) {
      dedupMap.set(key, sc);
    }
  });

  const rows: ElectiveHistoryRow[] = Array.from(dedupMap.values()).map((sc) => {
    const sub = electiveSubjectsMap.get(sc.subjectId);
    const cls = classMap.get(sc.classId);
    let gradeLevel = cls?.gradeLevel;
    if (!gradeLevel) {
      const lowerClass = (sc.className || sc.classId || '').toLowerCase();
      if (lowerClass.includes('ix') || lowerClass.includes('9')) gradeLevel = '9';
      else if (lowerClass.includes('viii') || lowerClass.includes('8')) gradeLevel = '8';
      else if (lowerClass.includes('vii') || lowerClass.includes('7')) gradeLevel = '7';
    }

    const competence = resolveRaporCompetenceDisplay(sc);
    const descText =
      competence.isMissingScore || competence.isIncompleteDescription
        ? (sc.finalDescription || sc.highestCompetenceDesc || '').trim()
        : competence.parts.join(' ');

    return {
      scoreId: sc.id,
      studentId: student.id,
      subjectId: sc.subjectId,
      subjectName: sub?.name || sc.subjectName || CODING_SUBJECT_NAME,
      academicYear: sc.academicYear,
      semester: sc.semester,
      semesterNumber: inferSemesterNumber(gradeLevel, sc.semester),
      classId: sc.classId,
      className: cls?.name || sc.className || '-',
      finalScore: sc.manualFinalScore ?? sc.finalScore ?? 0,
      predicate: sc.predicate || '-',
      description: descText || '-',
      updatedAt: sc.updatedAt
    };
  });

  rows.sort((a, b) => {
    const yearCmp = (a.academicYear || '').localeCompare(b.academicYear || '');
    if (yearCmp !== 0) return yearCmp;
    if (a.semester !== b.semester) return a.semester === 'Ganjil' ? -1 : 1;
    return a.subjectName.localeCompare(b.subjectName);
  });

  return rows;
}

export interface ReportGradeRow {
  no: number;
  subjectId: string;
  subjectName: string;
  finalScoreText: string;
  competenceText: string;
  isElectiveEmpty: boolean;
}

/**
 * Builds Section A report card rows for a student, ensuring preview & PDF match identically:
 * - Participating & graded KA -> value + competence description
 * - Participating & ungraded KA -> subject name with empty score & description cells
 * - Non-participating students -> excluded completely
 */
export function buildReportGradeRows(params: {
  subjects: Subject[];
  scores: AssessmentScore[];
  studentId?: string;
  classId?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  teachingAssignments?: TeachingAssignment[];
}): ReportGradeRow[] {
  const {
    subjects,
    scores,
    studentId,
    classId,
    academicYear,
    semester,
    teachingAssignments = []
  } = params;

  const sortedSubjects = getReportSubjectsForStudent({
    subjects,
    studentId,
    classId,
    academicYear,
    semester,
    teachingAssignments,
    scores
  });

  const targetYear = normalizeAcademicYearValue(academicYear);
  const targetSem = normalizeSemesterValue(semester);
  const periodScores = scores.filter(
    (sc) =>
      (!studentId || sc.studentId === studentId) &&
      normalizeAcademicYearValue(sc.academicYear) === targetYear &&
      normalizeSemesterValue(sc.semester) === targetSem
  );
  const scoreLookup = new Map(periodScores.map((sc) => [sc.subjectId, sc]));

  return sortedSubjects.map((sub, idx) => {
    const sc = scoreLookup.get(sub.id);
    const isElectiveEmpty = isElectiveSubject(sub) && !hasEnteredAssessmentScore(sc);
    if (isElectiveEmpty) {
      return {
        no: idx + 1,
        subjectId: sub.id,
        subjectName: sub.name,
        finalScoreText: '',
        competenceText: '',
        isElectiveEmpty: true
      };
    }

    const hasNumeric = hasEnteredNumericScore(sc);
    const rawScore = hasNumeric ? sc?.manualFinalScore ?? sc?.finalScore : undefined;
    const finalScoreText = rawScore !== undefined ? String(rawScore) : '-';
    const competenceDisplay = resolveRaporCompetenceDisplay(sc);

    return {
      no: idx + 1,
      subjectId: sub.id,
      subjectName: sub.name,
      finalScoreText,
      competenceText: competenceDisplay.parts.join('\n'),
      isElectiveEmpty: false
    };
  });
}

export const ELECTIVE_TRANSCRIPT_TITLE = 'RIWAYAT NILAI MATA PELAJARAN PILIHAN';
export const ELECTIVE_TRANSCRIPT_SUBTITLE =
  'Catatan Hasil Belajar Tambahan Sekolah (Bukan Transkrip Nilai Resmi Pemerintah)';
export const ELECTIVE_TRANSCRIPT_DISCLAIMER =
  'Dokumen ini merupakan catatan resmi internal sekolah atas riwayat nilai mata pelajaran pilihan tambahan (Koding dan Kecerdasan Artifisial) yang diikuti siswa, dan BUKAN merupakan Transkrip Nilai Resmi Pemerintah.';

export function buildElectiveTranscriptTableRows(
  historyRows: ElectiveHistoryRow[]
): (string | number)[][] {
  if (historyRows.length === 0) {
    return [
      [
        '-',
        CODING_SUBJECT_NAME,
        '-',
        '-',
        '-',
        '-',
        'Peserta didik belum memiliki riwayat nilai mata pelajaran pilihan tambahan.'
      ]
    ];
  }

  return historyRows.map((row, idx) => [
    idx + 1,
    row.subjectName,
    row.academicYear,
    row.semesterNumber ? `Sem. ${row.semesterNumber} (${row.semester})` : row.semester,
    row.className,
    row.finalScore,
    row.description
  ]);
}

