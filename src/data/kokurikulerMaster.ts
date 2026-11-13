import { KokurikulerDimensionMaster, KokurikulerThemeMaster } from '../types/erapor';

/**
 * DATA REFERENSI MASTER PENILAIAN KOKURIKULER JENJANG SMP (FASE D)
 * Mengacu pada:
 * 1. Keputusan Kepala BSKAP Kemendikdasmen Nomor 058/H/KR/2025 tentang Alur Perkembangan Kompetensi
 * 2. Aplikasi Resmi e-Rapor SMP Kemendikdasmen Versi 2025.2
 *
 * Seluruh 8 Dimensi Profil Lulusan beserta Subdimensi dan 3 Tingkatan Perkembangan (Berkembang, Cakap, Mahir)
 */
export const OFFICIAL_KOKURIKULER_DIMENSIONS: KokurikulerDimensionMaster[] = [
  {
    id: 'dim-1',
    order: 1,
    name: 'Keimanan dan Ketakwaan terhadap Tuhan Yang Maha Esa',
    shortName: 'Keimanan & Ketakwaan',
    description:
      'Penghayatan dan pengamalan ajaran agama/kepercayaan secara konsisten dalam hubungan dengan Tuhan Yang Maha Esa, sesama manusia, dan lingkungan alam.',
    isLocked: true,
    subdimensions: [
      {
        id: 'sub-1-1',
        dimensionId: 'dim-1',
        code: 'D1.1',
        name: 'Hubungan dengan Tuhan Yang Maha Esa',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Memahami makna ajaran agama/kepercayaan yang dianut dan mulai melaksanakan ibadah serta berdoa dengan bimbingan atau pengingat dari orang lain.',
          Cakap:
            'Menghayati ajaran agama/kepercayaan yang dianut serta melaksanakan ibadah dan perilaku berakhlak mulia secara konsisten atas kesadaran diri sendiri.',
          Mahir:
            'Mengamalkan nilai-nilai keimanan dan ketakwaan kepada Tuhan Yang Maha Esa secara mendalam dalam keseharian serta mengajak dan menginspirasi orang lain untuk berbuat baik.'
        }
      },
      {
        id: 'sub-1-2',
        dimensionId: 'dim-1',
        code: 'D1.2',
        name: 'Hubungan dengan Sesama',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Menunjukkan sikap santun, jujur, dan menghormati sesama teman serta orang yang lebih tua dalam lingkungan sekolah dengan arahan pendidik.',
          Cakap:
            'Menunjukkan empati, kejujuran, toleransi, dan penghargaan terhadap perbedaan agama, suku, maupun latar belakang sesama manusia secara konsisten.',
          Mahir:
            'Menjadi teladan dalam menumbuhkan kerukunan, kepedulian sosial, dan keadilan antarumat beragama serta proaktif mencegah perilaku merendahkan sesama.'
        }
      },
      {
        id: 'sub-1-3',
        dimensionId: 'dim-1',
        code: 'D1.3',
        name: 'Hubungan dengan Alam',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Menyadari bahwa alam semesta merupakan ciptaan Tuhan dan ikut menjaga kebersihan serta kelestarian lingkungan sekitar saat diarahkan.',
          Cakap:
            'Menunjukkan rasa syukur kepada Tuhan Yang Maha Esa dengan menjaga kelestarian alam, merawat makhluk hidup, dan menggunakan sumber daya secara bijak.',
          Mahir:
            'Menginisiasi tindakan nyata pelestarian lingkungan alam sebagai wujud ketakwaan serta mengajak komunitas sekolah untuk mengurangi dampak kerusakan lingkungan.'
        }
      }
    ]
  },
  {
    id: 'dim-2',
    order: 2,
    name: 'Kewargaan',
    shortName: 'Kewargaan',
    description:
      'Kesadaran hak dan kewajiban sebagai warga sekolah, masyarakat lokal, bangsa Indonesia (NKRI), serta warga dunia yang menghargai keberagaman budaya.',
    isLocked: true,
    subdimensions: [
      {
        id: 'sub-2-1',
        dimensionId: 'dim-2',
        code: 'D2.1',
        name: 'Kewargaan Lokal',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Berperilaku sesuai aturan, tata tertib sekolah, dan norma masyarakat setempat dalam kegiatan bersama.',
          Cakap:
            'Berperilaku sesuai aturan dan norma masyarakat lokal secara konsisten serta ikut serta dalam kegiatan pelestarian budaya dan kearifan lokal daerah.',
          Mahir:
            'Berperilaku sesuai aturan dan norma masyarakat secara konsisten serta mampu mengajak orang lain untuk turut menjaga ketertiban dan kearifan lokal.'
        }
      },
      {
        id: 'sub-2-2',
        dimensionId: 'dim-2',
        code: 'D2.2',
        name: 'Kewargaan Nasional',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Berperilaku sesuai norma kebangsaan berdasarkan Pancasila serta mulai mengenal dan menghargai keragaman budaya Nusantara.',
          Cakap:
            'Berpartisipasi aktif dalam menjaga keutuhan Negara Kesatuan Republik Indonesia (NKRI), menaati hukum, serta menghargai keragaman budaya nasional.',
          Mahir:
            'Berpartisipasi aktif menjaga persatuan dan keutuhan NKRI serta mampu mengajak orang lain untuk bangga dan berkontribusi bagi kemajuan bangsa Indonesia.'
        }
      },
      {
        id: 'sub-2-3',
        dimensionId: 'dim-2',
        code: 'D2.3',
        name: 'Kewargaan Global',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Mengenal isu kemanusiaan dan keberagaman budaya dunia serta mulai berperilaku sesuai norma pergaulan global sambil tetap menjaga jati diri bangsa.',
          Cakap:
            'Berperilaku sesuai norma global yang santun, menghargai keragaman budaya dunia, dan tetap teguh menjaga identitas nasional Indonesia.',
          Mahir:
            'Menganalisis isu global secara kritis dan konstruktif, menghargai keberagaman global, serta mengajak orang lain bersikap bijak tanpa kehilangan identitas nasional.'
        }
      }
    ]
  },
  {
    id: 'dim-3',
    order: 3,
    name: 'Penalaran Kritis',
    shortName: 'Penalaran Kritis',
    description:
      'Kemampuan memproses informasi secara objektif, menyusun argumentasi logis berbasis bukti, mengambil keputusan rasional, dan memecahkan masalah secara sistematis.',
    isLocked: true,
    subdimensions: [
      {
        id: 'sub-3-1',
        dimensionId: 'dim-3',
        code: 'D3.1',
        name: 'Penyampaian Argumentasi',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Menyampaikan pendapat dan alasan sederhana berdasarkan informasi yang diperoleh dari sumber terbatas dengan pendampingan.',
          Cakap:
            'Menyusun dan menyampaikan argumentasi secara logis, runtut, dan objektif berdasarkan data serta bukti pendukung yang relevan.',
          Mahir:
            'Mengevaluasi keakuratan berbagai argumen yang kompleks dan menyampaikan sanggahan atau argumentasi kritis secara sistematis dan berbasis fakta kuat.'
        }
      },
      {
        id: 'sub-3-2',
        dimensionId: 'dim-3',
        code: 'D3.2',
        name: 'Pengambilan Keputusan',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Mempertimbangkan beberapa pilihan sebelum menentukan keputusan sederhana dalam kegiatan kelompok dengan arahan pendidik.',
          Cakap:
            'Mengambil keputusan secara rasional dan bertanggung jawab dengan membandingkan berbagai sudut pandang, data, serta konsekuensi yang relevan.',
          Mahir:
            'Merumuskan keputusan strategis dalam situasi kompleks dengan menimbang dampak jangka panjang, etika, serta masukan berbagai pihak secara objektif.'
        }
      },
      {
        id: 'sub-3-3',
        dimensionId: 'dim-3',
        code: 'D3.3',
        name: 'Penyelesaian Masalah',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Mengidentifikasi masalah nyata di lingkungan belajar dan mencoba menerapkan langkah penyelesaian yang sudah dicontohkan.',
          Cakap:
            'Menganalisis akar penyebab permasalahan secara sistematis dan merancang solusi yang logis, efektif, serta dapat diterapkan.',
          Mahir:
            'Merumuskan alternatif solusi yang inovatif dan terukur untuk permasalahan pelik serta mengevaluasi efektivitas perbaikan yang dilakukan.'
        }
      }
    ]
  },
  {
    id: 'dim-4',
    order: 4,
    name: 'Kreativitas',
    shortName: 'Kreativitas',
    description:
      'Kemampuan memunculkan gagasan baru, berpikir fleksibel dari berbagai sudut pandang, serta menghasilkan karya atau tindakan yang orisinal dan bermakna.',
    isLocked: true,
    subdimensions: [
      {
        id: 'sub-4-1',
        dimensionId: 'dim-4',
        code: 'D4.1',
        name: 'Gagasan Baru',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Mengajukan ide atau memodifikasi gagasan yang sudah ada untuk mendukung pelaksanaan kegiatan kokurikuler dengan dorongan guru.',
          Cakap:
            'Menghasilkan gagasan baru yang orisinal dan relevan untuk menjawab tantangan kegiatan atau proyek sesuai konteks lingkungan sekolah.',
          Mahir:
            'Mencetuskan gagasan terobosan yang unik, visioner, dan menginspirasi pengembangan ide anggota kelompok lainnya secara berkelanjutan.'
        }
      },
      {
        id: 'sub-4-2',
        dimensionId: 'dim-4',
        code: 'D4.2',
        name: 'Fleksibilitas Berpikir',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Bersedia mencoba cara kerja alternatif yang disarankan oleh guru atau teman ketika menghadapi hambatan dalam berkegiatan.',
          Cakap:
            'Memandang suatu persoalan dari beragam sudut pandang serta mampu menyesuaikan rencana dan pendekatan secara luwes saat menemukan kendala.',
          Mahir:
            'Mengombinasikan berbagai perspektif lintas bidang secara adaptif untuk menciptakan pendekatan baru yang lebih efektif dalam situasi berubah-ubah.'
        }
      },
      {
        id: 'sub-4-3',
        dimensionId: 'dim-4',
        code: 'D4.3',
        name: 'Karya',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Menciptakan produk, pertunjukan, atau karya sederhana mengikuti panduan dan contoh yang diberikan dalam kegiatan.',
          Cakap:
            'Menghasilkan karya orisinal berupa produk, aksi, atau gagasan nyata yang tertata baik, bermakna, serta bermanfaat bagi lingkungan sekitar.',
          Mahir:
            'Menghasilkan karya orisinal berkualitas tinggi yang memiliki nilai guna dan estetika kuat serta berdampak positif bagi masyarakat sekolah maupun luas.'
        }
      }
    ]
  },
  {
    id: 'dim-5',
    order: 5,
    name: 'Kolaborasi',
    shortName: 'Kolaborasi',
    description:
      'Kemampuan bekerja sama secara aktif, memiliki kepedulian sosial, serta kesediaan berbagi sumber daya dan peran demi tujuan bersama.',
    isLocked: true,
    subdimensions: [
      {
        id: 'sub-5-1',
        dimensionId: 'dim-5',
        code: 'D5.1',
        name: 'Peduli',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Memperhatikan kondisi teman satu kelompok dan membantu apabila diminta selama pelaksanaan kegiatan.',
          Cakap:
            'Menunjukkan kepekaan dan empati terhadap kebutuhan, kesulitan, maupun kontribusi setiap anggota kelompok tanpa harus diminta.',
          Mahir:
            'Menggerakkan kepedulian kolektif dalam tim serta menciptakan suasana kerja yang inklusif, saling menghargai, dan mendukung seluruh anggota.'
        }
      },
      {
        id: 'sub-5-2',
        dimensionId: 'dim-5',
        code: 'D5.2',
        name: 'Berbagi',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Bersedia meminjamkan alat atau berbagi informasi dasar kepada anggota kelompok apabila diingatkan oleh pendamping.',
          Cakap:
            'Secara sukarela berbagi pengetahuan, keterampilan, dan sumber daya yang dimiliki demi kelancaran pencapaian tujuan tim.',
          Mahir:
            'Proaktif memfasilitasi pertukaran pengetahuan dan sumber daya antarkelompok sehingga meningkatkan kapasitas dan keberhasilan bersama.'
        }
      },
      {
        id: 'sub-5-3',
        dimensionId: 'dim-5',
        code: 'D5.3',
        name: 'Kerja Sama',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Terlibat dalam pembagian tugas kelompok dan menyelesaikan bagian tugasnya di bawah pengawasan pendidik atau ketua tim.',
          Cakap:
            'Menyelaraskan tindakan dan berkomitmen menjalankan peran dalam tim untuk mencapai target bersama secara efektif dan harmonis.',
          Mahir:
            'Menginisiasi koordinasi kerja sama lintas kelompok, mengelola perbedaan pendapat secara konstruktif, dan memastikan keberhasilan tujuan bersama.'
        }
      }
    ]
  },
  {
    id: 'dim-6',
    order: 6,
    name: 'Kemandirian',
    shortName: 'Kemandirian',
    description:
      'Kesadaran tanggung jawab atas proses belajar, kepemimpinan diri dalam bertindak, dan kemampuan merencanakan pengembangan diri secara berkelanjutan.',
    isLocked: true,
    subdimensions: [
      {
        id: 'sub-6-1',
        dimensionId: 'dim-6',
        code: 'D6.1',
        name: 'Bertanggung Jawab',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Menyelesaikan tugas kegiatan sesuai waktu yang ditentukan dengan pemantauan rutin dari guru atau koordinator.',
          Cakap:
            'Bertanggung jawab penuh atas proses, keputusan, serta penyelesaian tugas tepat waktu dengan kualitas yang dapat dipertanggungjawabkan.',
          Mahir:
            'Menunjukkan akuntabilitas tinggi atas hasil kerja pribadi maupun kelompok serta siap memperbaiki kekurangan secara proaktif tanpa menunda.'
        }
      },
      {
        id: 'sub-6-2',
        dimensionId: 'dim-6',
        code: 'D6.2',
        name: 'Kepemimpinan',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Mampu memimpin diri sendiri untuk menjaga kedisiplinan serta mulai berlatih mengambil peran koordinasi kecil dalam kelompok.',
          Cakap:
            'Menunjukkan inisiatif memimpin diri dan mengarahkan rekan sebaya secara demokratis, adil, dan memberi contoh nyata dalam kegiatan.',
          Mahir:
            'Menggerakkan tim dengan visi yang jelas, memotivasi rekan sejawat, serta mengambil tanggung jawab kepemimpinan dalam kegiatan sekolah.'
        }
      },
      {
        id: 'sub-6-3',
        dimensionId: 'dim-6',
        code: 'D6.3',
        name: 'Pengembangan Diri',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Mengenali kelebihan dan hal yang perlu ditingkatkan dari dirinya berdasarkan umpan balik yang disampaikan pendidik.',
          Cakap:
            'Mengatur strategi belajar mandiri, melakukan refleksi diri secara berkala, dan terus mengembangkan potensi diri untuk mengatasi tantangan.',
          Mahir:
            'Merancang target pengembangan kompetensi jangka panjang secara mandiri serta memotivasi teman sebaya untuk terus bertumbuh dan berprestasi.'
        }
      }
    ]
  },
  {
    id: 'dim-7',
    order: 7,
    name: 'Kesehatan',
    shortName: 'Kesehatan',
    description:
      'Pemahaman dan pembiasaan pola hidup bersih dan sehat, menjaga kebugaran fisik dan kesehatan mental, serta memelihara kesehatan lingkungan.',
    isLocked: true,
    subdimensions: [
      {
        id: 'sub-7-1',
        dimensionId: 'dim-7',
        code: 'D7.1',
        name: 'Hidup Bersih dan Sehat',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Menerapkan perilaku menjaga kebersihan diri, mencuci tangan, dan memilih asupan sehat ketika diingatkan oleh guru atau teman.',
          Cakap:
            'Membiasakan perilaku hidup bersih dan sehat secara konsisten dalam keseharian di sekolah maupun di rumah dengan penuh kesadaran.',
          Mahir:
            'Menjadi teladan pola hidup bersih dan sehat serta mengkampanyekan pembiasaan higienis dan konsumsi bergizi bagi warga sekolah.'
        }
      },
      {
        id: 'sub-7-2',
        dimensionId: 'dim-7',
        code: 'D7.2',
        name: 'Kebugaran, Kesehatan Fisik, dan Kesehatan Mental',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Berpartisipasi dalam aktivitas fisik ringan dan mulai mengenali emosi diri agar tetap tenang dalam kegiatan sekolah.',
          Cakap:
            'Menjaga kebugaran jasmani secara teratur, mengelola emosi serta stres dengan cara sehat, dan menjaga keseimbangan waktu belajar dan istirahat.',
          Mahir:
            'Memiliki daya tahan fisik dan ketangguhan mental yang prima serta mampu mendampingi atau menyemangati teman dalam menjaga kesehatan jiwa raga.'
        }
      },
      {
        id: 'sub-7-3',
        dimensionId: 'dim-7',
        code: 'D7.3',
        name: 'Kesehatan Lingkungan',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Ikut menjaga kebersihan ruang kelas, halaman sekolah, serta memilah sampah pada tempat yang telah disediakan.',
          Cakap:
            'Secara aktif memelihara sanitasi, kebersihan lingkungan sekolah, dan mencegah munculnya sumber penyakit di area kegiatan.',
          Mahir:
            'Menginisiasi gerakan lingkungan sehat dan bebas sampah di sekolah maupun masyarakat sekitar serta mengajak warga sekolah berperan aktif.'
        }
      }
    ]
  },
  {
    id: 'dim-8',
    order: 8,
    name: 'Komunikasi',
    shortName: 'Komunikasi',
    description:
      'Kemampuan menyimak secara aktif, berbicara dengan santun dan efektif, membaca pemahaman secara kritis, serta menulis informasi terstruktur.',
    isLocked: true,
    subdimensions: [
      {
        id: 'sub-8-1',
        dimensionId: 'dim-8',
        code: 'D8.1',
        name: 'Menyimak',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Menangkap pokok informasi lisan yang disampaikan secara sederhana oleh guru atau teman saat berdiskusi.',
          Cakap:
            'Menyimak dengan penuh perhatian, menghargai pembicara, serta mampu merangkum dan menanggapi gagasan utama secara tepat.',
          Mahir:
            'Menganalisis pesan tersurat maupun tersirat dari paparan lisan kompleks dan memberikan umpan balik yang konstruktif serta empatik.'
        }
      },
      {
        id: 'sub-8-2',
        dimensionId: 'dim-8',
        code: 'D8.2',
        name: 'Berbicara',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Menyampaikan gagasan atau hasil pengamatan secara lisan dengan bahasa yang cukup jelas namun masih membutuhkan dorongan.',
          Cakap:
            'Mengemukakan gagasan, pertanyaan, dan presentasi lisan secara runtut, santun, percaya diri, dan mudah dipahami audiens.',
          Mahir:
            'Berbicara dengan artikulasi dan retorika publik yang persuasif, adaptif terhadap konteks audiens, serta memandu diskusi secara efektif.'
        }
      },
      {
        id: 'sub-8-3',
        dimensionId: 'dim-8',
        code: 'D8.3',
        name: 'Membaca',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Memahami isi teks atau panduan informasi sederhana yang digunakan sebagai rujukan dalam kegiatan kokurikuler.',
          Cakap:
            'Membaca dan menelaah beragam teks informasi maupun visual secara kritis untuk menemukan fakta dan gagasan pendukung kegiatan.',
          Mahir:
            'Menginterpretasi dan mensintesis berbagai sumber bacaan kredibel lintas media untuk memperkaya analisis serta kualitas karya.'
        }
      },
      {
        id: 'sub-8-4',
        dimensionId: 'dim-8',
        code: 'D8.4',
        name: 'Menulis',
        phase: 'D',
        isLocked: true,
        levelDescriptions: {
          Berkembang:
            'Menuliskan catatan atau laporan singkat kegiatan menggunakan struktur kalimat sederhana dengan arahan pembimbing.',
          Cakap:
            'Menulis laporan, refleksi, dan karya tulis dengan struktur yang runtut, kaidah bahasa Indonesia baku, dan pesan yang jelas.',
          Mahir:
            'Memproduksi karya tulis atau publikasi multimoda yang terstruktur tajam, komunikatif, orisinal, serta siap disebarluaskan.'
        }
      }
    ]
  }
];

export const OFFICIAL_KOKURIKULER_THEMES: KokurikulerThemeMaster[] = [
  {
    id: 'tema-1',
    name: 'Pembentukan Karakter dan Spiritualitas',
    description: 'Penguatan akhlak mulia, pembiasaan ibadah, toleransi, dan ketakwaan.',
    isActive: true
  },
  {
    id: 'tema-2',
    name: 'Kesehatan, Kebersihan, dan Gaya Hidup Berkelanjutan',
    description: 'Pelestarian lingkungan hidup, konservasi pesisir/alam, pola hidup bersih dan sehat.',
    isActive: true
  },
  {
    id: 'tema-3',
    name: 'Kearifan Lokal dan Budaya Daerah',
    description: 'Pelestarian seni, tradisi Melayu, pantun, sejarah, dan potensi lokal daerah.',
    isActive: true
  },
  {
    id: 'tema-4',
    name: 'Kewargaan, Kebinekaan, dan Demokrasi Sekolah',
    description: 'Penguatan persatuan, toleransi, gotong royong, dan kepemimpinan peserta didik.',
    isActive: true
  },
  {
    id: 'tema-5',
    name: 'Literasi, Numerasi, Sains, dan Rekayasa Teknologi',
    description: 'Pengembangan budaya baca-tulis, riset sederhana, kewirausahaan, dan inovasi tepat guna.',
    isActive: true
  },
  {
    id: 'tema-6',
    name: 'Kemandirian, Kepemimpinan, dan Kewirausahaan Muda',
    description: 'Pelatihan jiwa wirausaha pelajar, kedisiplinan diri, dan proyek karya mandiri.',
    isActive: true
  }
];

export const OFFICIAL_SMP_PHASES = [
  'Fase D (SMP Kelas VII - IX)',
  'Fase D - Kelas VII',
  'Fase D - Kelas VIII',
  'Fase D - Kelas IX'
];
