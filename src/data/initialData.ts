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
  TeachingAssignment,
  KKTPConfig,
  FormativeAssessment,
  SummativeAssessment,
  SubjectFinalScoreConfig
} from '../types/erapor';

export const initialSchoolProfile: SchoolProfile = {
  npsn: '10403328',
  nss: '201040101001',
  name: 'SMP NEGERI 1 RANGSANG',
  status: 'Negeri',
  jenjang: 'SMP',
  address: 'Jl. Pelajar No. 01 Tanjung Samak',
  desa: 'Tanjung Samak',
  kecamatan: 'Rangsang',
  kabupaten: 'Kepulauan Meranti',
  provinsi: 'Riau',
  postalCode: '28792',
  email: 'smpn1rangsang@merantikab.go.id',
  phone: '0812-7654-3210',
  website: 'https://smpn1rangsang.sch.id',
  headmasterName: 'Kamaruddin, S.Pd.',
  headmasterNip: '19710424 199708 1 001',
  activeAcademicYear: '2026/2027',
  activeSemester: 'Ganjil',
  reportDate: '19 Desember 2026',
  reportPlace: 'Tanjung Samak',
  autoAcademicYear: true
};

export const initialCurricula: Curriculum[] = [
  {
    id: 'cur-merdeka',
    code: 'KUR-MERDEKA',
    name: 'Kurikulum Merdeka (Fase D SMP)',
    phase: 'Fase D (Kelas VII - IX)',
    description: 'Kurikulum berbasis capaian pembelajaran, penilaian formatif & sumatif lingkup materi serta sumatif akhir semester.',
    formatifWeight: 50,
    sumatifWeight: 50,
    passingCriteria: 75
  },
  {
    id: 'cur-2013',
    code: 'K-2013',
    name: 'Kurikulum 2013 (K13 Revisi)',
    phase: 'SMP Kelas VII - IX',
    description: 'Kurikulum berbasis kompetensi inti dan kompetensi dasar (KI/KD) dengan penilaian Pengetahuan dan Keterampilan.',
    formatifWeight: 40,
    sumatifWeight: 60,
    passingCriteria: 70
  }
];

export const initialSubjects: Subject[] = [
  { id: 'sub-pai', code: 'PAIBP', name: 'Pendidikan Agama Islam dan Budi Pekerti', category: 'A', orderIndex: 1, kkm: 75 },
  { id: 'sub-ppkn', code: 'PPKN', name: 'Pendidikan Pancasila', category: 'A', orderIndex: 2, kkm: 75 },
  { id: 'sub-bindo', code: 'BINDO', name: 'Bahasa Indonesia', category: 'A', orderIndex: 3, kkm: 75 },
  { id: 'sub-mat', code: 'MTK', name: 'Matematika', category: 'A', orderIndex: 4, kkm: 75 },
  { id: 'sub-ipa', code: 'IPA', name: 'Ilmu Pengetahuan Alam (IPA)', category: 'A', orderIndex: 5, kkm: 75 },
  { id: 'sub-ips', code: 'IPS', name: 'Ilmu Pengetahuan Sosial (IPS)', category: 'A', orderIndex: 6, kkm: 75 },
  { id: 'sub-bing', code: 'BING', name: 'Bahasa Inggris', category: 'A', orderIndex: 7, kkm: 75 },
  { id: 'sub-pjok', code: 'PJOK', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', category: 'B', orderIndex: 8, kkm: 75 },
  { id: 'sub-inf', code: 'INF', name: 'Informatika', category: 'B', orderIndex: 9, kkm: 75 },
  { id: 'sub-seni', code: 'SENI', name: 'Seni Budaya & Prakarya', category: 'B', orderIndex: 10, kkm: 75 },
  { id: 'sub-bmr', code: 'BMR', name: 'Muatan Lokal Budaya Melayu Riau (BMR)', category: 'Muatan Lokal', orderIndex: 11, kkm: 75 }
];

export const initialTeachers: Teacher[] = [
  {
    id: 'tch-01',
    nip: '19710424 199708 1 001',
    nuptk: '7456749651200012',
    name: 'Kamaruddin, S.Pd.',
    degree: 'S.Pd.',
    gender: 'L',
    education: 'S1 Pendidikan Fisika - Universitas Riau',
    employmentStatus: 'PNS',
    position: 'Kepala Sekolah',
    phone: '0812-7654-0001',
    email: 'kamaruddin@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-ipa'],
    isHomeroom: false
  },
  {
    id: 'tch-02',
    nip: '19820515 200801 1 005',
    nuptk: '8245760662200023',
    name: 'Drs. Zulkifli, M.Pd.',
    degree: 'M.Pd.',
    gender: 'L',
    education: 'S2 Manajemen Pendidikan - Universitas Riau',
    employmentStatus: 'PNS',
    position: 'Wali Kelas VII.1 & Guru Bhs. Indonesia',
    phone: '0813-8899-1122',
    email: 'zulkifli@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-bindo'],
    isHomeroom: true,
    homeroomClassId: 'cls-vii-1'
  },
  {
    id: 'tch-03',
    nip: '19880912 201402 2 003',
    nuptk: '9356766667300045',
    name: 'Siti Rohani, S.Pd.',
    degree: 'S.Pd.',
    gender: 'P',
    education: 'S1 Pendidikan Matematika - UIN Suska Riau',
    employmentStatus: 'PNS',
    position: 'Wali Kelas VII.2 & Guru Matematika',
    phone: '0821-7788-9900',
    email: 'siti.rohani@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-mat'],
    isHomeroom: true,
    homeroomClassId: 'cls-vii-2'
  },
  {
    id: 'tch-04',
    nip: '19910314 201902 1 007',
    nuptk: '4534768670130089',
    name: 'Hendra Wijaya, S.Pd.',
    degree: 'S.Pd.',
    gender: 'L',
    education: 'S1 Pendidikan Jasmani - Universitas Riau',
    employmentStatus: 'PPPK',
    position: 'Wali Kelas VII.3 & Guru PJOK',
    phone: '0852-9900-1122',
    email: 'hendra.w@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-pjok'],
    isHomeroom: true,
    homeroomClassId: 'cls-vii-3'
  },
  {
    id: 'tch-05',
    nip: '19901103 201903 1 008',
    nuptk: '4534768670130092',
    name: 'Rahmat Hidayat, S.Pd.',
    degree: 'S.Pd.',
    gender: 'L',
    education: 'S1 Pendidikan IPA - Universitas Maritim Raja Ali Haji',
    employmentStatus: 'PPPK',
    position: 'Wali Kelas VIII.1 & Guru IPA',
    phone: '0852-6633-4411',
    email: 'rahmat.h@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-ipa'],
    isHomeroom: true,
    homeroomClassId: 'cls-viii-1'
  },
  {
    id: 'tch-06',
    nip: '19850320 201001 2 015',
    nuptk: '5142763665210088',
    name: 'Nurhasanah, S.Pd.I.',
    degree: 'S.Pd.I.',
    gender: 'P',
    education: 'S1 Tarbiyah - STAI Nurul Hidayah Selatpanjang',
    employmentStatus: 'PNS',
    position: 'Wali Kelas VIII.2 & Guru PAIBP',
    phone: '0823-8877-6655',
    email: 'nurhasanah@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-pai'],
    isHomeroom: true,
    homeroomClassId: 'cls-viii-2'
  },
  {
    id: 'tch-07',
    nip: '19870824 201101 2 009',
    nuptk: '8845761663200051',
    name: 'Dewi Sartika, S.Pd.',
    degree: 'S.Pd.',
    gender: 'P',
    education: 'S1 Pendidikan IPS / Geografi - Universitas Negeri Padang',
    employmentStatus: 'PNS',
    position: 'Wali Kelas VIII.3 & Guru IPS',
    phone: '0812-7766-5544',
    email: 'dewi.sartika@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-ips'],
    isHomeroom: true,
    homeroomClassId: 'cls-viii-3'
  },
  {
    id: 'tch-08',
    nip: '19920807 202221 1 002',
    nuptk: '3448770671130114',
    name: 'Muhammad Ilham, S.Kom.',
    degree: 'S.Kom.',
    gender: 'L',
    education: 'S1 Teknik Informatika - UIR',
    employmentStatus: 'PPPK',
    position: 'Wali Kelas IX.1 & Guru Informatika',
    phone: '0812-9988-7766',
    email: 'ilham.kom@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-inf'],
    isHomeroom: true,
    homeroomClassId: 'cls-ix-1'
  },
  {
    id: 'tch-09',
    nip: '19800714 200501 2 006',
    nuptk: '6246758660300062',
    name: 'Nikmatul Khasanah, S.Pd.',
    degree: 'S.Pd.',
    gender: 'P',
    education: 'S1 Pendidikan Matematika - Universitas Riau',
    employmentStatus: 'PNS',
    position: 'Wali Kelas IX.2 & Guru Matematika',
    phone: '0813-6543-2198',
    email: 'nikmatul.khasanah@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-mat'],
    isHomeroom: true,
    homeroomClassId: 'cls-ix-2'
  },
  {
    id: 'tch-10',
    nip: '19950118 202421 1 004',
    nuptk: '2139773674130032',
    name: 'Tengku Firdaus, S.Sn.',
    degree: 'S.Sn.',
    gender: 'L',
    education: 'S1 Seni Rupa - Institut Seni Indonesia Padang Panjang',
    employmentStatus: 'Guru Honor Sekolah',
    position: 'Wali Kelas IX.3 & Guru Seni & BMR',
    phone: '0853-7744-1199',
    email: 'tengku.firdaus@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-seni', 'sub-bmr'],
    isHomeroom: true,
    homeroomClassId: 'cls-ix-3'
  },
  {
    id: 'tch-11',
    nip: '19860412 201001 1 012',
    nuptk: '7734762664200031',
    name: 'Agus Prasetyo, S.Pd.',
    degree: 'S.Pd.',
    gender: 'L',
    education: 'S1 PPKn - Universitas Riau',
    employmentStatus: 'PNS',
    position: 'Guru Pendidikan Pancasila',
    phone: '0812-7890-4321',
    email: 'agus.p@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-ppkn'],
    isHomeroom: false
  },
  {
    id: 'tch-12',
    nip: '19930712 202012 1 005',
    nuptk: '8834762664200099',
    name: 'MUHAMAD FAUZI, S.Pd.Gr',
    degree: 'S.Pd.Gr',
    gender: 'L',
    education: 'S1 Pendidikan IPA - Universitas Riau',
    employmentStatus: 'PPPK',
    position: 'Guru Ilmu Pengetahuan Alam (IPA)',
    phone: '0812-7890-9988',
    email: 'muhamadfauzi@smpn1rangsang.sch.id',
    subjectsTaught: ['sub-ipa'],
    isHomeroom: false
  }
];

export const initialClassrooms: Classroom[] = [
  // Kelas VII (VII.1 - VII.3)
  { id: 'cls-vii-1', name: 'Kelas VII.1', gradeLevel: '7', curriculumId: 'cur-merdeka', homeroomTeacherId: 'tch-02', roomNumber: 'R. 101', capacity: 32 },
  { id: 'cls-vii-2', name: 'Kelas VII.2', gradeLevel: '7', curriculumId: 'cur-merdeka', homeroomTeacherId: 'tch-03', roomNumber: 'R. 102', capacity: 32 },
  { id: 'cls-vii-3', name: 'Kelas VII.3', gradeLevel: '7', curriculumId: 'cur-merdeka', homeroomTeacherId: 'tch-04', roomNumber: 'R. 103', capacity: 32 },
  // Kelas VIII (VIII.1 - VIII.3)
  { id: 'cls-viii-1', name: 'Kelas VIII.1', gradeLevel: '8', curriculumId: 'cur-merdeka', homeroomTeacherId: 'tch-05', roomNumber: 'R. 201', capacity: 32 },
  { id: 'cls-viii-2', name: 'Kelas VIII.2', gradeLevel: '8', curriculumId: 'cur-merdeka', homeroomTeacherId: 'tch-06', roomNumber: 'R. 202', capacity: 32 },
  { id: 'cls-viii-3', name: 'Kelas VIII.3', gradeLevel: '8', curriculumId: 'cur-merdeka', homeroomTeacherId: 'tch-07', roomNumber: 'R. 203', capacity: 32 },
  // Kelas IX (IX.1 - IX.3)
  { id: 'cls-ix-1', name: 'Kelas IX.1', gradeLevel: '9', curriculumId: 'cur-merdeka', homeroomTeacherId: 'tch-08', roomNumber: 'R. 301', capacity: 32 },
  { id: 'cls-ix-2', name: 'Kelas IX.2', gradeLevel: '9', curriculumId: 'cur-merdeka', homeroomTeacherId: 'tch-09', roomNumber: 'R. 302', capacity: 32 },
  { id: 'cls-ix-3', name: 'Kelas IX.3', gradeLevel: '9', curriculumId: 'cur-merdeka', homeroomTeacherId: 'tch-10', roomNumber: 'R. 303', capacity: 32 }
];

export const initialStudents: Student[] = [
  // Kelas VII.1
  {
    id: 'std-701',
    nis: '24701',
    nisn: '0115432901',
    name: 'Ahmad Fadillah',
    gender: 'L',
    pob: 'Tanjung Samak',
    dob: '2011-04-12',
    religion: 'Islam',
    address: 'Jl. Bahari No. 14 Tanjung Samak',
    fatherName: 'Hasan Basri',
    motherName: 'Mariana',
    fatherJob: 'Nelayan',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0812-7001-1101',
    classId: 'cls-vii-1',
    status: 'Aktif'
  },
  {
    id: 'std-702',
    nis: '24702',
    nisn: '0118945622',
    name: 'Anisa Ramadhani',
    gender: 'P',
    pob: 'Selatpanjang',
    dob: '2011-08-19',
    religion: 'Islam',
    address: 'Jl. Merdeka RT 02 RW 01 Tanjung Samak',
    fatherName: 'Syamsul Bahri',
    motherName: 'Faridah',
    fatherJob: 'Wiraswasta',
    motherJob: 'Pedagang',
    parentPhone: '0813-7002-2202',
    classId: 'cls-vii-1',
    status: 'Aktif'
  },
  {
    id: 'std-703',
    nis: '24703',
    nisn: '0114521093',
    name: 'Bagus Pratama Putra',
    gender: 'L',
    pob: 'Tanjung Samak',
    dob: '2011-02-05',
    religion: 'Islam',
    address: 'Jl. Diponegoro No. 8 Tanjung Samak',
    fatherName: 'Bambang Irawan',
    motherName: 'Sri Wahyuni',
    fatherJob: 'PNS',
    motherJob: 'Guru',
    parentPhone: '0852-7003-3303',
    classId: 'cls-vii-1',
    status: 'Aktif'
  },
  {
    id: 'std-704',
    nis: '24704',
    nisn: '0117823414',
    name: 'Citra Dewi Lestari',
    gender: 'P',
    pob: 'Tanjung Bakau',
    dob: '2011-10-15',
    religion: 'Islam',
    address: 'Dusun Tanjung Bakau, Kec. Rangsang',
    fatherName: 'Rustam',
    motherName: 'Salbiah',
    fatherJob: 'Petani Karet',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0823-7004-4404',
    classId: 'cls-vii-1',
    status: 'Aktif'
  },
  {
    id: 'std-705',
    nis: '24705',
    nisn: '0112390185',
    name: 'Daffa Rizky Alfaridzi',
    gender: 'L',
    pob: 'Tanjung Samak',
    dob: '2011-06-27',
    religion: 'Islam',
    address: 'Jl. Pelabuhan Baru RT 04 Tanjung Samak',
    fatherName: 'Ridwan',
    motherName: 'Nurlela',
    fatherJob: 'Buruh Pelabuhan',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0812-7005-5505',
    classId: 'cls-vii-1',
    status: 'Aktif'
  },
  {
    id: 'std-706',
    nis: '24706',
    nisn: '0116672386',
    name: 'Fathir Maulana',
    gender: 'L',
    pob: 'Repan',
    dob: '2011-01-30',
    religion: 'Islam',
    address: 'Desa Repan, Kec. Rangsang',
    fatherName: 'Ismail',
    motherName: 'Khadijah',
    fatherJob: 'Petani Kelapa',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0853-7006-6606',
    classId: 'cls-vii-1',
    status: 'Aktif'
  },
  {
    id: 'std-707',
    nis: '24707',
    nisn: '0119845127',
    name: 'Indah Permata Sari',
    gender: 'P',
    pob: 'Tanjung Samak',
    dob: '2011-11-08',
    religion: 'Islam',
    address: 'Jl. Sukajadi No. 22 Tanjung Samak',
    fatherName: 'Abdul Malik',
    motherName: 'Rosmini',
    fatherJob: 'Wiraswasta',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0821-7007-7707',
    classId: 'cls-vii-1',
    status: 'Aktif'
  },
  {
    id: 'std-708',
    nis: '24708',
    nisn: '0113349018',
    name: 'Muhammad Ilham Akbar',
    gender: 'L',
    pob: 'Tanjung Samak',
    dob: '2011-05-18',
    religion: 'Islam',
    address: 'Jl. Sudirman RT 01 Tanjung Samak',
    fatherName: 'M. Yusuf',
    motherName: 'Rohana',
    fatherJob: 'Perangkat Desa',
    motherJob: 'Pedagang',
    parentPhone: '0813-7008-8808',
    classId: 'cls-vii-1',
    status: 'Aktif'
  },

  // Kelas VII.2
  {
    id: 'std-709',
    nis: '24709',
    nisn: '0118822319',
    name: 'Nabila Az-Zahra',
    gender: 'P',
    pob: 'Tanjung Samak',
    dob: '2011-09-02',
    religion: 'Islam',
    address: 'Jl. Masjid Taqwa No. 5 Tanjung Samak',
    fatherName: 'Ibrahim',
    motherName: 'Kasmawati',
    fatherJob: 'Nelayan',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0822-7009-9909',
    classId: 'cls-vii-2',
    status: 'Aktif'
  },
  {
    id: 'std-710',
    nis: '24710',
    nisn: '0115443211',
    name: 'Rian Syahputra',
    gender: 'L',
    pob: 'Tanjung Samak',
    dob: '2011-03-12',
    religion: 'Islam',
    address: 'Jl. Bahari RT 03 Tanjung Samak',
    fatherName: 'Syahrial',
    motherName: 'Yuliana',
    fatherJob: 'Nelayan',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0812-7010-1010',
    classId: 'cls-vii-2',
    status: 'Aktif'
  },

  // Kelas VII.3
  {
    id: 'std-711',
    nis: '24711',
    nisn: '0116778899',
    name: 'Tengku Muhammad Hafiz',
    gender: 'L',
    pob: 'Tanjung Samak',
    dob: '2011-07-04',
    religion: 'Islam',
    address: 'Jl. Pelajar No. 12 Tanjung Samak',
    fatherName: 'Tengku Mansur',
    motherName: 'Tengku Salmah',
    fatherJob: 'PNS',
    motherJob: 'Guru',
    parentPhone: '0813-7011-1111',
    classId: 'cls-vii-3',
    status: 'Aktif'
  },
  {
    id: 'std-712',
    nis: '24712',
    nisn: '0119988776',
    name: 'Putri Balqis Humaira',
    gender: 'P',
    pob: 'Selatpanjang',
    dob: '2011-12-14',
    religion: 'Islam',
    address: 'Jl. Diponegoro RT 01 Tanjung Samak',
    fatherName: 'Baharuddin',
    motherName: 'Mardiah',
    fatherJob: 'Wiraswasta',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0821-7012-1212',
    classId: 'cls-vii-3',
    status: 'Aktif'
  },

  // Kelas VIII.1
  {
    id: 'std-801',
    nis: '23801',
    nisn: '0105432901',
    name: 'Dimas Surya Saputra',
    gender: 'L',
    pob: 'Tanjung Samak',
    dob: '2010-03-14',
    religion: 'Islam',
    address: 'Jl. Nelayan No. 03 Tanjung Samak',
    fatherName: 'Surya Darma',
    motherName: 'Lestari',
    fatherJob: 'Nelayan',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0812-8001-1101',
    classId: 'cls-viii-1',
    status: 'Aktif'
  },
  {
    id: 'std-802',
    nis: '23802',
    nisn: '0106677881',
    name: 'Kirana Larasati',
    gender: 'P',
    pob: 'Tanjung Samak',
    dob: '2010-06-22',
    religion: 'Islam',
    address: 'Jl. Merdeka No. 18 Tanjung Samak',
    fatherName: 'Zulkifli Lubis',
    motherName: 'Suryani',
    fatherJob: 'Wiraswasta',
    motherJob: 'Pedagang',
    parentPhone: '0813-8002-2202',
    classId: 'cls-viii-1',
    status: 'Aktif'
  },

  // Kelas VIII.2
  {
    id: 'std-803',
    nis: '23803',
    nisn: '0107788992',
    name: 'Fauzan Adzima',
    gender: 'L',
    pob: 'Repan',
    dob: '2010-08-11',
    religion: 'Islam',
    address: 'Dusun Parit Senang, Kec. Rangsang',
    fatherName: 'M. Tahir',
    motherName: 'Fatimah',
    fatherJob: 'Petani Sagu',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0852-8003-3303',
    classId: 'cls-viii-2',
    status: 'Aktif'
  },

  // Kelas VIII.3
  {
    id: 'std-804',
    nis: '23804',
    nisn: '0108899003',
    name: 'Raudhah Syahirah',
    gender: 'P',
    pob: 'Tanjung Samak',
    dob: '2010-11-29',
    religion: 'Islam',
    address: 'Jl. Masjid Taqwa RT 04 Tanjung Samak',
    fatherName: 'H. Syamsuddin',
    motherName: 'Hj. Zubaidah',
    fatherJob: 'Pedagang',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0823-8004-4404',
    classId: 'cls-viii-3',
    status: 'Aktif'
  },

  // Kelas IX.1
  {
    id: 'std-901',
    nis: '22901',
    nisn: '0095432901',
    name: 'Zahra Aulia Putri',
    gender: 'P',
    pob: 'Tanjung Samak',
    dob: '2009-07-21',
    religion: 'Islam',
    address: 'Jl. Pahlawan No. 12 Tanjung Samak',
    fatherName: 'Zulkarnaen',
    motherName: 'Aminah',
    fatherJob: 'PNS',
    motherJob: 'PNS',
    parentPhone: '0812-9001-1101',
    classId: 'cls-ix-1',
    status: 'Aktif'
  },
  {
    id: 'std-902',
    nis: '22902',
    nisn: '0096655441',
    name: 'Rafi Al-Faris',
    gender: 'L',
    pob: 'Selatpanjang',
    dob: '2009-04-10',
    religion: 'Islam',
    address: 'Jl. Pelabuhan Baru No. 05 Tanjung Samak',
    fatherName: 'Firman Syah',
    motherName: 'Nurhaliza',
    fatherJob: 'Wiraswasta',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0813-9002-2202',
    classId: 'cls-ix-1',
    status: 'Aktif'
  },

  // Kelas IX.2
  {
    id: 'std-903',
    nis: '22903',
    nisn: '0097766552',
    name: 'Dwi Kurniawan',
    gender: 'L',
    pob: 'Tanjung Samak',
    dob: '2009-09-17',
    religion: 'Islam',
    address: 'Jl. Bahari No. 33 Tanjung Samak',
    fatherName: 'Kurnia',
    motherName: 'Ernawati',
    fatherJob: 'Nelayan',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0852-9003-3303',
    classId: 'cls-ix-2',
    status: 'Aktif'
  },

  // Kelas IX.3
  {
    id: 'std-904',
    nis: '22904',
    nisn: '0098877663',
    name: 'Siti Sarah Ramadhani',
    gender: 'P',
    pob: 'Tanjung Bakau',
    dob: '2009-10-08',
    religion: 'Islam',
    address: 'Desa Tanjung Bakau, Kec. Rangsang',
    fatherName: 'Marzuki',
    motherName: 'Maimunah',
    fatherJob: 'Petani Karet',
    motherJob: 'Ibu Rumah Tangga',
    parentPhone: '0822-9004-4404',
    classId: 'cls-ix-3',
    status: 'Aktif'
  }
];

export const initialLearningObjectives: LearningObjective[] = [
  // Bahasa Indonesia Kelas 7 (Fase D)
  { id: 'tp-bindo-7.1', curriculumId: 'cur-merdeka', subjectId: 'sub-bindo', gradeLevel: '7', code: 'TP 7.1', description: 'Memahami dan menganalisis teks deskripsi objek alam, budaya, dan kearifan lokal Melayu Riau secara kritis', semester: 'Ganjil' },
  { id: 'tp-bindo-7.2', curriculumId: 'cur-merdeka', subjectId: 'sub-bindo', gradeLevel: '7', code: 'TP 7.2', description: 'Mengidentifikasi unsur-unsur dan struktur teks puisi rakyat (pantun, gurindam, syair)', semester: 'Ganjil' },
  { id: 'tp-bindo-7.3', curriculumId: 'cur-merdeka', subjectId: 'sub-bindo', gradeLevel: '7', code: 'TP 7.3', description: 'Menulis teks prosedur sederhana tentang kegiatan sehari-hari dengan struktur kalimat efektif', semester: 'Ganjil' },
  { id: 'tp-bindo-7.4', curriculumId: 'cur-merdeka', subjectId: 'sub-bindo', gradeLevel: '7', code: 'TP 7.4', description: 'Menyajikan gagasan dan pesan dalam bentuk teks narasi fiksi/cerita fantasi secara kreatif', semester: 'Ganjil' },
  
  // Matematika Kelas 7 (Fase D)
  { id: 'tp-mat-7.1', curriculumId: 'cur-merdeka', subjectId: 'sub-mat', gradeLevel: '7', code: 'TP 7.1', description: 'Membaca, menulis, dan membandingkan bilangan bulat serta operasi hitung campuran', semester: 'Ganjil' },
  { id: 'tp-mat-7.2', curriculumId: 'cur-merdeka', subjectId: 'sub-mat', gradeLevel: '7', code: 'TP 7.2', description: 'Menyelesaikan permasalahan kontekstual menggunakan konsep bilangan pecahan dan desimal', semester: 'Ganjil' },
  { id: 'tp-mat-7.3', curriculumId: 'cur-merdeka', subjectId: 'sub-mat', gradeLevel: '7', code: 'TP 7.3', description: 'Menyatakan suatu situasi ke dalam bentuk aljabar dan menyederhanakan operasi suku sejenis', semester: 'Ganjil' },
  { id: 'tp-mat-7.4', curriculumId: 'cur-merdeka', subjectId: 'sub-mat', gradeLevel: '7', code: 'TP 7.4', description: 'Menyelesaikan persamaan dan pertidaksamaan linear satu variabel dalam kehidupan sehari-hari', semester: 'Ganjil' },

  // IPA Kelas 7 (Fase D)
  { id: 'tp-ipa-7.1', curriculumId: 'cur-merdeka', subjectId: 'sub-ipa', gradeLevel: '7', code: 'TP 7.1', description: 'Menerapkan konsep pengukuran berbagai besaran dengan satuan baku dan alat ukur yang sesuai', semester: 'Ganjil' },
  { id: 'tp-ipa-7.2', curriculumId: 'cur-merdeka', subjectId: 'sub-ipa', gradeLevel: '7', code: 'TP 7.2', description: 'Mengklasifikasikan makhluk hidup dan benda berdasarkan karakteristik yang diamati', semester: 'Ganjil' },
  { id: 'tp-ipa-7.3', curriculumId: 'cur-merdeka', subjectId: 'sub-ipa', gradeLevel: '7', code: 'TP 7.3', description: 'Menganalisis konsep zat, perubahan wujud, dan pemisahan campuran sederhana', semester: 'Ganjil' },

  // Pendidikan Pancasila Kelas 7 (Fase D)
  { id: 'tp-ppkn-7.1', curriculumId: 'cur-merdeka', subjectId: 'sub-ppkn', gradeLevel: '7', code: 'TP 7.1', description: 'Mendeskripsikan sejarah kelahiran, perumusan, dan penetapan Pancasila sebagai dasar negara', semester: 'Ganjil' },
  { id: 'tp-ppkn-7.2', curriculumId: 'cur-merdeka', subjectId: 'sub-ppkn', gradeLevel: '7', code: 'TP 7.2', description: 'Menerapkan nilai-nilai Pancasila dalam norma kehidupan bermasyarakat dan berbangsa', semester: 'Ganjil' },

  // Bahasa Inggris Kelas 7 (Fase D)
  { id: 'tp-bing-7.1', curriculumId: 'cur-merdeka', subjectId: 'sub-bing', gradeLevel: '7', code: 'TP 7.1', description: 'Menggunakan ungkapan salam, perpisahan, dan memperkenalkan diri dalam konteks percakapan', semester: 'Ganjil' },
  { id: 'tp-bing-7.2', curriculumId: 'cur-merdeka', subjectId: 'sub-bing', gradeLevel: '7', code: 'TP 7.2', description: 'Mengidentifikasi informasi rinci teks deskriptif tentang orang, binatang, dan benda favorit', semester: 'Ganjil' },

  // BMR Kelas 7 (Fase D)
  { id: 'tp-bmr-7.1', curriculumId: 'cur-merdeka', subjectId: 'sub-bmr', gradeLevel: '7', code: 'TP 7.1', description: 'Mengenal dan melafalkan tulisan Arab Melayu Riau tingkat dasar dengan kaidah yang benar', semester: 'Ganjil' },
  { id: 'tp-bmr-7.2', curriculumId: 'cur-merdeka', subjectId: 'sub-bmr', gradeLevel: '7', code: 'TP 7.2', description: 'Memahami adab dan tunjuk ajar Melayu dalam pergaulan sebaya dan kepada orang tua', semester: 'Ganjil' },

  // Kelas 8
  { id: 'tp-bindo-8.1', curriculumId: 'cur-merdeka', subjectId: 'sub-bindo', gradeLevel: '8', code: 'TP 8.1', description: 'Mengidentifikasi dan menulis teks berita aktual di lingkungan Kepulauan Meranti', semester: 'Ganjil' },
  { id: 'tp-mat-8.1', curriculumId: 'cur-merdeka', subjectId: 'sub-mat', gradeLevel: '8', code: 'TP 8.1', description: 'Menentukan pola barisan bilangan dan konfigurasi objek', semester: 'Ganjil' },
  { id: 'tp-ipa-8.1', curriculumId: 'cur-merdeka', subjectId: 'sub-ipa', gradeLevel: '8', code: 'TP 8.1', description: 'Menganalisis sistem gerak pada manusia dan upaya menjaga kesehatannya', semester: 'Ganjil' },

  // Kelas 9
  { id: 'tp-bindo-9.1', curriculumId: 'cur-merdeka', subjectId: 'sub-bindo', gradeLevel: '9', code: 'TP 9.1', description: 'Menyimpulkan isi dan struktur teks laporan percobaan ilmiah', semester: 'Ganjil' },
  { id: 'tp-mat-9.1', curriculumId: 'cur-merdeka', subjectId: 'sub-mat', gradeLevel: '9', code: 'TP 9.1', description: 'Menerapkan konsep perpangkatan dan bentuk akar dalam penyelesaian masalah', semester: 'Ganjil' },
  { id: 'tp-ipa-9.1', curriculumId: 'cur-merdeka', subjectId: 'sub-ipa', gradeLevel: '9', code: 'TP 9.1', description: 'Menghubungkan sistem reproduksi manusia dengan gangguan dan kelainan', semester: 'Ganjil' }
];

export const initialExtracurriculars: Extracurricular[] = [
  { id: 'ekskul-1', name: 'Pramuka Gudep SMPN 1 Rangsang', coachName: 'Rahmat Hidayat, S.Pd.', dayAndTime: 'Jumat, 15:00 - 17:00 WIB', description: 'Kegiatan kepanduan, kedisiplinan, kemandirian, dan kepemimpinan.' },
  { id: 'ekskul-2', name: 'Palang Merah Remaja (PMR)', coachName: 'Siti Rohani, S.Pd.', dayAndTime: 'Sabtu, 08:00 - 10:00 WIB', description: 'Pertolongan pertama pada kecelakaan, kepalangmerahan, dan kesehatan remaja.' },
  { id: 'ekskul-3', name: 'Seni Tari & Musik Tradisional Melayu', coachName: 'Tengku Firdaus, S.Sn.', dayAndTime: 'Kamis, 15:30 - 17:00 WIB', description: 'Pelestarian seni tari Zapin, musik Gambus, dan teater tradisional Rangsang.' },
  { id: 'ekskul-4', name: 'Futsal & Sepak Bola Sekolah', coachName: 'Hendra Wijaya, S.Pd.', dayAndTime: 'Selasa & Sabtu sore', description: 'Pembinaan fisik, taktik olahraga beregu, sportivitas, dan turnamen antarsekolah.' }
];

export const initialScores: AssessmentScore[] = [
  // Student 701 (Kelas VII.1)
  {
    id: 'sc-701-bindo',
    studentId: 'std-701',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-bindo-7.1': 85, 'tp-bindo-7.2': 88, 'tp-bindo-7.3': 82, 'tp-bindo-7.4': 86 },
    sumatifMateriScores: { 'tp-bindo-7.1': 86, 'tp-bindo-7.2': 87, 'tp-bindo-7.3': 84, 'tp-bindo-7.4': 88 },
    sumatifAkhirSemester: 85,
    finalScore: 86,
    predicate: 'A',
    highestCompetenceDesc: 'Menunjukkan penguasaan yang sangat baik dalam mengidentifikasi struktur teks puisi rakyat (pantun & syair) serta menyajikan cerita fiksi.',
    lowestCompetenceDesc: 'Cukup mampu dalam menulis teks prosedur sederhana dan perlu latihan variasi kosakata efektif.',
    updatedAt: '2024-12-18 10:30'
  },
  {
    id: 'sc-701-mat',
    studentId: 'std-701',
    subjectId: 'sub-mat',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-mat-7.1': 82, 'tp-mat-7.2': 80, 'tp-mat-7.3': 78, 'tp-mat-7.4': 76 },
    sumatifMateriScores: { 'tp-mat-7.1': 80, 'tp-mat-7.2': 82, 'tp-mat-7.3': 77, 'tp-mat-7.4': 79 },
    sumatifAkhirSemester: 80,
    finalScore: 80,
    predicate: 'B',
    highestCompetenceDesc: 'Menunjukkan pemahaman yang baik dalam operasi hitung bilangan bulat dan pecahan kontekstual.',
    lowestCompetenceDesc: 'Perlu bimbingan lebih lanjut dalam menyelesaikan pertidaksamaan linear satu variabel.',
    updatedAt: '2024-12-18 11:15'
  },
  {
    id: 'sc-701-ipa',
    studentId: 'std-701',
    subjectId: 'sub-ipa',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-ipa-7.1': 88, 'tp-ipa-7.2': 85, 'tp-ipa-7.3': 84 },
    sumatifMateriScores: { 'tp-ipa-7.1': 87, 'tp-ipa-7.2': 86, 'tp-ipa-7.3': 85 },
    sumatifAkhirSemester: 88,
    finalScore: 86,
    predicate: 'A',
    highestCompetenceDesc: 'Sangat baik dalam menerapkan konsep pengukuran menggunakan alat ukur baku dan klasifikasi materi.',
    lowestCompetenceDesc: 'Cukup dalam menganalisis metode pemisahan campuran dan perubahan wujud.',
    updatedAt: '2024-12-18 14:00'
  },
  {
    id: 'sc-701-ppkn',
    studentId: 'std-701',
    subjectId: 'sub-ppkn',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-ppkn-7.1': 88, 'tp-ppkn-7.2': 85 },
    sumatifMateriScores: { 'tp-ppkn-7.1': 86, 'tp-ppkn-7.2': 87 },
    sumatifAkhirSemester: 85,
    finalScore: 86,
    predicate: 'A',
    highestCompetenceDesc: 'Sangat baik dalam mendeskripsikan sejarah kelahiran Pancasila dan penerapan nilai luhur bangsa.',
    lowestCompetenceDesc: 'Mampu memahami norma-norma kehidupan bermasyarakat secara memadai.',
    updatedAt: '2024-12-18 14:20'
  },
  {
    id: 'sc-701-bing',
    studentId: 'std-701',
    subjectId: 'sub-bing',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-bing-7.1': 84, 'tp-bing-7.2': 80 },
    sumatifMateriScores: { 'tp-bing-7.1': 82, 'tp-bing-7.2': 84 },
    sumatifAkhirSemester: 82,
    finalScore: 83,
    predicate: 'B',
    highestCompetenceDesc: 'Mampu menggunakan ungkapan interpersonal perkenalan diri dan salam dengan percaya diri.',
    lowestCompetenceDesc: 'Perlu penguatan perbendaharaan kata deskriptif tentang benda di sekitarnya.',
    updatedAt: '2024-12-18 15:10'
  },
  {
    id: 'sc-701-bmr',
    studentId: 'std-701',
    subjectId: 'sub-bmr',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-bmr-7.1': 90, 'tp-bmr-7.2': 92 },
    sumatifMateriScores: { 'tp-bmr-7.1': 92, 'tp-bmr-7.2': 90 },
    sumatifAkhirSemester: 90,
    finalScore: 91,
    predicate: 'A',
    highestCompetenceDesc: 'Sangat mahir membaca dan menulis aksara Arab Melayu serta mengamalkan tunjuk ajar Melayu.',
    lowestCompetenceDesc: 'Menunjukkan pemahaman yang kokoh pada seluruh materi Budaya Melayu Riau.',
    updatedAt: '2024-12-18 15:40'
  },
  // Student 702 (Kelas VII.1)
  {
    id: 'sc-702-bindo',
    studentId: 'std-702',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-bindo-7.1': 92, 'tp-bindo-7.2': 94, 'tp-bindo-7.3': 90, 'tp-bindo-7.4': 92 },
    sumatifMateriScores: { 'tp-bindo-7.1': 93, 'tp-bindo-7.2': 95, 'tp-bindo-7.3': 90, 'tp-bindo-7.4': 92 },
    sumatifAkhirSemester: 93,
    finalScore: 93,
    predicate: 'A',
    highestCompetenceDesc: 'Sangat unggul dalam mengapresiasi dan menyusun puisi rakyat berpantun Melayu serta teks fiksi.',
    lowestCompetenceDesc: 'Konsisten menunjukkan prestasi gemilang pada seluruh tujuan pembelajaran.',
    updatedAt: '2024-12-18 10:45'
  },
  {
    id: 'sc-702-mat',
    studentId: 'std-702',
    subjectId: 'sub-mat',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-mat-7.1': 90, 'tp-mat-7.2': 88, 'tp-mat-7.3': 85, 'tp-mat-7.4': 87 },
    sumatifMateriScores: { 'tp-mat-7.1': 89, 'tp-mat-7.2': 90, 'tp-mat-7.3': 86, 'tp-mat-7.4': 88 },
    sumatifAkhirSemester: 90,
    finalScore: 89,
    predicate: 'A',
    highestCompetenceDesc: 'Sangat terampil menyelesaikan soal kontekstual bilangan pecahan dan bentuk aljabar.',
    lowestCompetenceDesc: 'Mampu menyelesaikan persamaan linear satu variabel dengan cukup teliti.',
    updatedAt: '2024-12-18 11:30'
  },
  // Student 709 (Kelas VII.2)
  {
    id: 'sc-709-bindo',
    studentId: 'std-709',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-2',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-bindo-7.1': 88, 'tp-bindo-7.2': 86 },
    sumatifMateriScores: { 'tp-bindo-7.1': 87, 'tp-bindo-7.2': 88 },
    sumatifAkhirSemester: 86,
    finalScore: 87,
    predicate: 'A',
    highestCompetenceDesc: 'Sangat baik dalam mengapresiasi puisi rakyat berpantun Melayu.',
    lowestCompetenceDesc: 'Perlu penguatan pada teks narasi fiksi.',
    updatedAt: '2024-12-18 11:45'
  },
  // Student 801 (Kelas VIII.1)
  {
    id: 'sc-801-ipa',
    studentId: 'std-801',
    subjectId: 'sub-ipa',
    classId: 'cls-viii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: { 'tp-ipa-8.1': 86 },
    sumatifMateriScores: { 'tp-ipa-8.1': 88 },
    sumatifAkhirSemester: 85,
    finalScore: 87,
    predicate: 'A',
    highestCompetenceDesc: 'Menunjukkan pemahaman mendalam tentang sistem gerak manusia.',
    lowestCompetenceDesc: 'Mencapai ketuntasan materi dengan baik.',
    updatedAt: '2024-12-18 13:00'
  },
  // Student 901 (Kelas IX.1)
  {
    id: 'sc-901-inf',
    studentId: 'std-901',
    subjectId: 'sub-inf',
    classId: 'cls-ix-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    formatifScores: {},
    sumatifMateriScores: {},
    sumatifAkhirSemester: 92,
    finalScore: 92,
    predicate: 'A',
    highestCompetenceDesc: 'Sangat mahir dalam pemecahan masalah komputasional dan literasi digital.',
    lowestCompetenceDesc: 'Mempertahankan ketuntasan unggul di seluruh materi.',
    updatedAt: '2024-12-18 14:00'
  }
];

export const initialAttendance: Attendance[] = [
  { id: 'att-701', studentId: 'std-701', classId: 'cls-vii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 1, izin: 0, alpa: 0 },
  { id: 'att-702', studentId: 'std-702', classId: 'cls-vii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 },
  { id: 'att-703', studentId: 'std-703', classId: 'cls-vii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 2, izin: 1, alpa: 0 },
  { id: 'att-704', studentId: 'std-704', classId: 'cls-vii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 1, alpa: 0 },
  { id: 'att-705', studentId: 'std-705', classId: 'cls-vii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 1, izin: 2, alpa: 1 },
  { id: 'att-706', studentId: 'std-706', classId: 'cls-vii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 },
  { id: 'att-707', studentId: 'std-707', classId: 'cls-vii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 1, izin: 0, alpa: 0 },
  { id: 'att-708', studentId: 'std-708', classId: 'cls-vii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 1, alpa: 0 },
  { id: 'att-709', studentId: 'std-709', classId: 'cls-vii-2', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 },
  { id: 'att-710', studentId: 'std-710', classId: 'cls-vii-2', academicYear: '2024/2025', semester: 'Ganjil', sakit: 1, izin: 0, alpa: 0 },
  { id: 'att-711', studentId: 'std-711', classId: 'cls-vii-3', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 },
  { id: 'att-712', studentId: 'std-712', classId: 'cls-vii-3', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 1, alpa: 0 },
  { id: 'att-801', studentId: 'std-801', classId: 'cls-viii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 },
  { id: 'att-802', studentId: 'std-802', classId: 'cls-viii-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 1, izin: 0, alpa: 0 },
  { id: 'att-803', studentId: 'std-803', classId: 'cls-viii-2', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 },
  { id: 'att-804', studentId: 'std-804', classId: 'cls-viii-3', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 },
  { id: 'att-901', studentId: 'std-901', classId: 'cls-ix-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 },
  { id: 'att-902', studentId: 'std-902', classId: 'cls-ix-1', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 },
  { id: 'att-903', studentId: 'std-903', classId: 'cls-ix-2', academicYear: '2024/2025', semester: 'Ganjil', sakit: 1, izin: 0, alpa: 0 },
  { id: 'att-904', studentId: 'std-904', classId: 'cls-ix-3', academicYear: '2024/2025', semester: 'Ganjil', sakit: 0, izin: 0, alpa: 0 }
];

export const initialStudentExtracurriculars: StudentExtracurricular[] = [
  {
    id: 'se-701-1',
    studentId: 'std-701',
    extracurricularId: 'ekskul-1',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    predicate: 'Sangat Baik',
    description: 'Aktif dalam latihan kepramukaan rutin, disiplin, dan memiliki jiwa kepemimpinan regu yang tangguh.'
  },
  {
    id: 'se-701-2',
    studentId: 'std-701',
    extracurricularId: 'ekskul-4',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    predicate: 'Baik',
    description: 'Memperlihatkan kerja sama tim yang solid dan stamina baik saat pertandingan futsal antarkelas.'
  },
  {
    id: 'se-702-1',
    studentId: 'std-702',
    extracurricularId: 'ekskul-2',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    predicate: 'Sangat Baik',
    description: 'Sangat tanggap dalam simulasi pertolongan pertama pada kecelakaan dan memiliki kepedulian sosial tinggi.'
  },
  {
    id: 'se-702-2',
    studentId: 'std-702',
    extracurricularId: 'ekskul-3',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    predicate: 'Sangat Baik',
    description: 'Memiliki keluwesan gerak tari Zapin Rangsang dan aktif tampil dalam pentas seni sekolah.'
  }
];

export const initialHomeroomNotes: HomeroomNote[] = [
  {
    id: 'hn-701',
    studentId: 'std-701',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    growthNote: 'Ahmad menunjukkan perkembangan karakter yang terpuji, sopan santun dalam tutur kata, dan rajin membantu teman.',
    achievementNote: 'Meraih Peringkat II di Kelas VII.1 dan aktif sebagai Pratama Pramuka.',
    suggestions: 'Pertahankan kedisiplinan belajar dan tingkatkan ketelitian pada mata pelajaran berhitung.',
    promotionDecision: 'Belum Ditentukan'
  },
  {
    id: 'hn-702',
    studentId: 'std-702',
    classId: 'cls-vii-1',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    growthNote: 'Anisa adalah siswi teladan yang sangat rajin, mandiri, dan berdedikasi tinggi dalam seluruh tugas akademik.',
    achievementNote: 'Meraih Peringkat I di Kelas VII.1 dengan nilai akademis istimewa.',
    suggestions: 'Terus pertahankan motivasi belajar tinggi ini demi menggapai cita-cita mulia.',
    promotionDecision: 'Belum Ditentukan'
  }
];

export const initialUsers: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    name: 'Administrator E-Rapor',
    role: 'admin',
    nip: '19850610 201101 1 007'
  },
  {
    id: 'usr-kepsek',
    username: 'kepsek',
    name: 'Kamaruddin, S.Pd.',
    role: 'kepsek',
    nip: '19710424 199708 1 001',
    teacherId: 'tch-01'
  },
  {
    id: 'usr-walivii1',
    username: 'walivii1',
    name: 'Drs. Zulkifli, M.Pd.',
    role: 'walikelas',
    nip: '19820515 200801 1 005',
    teacherId: 'tch-02',
    classId: 'cls-vii-1'
  },
  {
    id: 'usr-walivii2',
    username: 'walivii2',
    name: 'Siti Rohani, S.Pd.',
    role: 'walikelas',
    nip: '19880912 201402 2 003',
    teacherId: 'tch-03',
    classId: 'cls-vii-2'
  },
  {
    id: 'usr-walivii3',
    username: 'walivii3',
    name: 'Hendra Wijaya, S.Pd.',
    role: 'walikelas',
    nip: '19910314 201902 1 007',
    teacherId: 'tch-04',
    classId: 'cls-vii-3'
  },
  {
    id: 'usr-waliviii1',
    username: 'waliviii1',
    name: 'Rahmat Hidayat, S.Pd.',
    role: 'walikelas',
    nip: '19901103 201903 1 008',
    teacherId: 'tch-05',
    classId: 'cls-viii-1'
  },
  {
    id: 'usr-waliviii2',
    username: 'waliviii2',
    name: 'Nurhasanah, S.Pd.I.',
    role: 'walikelas',
    nip: '19850320 201001 2 015',
    teacherId: 'tch-06',
    classId: 'cls-viii-2'
  },
  {
    id: 'usr-waliviii3',
    username: 'waliviii3',
    name: 'Dewi Sartika, S.Pd.',
    role: 'walikelas',
    nip: '19870824 201101 2 009',
    teacherId: 'tch-07',
    classId: 'cls-viii-3'
  },
  {
    id: 'usr-waliix1',
    username: 'waliix1',
    name: 'Muhammad Ilham, S.Kom.',
    role: 'walikelas',
    nip: '19920807 202221 1 002',
    teacherId: 'tch-08',
    classId: 'cls-ix-1'
  },
  {
    id: 'usr-waliix2',
    username: 'nikmatul',
    name: 'Nikmatul Khasanah, S.Pd.',
    role: 'walikelas',
    nip: '19800714 200501 2 006',
    teacherId: 'tch-09',
    classId: 'cls-ix-2',
    activeDutyMode: 'walikelas'
  },
  {
    id: 'usr-waliix3',
    username: 'waliix3',
    name: 'Tengku Firdaus, S.Sn.',
    role: 'walikelas',
    nip: '19950118 202421 1 004',
    teacherId: 'tch-10',
    classId: 'cls-ix-3'
  },
  {
    id: 'usr-gurumat',
    username: 'gurumat',
    name: 'Nikmatul Khasanah, S.Pd.',
    role: 'guru',
    nip: '19800714 200501 2 006',
    teacherId: 'tch-09'
  },
  {
    id: 'usr-guruipa',
    username: 'guruipa',
    name: 'Rahmat Hidayat, S.Pd.',
    role: 'guru',
    nip: '19901103 201903 1 008',
    teacherId: 'tch-05'
  },
  {
    id: 'usr-gurufauzi',
    username: 'gurufauzi',
    name: 'MUHAMAD FAUZI, S.Pd.Gr',
    role: 'guru',
    nip: '19930712 202012 1 005',
    teacherId: 'tch-12'
  }
];

export const initialTeachingAssignments: TeachingAssignment[] = [
  // Nikmatul Khasanah, S.Pd. (tch-09) - Guru Matematika (sub-mat) untuk Kelas VII.1 sampai IX.3
  { id: 'ta-tch09-mat-vii1', teacherId: 'tch-09', teacherName: 'Nikmatul Khasanah, S.Pd.', subjectId: 'sub-mat', subjectName: 'Matematika', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch09-mat-vii2', teacherId: 'tch-09', teacherName: 'Nikmatul Khasanah, S.Pd.', subjectId: 'sub-mat', subjectName: 'Matematika', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch09-mat-vii3', teacherId: 'tch-09', teacherName: 'Nikmatul Khasanah, S.Pd.', subjectId: 'sub-mat', subjectName: 'Matematika', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch09-mat-viii1', teacherId: 'tch-09', teacherName: 'Nikmatul Khasanah, S.Pd.', subjectId: 'sub-mat', subjectName: 'Matematika', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch09-mat-viii2', teacherId: 'tch-09', teacherName: 'Nikmatul Khasanah, S.Pd.', subjectId: 'sub-mat', subjectName: 'Matematika', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch09-mat-viii3', teacherId: 'tch-09', teacherName: 'Nikmatul Khasanah, S.Pd.', subjectId: 'sub-mat', subjectName: 'Matematika', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch09-mat-ix1', teacherId: 'tch-09', teacherName: 'Nikmatul Khasanah, S.Pd.', subjectId: 'sub-mat', subjectName: 'Matematika', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch09-mat-ix2', teacherId: 'tch-09', teacherName: 'Nikmatul Khasanah, S.Pd.', subjectId: 'sub-mat', subjectName: 'Matematika', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch09-mat-ix3', teacherId: 'tch-09', teacherName: 'Nikmatul Khasanah, S.Pd.', subjectId: 'sub-mat', subjectName: 'Matematika', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // Drs. Zulkifli, M.Pd. (tch-02) - Bahasa Indonesia (sub-bindo)
  { id: 'ta-tch02-bin-vii1', teacherId: 'tch-02', teacherName: 'Drs. Zulkifli, M.Pd.', subjectId: 'sub-bindo', subjectName: 'Bahasa Indonesia', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch02-bin-vii2', teacherId: 'tch-02', teacherName: 'Drs. Zulkifli, M.Pd.', subjectId: 'sub-bindo', subjectName: 'Bahasa Indonesia', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch02-bin-vii3', teacherId: 'tch-02', teacherName: 'Drs. Zulkifli, M.Pd.', subjectId: 'sub-bindo', subjectName: 'Bahasa Indonesia', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch02-bin-viii1', teacherId: 'tch-02', teacherName: 'Drs. Zulkifli, M.Pd.', subjectId: 'sub-bindo', subjectName: 'Bahasa Indonesia', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch02-bin-viii2', teacherId: 'tch-02', teacherName: 'Drs. Zulkifli, M.Pd.', subjectId: 'sub-bindo', subjectName: 'Bahasa Indonesia', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch02-bin-viii3', teacherId: 'tch-02', teacherName: 'Drs. Zulkifli, M.Pd.', subjectId: 'sub-bindo', subjectName: 'Bahasa Indonesia', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch02-bin-ix1', teacherId: 'tch-02', teacherName: 'Drs. Zulkifli, M.Pd.', subjectId: 'sub-bindo', subjectName: 'Bahasa Indonesia', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch02-bin-ix2', teacherId: 'tch-02', teacherName: 'Drs. Zulkifli, M.Pd.', subjectId: 'sub-bindo', subjectName: 'Bahasa Indonesia', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch02-bin-ix3', teacherId: 'tch-02', teacherName: 'Drs. Zulkifli, M.Pd.', subjectId: 'sub-bindo', subjectName: 'Bahasa Indonesia', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // Nurhasanah, S.Pd.I. (tch-06) - PAIBP (sub-pai)
  { id: 'ta-tch06-pai-vii1', teacherId: 'tch-06', teacherName: 'Nurhasanah, S.Pd.I.', subjectId: 'sub-pai', subjectName: 'Pendidikan Agama Islam dan Budi Pekerti', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch06-pai-vii2', teacherId: 'tch-06', teacherName: 'Nurhasanah, S.Pd.I.', subjectId: 'sub-pai', subjectName: 'Pendidikan Agama Islam dan Budi Pekerti', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch06-pai-vii3', teacherId: 'tch-06', teacherName: 'Nurhasanah, S.Pd.I.', subjectId: 'sub-pai', subjectName: 'Pendidikan Agama Islam dan Budi Pekerti', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch06-pai-viii1', teacherId: 'tch-06', teacherName: 'Nurhasanah, S.Pd.I.', subjectId: 'sub-pai', subjectName: 'Pendidikan Agama Islam dan Budi Pekerti', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch06-pai-viii2', teacherId: 'tch-06', teacherName: 'Nurhasanah, S.Pd.I.', subjectId: 'sub-pai', subjectName: 'Pendidikan Agama Islam dan Budi Pekerti', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch06-pai-viii3', teacherId: 'tch-06', teacherName: 'Nurhasanah, S.Pd.I.', subjectId: 'sub-pai', subjectName: 'Pendidikan Agama Islam dan Budi Pekerti', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch06-pai-ix1', teacherId: 'tch-06', teacherName: 'Nurhasanah, S.Pd.I.', subjectId: 'sub-pai', subjectName: 'Pendidikan Agama Islam dan Budi Pekerti', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch06-pai-ix2', teacherId: 'tch-06', teacherName: 'Nurhasanah, S.Pd.I.', subjectId: 'sub-pai', subjectName: 'Pendidikan Agama Islam dan Budi Pekerti', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch06-pai-ix3', teacherId: 'tch-06', teacherName: 'Nurhasanah, S.Pd.I.', subjectId: 'sub-pai', subjectName: 'Pendidikan Agama Islam dan Budi Pekerti', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // Agus Prasetyo, S.Pd. (tch-11) - Pendidikan Pancasila (sub-ppkn)
  { id: 'ta-tch11-ppkn-vii1', teacherId: 'tch-11', teacherName: 'Agus Prasetyo, S.Pd.', subjectId: 'sub-ppkn', subjectName: 'Pendidikan Pancasila', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch11-ppkn-vii2', teacherId: 'tch-11', teacherName: 'Agus Prasetyo, S.Pd.', subjectId: 'sub-ppkn', subjectName: 'Pendidikan Pancasila', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch11-ppkn-vii3', teacherId: 'tch-11', teacherName: 'Agus Prasetyo, S.Pd.', subjectId: 'sub-ppkn', subjectName: 'Pendidikan Pancasila', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch11-ppkn-viii1', teacherId: 'tch-11', teacherName: 'Agus Prasetyo, S.Pd.', subjectId: 'sub-ppkn', subjectName: 'Pendidikan Pancasila', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch11-ppkn-viii2', teacherId: 'tch-11', teacherName: 'Agus Prasetyo, S.Pd.', subjectId: 'sub-ppkn', subjectName: 'Pendidikan Pancasila', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch11-ppkn-viii3', teacherId: 'tch-11', teacherName: 'Agus Prasetyo, S.Pd.', subjectId: 'sub-ppkn', subjectName: 'Pendidikan Pancasila', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch11-ppkn-ix1', teacherId: 'tch-11', teacherName: 'Agus Prasetyo, S.Pd.', subjectId: 'sub-ppkn', subjectName: 'Pendidikan Pancasila', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch11-ppkn-ix2', teacherId: 'tch-11', teacherName: 'Agus Prasetyo, S.Pd.', subjectId: 'sub-ppkn', subjectName: 'Pendidikan Pancasila', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch11-ppkn-ix3', teacherId: 'tch-11', teacherName: 'Agus Prasetyo, S.Pd.', subjectId: 'sub-ppkn', subjectName: 'Pendidikan Pancasila', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // MUHAMAD FAUZI, S.Pd.Gr (tch-12) - Guru IPA Kelas VII dan IX
  { id: 'ta-tch12-ipa-vii1', teacherId: 'tch-12', teacherName: 'MUHAMAD FAUZI, S.Pd.Gr', subjectId: 'sub-ipa', subjectName: 'Ilmu Pengetahuan Alam (IPA)', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch12-ipa-vii2', teacherId: 'tch-12', teacherName: 'MUHAMAD FAUZI, S.Pd.Gr', subjectId: 'sub-ipa', subjectName: 'Ilmu Pengetahuan Alam (IPA)', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch12-ipa-vii3', teacherId: 'tch-12', teacherName: 'MUHAMAD FAUZI, S.Pd.Gr', subjectId: 'sub-ipa', subjectName: 'Ilmu Pengetahuan Alam (IPA)', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch12-ipa-ix1', teacherId: 'tch-12', teacherName: 'MUHAMAD FAUZI, S.Pd.Gr', subjectId: 'sub-ipa', subjectName: 'Ilmu Pengetahuan Alam (IPA)', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch12-ipa-ix2', teacherId: 'tch-12', teacherName: 'MUHAMAD FAUZI, S.Pd.Gr', subjectId: 'sub-ipa', subjectName: 'Ilmu Pengetahuan Alam (IPA)', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch12-ipa-ix3', teacherId: 'tch-12', teacherName: 'MUHAMAD FAUZI, S.Pd.Gr', subjectId: 'sub-ipa', subjectName: 'Ilmu Pengetahuan Alam (IPA)', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // Rahmat Hidayat, S.Pd. (tch-05) - Guru IPA Kelas VIII
  { id: 'ta-tch05-ipa-viii1', teacherId: 'tch-05', teacherName: 'Rahmat Hidayat, S.Pd.', subjectId: 'sub-ipa', subjectName: 'Ilmu Pengetahuan Alam (IPA)', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch05-ipa-viii2', teacherId: 'tch-05', teacherName: 'Rahmat Hidayat, S.Pd.', subjectId: 'sub-ipa', subjectName: 'Ilmu Pengetahuan Alam (IPA)', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch05-ipa-viii3', teacherId: 'tch-05', teacherName: 'Rahmat Hidayat, S.Pd.', subjectId: 'sub-ipa', subjectName: 'Ilmu Pengetahuan Alam (IPA)', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // Dewi Sartika, S.Pd. (tch-07) - IPS (sub-ips)
  { id: 'ta-tch07-ips-vii1', teacherId: 'tch-07', teacherName: 'Dewi Sartika, S.Pd.', subjectId: 'sub-ips', subjectName: 'Ilmu Pengetahuan Sosial (IPS)', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch07-ips-vii2', teacherId: 'tch-07', teacherName: 'Dewi Sartika, S.Pd.', subjectId: 'sub-ips', subjectName: 'Ilmu Pengetahuan Sosial (IPS)', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch07-ips-vii3', teacherId: 'tch-07', teacherName: 'Dewi Sartika, S.Pd.', subjectId: 'sub-ips', subjectName: 'Ilmu Pengetahuan Sosial (IPS)', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch07-ips-viii1', teacherId: 'tch-07', teacherName: 'Dewi Sartika, S.Pd.', subjectId: 'sub-ips', subjectName: 'Ilmu Pengetahuan Sosial (IPS)', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch07-ips-viii2', teacherId: 'tch-07', teacherName: 'Dewi Sartika, S.Pd.', subjectId: 'sub-ips', subjectName: 'Ilmu Pengetahuan Sosial (IPS)', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch07-ips-viii3', teacherId: 'tch-07', teacherName: 'Dewi Sartika, S.Pd.', subjectId: 'sub-ips', subjectName: 'Ilmu Pengetahuan Sosial (IPS)', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch07-ips-ix1', teacherId: 'tch-07', teacherName: 'Dewi Sartika, S.Pd.', subjectId: 'sub-ips', subjectName: 'Ilmu Pengetahuan Sosial (IPS)', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch07-ips-ix2', teacherId: 'tch-07', teacherName: 'Dewi Sartika, S.Pd.', subjectId: 'sub-ips', subjectName: 'Ilmu Pengetahuan Sosial (IPS)', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch07-ips-ix3', teacherId: 'tch-07', teacherName: 'Dewi Sartika, S.Pd.', subjectId: 'sub-ips', subjectName: 'Ilmu Pengetahuan Sosial (IPS)', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // Siti Rohani, S.Pd. (tch-03) - Bahasa Inggris (sub-bing)
  { id: 'ta-tch03-bing-vii1', teacherId: 'tch-03', teacherName: 'Siti Rohani, S.Pd.', subjectId: 'sub-bing', subjectName: 'Bahasa Inggris', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch03-bing-vii2', teacherId: 'tch-03', teacherName: 'Siti Rohani, S.Pd.', subjectId: 'sub-bing', subjectName: 'Bahasa Inggris', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch03-bing-vii3', teacherId: 'tch-03', teacherName: 'Siti Rohani, S.Pd.', subjectId: 'sub-bing', subjectName: 'Bahasa Inggris', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch03-bing-viii1', teacherId: 'tch-03', teacherName: 'Siti Rohani, S.Pd.', subjectId: 'sub-bing', subjectName: 'Bahasa Inggris', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch03-bing-viii2', teacherId: 'tch-03', teacherName: 'Siti Rohani, S.Pd.', subjectId: 'sub-bing', subjectName: 'Bahasa Inggris', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch03-bing-viii3', teacherId: 'tch-03', teacherName: 'Siti Rohani, S.Pd.', subjectId: 'sub-bing', subjectName: 'Bahasa Inggris', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch03-bing-ix1', teacherId: 'tch-03', teacherName: 'Siti Rohani, S.Pd.', subjectId: 'sub-bing', subjectName: 'Bahasa Inggris', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch03-bing-ix2', teacherId: 'tch-03', teacherName: 'Siti Rohani, S.Pd.', subjectId: 'sub-bing', subjectName: 'Bahasa Inggris', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch03-bing-ix3', teacherId: 'tch-03', teacherName: 'Siti Rohani, S.Pd.', subjectId: 'sub-bing', subjectName: 'Bahasa Inggris', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // Hendra Wijaya, S.Pd. (tch-04) - PJOK (sub-pjok)
  { id: 'ta-tch04-pjok-vii1', teacherId: 'tch-04', teacherName: 'Hendra Wijaya, S.Pd.', subjectId: 'sub-pjok', subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch04-pjok-vii2', teacherId: 'tch-04', teacherName: 'Hendra Wijaya, S.Pd.', subjectId: 'sub-pjok', subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch04-pjok-vii3', teacherId: 'tch-04', teacherName: 'Hendra Wijaya, S.Pd.', subjectId: 'sub-pjok', subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch04-pjok-viii1', teacherId: 'tch-04', teacherName: 'Hendra Wijaya, S.Pd.', subjectId: 'sub-pjok', subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch04-pjok-viii2', teacherId: 'tch-04', teacherName: 'Hendra Wijaya, S.Pd.', subjectId: 'sub-pjok', subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch04-pjok-viii3', teacherId: 'tch-04', teacherName: 'Hendra Wijaya, S.Pd.', subjectId: 'sub-pjok', subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch04-pjok-ix1', teacherId: 'tch-04', teacherName: 'Hendra Wijaya, S.Pd.', subjectId: 'sub-pjok', subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch04-pjok-ix2', teacherId: 'tch-04', teacherName: 'Hendra Wijaya, S.Pd.', subjectId: 'sub-pjok', subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch04-pjok-ix3', teacherId: 'tch-04', teacherName: 'Hendra Wijaya, S.Pd.', subjectId: 'sub-pjok', subjectName: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // Muhammad Ilham, S.Kom. (tch-08) - Informatika (sub-inf)
  { id: 'ta-tch08-inf-vii1', teacherId: 'tch-08', teacherName: 'Muhammad Ilham, S.Kom.', subjectId: 'sub-inf', subjectName: 'Informatika', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch08-inf-vii2', teacherId: 'tch-08', teacherName: 'Muhammad Ilham, S.Kom.', subjectId: 'sub-inf', subjectName: 'Informatika', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch08-inf-vii3', teacherId: 'tch-08', teacherName: 'Muhammad Ilham, S.Kom.', subjectId: 'sub-inf', subjectName: 'Informatika', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch08-inf-viii1', teacherId: 'tch-08', teacherName: 'Muhammad Ilham, S.Kom.', subjectId: 'sub-inf', subjectName: 'Informatika', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch08-inf-viii2', teacherId: 'tch-08', teacherName: 'Muhammad Ilham, S.Kom.', subjectId: 'sub-inf', subjectName: 'Informatika', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch08-inf-viii3', teacherId: 'tch-08', teacherName: 'Muhammad Ilham, S.Kom.', subjectId: 'sub-inf', subjectName: 'Informatika', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch08-inf-ix1', teacherId: 'tch-08', teacherName: 'Muhammad Ilham, S.Kom.', subjectId: 'sub-inf', subjectName: 'Informatika', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch08-inf-ix2', teacherId: 'tch-08', teacherName: 'Muhammad Ilham, S.Kom.', subjectId: 'sub-inf', subjectName: 'Informatika', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch08-inf-ix3', teacherId: 'tch-08', teacherName: 'Muhammad Ilham, S.Kom.', subjectId: 'sub-inf', subjectName: 'Informatika', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  // Tengku Firdaus, S.Sn. (tch-10) - Seni Budaya & BMR
  { id: 'ta-tch10-sen-vii1', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-seni', subjectName: 'Seni Budaya & Prakarya', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-sen-vii2', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-seni', subjectName: 'Seni Budaya & Prakarya', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-sen-vii3', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-seni', subjectName: 'Seni Budaya & Prakarya', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-sen-viii1', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-seni', subjectName: 'Seni Budaya & Prakarya', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-sen-viii2', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-seni', subjectName: 'Seni Budaya & Prakarya', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-sen-viii3', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-seni', subjectName: 'Seni Budaya & Prakarya', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-sen-ix1', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-seni', subjectName: 'Seni Budaya & Prakarya', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-sen-ix2', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-seni', subjectName: 'Seni Budaya & Prakarya', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-sen-ix3', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-seni', subjectName: 'Seni Budaya & Prakarya', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },

  { id: 'ta-tch10-bmr-vii1', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-bmr', subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)', classId: 'cls-vii-1', className: 'Kelas VII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-bmr-vii2', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-bmr', subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)', classId: 'cls-vii-2', className: 'Kelas VII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-bmr-vii3', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-bmr', subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)', classId: 'cls-vii-3', className: 'Kelas VII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-bmr-viii1', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-bmr', subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)', classId: 'cls-viii-1', className: 'Kelas VIII.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-bmr-viii2', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-bmr', subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)', classId: 'cls-viii-2', className: 'Kelas VIII.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-bmr-viii3', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-bmr', subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)', classId: 'cls-viii-3', className: 'Kelas VIII.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-bmr-ix1', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-bmr', subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)', classId: 'cls-ix-1', className: 'Kelas IX.1', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-bmr-ix2', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-bmr', subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)', classId: 'cls-ix-2', className: 'Kelas IX.2', academicYear: '2026/2027', semester: 'Semua', status: 'active' },
  { id: 'ta-tch10-bmr-ix3', teacherId: 'tch-10', teacherName: 'Tengku Firdaus, S.Sn.', subjectId: 'sub-bmr', subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)', classId: 'cls-ix-3', className: 'Kelas IX.3', academicYear: '2026/2027', semester: 'Semua', status: 'active' }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2024-12-18 08:30:15',
    userId: 'usr-admin',
    userName: 'Administrator E-Rapor',
    role: 'admin',
    action: 'Inisialisasi Sistem',
    details: 'Sistem E-Rapor SMP N 1 Rangsang Rombel VII.1 - IX.3 Tahun Pelajaran 2024/2025 Semester Ganjil diaktifkan.'
  },
  {
    id: 'log-2',
    timestamp: '2024-12-18 10:45:00',
    userId: 'usr-walivii1',
    userName: 'Drs. Zulkifli, M.Pd.',
    role: 'walikelas',
    action: 'Input Nilai Mapel',
    details: 'Menginput dan memverifikasi nilai Bahasa Indonesia untuk Kelas VII.1.'
  }
];

export const initialKKTPConfigs: KKTPConfig[] = [
  {
    id: 'kktp-bindo-7.1',
    subjectId: 'sub-bindo',
    gradeLevel: '7',
    tpId: 'tp-bindo-7.1',
    updatedAt: '2024-12-18 10:00',
    criteria: [
      { category: 'Perlu Bimbingan', minScore: 0, description: 'Belum mencapai kriteria ketercapaian, perlu remedial.' },
      { category: 'Cukup', minScore: 61, description: 'Mencapai kriteria ketercapaian minimal.' },
      { category: 'Baik', minScore: 71, description: 'Mencapai kriteria ketercapaian dengan baik.' },
      { category: 'Sangat Baik', minScore: 86, description: 'Melampaui kriteria ketercapaian dengan sangat baik.' }
    ]
  },
  {
    id: 'kktp-mat-7.1',
    subjectId: 'sub-mat',
    gradeLevel: '7',
    tpId: 'tp-mat-7.1',
    updatedAt: '2024-12-18 10:00',
    criteria: [
      { category: 'Perlu Bimbingan', minScore: 0, description: 'Belum mencapai kriteria ketercapaian.' },
      { category: 'Cukup', minScore: 65, description: 'Cukup mencapai kriteria ketercapaian.' },
      { category: 'Baik', minScore: 75, description: 'Berhasil mencapai kriteria ketercapaian.' },
      { category: 'Sangat Baik', minScore: 88, description: 'Sangat berhasil mencapai kriteria ketercapaian.' }
    ]
  }
];

export const initialFormativeAssessments: FormativeAssessment[] = [
  {
    id: 'form-1',
    studentId: 'std-701',
    teacherId: 'tch-02',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    tpId: 'tp-bindo-7.1',
    date: '2024-09-12',
    technique: 'observasi',
    observation: 'Aktif bertanya dan memberikan tanggapan relevan.',
    feedback: 'Pertahankan keaktifanmu dalam diskusi kelas.',
    academicYear: '2024/2025',
    semester: 'Ganjil',
    updatedAt: '2024-09-12 11:00'
  }
];

export const initialSummativeAssessments: SummativeAssessment[] = [
  {
    id: 'sum-1',
    studentId: 'std-701',
    teacherId: 'tch-02',
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    tpId: 'tp-bindo-7.1',
    date: '2024-09-25',
    technique: 'tes tertulis',
    score: 85,
    academicYear: '2024/2025',
    semester: 'Ganjil',
    updatedAt: '2024-09-25 10:00'
  }
];

export const initialFinalScoreConfigs: SubjectFinalScoreConfig[] = [
  {
    subjectId: 'sub-bindo',
    classId: 'cls-vii-1',
    method: 'rata-rata',
    sasWeight: 30
  },
  {
    subjectId: 'sub-mat',
    classId: 'cls-vii-1',
    method: 'rata-rata',
    sasWeight: 30
  }
];
