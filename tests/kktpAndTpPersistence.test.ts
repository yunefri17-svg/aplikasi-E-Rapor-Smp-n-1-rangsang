import assert from 'node:assert/strict';
import { Subject, Teacher, TeachingAssignment, User } from '../src/types/erapor';
import { getVisibleSubjectsForUser, resolveTeacherForUser } from '../src/utils/teacherAssignmentHelper';
import { loadDatabase } from '../src/services/storage';

let passed = 0;
function runTest(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}

const subjects: Subject[] = [
  { id: 'sub-bindo', code: 'BIND', name: 'Bahasa Indonesia', category: 'A', orderIndex: 3, kkm: 75 },
  { id: 'sub-mtk', code: 'MTK', name: 'Matematika', category: 'A', orderIndex: 4, kkm: 75 },
  { id: 'sub-inf', code: 'INF', name: 'Informatika', category: 'A', orderIndex: 9, kkm: 75 },
  { id: 'sub-coding', code: 'KKA', name: 'Koding dan Kecerdasan Artifisial', category: 'Pilihan', orderIndex: 10, kkm: 75 }
];

const teachers: Teacher[] = [
  {
    id: 'tch-1',
    nip: '198501012010011001',
    nuptk: '1234567890123456',
    name: 'Fauzi Rahman, S.Pd',
    degree: 'S.Pd',
    gender: 'L',
    education: 'S1',
    employmentStatus: 'PNS',
    position: 'Guru Mapel',
    subjectsTaught: ['sub-inf'],
    isHomeroom: true,
    homeroomClassId: 'cls-7a',
    phone: '0812',
    email: 'fauzi@example.com'
  },
  {
    id: 'tch-2',
    nip: '199002022015022002',
    nuptk: '2345678901234567',
    name: 'Nikmatul Khairiah, S.Pd.',
    degree: 'S.Pd',
    gender: 'P',
    education: 'S1',
    employmentStatus: 'PNS',
    position: 'Guru Mapel',
    subjectsTaught: [],
    isHomeroom: false,
    phone: '0813',
    email: 'nikmatul@example.com'
  }
];

runTest('resolveTeacherForUser matches by teacherId, NIP, exact name, or normalized alphanumeric name', () => {
  const byId = resolveTeacherForUser({ id: 'u1', username: 'u1', name: 'Lain', role: 'guru', teacherId: 'tch-1' }, teachers);
  assert.equal(byId?.id, 'tch-1');

  const byNip = resolveTeacherForUser({ id: 'u2', username: 'u2', name: 'Nama Beda', role: 'guru', nip: '199002022015022002' }, teachers);
  assert.equal(byNip?.id, 'tch-2');

  const byNormName = resolveTeacherForUser({ id: 'u3', username: 'u3', name: 'Nikmatul Khairiah SPd', role: 'guru' }, teachers);
  assert.equal(byNormName?.id, 'tch-2');
});

runTest('getVisibleSubjectsForUser resolves assigned subjects even without teacherId on user and undefined assignment status', () => {
  const guruWithoutTeacherId: User = {
    id: 'u-nik',
    username: 'nikmatul',
    name: 'Nikmatul Khairiah SPd',
    role: 'guru',
    nip: '199002022015022002'
  };
  const assignments: TeachingAssignment[] = [
    {
      id: 'ta-1',
      teacherId: 'tch-2',
      teacherName: 'Nikmatul Khairiah, S.Pd.',
      subjectId: 'sub-mtk',
      subjectName: 'Matematika',
      classId: 'cls-7a',
      className: 'VII.1',
      academicYear: '2026/2027',
      semester: 'Ganjil'
      // status intentionally undefined
    } as TeachingAssignment,
    {
      id: 'ta-inactive',
      teacherId: 'tch-2',
      teacherName: 'Nikmatul Khairiah, S.Pd.',
      subjectId: 'sub-bindo',
      subjectName: 'Bahasa Indonesia',
      classId: 'cls-7a',
      className: 'VII.1',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      status: 'inactive'
    }
  ];

  const visible = getVisibleSubjectsForUser({
    currentUser: guruWithoutTeacherId,
    subjects,
    teachingAssignments: assignments,
    teachers,
    includeAllForWaliKelas: false
  });
  assert.deepEqual(visible.map((s) => s.id), ['sub-mtk']);
});

runTest('getVisibleSubjectsForUser matches via ta.teacherName and ta.subjectName fallback or subjectsTaught fallback', () => {
  const guruByName: User = {
    id: 'u-temp',
    username: 'temp',
    name: 'Guru Koding',
    role: 'guru'
  };
  const assignments: TeachingAssignment[] = [
    {
      id: 'ta-name',
      teacherId: 'stale-teacher-id',
      teacherName: 'Guru Koding',
      subjectId: 'legacy-sub-id',
      subjectName: 'Koding dan Kecerdasan Artifisial',
      classId: 'cls-7a',
      className: 'VII.1',
      academicYear: '2026/2027',
      semester: 'Ganjil',
      status: 'active'
    }
  ];

  const visibleByAssignmentName = getVisibleSubjectsForUser({
    currentUser: guruByName,
    subjects,
    teachingAssignments: assignments,
    teachers,
    includeAllForWaliKelas: false
  });
  assert.deepEqual(visibleByAssignmentName.map((s) => s.id), ['sub-coding']);

  const guruSubjectsTaughtFallback: User = {
    id: 'u-fauzi',
    username: 'fauzi',
    name: 'Fauzi Rahman, S.Pd',
    role: 'walikelas',
    teacherId: 'tch-1',
    classId: 'cls-7a'
  };
  const visibleFallback = getVisibleSubjectsForUser({
    currentUser: guruSubjectsTaughtFallback,
    subjects,
    teachingAssignments: [],
    teachers,
    includeAllForWaliKelas: false
  });
  assert.deepEqual(visibleFallback.map((s) => s.id), ['sub-inf']);

  const visibleWaliKelasReadonly = getVisibleSubjectsForUser({
    currentUser: guruSubjectsTaughtFallback,
    subjects,
    teachingAssignments: [],
    teachers,
    includeAllForWaliKelas: true
  });
  assert.equal(visibleWaliKelasReadonly.length, subjects.length);
});

runTest('loadDatabase respects tombstones and never resurrects deleted built-in TP (tp-bindo-7.1)', () => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k)
  };

  store.set(
    'erapor_deleted_entity_ids_v1',
    JSON.stringify({ assessments: ['tp-bindo-7.1'], learningObjectives: ['tp-bindo-7.1'] })
  );

  // 1. Fresh/initial localStorage boot (no db yet)
  const freshDb = loadDatabase();
  assert.equal(
    freshDb.learningObjectives.some((tp) => tp.id === 'tp-bindo-7.1'),
    false,
    'tp-bindo-7.1 must not be present on fresh load when tombstoned'
  );

  // 2. Existing localStorage db that somehow still contains tp-bindo-7.1
  store.set(
    'erapor_smpn1rangsang_db_v3',
    JSON.stringify({
      ...freshDb,
      learningObjectives: [{ id: 'tp-bindo-7.1', code: 'TP 7.1', subjectId: 'sub-bindo', gradeLevel: '7', semester: 'Ganjil', curriculumId: 'cur-merdeka', description: 'Old' }]
    })
  );
  const reloadedDb = loadDatabase();
  assert.equal(
    reloadedDb.learningObjectives.some((tp) => tp.id === 'tp-bindo-7.1'),
    false,
    'tp-bindo-7.1 must remain deleted on subsequent loads'
  );
});

console.log(`All ${passed} tests passed!`);
