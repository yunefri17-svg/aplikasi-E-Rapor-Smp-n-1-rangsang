import React, { useState, useEffect } from 'react';
import {
  loadDatabase,
  saveDatabase,
  logActivity,
  syncHomeroomAssignment,
  syncUsersWithTeachers,
  sanitizeTeachingAssignments,
  partialPurgeMasterData,
  AppDatabase
} from './services/storage';
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
  DutyMode,
  TeachingAssignment,
  FormativeAssessment,
  SummativeAssessment,
  KKTPConfig,
  SubjectFinalScoreConfig
} from './types/erapor';
import { Calendar } from 'lucide-react';
import {
  getAvailableAcademicYears,
  getCurrentSystemAcademicYear,
  getDefaultReportDate
} from './utils/academicYear';
import { sortClassrooms } from './utils/classroomSort';
import { SubjectDescriptionBank } from './utils/descriptionBank';
import { Header } from './components/layout/Header';
import { Sidebar, MenuId } from './components/layout/Sidebar';
import {
  queueAutoSyncToFirestore,
  syncAllToFirestore,
  fetchFromFirestore,
  wipeFirestoreMasterCollections,
  testFirestoreConnection,
  subscribeToSyncState,
  listenToFirestoreRealtime,
  saveScoresToFirestoreDirect,
  deleteDocFromFirestore,
  surgicalSync,
  reconnectToCloud,
  CloudSyncState
} from './services/firebaseSync';

// Views
import { DashboardView } from './views/DashboardView';
import { DataReferensiView } from './views/DataReferensiView';
import { DataSekolahView } from './views/DataSekolahView';
import { DataGuruView } from './views/DataGuruView';
import { DataSiswaView } from './views/DataSiswaView';
import { RombelView } from './views/RombelView';
import { DataMapelView } from './views/DataMapelView';
import { DataKurikulumView } from './views/DataKurikulumView';
import { PenugasanGuruView } from './views/PenugasanGuruView';
import { DataPembelajaranView } from './views/DataPembelajaranView';
import { DataEkskulView } from './views/DataEkskulView';
import { DataAbsensiView } from './views/DataAbsensiView';
import { InputNilaiView } from './views/InputNilaiView';
import { PengolahanNilaiView } from './views/PengolahanNilaiView';
import { DeskripsiNilaiView } from './views/DeskripsiNilaiView';
import { RekapNilaiMapelView } from './views/RekapNilaiMapelView';
import { RekapitulasiNilaiView } from './views/RekapitulasiNilaiView';
import { LegerNilaiView } from './views/LegerNilaiView';
import { PengolahanRaporView } from './views/PengolahanRaporView';
import { KenaikanKelasView } from './views/KenaikanKelasView';
import { CetakRaporView } from './views/CetakRaporView';
import { LaporanSekolahView } from './views/LaporanSekolahView';
import { ImporEksporDapodikView } from './views/ImporEksporDapodikView';
import { ManajemenWaliKelasView } from './views/ManajemenWaliKelasView';
import { ManajemenPenggunaView } from './views/ManajemenPenggunaView';
import { PengaturanAplikasiView } from './views/PengaturanAplikasiView';

// Kurikulum Merdeka 2025 Views
import { KKTPConfigView } from './views/KKTPConfigView';
import { AsesmenFormatifView } from './views/AsesmenFormatifView';
import { AsesmenSumatifView } from './views/AsesmenSumatifView';
import { PengolahanNilaiAkhirView } from './views/PengolahanNilaiAkhirView';


export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => {
    const loaded = loadDatabase();
    loaded.classrooms = sortClassrooms(loaded.classrooms);
    return loaded;
  });
  const [activeMenu, setActiveMenu] = useState<MenuId>(() => {
    try {
      const saved = localStorage.getItem('erapor_active_menu');
      if (saved) return saved as MenuId;
    } catch {}
    return 'dashboard';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [targetPrintStudentId, setTargetPrintStudentId] = useState<string | undefined>(undefined);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);

  // Current active user
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedUserId = localStorage.getItem('erapor_active_user_id');
      if (savedUserId) {
        const found = db.users.find((u) => u.id === savedUserId);
        if (found) return found;
      }
    } catch {}
    return db.users.find((u) => u.role === 'admin') || db.users[0];
  });

  // Dual duty mode (Wali Kelas vs Guru Mata Pelajaran)
  const [dutyMode, setDutyMode] = useState<DutyMode>(() => {
    try {
      const savedDuty = localStorage.getItem('erapor_active_duty_mode');
      if (savedDuty === 'walikelas' || savedDuty === 'guru') return savedDuty as DutyMode;
    } catch {}
    return currentUser.role === 'walikelas' ? 'walikelas' : 'guru';
  });

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('erapor_active_user_id', user.id);
    } catch {}
    const newDuty: DutyMode = user.role === 'walikelas' ? 'walikelas' : 'guru';
    setDutyMode(newDuty);
    try {
      localStorage.setItem('erapor_active_duty_mode', newDuty);
    } catch {}
  };

  const handleToggleDutyMode = (mode: DutyMode) => {
    setDutyMode(mode);
    try {
      localStorage.setItem('erapor_active_duty_mode', mode);
    } catch {}
  };

  const handleSelectMenu = (menu: MenuId) => {
    setActiveMenu(menu);
    try {
      localStorage.setItem('erapor_active_menu', menu);
    } catch {}
  };

  // Find associated teacher profile for current user
  const currentTeacher = React.useMemo(() => {
    return db.teachers.find(
      (t) =>
        (currentUser.teacherId && t.id === currentUser.teacherId) ||
        (currentUser.nip && t.nip === currentUser.nip) ||
        (t.name.toLowerCase().includes('fauzi') && currentUser.name.toLowerCase().includes('fauzi')) ||
        (t.name.toLowerCase().includes('nikmatul') && currentUser.name.toLowerCase().includes('nikmatul')) ||
        t.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
    );
  }, [db.teachers, currentUser]);

  const hasHomeroomDuty = Boolean(currentUser.classId || currentTeacher?.isHomeroom);
  const hasTeachingDuties = React.useMemo(() => {
    if (!currentTeacher) return false;
    const hasAssignments = (db.teachingAssignments || []).some(
      (ta) => ta.teacherId === currentTeacher.id && ta.status !== 'inactive'
    );
    const hasMapel = currentTeacher.subjectsTaught && currentTeacher.subjectsTaught.length > 0;
    return Boolean(hasAssignments || hasMapel);
  }, [currentTeacher, db.teachingAssignments]);

  const canSwitchDutyMode = Boolean(
    hasHomeroomDuty && hasTeachingDuties && currentUser.role !== 'admin' && currentUser.role !== 'kepsek'
  );

  const homeroomClass = React.useMemo(() => {
    const cId = currentUser.classId || currentTeacher?.homeroomClassId;
    return db.classrooms.find((c) => c.id === cId);
  }, [currentUser, currentTeacher, db.classrooms]);

  // Effective User with active role depending on current duty mode
  const effectiveUser: User = React.useMemo(() => {
    let base = currentUser;
    // Auto-link teacherId if missing but teacher found by name/nip
    if (!base.teacherId && currentTeacher) {
      base = { ...base, teacherId: currentTeacher.id };
    }
    
    if (!canSwitchDutyMode) return base;
    return {
      ...base,
      role: dutyMode,
      activeDutyMode: dutyMode
    };
  }, [canSwitchDutyMode, currentUser, dutyMode, currentTeacher]);

  // Modal for quick academic year switch
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);

  // Cloud Firebase Sync State
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({
    status: 'connected',
    lastSyncTime: null,
    message: 'Cloud Firebase Aktif',
    isOnline: true
  });

  useEffect(() => {
    const unsubscribeSync = subscribeToSyncState(setCloudSyncState);

    // Subscribe to Firestore real-time listener for All Core Data
    const unsubscribeRealtime = listenToFirestoreRealtime((payload) => {
      setDb((prev) => {
        let changed = false;
        const updated = { ...prev };

        const mergeList = (key: keyof AppDatabase, incoming: any[] | undefined) => {
          if (incoming && incoming.length > 0) {
            // Special cases for composite IDs or specific merging needs
            if (key === 'finalScoreConfigs') {
              if (!updated.finalScoreConfigs) updated.finalScoreConfigs = [];
              incoming.forEach(fsc => {
                if (!fsc) return;
                const idx = updated.finalScoreConfigs.findIndex(c => c && c.subjectId === fsc.subjectId && c.classId === fsc.classId);
                if (idx >= 0) {
                  const existing = updated.finalScoreConfigs[idx];
                  if (JSON.stringify(existing) !== JSON.stringify(fsc)) {
                    updated.finalScoreConfigs[idx] = fsc;
                    changed = true;
                  }
                } else {
                  updated.finalScoreConfigs.push(fsc);
                  changed = true;
                }
              });
              return;
            }

            // Standard ID-based merge
            const currentList = (prev[key] as any[]) || [];
            const incomingMap = new Map(incoming.filter(item => item && item.id).map(item => [item.id, item]));
            
            // 1. Update existing items
            const nextList = currentList.map(item => {
              if (!item || !item.id) return item;
              const cloudItem = incomingMap.get(item.id);
              if (cloudItem && JSON.stringify(item) !== JSON.stringify(cloudItem)) {
                changed = true;
                return cloudItem;
              }
              return item;
            });

            // 2. Add new items
            incoming.forEach(item => {
              if (item && item.id && !currentList.some(existing => existing && existing.id === item.id)) {
                nextList.push(item);
                changed = true;
              }
            });

            if (changed) {
              (updated as any)[key] = nextList;
            }
          }
        };

        // Standard Collections
        mergeList('scores', payload.scores);
        mergeList('notifications', payload.notifications);
        mergeList('formativeAssessments', payload.formativeAssessments);
        mergeList('summativeAssessments', payload.summativeAssessments);
        mergeList('kktpConfigs', payload.kktpConfigs);
        mergeList('finalScoreConfigs', payload.finalScoreConfigs);
        
        // Master Data Collections
        mergeList('students', payload.students);
        mergeList('teachers', payload.teachers);
        mergeList('classrooms', payload.classrooms);
        mergeList('subjects', payload.subjects);
        mergeList('teachingAssignments', payload.teachingAssignments);
        mergeList('learningObjectives', payload.learningObjectives);
        mergeList('curricula', payload.curricula);
        mergeList('users', payload.users);
        mergeList('attendance', payload.attendance);
        mergeList('homeroomNotes', payload.homeroomNotes);
        
        if (payload.schoolProfile && payload.schoolProfile.length > 0) {
          const remoteSchool = payload.schoolProfile[0];
          if (JSON.stringify(prev.schoolProfile) !== JSON.stringify(remoteSchool)) {
            updated.schoolProfile = remoteSchool;
            changed = true;
          }
        }

        mergeList('extracurriculars', payload.extracurriculars);
        mergeList('studentExtracurriculars', payload.studentExtracurriculars);

        if (changed) {
          const finalDb = syncUsersWithTeachers(updated);
          saveDatabase(finalDb);
          return finalDb;
        }
        return prev;
      });
    });

    // Initial check & auto-sync to Cloud Firestore on boot
    // Initial check & auto-sync to Cloud Firestore on boot
    const initCloud = async () => {
      try {
        const conn = await testFirestoreConnection();
        if (conn.success) {
          const remoteData = await fetchFromFirestore();
          if (remoteData && remoteData.students && remoteData.students.length > 0) {
            setDb((prev) => {
              const merged: AppDatabase = {
                ...prev,
                schoolProfile: remoteData.schoolProfile || prev.schoolProfile,
                students: remoteData.students && remoteData.students.length > 0 ? remoteData.students : prev.students,
                teachers: remoteData.teachers && remoteData.teachers.length > 0 ? remoteData.teachers : prev.teachers,
                classrooms: sortClassrooms(
                  remoteData.classrooms && remoteData.classrooms.length > 0 ? remoteData.classrooms : prev.classrooms
                ),
                subjects: remoteData.subjects && remoteData.subjects.length > 0 ? remoteData.subjects : prev.subjects,
                curricula: remoteData.curricula && remoteData.curricula.length > 0 ? remoteData.curricula : prev.curricula,
                learningObjectives: remoteData.learningObjectives && remoteData.learningObjectives.length > 0 ? remoteData.learningObjectives : prev.learningObjectives,
                scores: (() => {
                  const remoteScores = remoteData.scores || [];
                  const localScores = prev.scores || [];
                  const scoreKey = (s: AssessmentScore) =>
                    `${s.studentId}-${s.subjectId}-${(s.academicYear || '').replace(/\//g, '_')}-${s.semester}`;
                  const scoreMap = new Map();
                  // In initial sync, Remote (Cloud) takes precedence to ensure other devices' work is seen
                  localScores.forEach((s) => scoreMap.set(scoreKey(s), s));
                  remoteScores.forEach((s) => scoreMap.set(scoreKey(s), s)); 
                  return Array.from(scoreMap.values());
                })(),
                attendance: (() => {
                  const remoteAtt = remoteData.attendance || [];
                  const localAtt = prev.attendance || [];
                  const attKey = (a: Attendance) => `${a.studentId}-${(a.academicYear || '').replace(/\//g, '_')}-${a.semester}`;
                  const attMap = new Map();
                  localAtt.forEach((a) => attMap.set(attKey(a), a));
                  remoteAtt.forEach((a) => attMap.set(attKey(a), a));
                  return Array.from(attMap.values());
                })(),
                homeroomNotes: (() => {
                  const remoteNotes = remoteData.homeroomNotes || [];
                  const localNotes = prev.homeroomNotes || [];
                  const noteKey = (n: HomeroomNote) => `${n.studentId}-${(n.academicYear || '').replace(/\//g, '_')}-${n.semester}`;
                  const noteMap = new Map();
                  localNotes.forEach((n) => noteMap.set(noteKey(n), n));
                  remoteNotes.forEach((n) => noteMap.set(noteKey(n), n));
                  return Array.from(noteMap.values());
                })(),
                teachingAssignments: remoteData.teachingAssignments && remoteData.teachingAssignments.length > 0
                  ? remoteData.teachingAssignments
                  : prev.teachingAssignments,
                users: remoteData.users && remoteData.users.length > 0 ? remoteData.users : prev.users,
                formativeAssessments: remoteData.formativeAssessments || prev.formativeAssessments,
                summativeAssessments: remoteData.summativeAssessments || prev.summativeAssessments,
                kktpConfigs: remoteData.kktpConfigs || prev.kktpConfigs,
                finalScoreConfigs: remoteData.finalScoreConfigs || prev.finalScoreConfigs
              };
              const cleaned = sanitizeTeachingAssignments(syncUsersWithTeachers(merged));

              // Remove orphaned users from Firestore so they never reappear on reload
              if (remoteData.users) {
                const validUserIds = new Set(cleaned.users.map((u: User) => u.id));
                remoteData.users.forEach((ru: User) => {
                  if (!validUserIds.has(ru.id)) {
                    deleteDocFromFirestore('users', ru.id).catch(() => {});
                  }
                });
              }

              // Update currentUser if the user account was deleted
              setCurrentUser((curr: User) => {
                const exists = cleaned.users.some((u: User) => u.id === curr.id);
                if (!exists) {
                  return cleaned.users.find((u: User) => u.role === 'admin') || cleaned.users[0] || curr;
                }
                return curr;
              });

              saveDatabase(cleaned);
              return cleaned;
            });
          }
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
      }
    };

    initCloud();
    return () => {
      unsubscribeSync();
      unsubscribeRealtime();
    };
  }, []);

  // Persist DB helper (Instant local update + targeted or debounced Cloud sync)
  const updateDbAndSave = (
    updater: (prev: AppDatabase) => AppDatabase, 
    skipCloudSync = false,
    syncHint?: { collection: string; id: string; data: any }
  ) => {
    setDb((prev) => {
      const next = updater(prev);
      saveDatabase(next);
      
      if (!skipCloudSync) {
        if (syncHint) {
          // Surgical sync: update only one document (highly efficient)
          surgicalSync(syncHint.collection, syncHint.id, syncHint.data).catch(() => {});
        } else {
          // Fallback: full sync (debounced)
          queueAutoSyncToFirestore(next);
        }
      }
      return next;
    });
  };

  const handleManualSyncToCloud = async () => {
    try {
      setCloudSyncState(prev => ({ ...prev, status: 'syncing', message: 'Sinkronisasi data...' }));
      const remoteData = await fetchFromFirestore();
      if (remoteData) {
        handleApplyRemoteData(remoteData);
      }
      await syncAllToFirestore(db, currentUser);
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  const handleReconnect = async () => {
    await reconnectToCloud();
    await handleManualSyncToCloud();
  };

  // Handlers for School Profile
  const handleSaveSchool = (updated: SchoolProfile) => {
    updateDbAndSave(
      (prev) => ({ ...prev, schoolProfile: updated }),
      false,
      { collection: 'schools', id: 'smpn1rangsang', data: updated }
    );
    logActivity(currentUser, 'Ubah Profil Sekolah', 'Memperbarui informasi identitas satuan pendidikan.');
  };

  // Handlers for Teachers
  const handleSaveTeacher = (teacher: Teacher) => {
    updateDbAndSave((prev) => {
      const idx = prev.teachers.findIndex((t) => t.id === teacher.id);
      let newTeachers = [...prev.teachers];
      if (idx >= 0) {
        newTeachers[idx] = teacher;
      } else {
        newTeachers.push(teacher);
      }

      // Sync homeroom class assignment in classrooms if applicable
      let updatedClassrooms = [...prev.classrooms];
      if (teacher.isHomeroom && teacher.homeroomClassId) {
        updatedClassrooms = updatedClassrooms.map((c) => {
          if (c.id === teacher.homeroomClassId) {
            return { ...c, homeroomTeacherId: teacher.id };
          }
          if (c.homeroomTeacherId === teacher.id && c.id !== teacher.homeroomClassId) {
            return { ...c, homeroomTeacherId: '' };
          }
          return c;
        });
      } else if (!teacher.isHomeroom) {
        updatedClassrooms = updatedClassrooms.map((c) => {
          if (c.homeroomTeacherId === teacher.id) {
            return { ...c, homeroomTeacherId: '' };
          }
          return c;
        });
      }

      return syncUsersWithTeachers({ ...prev, teachers: newTeachers, classrooms: updatedClassrooms });
    }, false, { collection: 'teachers', id: teacher.id, data: teacher });
    logActivity(currentUser, 'Simpan Guru', `Menyimpan data guru: ${teacher.name}`);
  };

  const handleDeleteTeacher = (teacherId: string) => {
    const teacherToDelete = db.teachers.find((t) => t.id === teacherId);
    
    // Find associated user accounts (by teacherId, nip, or name matching)
    const usersToDelete = db.users.filter(
      (u) =>
        u.teacherId === teacherId ||
        (teacherToDelete && u.nip && u.nip === teacherToDelete.nip) ||
        (teacherToDelete && u.name && u.name.toLowerCase().trim() === teacherToDelete.name.toLowerCase().trim())
    );

    // Delete associated user documents from Firestore immediately
    usersToDelete.forEach((u) => {
      deleteDocFromFirestore('users', u.id).catch(() => {});
    });

    // Check if the currently logged-in user is the one being deleted
    const isCurrentDeleted = 
      currentUser.teacherId === teacherId ||
      usersToDelete.some((u) => u.id === currentUser.id) ||
      (teacherToDelete && currentUser.nip && currentUser.nip === teacherToDelete.nip) ||
      (teacherToDelete && currentUser.name.toLowerCase().trim() === teacherToDelete.name.toLowerCase().trim());

    if (isCurrentDeleted) {
      const fallbackAdmin = db.users.find((u) => u.role === 'admin' && !usersToDelete.some((del) => del.id === u.id)) || {
        id: 'usr-admin-1',
        username: 'admin',
        name: 'Administrator Rapor',
        role: 'admin',
        isActive: true
      };
      setCurrentUser(fallbackAdmin as User);
    }

    const assignmentsToDelete = (db.teachingAssignments || []).filter((ta) => ta.teacherId === teacherId);
    assignmentsToDelete.forEach((ta) => {
      deleteDocFromFirestore('teaching_assignments', ta.id).catch(() => {});
    });

    updateDbAndSave((prev) =>
      syncUsersWithTeachers({
        ...prev,
        teachers: prev.teachers.filter((t) => t.id !== teacherId),
        teachingAssignments: (prev.teachingAssignments || []).filter((ta) => ta.teacherId !== teacherId),
        users: prev.users.filter((u) => !usersToDelete.some((del) => del.id === u.id))
      })
    );
    deleteDocFromFirestore('teachers', teacherId).catch(() => {});
    logActivity(currentUser, 'Hapus Guru & Hak Akses', `Menghapus guru ${teacherToDelete?.name || teacherId} dan seluruh akun hak akses terkait.`);
  };

  // Handlers for Students
  const handleSaveStudent = (student: Student) => {
    updateDbAndSave((prev) => {
      const idx = prev.students.findIndex((s) => s.id === student.id);
      let newStudents = [...prev.students];
      if (idx >= 0) {
        newStudents[idx] = student;
      } else {
        newStudents.push(student);
      }
      return { ...prev, students: newStudents };
    }, false, { collection: 'students', id: student.id, data: student });
    logActivity(currentUser, 'Simpan Siswa', `Menyimpan data peserta didik: ${student.name}`);
  };

  const handleDeleteStudent = (studentId: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
      scores: prev.scores.filter((sc) => sc.studentId !== studentId)
    }));
    deleteDocFromFirestore('students', studentId).catch(() => {});
    logActivity(currentUser, 'Hapus Siswa', `Menghapus data siswa ID: ${studentId}`);
  };

  const handleImportStudents = (newStudents: Student[]) => {
    updateDbAndSave((prev) => ({
      ...prev,
      students: [...prev.students, ...newStudents]
    }));
    logActivity(currentUser, 'Impor Siswa Dapodik', `Berhasil mengimpor ${newStudents.length} siswa baru.`);
  };

  // Handlers for Classrooms
  const handleSaveClassroom = (classroom: Classroom) => {
    updateDbAndSave((prev) => {
      const idx = prev.classrooms.findIndex((c) => c.id === classroom.id);
      let newCls = [...prev.classrooms];
      if (idx >= 0) {
        newCls[idx] = classroom;
      } else {
        newCls.push(classroom);
      }
      return { ...prev, classrooms: sortClassrooms(newCls) };
    }, false, { collection: 'classrooms', id: classroom.id, data: classroom });
    logActivity(currentUser, 'Simpan Rombel', `Menyimpan rombel: ${classroom.name}`);
  };

  const handleDeleteClassroom = (classroomId: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      classrooms: prev.classrooms.filter((c) => c.id !== classroomId)
    }));
    deleteDocFromFirestore('classrooms', classroomId).catch(() => {});
    logActivity(currentUser, 'Hapus Rombel', `Menghapus rombel ID: ${classroomId}`);
  };

  // Handlers for Subjects
  const handleSaveSubject = (subject: Subject) => {
    updateDbAndSave((prev) => {
      const idx = prev.subjects.findIndex((s) => s.id === subject.id);
      let newSubs = [...prev.subjects];
      if (idx >= 0) {
        newSubs[idx] = subject;
      } else {
        newSubs.push(subject);
      }
      return { ...prev, subjects: newSubs };
    }, false, { collection: 'subjects', id: subject.id, data: subject });
    logActivity(currentUser, 'Simpan Mapel', `Menyimpan mata pelajaran: ${subject.name}`);
  };

  const handleDeleteSubject = (subjectId: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subjectId)
    }));
    deleteDocFromFirestore('subjects', subjectId).catch(() => {});
    logActivity(currentUser, 'Hapus Mapel', `Menghapus mapel ID: ${subjectId}`);
  };

  // Handlers for Curricula
  const handleSaveCurricula = (curricula: Curriculum[]) => {
    updateDbAndSave((prev) => ({ ...prev, curricula }));
    logActivity(currentUser, 'Ubah Kurikulum', 'Memperbarui konfigurasi bobot nilai & kriteria kurikulum.');
  };

  // Handlers for Learning Objectives (TP)
  const handleSaveObjective = (obj: LearningObjective) => {
    updateDbAndSave((prev) => {
      const idx = prev.learningObjectives.findIndex((o) => o.id === obj.id);
      let newObjectives = [...prev.learningObjectives];
      if (idx >= 0) {
        newObjectives[idx] = obj;
      } else {
        newObjectives.push(obj);
      }
      return { ...prev, learningObjectives: newObjectives };
    }, false, { collection: 'assessments', id: obj.id, data: obj });
    logActivity(currentUser, 'Simpan TP', `Menyimpan Tujuan Pembelajaran: ${obj.code}`);
  };

  const handleDeleteObjective = (objId: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      learningObjectives: prev.learningObjectives.filter((o) => o.id !== objId)
    }));
    logActivity(currentUser, 'Hapus TP', `Menghapus Tujuan Pembelajaran ID: ${objId}`);
  };

  // Handlers for Extracurriculars
  const handleSaveExtracurricular = (ekskul: Extracurricular) => {
    updateDbAndSave((prev) => {
      const idx = prev.extracurriculars.findIndex((e) => e.id === ekskul.id);
      let newEkskul = [...prev.extracurriculars];
      if (idx >= 0) {
        newEkskul[idx] = ekskul;
      } else {
        newEkskul.push(ekskul);
      }
      return { ...prev, extracurriculars: newEkskul };
    }, false, { collection: 'extracurriculars', id: ekskul.id, data: ekskul });
    logActivity(currentUser, 'Simpan Ekskul', `Menyimpan kegiatan ekskul: ${ekskul.name}`);
  };

  const handleDeleteExtracurricular = (id: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      extracurriculars: prev.extracurriculars.filter((e) => e.id !== id)
    }));
    logActivity(currentUser, 'Hapus Ekskul', `Menghapus kegiatan ekskul ID: ${id}`);
  };

  const handleSaveStudentEkskul = (record: StudentExtracurricular) => {
    updateDbAndSave((prev) => {
      const idx = prev.studentExtracurriculars.findIndex(
        (se) =>
          se.studentId === record.studentId &&
          se.extracurricularId === record.extracurricularId &&
          se.academicYear === record.academicYear &&
          se.semester === record.semester
      );
      let list = [...prev.studentExtracurriculars];
      if (idx >= 0) {
        list[idx] = record;
      } else {
        list.push(record);
      }
      return { ...prev, studentExtracurriculars: list };
    }, false, { collection: 'student_extracurriculars', id: record.id, data: record });
  };

  // Handlers for Attendance
  const handleSaveAttendance = (records: Attendance[]) => {
    updateDbAndSave((prev) => {
      const newAtt = [...prev.attendance];
      records.forEach((rec) => {
        const idx = newAtt.findIndex(
          (a) =>
            a.studentId === rec.studentId &&
            a.academicYear === rec.academicYear &&
            a.semester === rec.semester
        );
        if (idx >= 0) {
          newAtt[idx] = rec;
        } else {
          newAtt.push(rec);
        }
        // Sync each record surgically
        surgicalSync('attendance', rec.id, rec).catch(() => {});
      });
      return { ...prev, attendance: newAtt };
    }, true); // skip full sync since we did it surgically for each item above
    logActivity(currentUser, 'Simpan Absensi', `Menyimpan rekap absensi untuk ${records.length} siswa.`);
  };

  // Handlers for Scores (Batch save & Real-time Cloud Sync)
  const handleSaveScores = (newScores: AssessmentScore[], notification?: AppNotification) => {
    const scoreKey = (s: AssessmentScore) =>
      `${s.studentId}-${s.subjectId}-${(s.academicYear || '').replace(/\//g, '_')}-${s.semester}`;

    updateDbAndSave((prev) => {
      const scoreMap = new Map(prev.scores.map((s) => [scoreKey(s), s]));
      newScores.forEach((sc) => {
        scoreMap.set(scoreKey(sc), sc);
      });

      let updatedNotifications = prev.notifications || [];
      if (notification) {
        const notifMap = new Map(updatedNotifications.map((n) => [n.id, n]));
        notifMap.set(notification.id, notification);
        updatedNotifications = Array.from(notifMap.values());
      }

      return {
        ...prev,
        scores: Array.from(scoreMap.values()),
        notifications: updatedNotifications
      };
    }, true); // skip whole-database auto sync! We send targeted scores below!

    // Save directly to Cloud Firestore in real time
    saveScoresToFirestoreDirect(newScores, notification).catch(() => {});

    logActivity(currentUser, 'Simpan Nilai Siswa', `Menyimpan dan mengkalkulasi ${newScores.length} data nilai.`);
  };

  const handleMarkNotificationRead = (notifId: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    }));
  };

  // Handlers for Homeroom Notes
  const handleSaveHomeroomNotes = (notes: HomeroomNote[]) => {
    updateDbAndSave((prev) => {
      const map = new Map(prev.homeroomNotes.map((n) => [n.id, n]));
      notes.forEach((n) => {
        map.set(n.id, n);
        surgicalSync('homeroom_notes', n.id, n).catch(() => {});
      });
      return { ...prev, homeroomNotes: Array.from(map.values()) };
    }, true);
    logActivity(currentUser, 'Simpan Catatan Wali Kelas', `Menyimpan catatan untuk ${notes.length} siswa.`);
  };

  // Handlers for Description Bank
  const handleSaveDescriptionBank = (bank: SubjectDescriptionBank[]) => {
    updateDbAndSave((prev) => ({ ...prev, descriptionBank: bank }));
    logActivity(currentUser, 'Simpan Bank Deskripsi', 'Memperbarui bank deskripsi nilai otomatis.');
  };

  // Handlers for Class Promotion
  const handlePromoteStudents = (studentIds: string[], targetClassId: string) => {
    updateDbAndSave((prev) => {
      const updatedStudents = prev.students.map((s) => {
        if (studentIds.includes(s.id)) {
          return { ...s, classId: targetClassId };
        }
        return s;
      });
      return { ...prev, students: updatedStudents };
    });
    logActivity(currentUser, 'Kenaikan Kelas Siswa', `Memindahkan ${studentIds.length} siswa ke rombel tujuan.`);
  };

  // Handlers for Users
  const handleSaveUser = (user: User) => {
    updateDbAndSave((prev) => {
      const idx = prev.users.findIndex((u) => u.id === user.id);
      let newUsers = [...prev.users];
      if (idx >= 0) {
        newUsers[idx] = user;
      } else {
        newUsers.push(user);
      }
      return { ...prev, users: newUsers };
    }, false, { collection: 'users', id: user.id, data: user });
    logActivity(currentUser, 'Simpan Pengguna', `Menyimpan akun pengguna @${user.username}`);
  };

  const handleDeleteUser = (userId: string) => {
    if (currentUser.id === userId) {
      const fallbackAdmin = db.users.find((u) => u.role === 'admin' && u.id !== userId) || {
        id: 'usr-admin-1',
        username: 'admin',
        name: 'Administrator Rapor',
        role: 'admin',
        isActive: true
      };
      setCurrentUser(fallbackAdmin as User);
    }
    deleteDocFromFirestore('users', userId).catch(() => {});
    updateDbAndSave((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId)
    }));
    logActivity(currentUser, 'Hapus Pengguna', `Menghapus akun pengguna ID: ${userId}`);
  };

  // Handlers for Homeroom Teacher (Wali Kelas) Accounts
  const handleSaveWaliKelas = (user: User, teacherId: string, classId: string) => {
    updateDbAndSave((prev) => {
      // 1. Sync assignment in classrooms & teachers
      const synced = syncHomeroomAssignment(prev, teacherId, classId, user.id);
      
      // 2. Upsert user in users table
      const idx = synced.users.findIndex((u) => u.id === user.id);
      let newUsers = [...synced.users];
      const updatedUser = { ...user, teacherId, classId };
      if (idx >= 0) {
        newUsers[idx] = updatedUser;
      } else {
        newUsers.push(updatedUser);
      }
      return syncUsersWithTeachers({ ...synced, users: newUsers });
    }, false, { collection: 'users', id: user.id, data: { ...user, teacherId, classId } });
    const cls = db.classrooms.find((c) => c.id === classId);
    logActivity(
      currentUser,
      'Penugasan Wali Kelas',
      `Menetapkan akun ${user.name} (@${user.username}) sebagai Wali ${cls?.name || classId}`
    );
  };

  // Handlers for Teaching Assignments (Penugasan Guru Mengajar)
  const handleSaveTeachingAssignments = (assignments: TeachingAssignment[]) => {
    updateDbAndSave((prev) => {
      assignments.forEach(ta => {
        surgicalSync('teaching_assignments', ta.id, ta).catch(() => {});
      });
      return {
        ...prev,
        teachingAssignments: assignments
      };
    }, true);
    logActivity(
      currentUser,
      'Penugasan Guru Mengajar',
      `Menyimpan daftar ${assignments.length} penugasan guru mengajar.`
    );
  };

  const handleDeleteTeachingAssignment = (assignmentId: string) => {
    deleteDocFromFirestore('teaching_assignments', assignmentId).catch(() => {});
    updateDbAndSave((prev) => ({
      ...prev,
      teachingAssignments: (prev.teachingAssignments || []).filter((a) => a.id !== assignmentId)
    }));
    logActivity(
      currentUser,
      'Hapus Penugasan Mengajar',
      `Menghapus penugasan mengajar ID: ${assignmentId}`
    );
  };

  const handleToggleUserStatus = (userId: string, newStatus: 'active' | 'inactive') => {
    updateDbAndSave((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    }));
    logActivity(
      currentUser,
      'Ubah Status Akun',
      `Mengubah status akun ID ${userId} menjadi ${newStatus === 'active' ? 'Aktif' : 'Nonaktif'}`
    );
  };

  const handleResetUserPassword = (userId: string, newPass: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
    }));
    logActivity(currentUser, 'Reset Password', `Mereset password untuk akun pengguna ID: ${userId}`);
  };

  // Database Backup / Restore / Reset
  const handleBackupDatabase = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `Backup_ERapor_SMPN1Rangsang_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    logActivity(currentUser, 'Backup Database', 'Mengunduh cadangan lengkap database aplikasi ke berkas JSON.');
  };

  const handleRestoreDatabase = (jsonContent: string) => {
    try {
      const parsed = JSON.parse(jsonContent);
      setDb(parsed);
      saveDatabase(parsed);
      logActivity(currentUser, 'Restore Database', 'Memulihkan database dari berkas cadangan JSON.');
    } catch (e: any) {
      alert(`Gagal memulihkan database: ${e.message}`);
    }
  };

  const handleResetDatabase = () => {
    localStorage.removeItem('erapor_smpn1rangsang_db_v1');
    const freshDb = loadDatabase();
    setDb(freshDb);
    logActivity(currentUser, 'Reset Database', 'Mengembalikan database ke konfigurasi awal SMP Negeri 1 Rangsang.');
  };

  const handlePurgeMasterData = async () => {
    try {
      // 1. Clear locally first for instant feedback
      const purged = partialPurgeMasterData(db);
      setDb(purged);
      saveDatabase(purged);
      
      // 2. Clear cloud collections (Hard Wipe)
      await wipeFirestoreMasterCollections();
      
      // 3. Sync the remaining configuration (School Profile, Classrooms, etc.) back to cloud
      await syncAllToFirestore(purged, currentUser);
      
      logActivity(currentUser, 'Pembersihan Data Master', 'Mengosongkan seluruh data siswa, guru, dan akun guru untuk mulai baru.');
    } catch (e: any) {
      console.error('Purge error:', e);
      alert(`Gagal membersihkan data master: ${e.message}`);
    }
  };

  // Kurikulum Merdeka 2025 Handlers
  const handleSaveFormative = (fa: FormativeAssessment) => {
    updateDbAndSave(
      (prev) => {
        const filtered = (prev.formativeAssessments || []).filter(a => a.id !== fa.id);
        return { ...prev, formativeAssessments: [...filtered, fa] };
      },
      false,
      { collection: 'formative_assessments', id: fa.id, data: fa }
    );
  };

  const handleSaveSummative = (sa: SummativeAssessment) => {
    updateDbAndSave(
      (prev) => {
        const filtered = (prev.summativeAssessments || []).filter(a => a.id !== sa.id);
        return { ...prev, summativeAssessments: [...filtered, sa] };
      },
      false,
      { collection: 'summative_assessments', id: sa.id, data: sa }
    );
  };

  const handleDeleteSummative = (id: string) => {
    updateDbAndSave((prev) => ({
      ...prev,
      summativeAssessments: (prev.summativeAssessments || []).filter(a => a.id !== id)
    }));
    deleteDocFromFirestore('summative_assessments', id).catch(() => {});
  };

  const handleSaveKKTP = (config: KKTPConfig) => {
    updateDbAndSave(
      (prev) => {
        const filtered = (prev.kktpConfigs || []).filter(c => c.tpId !== config.tpId);
        return { ...prev, kktpConfigs: [...filtered, config] };
      },
      false,
      { collection: 'kktp_configs', id: config.id, data: config }
    );
  };

  const handleSaveFinalScoreConfig = (config: SubjectFinalScoreConfig) => {
    updateDbAndSave((prev) => {
      const filtered = (prev.finalScoreConfigs || []).filter(c => c.subjectId !== config.subjectId || c.classId !== config.classId);
      return { ...prev, finalScoreConfigs: [...filtered, config] };
    });
  };

  const handleUpdateSchoolSettings = (updated: Partial<SchoolProfile>) => {
    updateDbAndSave((prev) => ({
      ...prev,
      schoolProfile: { ...prev.schoolProfile, ...updated }
    }));
    logActivity(currentUser, 'Ubah Pengaturan Periode', 'Memperbarui tahun pelajaran, semester, atau tanggal bagi rapor.');
  };

  const handleApplyRemoteData = (remoteData: Partial<AppDatabase>) => {
    updateDbAndSave((prev) => ({
      ...prev,
      ...remoteData
    }));
    logActivity(currentUser, 'Sinkronisasi Cloud Firestore', 'Memperbarui data lokal dari Cloud Firestore.');
  };

  const handleNavigateToPrint = (studentId?: string) => {
    if (studentId) setTargetPrintStudentId(studentId);
    setActiveMenu('cetak-rapor');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar navigation */}
      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={(menu) => setActiveMenu(menu)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        userRole={effectiveUser.role}
        counts={{
          students: db.students.length,
          teachers: db.teachers.length,
          classes: db.classrooms.length,
          subjects: db.subjects.length
        }}
      />

      {/* Main Content Container (ml-72 on desktop, full width on mobile) */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-72 min-h-screen">
        {/* Header bar */}
        <Header
          school={db.schoolProfile}
          currentUser={effectiveUser}
          onSwitchUser={handleSwitchUser}
          allUsers={db.users}
          notifications={db.notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenQuickSettings={() => setIsQuickSettingsOpen(true)}
          cloudSyncState={cloudSyncState}
          onTriggerSync={handleManualSyncToCloud}
          onReconnect={handleReconnect}
          activeDutyMode={dutyMode}
          onToggleDutyMode={setDutyMode}
          canSwitchDutyMode={canSwitchDutyMode}
          homeroomClassName={homeroomClass?.name}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 custom-scrollbar">
          {activeMenu === 'dashboard' && (
            <DashboardView
              school={db.schoolProfile}
              students={db.students}
              teachers={db.teachers}
              classrooms={db.classrooms}
              subjects={db.subjects}
              scores={db.scores}
              currentUser={effectiveUser}
              onNavigate={(m) => setActiveMenu(m)}
              onOpenQuickSettings={() => setIsQuickSettingsOpen(true)}
              cloudSyncState={cloudSyncState}
            />
          )}

          {activeMenu === 'data-referensi' && <DataReferensiView />}

          {activeMenu === 'data-sekolah' && (
            <DataSekolahView
              school={db.schoolProfile}
              onSave={handleSaveSchool}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-guru' && (
            <DataGuruView
              teachers={db.teachers}
              subjects={db.subjects}
              classrooms={db.classrooms}
              onSaveTeacher={handleSaveTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-siswa' && (
            <DataSiswaView
              students={db.students}
              classrooms={db.classrooms}
              onSaveStudent={handleSaveStudent}
              onDeleteStudent={handleDeleteStudent}
              onNavigateToImport={() => setActiveMenu('impor-ekspor')}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'rombel' && (
            <RombelView
              classrooms={db.classrooms}
              teachers={db.teachers}
              curricula={db.curricula}
              students={db.students}
              onSaveClassroom={handleSaveClassroom}
              onDeleteClassroom={handleDeleteClassroom}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-mapel' && (
            <DataMapelView
              subjects={db.subjects}
              onSaveSubject={handleSaveSubject}
              onDeleteSubject={handleDeleteSubject}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-kurikulum' && (
            <DataKurikulumView
              curricula={db.curricula}
              onSaveCurricula={handleSaveCurricula}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'penugasan-guru' && (
            <PenugasanGuruView
              teachers={db.teachers}
              subjects={db.subjects}
              classrooms={db.classrooms}
              teachingAssignments={db.teachingAssignments || []}
              onSaveAssignments={handleSaveTeachingAssignments}
              onDeleteAssignment={handleDeleteTeachingAssignment}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-pembelajaran' && (
            <DataPembelajaranView
              learningObjectives={db.learningObjectives}
              subjects={db.subjects}
              curricula={db.curricula}
              onSaveObjective={handleSaveObjective}
              onDeleteObjective={handleDeleteObjective}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-ekskul' && (
            <DataEkskulView
              extracurriculars={db.extracurriculars}
              studentExtracurriculars={db.studentExtracurriculars}
              classrooms={db.classrooms}
              students={db.students}
              onSaveExtracurricular={handleSaveExtracurricular}
              onDeleteExtracurricular={handleDeleteExtracurricular}
              onSaveStudentEkskul={handleSaveStudentEkskul}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'data-absensi' && (
            <DataAbsensiView
              attendanceList={db.attendance}
              classrooms={db.classrooms}
              students={db.students}
              onSaveAttendance={handleSaveAttendance}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'kktp-config' && (
            <KKTPConfigView
              subjects={db.subjects}
              learningObjectives={db.learningObjectives}
              kktpConfigs={db.kktpConfigs || []}
              onSaveKKTP={handleSaveKKTP}
              currentUser={effectiveUser}
              teachingAssignments={db.teachingAssignments || []}
            />
          )}

          {activeMenu === 'asesmen-formatif' && (
            <AsesmenFormatifView
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              learningObjectives={db.learningObjectives}
              formativeAssessments={db.formativeAssessments || []}
              onSaveAssessment={handleSaveFormative}
              currentUser={effectiveUser}
              teachingAssignments={db.teachingAssignments || []}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
            />
          )}

          {activeMenu === 'asesmen-sumatif' && (
            <AsesmenSumatifView
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              learningObjectives={db.learningObjectives}
              summativeAssessments={db.summativeAssessments || []}
              onSaveAssessment={handleSaveSummative}
              onDeleteAssessment={handleDeleteSummative}
              currentUser={effectiveUser}
              teachingAssignments={db.teachingAssignments || []}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
            />
          )}

          {activeMenu === 'pengolahan-nilai-akhir' && (
            <PengolahanNilaiAkhirView
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              learningObjectives={db.learningObjectives}
              summativeAssessments={db.summativeAssessments || []}
              kktpConfigs={db.kktpConfigs || []}
              finalScoreConfigs={db.finalScoreConfigs || []}
              scores={db.scores}
              onSaveScores={handleSaveScores}
              onSaveConfig={handleSaveFinalScoreConfig}
              currentUser={effectiveUser}
              teachingAssignments={db.teachingAssignments || []}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
            />
          )}

          {activeMenu === 'input-nilai' && (
            <InputNilaiView
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              learningObjectives={db.learningObjectives}
              scores={db.scores}
              curricula={db.curricula}
              teachers={db.teachers}
              teachingAssignments={db.teachingAssignments || []}
              onSaveScores={handleSaveScores}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'pengolahan-nilai' && (
            <PengolahanNilaiView
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              scores={db.scores}
              teachers={db.teachers}
              teachingAssignments={db.teachingAssignments || []}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'deskripsi-nilai' && (
            <DeskripsiNilaiView
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              scores={db.scores}
              learningObjectives={db.learningObjectives}
              descriptionBank={db.descriptionBank}
              teachers={db.teachers}
              teachingAssignments={db.teachingAssignments || []}
              onSaveScores={handleSaveScores}
              onSaveDescriptionBank={handleSaveDescriptionBank}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'rekap-nilai-mapel' && (
            <RekapNilaiMapelView
              db={db}
              currentUser={effectiveUser}
              onSaveScores={handleSaveScores}
            />
          )}

          {activeMenu === 'rekap-nilai' && (
            <RekapitulasiNilaiView
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              scores={db.scores}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'leger-nilai' && (
            <LegerNilaiView
              school={db.schoolProfile}
              classrooms={db.classrooms}
              subjects={db.subjects}
              students={db.students}
              scores={db.scores}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'pengolahan-rapor' && (
            <PengolahanRaporView
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              scores={db.scores}
              attendanceList={db.attendance}
              studentExtracurriculars={db.studentExtracurriculars}
              homeroomNotes={db.homeroomNotes}
              onSaveHomeroomNotes={handleSaveHomeroomNotes}
              onNavigateToPrint={handleNavigateToPrint}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'kenaikan-kelas' && (
            <KenaikanKelasView
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              scores={db.scores}
              attendanceList={db.attendance}
              homeroomNotes={db.homeroomNotes}
              onSaveDecisions={handleSaveHomeroomNotes}
              onPromoteStudents={handlePromoteStudents}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'cetak-rapor' && (
            <CetakRaporView
              school={db.schoolProfile}
              classrooms={db.classrooms}
              students={db.students}
              subjects={db.subjects}
              scores={db.scores}
              attendanceList={db.attendance}
              extracurriculars={db.extracurriculars}
              studentExtracurriculars={db.studentExtracurriculars}
              homeroomNotes={db.homeroomNotes}
              teachers={db.teachers}
              preselectedStudentId={targetPrintStudentId}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'laporan-sekolah' && (
            <LaporanSekolahView
              school={db.schoolProfile}
              classrooms={db.classrooms}
              students={db.students}
              teachers={db.teachers}
              subjects={db.subjects}
              scores={db.scores}
              attendanceList={db.attendance}
              academicYear={db.schoolProfile.activeAcademicYear}
              semester={db.schoolProfile.activeSemester}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'impor-ekspor' && (
            <ImporEksporDapodikView
              students={db.students}
              teachers={db.teachers}
              classrooms={db.classrooms}
              subjects={db.subjects}
              scores={db.scores}
              onImportStudents={handleImportStudents}
              currentUser={effectiveUser}
            />
          )}

          {activeMenu === 'manajemen-wali-kelas' && (
            <ManajemenWaliKelasView
              users={db.users}
              teachers={db.teachers}
              classrooms={db.classrooms}
              currentUser={effectiveUser}
              onSaveWaliKelas={handleSaveWaliKelas}
              onDeleteUser={handleDeleteUser}
              onToggleStatus={handleToggleUserStatus}
              onResetPassword={handleResetUserPassword}
              onSwitchUser={(u) => {
                handleSwitchUser(u);
                setActiveMenu('dashboard');
              }}
            />
          )}

          {activeMenu === 'manajemen-pengguna' && (
            <ManajemenPenggunaView
              users={db.users}
              teachers={db.teachers}
              classrooms={db.classrooms}
              currentUser={effectiveUser}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              onSwitchUser={handleSwitchUser}
            />
          )}

          {activeMenu === 'pengaturan-aplikasi' && (
            <PengaturanAplikasiView
              school={db.schoolProfile}
              auditLogs={db.auditLogs}
              onUpdateSchoolSettings={handleUpdateSchoolSettings}
              onBackupDatabase={handleBackupDatabase}
              onRestoreDatabase={handleRestoreDatabase}
              onResetDatabase={handleResetDatabase}
              onPurgeMasterData={handlePurgeMasterData}
              currentUser={effectiveUser}
              db={db}
              onApplyRemoteData={handleApplyRemoteData}
            />
          )}
        </main>
      </div>

      {/* Quick Settings Modal (Triggered from header academic pill) */}
      {isQuickSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Periode & Tahun Pelajaran Aktif
              </h3>
              <button
                onClick={() => setIsQuickSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pilih tahun pelajaran aktif untuk penginputan nilai dan pencetakan rapor. Sistem siap beroperasi jangka panjang dan berkelanjutan.
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Tahun Pelajaran</label>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = getCurrentSystemAcademicYear();
                      handleUpdateSchoolSettings({
                        activeAcademicYear: cur.academicYear,
                        activeSemester: cur.semester,
                        reportDate: getDefaultReportDate(cur.academicYear, cur.semester)
                      });
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                  >
                    Gunakan Tahun Sekarang ({getCurrentSystemAcademicYear().academicYear})
                  </button>
                </div>
                <select
                  value={db.schoolProfile.activeAcademicYear}
                  onChange={(e) => {
                    const yr = e.target.value;
                    handleUpdateSchoolSettings({
                      activeAcademicYear: yr,
                      reportDate: getDefaultReportDate(yr, db.schoolProfile.activeSemester)
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {getAvailableAcademicYears(2023, 10).map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun Pelajaran {yr} {yr === '2026/2027' ? '(Tahun Berjalan Saat Ini)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateSchoolSettings({
                      activeSemester: 'Ganjil',
                      reportDate: getDefaultReportDate(db.schoolProfile.activeAcademicYear, 'Ganjil')
                    })}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition ${
                      db.schoolProfile.activeSemester === 'Ganjil'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Semester Ganjil
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSchoolSettings({
                      activeSemester: 'Genap',
                      reportDate: getDefaultReportDate(db.schoolProfile.activeAcademicYear, 'Genap')
                    })}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition ${
                      db.schoolProfile.activeSemester === 'Genap'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Semester Genap
                  </button>
                </div>
              </div>

              {/* Data Safety Assurance Box */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
                <span className="text-sm">🛡️</span>
                <div>
                  <span className="font-bold block">Keamanan Data Historis:</span>
                  Data siswa, nilai, dan absensi di tahun-tahun pelajaran sebelumnya tetap aman tersimpan di database. Anda dapat beralih tahun kapan pun untuk memeriksa arsip nilai tanpa risiko data hilang.
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsQuickSettingsOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
