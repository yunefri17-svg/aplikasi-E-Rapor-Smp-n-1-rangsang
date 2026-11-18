import { Subject, Teacher, TeachingAssignment, User } from '../types/erapor';
import { sortSubjects } from './subjectSort';

const normalizeText = (value?: string): string =>
  (value || '').toLowerCase().trim();

const normalizeAlphaNum = (value?: string): string =>
  (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function resolveTeacherForUser(
  user: User | null | undefined,
  teachers: Teacher[] = []
): Teacher | undefined {
  if (!user || teachers.length === 0) return undefined;

  if (user.teacherId) {
    const byId = teachers.find((t) => t.id === user.teacherId);
    if (byId) return byId;
  }

  const userNip = (user.nip || '').trim();
  if (userNip) {
    const byNip = teachers.find((t) => (t.nip || '').trim() === userNip);
    if (byNip) return byNip;
  }

  const userName = normalizeText(user.name);
  if (userName) {
    const byExactName = teachers.find((t) => normalizeText(t.name) === userName);
    if (byExactName) return byExactName;

    const userAlpha = normalizeAlphaNum(user.name);
    if (userAlpha) {
      const byAlpha = teachers.find((t) => normalizeAlphaNum(t.name) === userAlpha);
      if (byAlpha) return byAlpha;
    }
  }

  return undefined;
}

export function getVisibleSubjectsForUser(params: {
  currentUser: User;
  subjects: Subject[];
  teachingAssignments?: TeachingAssignment[];
  teachers?: Teacher[];
  includeAllForWaliKelas?: boolean;
}): Subject[] {
  const {
    currentUser,
    subjects,
    teachingAssignments = [],
    teachers = [],
    includeAllForWaliKelas = false
  } = params;

  const sorted = sortSubjects(subjects);
  const isAdminOrKepsek = currentUser.role === 'admin' || currentUser.role === 'kepsek';
  if (isAdminOrKepsek) return sorted;
  if (includeAllForWaliKelas && currentUser.role === 'walikelas') return sorted;

  const matchedTeacher = resolveTeacherForUser(currentUser, teachers);

  const candidateTeacherIds = new Set<string>();
  if (currentUser.teacherId) candidateTeacherIds.add(currentUser.teacherId);
  if (matchedTeacher?.id) candidateTeacherIds.add(matchedTeacher.id);

  const candidateNames = new Set<string>();
  if (normalizeText(currentUser.name)) candidateNames.add(normalizeText(currentUser.name));
  if (normalizeText(matchedTeacher?.name)) candidateNames.add(normalizeText(matchedTeacher?.name));

  const candidateAlphaNames = new Set<string>();
  if (normalizeAlphaNum(currentUser.name)) candidateAlphaNames.add(normalizeAlphaNum(currentUser.name));
  if (normalizeAlphaNum(matchedTeacher?.name)) candidateAlphaNames.add(normalizeAlphaNum(matchedTeacher?.name));

  const activeAssignments = teachingAssignments.filter((ta) => {
    if (!ta || ta.status === 'inactive') return false;
    if (ta.teacherId && candidateTeacherIds.has(ta.teacherId)) return true;
    const taName = normalizeText(ta.teacherName);
    if (taName && candidateNames.has(taName)) return true;
    const taAlpha = normalizeAlphaNum(ta.teacherName);
    if (taAlpha && candidateAlphaNames.has(taAlpha)) return true;
    return false;
  });

  if (activeAssignments.length > 0) {
    const assignedIds = new Set(activeAssignments.map((ta) => ta.subjectId).filter(Boolean));
    const assignedNames = new Set(
      activeAssignments.map((ta) => normalizeText(ta.subjectName)).filter(Boolean)
    );
    const assignedSubjects = sorted.filter(
      (s) => assignedIds.has(s.id) || assignedNames.has(normalizeText(s.name))
    );
    if (assignedSubjects.length > 0) return assignedSubjects;
  }

  const fallbackSubjectIds = new Set(matchedTeacher?.subjectsTaught || []);
  if (fallbackSubjectIds.size > 0) {
    const fallbackSubjects = sorted.filter((s) => fallbackSubjectIds.has(s.id));
    if (fallbackSubjects.length > 0) return fallbackSubjects;
  }

  return [];
}
