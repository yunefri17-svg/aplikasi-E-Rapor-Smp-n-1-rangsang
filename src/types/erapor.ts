export type UserRole = 'admin' | 'guru' | 'walikelas' | 'kepsek';
export type DutyMode = 'walikelas' | 'guru';

export type AuthVerificationStatus =
  | 'verified_password'
  | 'verified_google'
  | 'unverified_anonymous_fallback';

export interface AuthSessionContext {
  firebaseUid?: string;
  verificationStatus: AuthVerificationStatus;
  providerId: string;
  boundUserId?: string;
  boundRole?: UserRole;
  passwordLengthEligible?: boolean;
  notice?: string;
  verifiedAt?: string;
}

export interface UserPublicProfile {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  nip?: string;
  teacherId?: string;
  classId?: string;
  status?: 'active' | 'inactive';
  firebaseUid?: string;
  verificationStatus?: AuthVerificationStatus;
  updatedAt?: string;
}

export type SaveSyncStatus =
  | 'IDLE'
  | 'SAVING'
  | 'SAVED_SERVER'
  | 'LOCAL_ONLY_QUOTA'
  | 'CONFLICT_DETECTED'
  | 'FAILED_SERVER';

export interface SaveOperationResult<T = unknown> {
  success: boolean;
  savedToServer: boolean;
  status: SaveSyncStatus;
  count?: number;
  message?: string;
  error?: string;
  conflictDetected?: boolean;
  quotaExceeded?: boolean;
  timestamp?: string;
  data?: T;
}

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
  firebaseUid?: string;
  authVerificationStatus?: AuthVerificationStatus;
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
  excludedStudentIds?: string[]; // Optional opt-out for elective subjects (Mapel Pilihan)
  enrolledStudentIds?: string[]; // Optional explicit opt-in whitelist for Mapel Pilihan
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
  category: 'A' | 'B' | 'Muatan Lokal' | 'Pilihan'; // Kemendikbud standard groups + Pilihan
  isElective?: boolean;
  excludedFromOfficialTranscript?: boolean;
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
  classId?: string; // Optional specific class binding (omitted = applies to all classes in gradeLevel)
  gradeLevel: '7' | '8' | '9';
  code: string; // e.g. "TP 7.1"
  description: string;
  semester: 'Ganjil' | 'Genap';
  academicYear?: string; // Optional period binding; if omitted applies to all years for that grade/semester
  materi?: string; // Lingkup materi / topik kompetensi
  phase?: string; // e.g. "Fase D"
  createdByTeacherId?: string;
  teacherId?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface LearningChapter {
  id: string;
  code: string; // e.g. "BAB 1"
  orderIndex: number; // 1, 2, 3...
  title: string; // e.g. "Bilangan Bulat"
  description?: string;
  subjectId: string;
  classId: string;
  gradeLevel: '7' | '8' | '9';
  teacherId: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  linkedTpIds?: string[]; // Optional TPs covered in this BAB for rapor description evidence
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SummativeAssessmentPlan {
  id: string;
  title: string; // e.g. "Sumatif BAB 1", "Sumatif BAB 2"
  chapterId: string; // Parent BAB Materi (LearningChapter)
  chapterCode?: string;
  chapterTitle?: string;
  tpIds: string[]; // References existing TP IDs from assessments without duplicating TP records
  subjectId: string;
  classId: string;
  gradeLevel: '7' | '8' | '9';
  teacherId: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  technique?: SummativeTechnique;
  assessmentDate?: string;
  description?: string;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export type TPAttainmentStatus =
  | 'tercapai_optimal'
  | 'tercapai_baik'
  | 'perlu_penguatan'
  | 'belum_cukup_bukti';

export interface TPAttainmentSummary {
  tpId: string;
  code: string;
  description: string;
  materi?: string;
  status: TPAttainmentStatus;
  summativeAvg?: number;
  summativeCount: number;
  formativeCount: number;
  formativeStatuses: ('Tercapai Optimal' | 'Tercapai Baik' | 'Perlu Penguatan')[];
  evidenceSummary: string;
}

export type AssessmentDescriptionStatus =
  | 'Belum dibuat'
  | 'Draft otomatis'
  | 'Sudah diedit guru'
  | 'Sudah disimpan'
  | 'Sudah difinalisasi';

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
  academicYearId?: string;
  semester: 'Ganjil' | 'Genap';
  semesterId?: string;
  formatifScores: Record<string, number>; // TP ID -> Score 0-100
  sumatifMateriScores: Record<string, number>; // TP / Scope -> Score 0-100
  chapterScores?: Record<string, number>; // LearningChapter ID -> Score 0-100
  sumatifAkhirSemester: number; // Test score SAS/ASAS
  hasSasScore?: boolean; // Distinguishes explicit 0 SAS from blank/unentered SAS
  babAverage?: number; // Computed average of filled BAB scores
  babWeightPercent?: number; // Effective BAB weight % used in calculation
  sasWeightPercent?: number; // Effective SAS weight % used in calculation
  finalScoreBreakdown?: string; // Transparent calculation breakdown text
  hasMissingComponents?: boolean; // True when any BAB or SAS is still empty
  missingComponentNote?: string; // Warning note detailing missing BABs / SAS
  finalScore: number;
  formatifAverage?: number; // Computed average of formative assessments (50% weight)
  sumatifAverage?: number; // Computed average of all summative components including SAS (50% weight)
  rawFinalScore?: number; // Exact decimal final score before rounding (e.g. 79.38)
  completenessStatus?: 'LENGKAP' | 'BELUM_LENGKAP';
  finalScoreStatus?:
    | 'FINAL_VALID'
    | 'MANUAL_OVERRIDE'
    | 'DRAFT_INCOMPLETE'
    | 'TERKUNCI'
    | 'BELUM_DIHITUNG';
  predicate: 'A' | 'B' | 'C' | 'D';
  highestCompetenceDesc: string;
  lowestCompetenceDesc: string;
  // Enhanced TP-based automated description fields
  selectedOptimalTpIds?: string[]; // Per-student teacher-checked TP optimal
  selectedImprovementTpIds?: string[]; // Per-student teacher-checked TP perlu pendampingan
  manualFinalScore?: number; // Direct teacher-input Nilai Akhir Rapor (0-100)
  learningObjectiveIds?: string[];
  formativeAssessmentIds?: string[];
  summativeAssessmentIds?: string[];
  achievedObjectives?: TPAttainmentSummary[];
  objectivesForImprovement?: TPAttainmentSummary[];
  tpAnalysis?: TPAttainmentSummary[];
  generatedDescription?: string;
  finalDescription?: string;
  descriptionStatus?: AssessmentDescriptionStatus;
  completenessWarning?: string;
  notes?: string;
  status?: 'BELUM' | 'DALAM PROSES' | 'PROSES' | 'SELESAI' | 'REVISI' | 'TERKUNCI';
  revisionNote?: string;
  updatedAt: string;
  createdAt?: string;
  updatedBy?: string;
  updatedById?: string;
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
export type FormativeMasteryStatus = 'Tercapai Optimal' | 'Tercapai Baik' | 'Perlu Penguatan';

export interface FormativeAssessment {
  id: string;
  studentId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  tpId: string; // Primary TP ID (backward compatible)
  tpIds?: string[]; // Supports multi-TP formative assessment
  date: string;
  technique: FormativeTechnique;
  masteryStatus?: FormativeMasteryStatus;
  score?: number; // Optional diagnostic score 0-100 if given by teacher
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
  planId?: string; // Reference to SummativeAssessmentPlan
  planTitle?: string;
  chapterId?: string; // Primary BAB Materi ID (Requirement B)
  chapterCode?: string; // e.g. "BAB 1"
  chapterTitle?: string; // e.g. "Bilangan Bulat"
  tpId: string; // Primary TP ID or chapter fallback (backward compatible with Firestore rules)
  tpIds?: string[]; // Supports 1 assessment covering multiple TPs
  assessmentTitle?: string; // e.g. "BAB 1 - Bilangan Bulat" or "UH 1 Teks Deskripsi"
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

export interface AssessmentPolicyConfig {
  id: 'assessment_policy';
  optimalMinScore: number; // Default 88 -> TP dicapai optimal
  goodMinScore: number; // Default 75 -> TP dicapai baik (batas KKTP)
  needStrengtheningBelow: number; // Default 75 -> TP perlu penguatan
  minimumTpEvidenceCount: number; // Default 1 -> Minimal TP dinilai sebelum deskripsi dianggap lengkap
  usePerTpKktpIfConfigured: boolean; // Default true
  formulaPolicyMode: 'existing_default' | 'confirmed_custom';
  confirmedFormulaNote?: string;
  includeFormativeInFinalScore: boolean; // Default false (formatif tidak mengubah bobot angka kecuali dikonfirmasi admin)
  isInputLocked: boolean; // Kunci global periode aktif
  lockedPeriods?: Record<string, boolean>; // e.g. "2026/2027_Ganjil": true
  lockedMessage?: string;
  updatedAt: string;
  updatedBy?: string;
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


