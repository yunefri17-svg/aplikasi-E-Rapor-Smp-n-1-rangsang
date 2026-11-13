export type UserRole = 'admin' | 'guru' | 'walikelas' | 'kepsek';
export type DutyMode = 'walikelas' | 'guru';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  nip?: string;
  teacherId?: string;
  classId?: string; // If homeroom teacher (wali kelas)
  avatar?: string;
  status?: 'active' | 'inactive';
  password?: string;
  activeDutyMode?: DutyMode; // For teachers with dual roles (Wali Kelas + Guru Mapel)
}

export interface TeachingAssignment {
  id: string;
  teacherId: string;
  teacherName?: string;
  subjectId: string;
  subjectName?: string;
  classId: string;
  className?: string;
  academicYear: string;
  semester?: 'Ganjil' | 'Genap' | 'Semua';
  status: 'active' | 'inactive';
  notes?: string;
  updatedAt?: string;
}

export interface SchoolProfile {
  npsn: string;
  nss?: string; // Nomor Statistik Sekolah (e.g. 201040101001)
  name: string;
  status: 'Negeri' | 'Swasta';
  jenjang: 'SMP';
  address: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  postalCode: string;
  email: string;
  phone: string;
  website: string;
  headmasterName: string;
  headmasterNip: string;
  activeAcademicYear: string; // e.g. "2024/2025"
  activeSemester: 'Ganjil' | 'Genap';
  reportDate: string; // e.g. "20 Desember 2024"
  reportPlace: string; // e.g. "Tanjung Samak"
  schoolLogo?: string;
  tutwuriLogo?: string;
  autoAcademicYear?: boolean; // If true, automatically advances academic year each year
}

export interface Teacher {
  id: string;
  nip: string;
  nuptk: string;
  name: string;
  degree: string;
  gender: 'L' | 'P';
  education: string;
  employmentStatus: 'PNS' | 'PPPK' | 'PPPK paruh waktu' | 'Guru Honor Sekolah' | 'GTT';
  position: string;
  phone: string;
  email: string;
  subjectsTaught: string[]; // Subject IDs
  isHomeroom: boolean;
  homeroomClassId?: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  pob: string; // Place of birth
  dob: string; // Date of birth YYYY-MM-DD
  religion: 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | 'Buddha' | 'Konghucu';
  address: string;
  fatherName: string;
  motherName: string;
  fatherJob: string;
  motherJob: string;
  parentPhone: string;
  classId: string;
  status: 'Aktif' | 'Mutasi' | 'Lulus' | 'Keluar';
  // Kemendikbud Buku Induk / Biodata Rapor fields
  familyStatus?: string; // Status dalam keluarga (e.g. "Anak Kandung")
  childOrder?: number | string; // Anak ke-
  homePhone?: string; // Nomor telepon rumah
  previousSchool?: string; // Sekolah asal (e.g. "SD Negeri 01 Tanjung Samak")
  acceptedClass?: string; // Diterima di kelas (e.g. "VII")
  acceptedDate?: string; // Tanggal diterima di sekolah ini
  parentAddress?: string; // Alamat orang tua jika berbeda
  guardianName?: string; // Nama wali peserta didik
  guardianAddress?: string; // Alamat wali
  guardianPhone?: string; // Nomor telepon wali
  guardianJob?: string; // Pekerjaan wali
  photoUrl?: string; // Pas foto siswa
}

export interface Classroom {
  id: string;
  name: string; // e.g. "Kelas 7A"
  gradeLevel: '7' | '8' | '9';
  curriculumId: string;
  homeroomTeacherId: string;
  roomNumber: string;
  capacity: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  category: 'A' | 'B' | 'Muatan Lokal'; // Kemendikbud standard groups
  orderIndex: number;
  kkm: number; // for K13 or passing standard reference (e.g. 75)
}

export interface Curriculum {
  id: string;
  code: string;
  name: string; // "Kurikulum Merdeka" or "Kurikulum 2013"
  phase: string; // "Fase D" for SMP
  description: string;
  formatifWeight: number; // e.g. 50
  sumatifWeight: number; // e.g. 50
  passingCriteria: number; // 75
}

export interface LearningObjective {
  id: string;
  curriculumId: string;
  subjectId: string;
  gradeLevel: '7' | '8' | '9';
  code: string; // e.g. "TP 7.1"
  description: string;
  semester: 'Ganjil' | 'Genap';
}

export interface AssessmentScore {
  id: string;
  studentId: string;
  studentName?: string;
  subjectId: string;
  subjectName?: string;
  classId: string;
  className?: string;
  teacherId?: string;
  teacherName?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  formatifScores: Record<string, number>; // TP ID -> Score 0-100
  sumatifMateriScores: Record<string, number>; // TP / Scope -> Score 0-100
  sumatifAkhirSemester: number; // Test score SAS/ASAS
  finalScore: number;
  predicate: 'A' | 'B' | 'C' | 'D';
  highestCompetenceDesc: string;
  lowestCompetenceDesc: string;
  notes?: string;
  status?: 'BELUM' | 'DALAM PROSES' | 'PROSES' | 'SELESAI' | 'REVISI' | 'TERKUNCI';
  revisionNote?: string;
  updatedAt: string;
  createdAt?: string;
  updatedBy?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp?: string;
  createdAt: string;
  recipientUserId?: string;
  recipientRole?: 'admin' | 'guru' | 'walikelas' | 'kepsek';
  classId: string;
  className?: string;
  subjectId: string;
  subjectName?: string;
  teacherId?: string;
  teacherName?: string;
  academicYear?: string;
  semester?: 'Ganjil' | 'Genap';
  type?: 'info' | 'completed' | 'revision' | 'revision_requested' | 'score_submitted';
  readBy?: string[];
  isRead?: boolean;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  sakit: number;
  izin: number;
  alpa: number;
}

export interface Extracurricular {
  id: string;
  name: string;
  coachName: string;
  dayAndTime: string;
  description: string;
}

export interface StudentExtracurricular {
  id: string;
  studentId: string;
  extracurricularId: string;
  classId: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  predicate: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  description: string;
}

export interface HomeroomNote {
  id: string;
  studentId: string;
  classId: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  growthNote: string;
  achievementNote: string;
  suggestions: string;
  promotionDecision?: 'Naik ke Kelas 8' | 'Naik ke Kelas 9' | 'Lulus' | 'Tinggal di Kelas 7' | 'Tinggal di Kelas 8' | 'Tidak Lulus' | 'Belum Ditentukan';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
}

// Kurikulum Merdeka 2025 Modules
export type FormativeTechnique = 'observasi' | 'tanya jawab' | 'diskusi' | 'kuis' | 'latihan' | 'praktik' | 'tugas';
export type SummativeTechnique = 'tes tertulis' | 'praktik' | 'proyek' | 'produk' | 'lainnya';

export interface FormativeAssessment {
  id: string;
  studentId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  tpId: string;
  date: string;
  technique: FormativeTechnique;
  observation: string;
  feedback: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  updatedAt: string;
}

export interface SummativeAssessment {
  id: string;
  studentId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  tpId: string;
  date: string;
  technique: SummativeTechnique;
  score: number;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  updatedAt: string;
}

export interface KKTPCriterion {
  category: 'Perlu Bimbingan' | 'Cukup' | 'Baik' | 'Sangat Baik';
  minScore: number;
  description: string;
}

export interface KKTPConfig {
  id: string;
  subjectId: string;
  gradeLevel: '7' | '8' | '9';
  tpId: string;
  criteria: KKTPCriterion[];
  updatedAt: string;
}

export type FinalScoreMethod = 'rata-rata' | 'pembobotan' | 'persentase-tp';

export interface SubjectFinalScoreConfig {
  subjectId: string;
  classId: string;
  method: FinalScoreMethod;
  tpWeights?: Record<string, number>; // tpId -> weight
  sasWeight?: number; // Weight for Summative Akhir Semester
}

export interface AcademicSemesterConfig {
  semester: 'Ganjil' | 'Genap';
  status: 'aktif' | 'arsip' | 'persiapan';
  reportDate: string;
  isLocked?: boolean;
}

export interface AcademicYearPeriod {
  id: string; // e.g. "ay-2026-2027"
  name: string; // e.g. "2026/2027"
  status: 'aktif' | 'persiapan' | 'arsip';
  semesters: AcademicSemesterConfig[];
  startDate?: string;
  endDate?: string;
  isLocked?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentMutation {
  id: string;
  studentId: string;
  studentName: string;
  nisn?: string;
  type: 'masuk' | 'keluar';
  date: string;
  previousSchool?: string; // Untuk mutasi masuk
  targetSchool?: string; // Untuk mutasi keluar
  classId: string;
  className: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  reason: string;
  letterNumber?: string; // Nomor Surat Keterangan Pindah
  notes?: string;
  createdAt?: string;
}

export interface StudentAchievement {
  id: string;
  studentId: string;
  studentName: string;
  nisn?: string;
  className?: string;
  title: string; // Nama kejuaraan / penghargaan
  type: 'Akademik' | 'Non-Akademik';
  level: 'Sekolah' | 'Kecamatan' | 'Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional';
  rank: string; // Juara 1, Medali Emas, dll.
  year: string;
  organizer?: string;
  certificateNumber?: string;
  notes?: string;
  createdAt?: string;
}

export interface KokurikulerProject {
  id: string;
  title: string;
  theme: string; // Tema P5 (Kearifan Lokal, Bhinneka Tunggal Ika, dll.)
  gradeLevel: '7' | '8' | '9';
  classId?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  description: string;
  facilitatorName?: string;
  notes?: string;
  createdAt?: string;
}

// ============================================================================
// MODUL PENILAIAN KOKURIKULER (e-Rapor SMP Kemendikdasmen Versi 2025.2)
// Referensi: Keputusan Kepala BSKAP Nomor 058/H/KR/2025
// ============================================================================

export type KokurikulerAchievementLevel = 'Berkembang' | 'Cakap' | 'Mahir';

export type KokurikulerDescriptionStatus =
  | 'Belum diisi'
  | 'Draft'
  | 'Sudah disimpan'
  | 'Sudah diperiksa'
  | 'Final';

export interface KokurikulerLevelDescriptions {
  Berkembang: string;
  Cakap: string;
  Mahir: string;
}

export interface KokurikulerSubdimensionMaster {
  id: string;
  dimensionId: string;
  code: string;
  name: string;
  phase: 'D';
  levelDescriptions: KokurikulerLevelDescriptions;
  isLocked?: boolean;
}

export interface KokurikulerDimensionMaster {
  id: string;
  order: number;
  name: string;
  shortName: string;
  description: string;
  subdimensions: KokurikulerSubdimensionMaster[];
  isLocked?: boolean;
  updatedAt?: string;
}

export interface KokurikulerThemeMaster {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface KokurikulerGroup {
  id: string;
  schoolId?: string;
  code: string; // e.g., KOK-2627-1-01
  name: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  theme: string;
  phase: string; // e.g., "Fase D (SMP)"
  classIds: string[]; // Supports one or multiple rombel
  coordinatorTeacherId: string;
  coordinatorName?: string;
  involvedTeacherIds: string[];
  involvedTeacherDimensions?: Record<string, string[]>; // teacherId -> dimensionIds allowed
  studentIds: string[]; // Registered student participants
  status: 'Aktif' | 'Nonaktif';
  isAssessmentLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KokurikulerActivity {
  id: string;
  schoolId?: string;
  orderIndex: number;
  name: string;
  finalObjective: string; // Tujuan Akhir Kegiatan
  groupId: string;
  theme: string;
  phase: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  dimensionIds: string[]; // Selected target dimensions (flexible, not all 8 required)
  subdimensionIds: string[]; // Selected target subdimensions
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KokurikulerScore {
  id: string; // Unique deterministic ID per academicYear+semester+group+activity+student+subdimension
  schoolId?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  groupId: string;
  activityId: string;
  studentId: string;
  rombelId: string;
  dimensionId: string;
  subdimensionId: string;
  teacherId: string;
  level: KokurikulerAchievementLevel;
  status: 'Draft' | 'Tersimpan' | 'Terkunci';
  createdAt: string;
  updatedAt: string;
}

export interface KokurikulerDescription {
  id: string; // Unique deterministic ID per academicYear+semester+group+activity+student
  schoolId?: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  groupId: string;
  activityId: string;
  studentId: string;
  rombelId: string;
  teacherId: string;
  description: string;
  status: KokurikulerDescriptionStatus;
  completenessWarning?: string;
  isAutoGenerated?: boolean;
  createdAt: string;
  updatedAt: string;
}


