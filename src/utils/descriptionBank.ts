export interface SubjectDescriptionRange {
  range: '95-100' | '90-94' | '85-89' | '80-84' | '75-79' | 'below-75';
  highestDesc: string;
  lowestDesc: string;
}

export interface SubjectDescriptionBank {
  subjectId: string;
  subjectName: string;
  ranges: SubjectDescriptionRange[];
}

export const defaultDescriptionBank: SubjectDescriptionBank[] = [
  {
    subjectId: 'sub-pai',
    subjectName: 'PAIBP (Pendidikan Agama Islam dan Budi Pekerti)',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan penguasaan yang sangat istimewa dan mendalam dalam memahami akidah, akhlak mulia, ibadah harian, serta sejarah peradaban Islam.',
        lowestDesc: 'Menunjukkan kemampuan analisis yang sangat tinggi dalam menerapkan nilai-nilai ajaran Islam secara komprehensif dalam kehidupan sehari-hari.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan pemahaman yang sangat baik dalam mempraktikkan ibadah, membaca Al-Qur\'an dengan tartil, dan mengamalkan nilai-nilai akhlak terpuji.',
        lowestDesc: 'Mampu menjelaskan hukum tajwid, kisah teladan nabi, dan tata cara ibadah wajib dengan tepat.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan penguasaan yang baik dalam memahami tata cara ibadah sehari-hari serta mampu menerapkan ajaran akhlak mulia dengan benar.',
        lowestDesc: 'Perlu peningkatan sedikit pada kelancaran hafalan surat pendek dan pemahaman asmaul husna.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu memahami dan mengamalkan nilai-nilai pokok keimanan, ibadah, dan budi pekerti dengan baik sesuai standar ketuntasan.',
        lowestDesc: 'Perlu penguatan dalam pemahaman sejarah Islam dan ketentuan ibadah sunnah.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang memadai dalam pemahaman materi dasar keagamaan.',
        lowestDesc: 'Perlu bimbingan rutin dan latihan tambahan dalam praktik ibadah dan hafalan.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai ketuntasan dengan bimbingan khusus pada materi pokok.',
        lowestDesc: 'Perlu pendampingan intensif dalam pemahaman dasar keimanan, tata cara beribadah, dan pengamalan akhlak.'
      }
    ]
  },
  {
    subjectId: 'sub-ppkn',
    subjectName: 'Pendidikan Pancasila',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan internalisasi nilai-nilai Pancasila, UUD NRI 1945, dan kesadaran hukum yang sangat luar biasa serta nasionalisme yang tinggi.',
        lowestDesc: 'Sangat aktif dalam menunjukkan sikap toleransi, gotong royong, dan pemahaman mendalam terhadap sistem pemerintahan.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan pemahaman yang sangat baik dalam mengimplementasikan norma, hak, dan kewajiban sebagai warga negara.',
        lowestDesc: 'Mampu menganalisis kasus pelanggaran norma dan solusi pemecahannya dengan bijak.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan pemahaman yang baik mengenai kedudukan Pancasila sebagai dasar negara dan pandangan hidup bangsa.',
        lowestDesc: 'Perlu penguatan dalam menghafal pasal-pasal UUD 1945 dan sejarah perumusannya.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu memahami konsep dasar kewarganegaraan, keragaman budaya, dan norma sosial dengan baik.',
        lowestDesc: 'Perlu peningkatan partisipasi aktif dalam diskusi tentang persatuan dan kesatuan bangsa.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang cukup dalam materi kewarganegaraan.',
        lowestDesc: 'Perlu bimbingan dalam memahami keterkaitan antar sila Pancasila dalam kehidupan.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai batas ketuntasan minimum.',
        lowestDesc: 'Perlu bimbingan intensif dalam pemahaman hak, kewajiban, dan nilai-nilai dasar negara.'
      }
    ]
  },
  {
    subjectId: 'sub-bindo',
    subjectName: 'Bahasa Indonesia',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan keterampilan yang sangat istimewa dalam menganalisis teks sastra, menyusun teks eksposisi/argumentasi, serta berbahasa lisan dan tulis yang sangat baik.',
        lowestDesc: 'Sangat mahir dalam menyunting teks, memahami struktur kebahasaan kompleks, dan mengapresiasi karya sastra.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan kemampuan yang sangat baik dalam memahami struktur teks, kaidah kebahasaan, serta apresiasi puisi dan prosa.',
        lowestDesc: 'Mampu menulis surat resmi, laporan hasil observasi, dan teks deskripsi dengan tata bahasa baku.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan kemampuan yang baik dalam menangkap isi teks, membaca kritis, serta menyusun kalimat efektif dan runtut.',
        lowestDesc: 'Perlu ketelitian dalam penggunaan ejaan yang disempurnakan (EYD) dan tanda baca.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu memahami informasi dari berbagai jenis teks dan menyusun karangan narasi sederhana dengan baik.',
        lowestDesc: 'Perlu peningkatan pengayaan kosakata dan kelancaran membaca pemahaman.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan dalam memahami teks bacaan sesuai standar KKM.',
        lowestDesc: 'Perlu bimbingan dalam penyusunan paragraf padu dan penulisan sesuai kaidah.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai ketuntasan minimum dalam pemahaman teks.',
        lowestDesc: 'Perlu bimbingan dan latihan intensif dalam pemahaman bacaan dan penulisan kalimat.'
      }
    ]
  },
  {
    subjectId: 'sub-mat',
    subjectName: 'Matematika',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan penguasaan yang sangat luar biasa dalam pemecahan masalah matematika kompleks, operasi aljabar, geometri, dan penalaran logis.',
        lowestDesc: 'Sangat terampil menyelesaikan soal cerita tingkat tinggi, fungsi kuadrat, dan statistika lanjutan.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan penguasaan yang sangat baik dalam menganalisis konsep bilangan, persamaan linear, dan pemecahan masalah matematis.',
        lowestDesc: 'Mampu menyelesaikan perhitungan pecahan, perbandingan, dan bangun datar dengan teliti.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan pemahaman yang baik dalam pengerjaan hitung, aljabar, dan penerapan rumus matematika dalam soal kontekstual.',
        lowestDesc: 'Perlu ketelitian lebih dalam perhitungan aljabar bertingkat dan teorema pythagoras.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu menyelesaikan perhitungan dasar matematika dan memahami konsep materi dengan baik sesuai standar ketuntasan.',
        lowestDesc: 'Perlu penguatan dalam pemecahan soal cerita yang melibatkan pecahan dan desimal.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang memadai dalam konsep hitung dasar.',
        lowestDesc: 'Perlu latihan lebih lanjut pada operasi hitung bilangan bulat dan aljabar dasar.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai ketuntasan minimum dengan bimbingan.',
        lowestDesc: 'Perlu bimbingan intensif dan latihan penguasaan konsep dasar hitung serta pengerjaan rumus.'
      }
    ]
  },
  {
    subjectId: 'sub-ipa',
    subjectName: 'Ilmu Pengetahuan Alam (IPA)',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan penguasaan sains yang sangat istimewa, analitis, dan mendalam terhadap konsep fisika, kimia, biologi, serta metode ilmiah.',
        lowestDesc: 'Sangat mahir merancang percobaan ilmiah, menganalisis ekosistem, sistem tata surya, dan reaksi zat.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan pemahaman yang sangat baik dalam mengaitkan konsep gejala alam, sel organisme, kalor, dan fenomena fisika.',
        lowestDesc: 'Mampu menyajikan laporan percobaan ilmiah secara sistematis dan logis.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan pemahaman yang baik dalam menjelaskan hukum alam, sistem organ tubuh, dan pengukuran besaran fisika.',
        lowestDesc: 'Perlu penguatan dalam analisis rumus fisika dan klasifikasi makhluk hidup kompleks.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu memahami konsep dasar ilmu pengetahuan alam dan menerangkannya dalam fenomena sehari-hari dengan baik.',
        lowestDesc: 'Perlu peningkatan ketelitian dalam menjawab soal penalaran sebab-akibat sains.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang memadai dalam materi sains dasar.',
        lowestDesc: 'Perlu penguatan pada konsep materi sains eksperimental dan istilah ilmiah.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai batas ketuntasan minimum.',
        lowestDesc: 'Perlu bimbingan intensif dalam pemahaman konsep dasar ilmu pengetahuan alam dan fenomena fisika/biologi.'
      }
    ]
  },
  {
    subjectId: 'sub-ips',
    subjectName: 'Ilmu Pengetahuan Sosial (IPS)',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan wawasan sosial, ekonomi, dan sejarah yang sangat luas serta pemahaman mendalam terhadap dinamika ruang dan interaksi sosial.',
        lowestDesc: 'Sangat analitis dalam mengkaji masalah sosial, aktivitas ekonomi masyarakat, dan kronologi sejarah peradaban.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan pemahaman yang sangat baik dalam menganalisis peta, interaksi keruangan, dan lembaga keuangan/sosial.',
        lowestDesc: 'Mampu menguraikan pengaruh interaksi antarruang terhadap kehidupan ekonomi dan budaya.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan pemahaman yang baik tentang gejala sosial, potensi sumber daya wilayah, dan periodisasi sejarah.',
        lowestDesc: 'Perlu ketelitian dalam menghafal tahun peristiwa sejarah dan peta tematik.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu memahami konsep dasar ilmu sosial, geografi, dan sejarah dengan baik sesuai KKM.',
        lowestDesc: 'Perlu penguatan dalam analisis grafik perekonomian dan dinamika penduduk.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang cukup dalam materi geografi dan sejarah dasar.',
        lowestDesc: 'Perlu bimbingan dalam pemahaman kronologi peristiwa dan peta.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai ketuntasan minimum.',
        lowestDesc: 'Perlu bimbingan intensif dalam pemahaman materi sosial, geografi, dan sejarah.'
      }
    ]
  },
  {
    subjectId: 'sub-bing',
    subjectName: 'Bahasa Inggris',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan kemampuan berbahasa Inggris yang sangat istimewa baik dalam pemahaman teks fungsional, tenses, maupun komunikasi lisan dan tulis.',
        lowestDesc: 'Sangat mahir menyusun teks descriptive, recount, narrative, serta menguasai kosakata luas.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan penguasaan kosakata dan tata bahasa Inggris yang sangat baik dalam menyusun dan merespon teks pendek.',
        lowestDesc: 'Mampu melafalkan kata dengan baik dan memahami percakapan interpersonal sederhana.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan pemahaman yang baik dalam mengartikan teks interaktif, deskriptif, dan naratif sederhana.',
        lowestDesc: 'Perlu peningkatan dalam penerapan *grammar* (*tenses*) dan pelafalan.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu memahami ungkapan sehari-hari dan kosakata dasar bahasa Inggris dengan baik sesuai KKM.',
        lowestDesc: 'Perlu penguatan dalam menyusun struktur kalimat tanya dan negatif.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang memadai dalam kosakata dasar.',
        lowestDesc: 'Perlu bimbingan dalam pemahaman struktur kalimat dan latihan mendengar (*listening*).'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai ketuntasan minimum.',
        lowestDesc: 'Perlu bimbingan intensif dalam penguasaan kosakata dasar dan *grammar* bahasa Inggris.'
      }
    ]
  },
  {
    subjectId: 'sub-pjok',
    subjectName: 'PJOK (Pendidikan Jasmani, Olahraga, dan Kesehatan)',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan keterampilan motorik, penguasaan teknik berbagai cabang olahraga, serta pemahaman kebugaran jasmani yang sangat istimewa.',
        lowestDesc: 'Sangat mahir dalam praktik permainan bola besar/kecil, atletik, dan senam lantai dengan teknik sempurna.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan penguasaan teknik dasar permainan beregu dan perorangan serta pemahaman pola hidup sehat dengan sangat baik.',
        lowestDesc: 'Mampu mendemonstrasikan rangkaian senam ketangkasan dan strategi permainan.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan kemampuan yang baik dalam praktik olahraga, kebugaran, dan menjunjung tinggi sportivitas.',
        lowestDesc: 'Perlu peningkatan pada daya tahan tubuh (*endurance*) dan teknik spesifik.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu mempraktikkan gerakan dasar olahraga dan memahami konsep kesehatan jasmani dengan baik sesuai KKM.',
        lowestDesc: 'Perlu penguatan dalam pemahaman peraturan resmi pertandingan olahraga.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang memadai dalam praktik olahraga dasar.',
        lowestDesc: 'Perlu bimbingan dalam koordinasi gerak fisik dan teknik lanjutan.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai ketuntasan minimum.',
        lowestDesc: 'Perlu bimbingan dan latihan intensif dalam teknik dasar olahraga serta kesehatan jasmani.'
      }
    ]
  },
  {
    subjectId: 'sub-inf',
    subjectName: 'Informatika',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan penguasaan berpikir komputasional, algoritma, analisis data, dan literasi digital yang sangat istimewa.',
        lowestDesc: 'Sangat mahir dalam pemecahan masalah menggunakan pemrograman visual, pengolahan lembar kerja, dan keamanan siber.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan keterampilan yang sangat baik dalam pengoperasian perangkat lunak, internet, dan logika pemrograman dasar.',
        lowestDesc: 'Mampu merancang struktur data sederhana dan menggunakan perangkat TIK secara produktif.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan pemahaman yang baik tentang sistem komputer, perangkat keras/lunak, dan pengolahan informasi.',
        lowestDesc: 'Perlu peningkatan dalam logika pemecahan masalah (*computational thinking*).'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu memahami konsep dasar teknologi informasi dan komunikasi serta literasi digital dengan baik sesuai KKM.',
        lowestDesc: 'Perlu penguatan dalam praktik aplikasi perkantoran (Word, Excel, PPT).'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang cukup dalam pengoperasian komputer dasar.',
        lowestDesc: 'Perlu bimbingan dalam pemahaman logika algoritma dan pemrograman.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai ketuntasan minimum.',
        lowestDesc: 'Perlu bimbingan intensif dalam pengoperasian dasar komputer dan literasi digital.'
      }
    ]
  },
  {
    subjectId: 'sub-seni',
    subjectName: 'Seni Budaya & Prakarya',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan kreativitas seni rupa, seni musik, seni tari, atau prakarya yang sangat luar biasa, estetis, dan bernilai tinggi.',
        lowestDesc: 'Sangat mahir memadukan unsur estetika dalam pembuatan karya seni kriya, pertunjukan musik, dan kerajinan.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan apresiasi dan keterampilan praktik berkarya seni rupa dan kerajinan tangan dengan sangat baik.',
        lowestDesc: 'Mampu memainkan alat musik tradisional/modern atau mementaskan gerak tari kreasi.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan kemampuan yang baik dalam mengolah bahan prakarya serta mengekspresikan karya seni.',
        lowestDesc: 'Perlu ketelatenan dan kerapian lebih dalam menyelesaikan detail karya seni.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu memahami konsep dasar estetika seni dan membuat kerajinan tangan sederhana dengan baik sesuai KKM.',
        lowestDesc: 'Perlu penguatan dalam pemahaman sejarah seni budaya Nusantara.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang cukup dalam praktik seni dasar.',
        lowestDesc: 'Perlu bimbingan dalam teknik berkarya dan apresiasi seni.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai ketuntasan minimum.',
        lowestDesc: 'Perlu bimbingan intensif dalam apresiasi dan praktik keterampilan seni serta prakarya.'
      }
    ]
  },
  {
    subjectId: 'sub-bmr',
    subjectName: 'Muatan Lokal Budaya Melayu Riau (BMR)',
    ranges: [
      {
        range: '95-100',
        highestDesc: 'Menunjukkan kecintaan dan penguasaan yang sangat mendalam terhadap adat istiadat, sastra lisan, gurindam, seloka, dan nilai luhur Budaya Melayu Riau.',
        lowestDesc: 'Sangat mahir melisankan gurindam 12, memahami pakaian adat, dan melestarikan kearifan lokal Melayu Riau.'
      },
      {
        range: '90-94',
        highestDesc: 'Menunjukkan pemahaman yang sangat baik tentang adab, tradisi, makanan khas, dan sejarah kepemimpinan Melayu Riau.',
        lowestDesc: 'Mampu menguraikan nilai budi pekerti dalam petuah andalan Melayu.'
      },
      {
        range: '85-89',
        highestDesc: 'Menunjukkan pemahaman yang baik mengenai adat bersendi syarak, syarak bersendi kitabullah di Riau.',
        lowestDesc: 'Perlu peningkatan dalam penguasaan istilah bahasa Melayu Riau klasik.'
      },
      {
        range: '80-84',
        highestDesc: 'Mampu memahami materi muatan lokal budaya Melayu Riau dengan baik sesuai KKM.',
        lowestDesc: 'Perlu penguatan dalam pemahaman silsilah adat dan kesenian tradisional Riau.'
      },
      {
        range: '75-79',
        highestDesc: 'Menunjukkan ketuntasan belajar yang cukup dalam materi budaya lokal.',
        lowestDesc: 'Perlu bimbingan dalam pemahaman kosakata dan sejarah lokal Melayu Riau.'
      },
      {
        range: 'below-75',
        highestDesc: 'Mencapai ketuntasan minimum.',
        lowestDesc: 'Perlu bimbingan intensif dalam pemahaman nilai budaya dan kearifan lokal Melayu Riau.'
      }
    ]
  }
];

export function getAutomaticDescription(
  subjectId: string,
  finalScore: number,
  customBank?: SubjectDescriptionBank[]
): { highest: string; lowest: string } {
  const bank = customBank || defaultDescriptionBank;
  const subConfig = bank.find((b) => b.subjectId === subjectId) || bank[0];

  let rangeKey: SubjectDescriptionRange['range'] = '80-84';
  if (finalScore >= 95) rangeKey = '95-100';
  else if (finalScore >= 90) rangeKey = '90-94';
  else if (finalScore >= 85) rangeKey = '85-89';
  else if (finalScore >= 80) rangeKey = '80-84';
  else if (finalScore >= 75) rangeKey = '75-79';
  else rangeKey = 'below-75';

  const rangeItem = subConfig.ranges.find((r) => r.range === rangeKey) || subConfig.ranges[3];
  return {
    highest: rangeItem.highestDesc,
    lowest: rangeItem.lowestDesc
  };
}
