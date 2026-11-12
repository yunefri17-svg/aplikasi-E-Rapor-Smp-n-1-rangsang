import {
  SchoolProfile,
  Teacher,
  Student,
  Classroom,
  Subject,
  Curriculum,
  LearningObjective,
  AssessmentScore,
  Attendance,
  Extracurricular,
  StudentExtracurricular,
  HomeroomNote,
  User,
  AuditLog,
  AppNotification,
  TeachingAssignment,
  FormativeAssessment,
  SummativeAssessment,
  KKTPConfig,
  SubjectFinalScoreConfig,
  AcademicYearPeriod,
  StudentMutation,
  StudentAchievement,
  KokurikulerProject
} from '../types/erapor';
import {
  initialSchoolProfile,
  initialCurricula,
  initialSubjects,
  initialTeachers,
  initialClassrooms,
  initialStudents,
  initialLearningObjectives,
  initialExtracurriculars,
  initialScores,
  initialAttendance,
  initialStudentExtracurriculars,
  initialHomeroomNotes,
  initialUsers,
  initialAuditLogs,
  initialTeachingAssignments,
  initialFormativeAssessments,
  initialSummativeAssessments,
  initialKKTPConfigs,
  initialFinalScoreConfigs,
  initialAcademicYears,
  initialStudentMutations,
  initialStudentAchievements,
  initialKokurikulerProjects
} from '../data/initialData';
import { syncProfileAcademicYear } from '../utils/academicYear';
import { sortClassrooms } from '../utils/classroomSort';
import { SubjectDescriptionBank, defaultDescriptionBank } from '../utils/descriptionBank';

const STORAGE_KEY = 'erapor_smpn1rangsang_db_v3';

export interface AppDatabase {
  schoolProfile: SchoolProfile;
  curricula: Curriculum[];
  subjects: Subject[];
  teachers: Teacher[];
  classrooms: Classroom[];
  students: Student[];
  learningObjectives: LearningObjective[];
  scores: AssessmentScore[];
  attendance: Attendance[];
  extracurriculars: Extracurricular[];
  studentExtracurriculars: StudentExtracurricular[];
  homeroomNotes: HomeroomNote[];
  users: User[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  descriptionBank: SubjectDescriptionBank[];
  teachingAssignments: TeachingAssignment[];
  // Kurikulum Merdeka 2025
  formativeAssessments: FormativeAssessment[];
  summativeAssessments: SummativeAssessment[];
  kktpConfigs: KKTPConfig[];
  finalScoreConfigs: SubjectFinalScoreConfig[];
  // Continuous Academic Administration
  academicYears: AcademicYearPeriod[];
  studentMutations: StudentMutation[];
  studentAchievements: StudentAchievement[];
  kokurikulerProjects: KokurikulerProject[];
}


export const loadDatabase = (): AppDatabase => {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy v2 data to migrate smoothly
      const legacyRaw = localStorage.getItem('erapor_smpn1rangsang_db_v2');
      if (legacyRaw) {
        try {
          const parsedLegacy = JSON.parse(legacyRaw);
          // Force update academic year to 2026/2027
          parsedLegacy.schoolProfile = syncProfileAcademicYear({
            ...(parsedLegacy.schoolProfile || initialSchoolProfile),
            activeAcademicYear: '2026/2027',
            activeSemester: 'Ganjil',
            reportDate: '19 Desember 2026'
          });
          // Ensure student parents are populated
          const initialMap = new Map(initialStudents.map((s) => [s.id, s]));
          parsedLegacy.students = (parsedLegacy.students || initialStudents).map((s: Student) => {
            const init = initialMap.get(s.id);
            return {
              ...s,
              fatherName: s.fatherName || init?.fatherName || 'Orang Tua Siswa',
              motherName: s.motherName || init?.motherName || 'Ibu Siswa',
              fatherJob: s.fatherJob || init?.fatherJob || 'Wiraswasta',
              motherJob: s.motherJob || init?.motherJob || 'Ibu Rumah Tangga',
              parentPhone: s.parentPhone || init?.parentPhone || '0812-7000-1111'
            };
          });
          saveDatabase(parsedLegacy);
          return parsedLegacy;
        } catch (e) {
          console.warn('Migration legacy note:', e);
        }
      }

      const initialDb: AppDatabase = {
        schoolProfile: syncProfileAcademicYear(initialSchoolProfile),
        curricula: initialCurricula,
        subjects: initialSubjects,
        teachers: initialTeachers,
        classrooms: initialClassrooms,
        students: initialStudents,
        learningObjectives: initialLearningObjectives,
        scores: initialScores,
        attendance: initialAttendance,
        extracurriculars: initialExtracurriculars,
        studentExtracurriculars: initialStudentExtracurriculars,
        homeroomNotes: initialHomeroomNotes,
        users: initialUsers,
        auditLogs: initialAuditLogs,
        notifications: [],
        descriptionBank: defaultDescriptionBank,
        teachingAssignments: initialTeachingAssignments,
        formativeAssessments: initialFormativeAssessments,
        summativeAssessments: initialSummativeAssessments,
        kktpConfigs: initialKKTPConfigs,
        finalScoreConfigs: initialFinalScoreConfigs,
        academicYears: initialAcademicYears,
        studentMutations: initialStudentMutations,
        studentAchievements: initialStudentAchievements,
        kokurikulerProjects: initialKokurikulerProjects
      };
      saveDatabase(initialDb);
      return initialDb;
    }
    const parsed = JSON.parse(raw);
    
    // Automatically advance academic year if autoAcademicYear is true
    const activeProfile = syncProfileAcademicYear({
      ...(parsed.schoolProfile || initialSchoolProfile),
      activeAcademicYear: '2026/2027',
      activeSemester: 'Ganjil'
    });

    // Ensure all students have valid parent names populated from initialData if missing
    const initialMap = new Map(initialStudents.map((s) => [s.id, s]));
    const students = (parsed.students || initialStudents).map((s: Student) => {
      const init = initialMap.get(s.id);
      return {
        ...s,
        fatherName: s.fatherName || init?.fatherName || 'Syamsul Bahri',
        motherName: s.motherName || init?.motherName || 'Faridah',
        fatherJob: s.fatherJob || init?.fatherJob || 'Wiraswasta',
        motherJob: s.motherJob || init?.motherJob || 'Ibu Rumah Tangga',
        parentPhone: s.parentPhone || init?.parentPhone || '0813-7002-2202'
      };
    });
    
    // Ensure 2026/2027 data exists alongside historic years without deleting past data
    let scores = parsed.scores || initialScores;
    const hasCurrentYearScores = scores.some(
      (s: AssessmentScore) => s.academicYear === activeProfile.activeAcademicYear
    );
    if (!hasCurrentYearScores && activeProfile.activeAcademicYear === '2026/2027') {
      const clonedCurrent = initialScores.map((s) => ({
        ...s,
        id: `sc-26-${s.studentId}-${s.subjectId}`,
        academicYear: '2026/2027',
        updatedAt: '2026-10-25 10:00'
      }));
      scores = [...scores, ...clonedCurrent];
    }

    let attendance = parsed.attendance || initialAttendance;
    const hasCurrentYearAtt = attendance.some(
      (a: Attendance) => a.academicYear === activeProfile.activeAcademicYear
    );
    if (!hasCurrentYearAtt && activeProfile.activeAcademicYear === '2026/2027') {
      const clonedAtt = initialAttendance.map((a) => ({
        ...a,
        id: `att-26-${a.studentId}`,
        academicYear: '2026/2027'
      }));
      attendance = [...attendance, ...clonedAtt];
    }

    let homeroomNotes = parsed.homeroomNotes || initialHomeroomNotes;
    const hasCurrentYearNotes = homeroomNotes.some(
      (n: HomeroomNote) => n.academicYear === activeProfile.activeAcademicYear
    );
    if (!hasCurrentYearNotes && activeProfile.activeAcademicYear === '2026/2027') {
      const clonedNotes = initialHomeroomNotes.map((n) => ({
        ...n,
        id: `hn-26-${n.studentId}`,
        academicYear: '2026/2027'
      }));
      homeroomNotes = [...homeroomNotes, ...clonedNotes];
    }

    let loadedTeachers: Teacher[] = parsed.teachers || initialTeachers;

    let loadedTeachingAssignments: TeachingAssignment[] = Array.isArray(parsed.teachingAssignments)
      ? parsed.teachingAssignments
      : initialTeachingAssignments;

    const syncedDb = sanitizeTeachingAssignments(
      syncUsersWithTeachers({
        schoolProfile: activeProfile,
        curricula: parsed.curricula || initialCurricula,
        subjects: parsed.subjects || initialSubjects,
        teachers: loadedTeachers,
        classrooms: sortClassrooms(parsed.classrooms || initialClassrooms),
        students,
        learningObjectives: parsed.learningObjectives || initialLearningObjectives,
        scores,
        attendance,
        extracurriculars: parsed.extracurriculars || initialExtracurriculars,
        studentExtracurriculars: parsed.studentExtracurriculars || initialStudentExtracurriculars,
        homeroomNotes,
        users: parsed.users || initialUsers,
        auditLogs: parsed.auditLogs || initialAuditLogs,
        notifications: parsed.notifications || [],
        descriptionBank: parsed.descriptionBank || defaultDescriptionBank,
        teachingAssignments: loadedTeachingAssignments,
        formativeAssessments: parsed.formativeAssessments?.length ? parsed.formativeAssessments : initialFormativeAssessments,
        summativeAssessments: parsed.summativeAssessments?.length ? parsed.summativeAssessments : initialSummativeAssessments,
        kktpConfigs: parsed.kktpConfigs?.length ? parsed.kktpConfigs : initialKKTPConfigs,
        finalScoreConfigs: parsed.finalScoreConfigs?.length ? parsed.finalScoreConfigs : initialFinalScoreConfigs,
        academicYears: parsed.academicYears?.length ? parsed.academicYears : initialAcademicYears,
        studentMutations: parsed.studentMutations?.length ? parsed.studentMutations : initialStudentMutations,
        studentAchievements: parsed.studentAchievements?.length ? parsed.studentAchievements : initialStudentAchievements,
        kokurikulerProjects: parsed.kokurikulerProjects?.length ? parsed.kokurikulerProjects : initialKokurikulerProjects
      })
    );

    saveDatabase(syncedDb);
    return syncedDb;
  } catch (err) {
    console.error('Failed to load database from localStorage, resetting to initial', err);
    return {
      schoolProfile: initialSchoolProfile,
      curricula: initialCurricula,
      subjects: initialSubjects,
      teachers: initialTeachers,
      classrooms: initialClassrooms,
      students: initialStudents,
      learningObjectives: initialLearningObjectives,
      scores: initialScores,
      attendance: initialAttendance,
      extracurriculars: initialExtracurriculars,
      studentExtracurriculars: initialStudentExtracurriculars,
      homeroomNotes: initialHomeroomNotes,
      users: initialUsers,
      auditLogs: initialAuditLogs,
      notifications: [],
      descriptionBank: defaultDescriptionBank,
      teachingAssignments: initialTeachingAssignments,
      formativeAssessments: [],
      summativeAssessments: [],
      kktpConfigs: [],
      finalScoreConfigs: [],
      academicYears: initialAcademicYears,
      studentMutations: initialStudentMutations,
      studentAchievements: initialStudentAchievements,
      kokurikulerProjects: initialKokurikulerProjects
    };
  }
};

export const saveDatabase = (db: AppDatabase): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Storage quota exceeded or error saving to localStorage', e);
  }
};

export const logActivity = (
  user: User | null,
  action: string,
  details: string
): void => {
  const db = loadDatabase();
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    userId: user?.id || 'sys',
    userName: user?.name || 'Sistem',
    role: user?.role || 'sys',
    action,
    details
  };
  db.auditLogs.unshift(newLog);
  // Keep last 100 logs
  if (db.auditLogs.length > 100) {
    db.auditLogs = db.auditLogs.slice(0, 100);
  }
  saveDatabase(db);
};

// Predicate calculator based on standard Kemendikbud interval
export const calculatePredicate = (score: number, kkm: number = 75): 'A' | 'B' | 'C' | 'D' => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= kkm) return 'C';
  return 'D';
};

// Automatic competence description generator
export const generateCompetenceDescriptions = (
  tps: LearningObjective[],
  formatifScores: Record<string, number>,
  sumatifMateriScores: Record<string, number>
): { highest: string; lowest: string } => {
  if (tps.length === 0) {
    return {
      highest: 'Menunjukkan penguasaan materi pembelajaran yang memadai sesuai kriteria ketercapaian.',
      lowest: 'Perlu bimbingan dan peningkatan ketekunan belajar pada materi pembelajaran.'
    };
  }

  // Calculate average per TP
  const tpAvgs = tps.map((tp) => {
    const f = formatifScores[tp.id] ?? 75;
    const s = sumatifMateriScores[tp.id] ?? f;
    const avg = Math.round((f + s) / 2);
    return { tp, avg };
  });

  tpAvgs.sort((a, b) => b.avg - a.avg);
  const highest = tpAvgs[0];
  const lowest = tpAvgs[tpAvgs.length - 1];

  let highestDesc = '';
  if (highest.avg >= 90) {
    highestDesc = `Menunjukkan penguasaan yang sangat istimewa dalam ${highest.tp.description.toLowerCase()}.`;
  } else if (highest.avg >= 80) {
    highestDesc = `Menunjukkan pemahaman yang sangat baik dalam ${highest.tp.description.toLowerCase()}.`;
  } else {
    highestDesc = `Mampu memahami dan mempraktikkan materi ${highest.tp.description.toLowerCase()} dengan cukup baik.`;
  }

  let lowestDesc = '';
  if (lowest.avg < 75) {
    lowestDesc = `Perlu bimbingan dan pendampingan intensif dalam ${lowest.tp.description.toLowerCase()}.`;
  } else if (lowest.avg < 82) {
    lowestDesc = `Perlu peningkatan ketelitian dan latihan berkelanjutan dalam ${lowest.tp.description.toLowerCase()}.`;
  } else {
    lowestDesc = `Mencapai ketuntasan materi dengan baik, disarankan memperdalam wawasan materi pengayaan.`;
  }

  return { highest: highestDesc, lowest: lowestDesc };
};

// ==========================================
// ROLE-BASED ACCESS CONTROL (RBAC) FOR WALI KELAS
// ==========================================

export interface SecurityValidationResult {
  allowed: boolean;
  message: string;
  authorizedClassId?: string;
  attemptedClassId?: string;
}

/**
 * Validates whether the logged-in user has permission to access the given classId.
 * Admin and Kepsek have access to all classes.
 * Wali Kelas strictly has access only to user.classId.
 */
export const validateClassAccess = (
  user: User | null,
  targetClassId?: string
): SecurityValidationResult => {
  if (!user) {
    return {
      allowed: false,
      message: 'Sesi login tidak valid. Silakan masuk kembali.'
    };
  }

  // Admin and Kepsek have full access to all rombel
  if (user.role === 'admin' || user.role === 'kepsek') {
    return {
      allowed: true,
      message: 'Akses penuh diberikan (Administrator/Kepala Sekolah).'
    };
  }

  // Wali Kelas must strictly match their assigned classId
  if (user.role === 'walikelas') {
    if (!user.classId) {
      return {
        allowed: false,
        message: 'AKSES DITOLAK. Akun Wali Kelas belum dihubungkan ke rombongan belajar mana pun.'
      };
    }

    if (targetClassId && targetClassId !== user.classId) {
      return {
        allowed: false,
        message: 'AKSES DITOLAK. Anda tidak memiliki kewenangan untuk mengakses data kelas ini.',
        authorizedClassId: user.classId,
        attemptedClassId: targetClassId
      };
    }

    return {
      allowed: true,
      message: 'Akses valid untuk kelas binaan.',
      authorizedClassId: user.classId
    };
  }

  // Guru mata pelajaran
  return {
    allowed: true,
    message: 'Akses guru mapel.'
  };
};

/**
 * Returns classrooms visible to the user.
 * Wali kelas ONLY sees their assigned classroom.
 */
export const getAccessibleClassrooms = (
  user: User | null,
  allClassrooms: Classroom[]
): Classroom[] => {
  if (!user) return [];
  if (user.role === 'admin' || user.role === 'kepsek' || user.role === 'guru') {
    return allClassrooms;
  }
  if (user.role === 'walikelas') {
    return allClassrooms.filter((c) => c.id === user.classId);
  }
  return allClassrooms;
};

import { sortStudentsAlphabetically } from '../utils/studentSort';

/**
 * Filters students by user access level and sorts them alphabetically by name.
 * Wali kelas can never see students from another class.
 */
export const getAccessibleStudents = (
  user: User | null,
  allStudents: Student[],
  selectedClassId?: string
): Student[] => {
  if (!user) return [];
  let res: Student[] = [];
  if (user.role === 'walikelas') {
    // If selectedClassId is specified and differs from user's class, return empty
    if (selectedClassId && selectedClassId !== user.classId) {
      return [];
    }
    res = allStudents.filter((s) => s.classId === user.classId);
  } else if (selectedClassId && selectedClassId !== 'all') {
    res = allStudents.filter((s) => s.classId === selectedClassId);
  } else {
    res = allStudents;
  }

  // Sort only if viewing a specific class
  return selectedClassId && selectedClassId !== 'all' ? sortStudentsAlphabetically(res) : res;
};

/**
 * Synchronizes homeroom assignment across classrooms, teachers, and users tables.
 */
export const syncHomeroomAssignment = (
  db: AppDatabase,
  teacherId: string,
  newClassId: string,
  userId?: string
): AppDatabase => {
  const updatedDb = { ...db };
  const classrooms = Array.isArray(db.classrooms) ? db.classrooms : [];
  const teachers = Array.isArray(db.teachers) ? db.teachers : [];
  const users = Array.isArray(db.users) ? db.users : [];

  // 1. Clear old classroom assignments for this teacher
  updatedDb.classrooms = classrooms.map((cls) => {
    if (cls.homeroomTeacherId === teacherId && cls.id !== newClassId) {
      return { ...cls, homeroomTeacherId: '' };
    }
    if (cls.id === newClassId) {
      return { ...cls, homeroomTeacherId: teacherId };
    }
    return cls;
  });

  // 2. Update teacher record
  updatedDb.teachers = teachers.map((t) => {
    if (t.id === teacherId) {
      return { ...t, homeroomClassId: newClassId };
    }
    return t;
  });

  // 3. Update user record if provided
  if (userId) {
    updatedDb.users = users.map((u) => {
      if (u.id === userId) {
        return { ...u, teacherId, classId: newClassId };
      }
      return u;
    });
  } else {
    // Also update any user with this teacherId
    updatedDb.users = users.map((u) => {
      if (u.teacherId === teacherId && u.role === 'walikelas') {
        return { ...u, classId: newClassId };
      }
      return u;
    });
  }

  return updatedDb;
};

/**
 * Specifically purges students, teachers, and non-admin simulated user accounts.
 * This is used for a "fresh start" of school data.
 */
export const partialPurgeMasterData = (db: AppDatabase): AppDatabase => {
  const updatedDb = { ...db };
  
  // 1. Clear students and all dependent data
  updatedDb.students = [];
  updatedDb.scores = [];
  updatedDb.attendance = [];
  updatedDb.homeroomNotes = [];
  updatedDb.studentExtracurriculars = [];
  updatedDb.formativeAssessments = [];
  updatedDb.summativeAssessments = [];
  updatedDb.kktpConfigs = [];
  updatedDb.finalScoreConfigs = [];
  
  // 2. Clear teachers
  updatedDb.teachers = [];
  
  // 3. Reset classroom teacher assignments
  updatedDb.classrooms = (Array.isArray(db.classrooms) ? db.classrooms : []).map(c => ({
    ...c,
    homeroomTeacherId: ''
  }));
  
  // 4. Clear simulated staff users (keep admin and kepsek)
  updatedDb.users = (Array.isArray(db.users) ? db.users : []).filter(u => 
    u.role === 'admin' || u.role === 'kepsek' || !u.teacherId
  );
  
  return updatedDb;
};

/**
 * Ensures that the users table (used for simulated login) is synchronized with the actual teachers list.
 * This prevents "ghost" teachers in the login switcher after data modification.
 */
export const syncUsersWithTeachers = (db: AppDatabase): AppDatabase => {
  const updatedDb = { ...db };
  const teachers = Array.isArray(db.teachers) ? db.teachers : [];
  const classrooms = Array.isArray(db.classrooms) ? db.classrooms : [];
  const users = Array.isArray(db.users) ? db.users : [];

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const teacherNipMap = new Map(teachers.filter((t) => t.nip && t.nip.trim()).map((t) => [t.nip.trim(), t]));
  const teacherNameMap = new Map(teachers.map((t) => [t.name.toLowerCase().replace(/[^a-z0-9]/g, ''), t]));

  // 1. Remove users (guru/walikelas) whose corresponding teacher no longer exists in teachers table
  updatedDb.users = users.filter((u) => {
    if (!u) return false;
    // Always preserve administrator and headmaster accounts
    if (u.role === 'admin' || u.role === 'kepsek') return true;

    // A teacher/walikelas account is only valid if a matching active teacher exists
    const hasTeacherId = u.teacherId && teacherMap.has(u.teacherId);
    const hasNip = u.nip && u.nip.trim() && teacherNipMap.has(u.nip.trim());
    const hasName = u.name && teacherNameMap.has(u.name.toLowerCase().replace(/[^a-z0-9]/g, ''));

    return Boolean(hasTeacherId || hasNip || hasName);
  });

  // 2. Also ensure classrooms do not reference deleted homeroom teachers & are strictly sorted
  updatedDb.classrooms = sortClassrooms(
    classrooms.map((c) => {
      if (c.homeroomTeacherId && !teacherMap.has(c.homeroomTeacherId)) {
        return { ...c, homeroomTeacherId: '' };
      }
      return c;
    })
  );

  // 3. Add users for active teachers if missing
  const existingUserTeacherIds = new Set(updatedDb.users.filter((u) => u && u.teacherId).map((u) => u.teacherId));
  teachers.forEach((t) => {
    if (!t) return;
    if (!existingUserTeacherIds.has(t.id)) {
      updatedDb.users.push({
        id: `usr-${t.id}`,
        username: t.name.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '') || `guru${t.id}`,
        name: t.name,
        role: t.isHomeroom ? 'walikelas' : 'guru',
        status: 'active',
        teacherId: t.id,
        classId: t.homeroomClassId,
        nip: t.nip
      });
    }
  });

  // 4. Update existing user details (names, roles, classIds, NIPs)
  updatedDb.users = updatedDb.users.map((u) => {
    if (!u) return u;
    if (u.role === 'admin' || u.role === 'kepsek') return u;
    const t =
      (u.teacherId ? teacherMap.get(u.teacherId) : null) ||
      (u.nip && u.nip.trim() ? teacherNipMap.get(u.nip.trim()) : null) ||
      (u.name ? teacherNameMap.get(u.name.toLowerCase().replace(/[^a-z0-9]/g, '')) : null);

    if (!t) return u;

    return {
      ...u,
      name: t.name,
      nip: t.nip,
      teacherId: t.id,
      classId: t.homeroomClassId,
      role: t.isHomeroom ? 'walikelas' : 'guru'
    };
  });

  return updatedDb;
};

/**
 * Strictly purges teaching assignments referencing non-existent or fictional teachers
 * and synchronizes names with active teachers, subjects, and classrooms.
 */
export const sanitizeTeachingAssignments = (db: AppDatabase): AppDatabase => {
  const teachers = Array.isArray(db.teachers) ? db.teachers : [];
  const subjects = Array.isArray(db.subjects) ? db.subjects : [];
  const classrooms = Array.isArray(db.classrooms) ? db.classrooms : [];
  const assignments = Array.isArray(db.teachingAssignments) ? db.teachingAssignments : [];

  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classrooms.map((c) => [c.id, c]));

  const validAssignments = assignments.filter((ta) => {
    return ta && teacherMap.has(ta.teacherId);
  }).map((ta) => {
    const t = teacherMap.get(ta.teacherId);
    const s = subjectMap.get(ta.subjectId);
    const c = classMap.get(ta.classId);
    return {
      ...ta,
      teacherName: t ? t.name : ta.teacherName,
      subjectName: s ? s.name : ta.subjectName,
      className: c ? c.name : ta.className
    };
  });

  return {
    ...db,
    teachingAssignments: validAssignments
  };
};

/**
 * Teaching Assignment Helpers
 */
export const getTeacherAssignedSubjects = (
  teacherId: string,
  assignments: TeachingAssignment[] = [],
  fallbackSubjects: string[] = []
): string[] => {
  const assigned = assignments
    .filter((a) => a.teacherId === teacherId && a.status !== 'inactive')
    .map((a) => a.subjectId);
  const combined = assigned.length > 0 ? assigned : fallbackSubjects;
  return Array.from(new Set(combined));
};

export const getTeacherAssignedClasses = (
  teacherId: string,
  subjectId: string,
  assignments: TeachingAssignment[] = []
): string[] => {
  const classes = assignments
    .filter(
      (a) =>
        a.teacherId === teacherId &&
        a.subjectId === subjectId &&
        a.status !== 'inactive'
    )
    .map((a) => a.classId);
  return Array.from(new Set(classes));
};

export const isTeacherAssignedToClass = (
  teacherId: string,
  subjectId: string,
  classId: string,
  assignments: TeachingAssignment[] = []
): boolean => {
  return assignments.some(
    (a) =>
      a.teacherId === teacherId &&
      a.subjectId === subjectId &&
      a.classId === classId &&
      a.status !== 'inactive'
  );
};
