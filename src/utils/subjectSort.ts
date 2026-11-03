import { Subject } from '../types/erapor';

/**
 * Official Kemendikbud / Kurikulum Merdeka SMP Subject Order
 */
export const OFFICIAL_SUBJECT_ORDER = [
  'Pendidikan Agama Islam dan Budi Pekerti',
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan', // Variant
  'Informatika',
  'Seni Budaya & Prakarya',
  'Muatan Lokal Budaya Melayu Riau ( BMR )',
  'Muatan Lokal Budaya Melayu Riau (BMR)' // Variant
];

/**
 * Sort subjects based on official order or orderIndex
 */
export function sortSubjects(subjects: Subject[]): Subject[] {
  return [...subjects].sort((a, b) => {
    // 1. Try sorting by orderIndex if both have it and they are different
    if (a.orderIndex !== undefined && b.orderIndex !== undefined && a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    // 2. Fallback to official name-based order
    const indexA = OFFICIAL_SUBJECT_ORDER.findIndex(name => 
      a.name.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(a.name.toLowerCase())
    );
    const indexB = OFFICIAL_SUBJECT_ORDER.findIndex(name => 
      b.name.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(b.name.toLowerCase())
    );

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // 3. Last fallback: alphabetical by name
    return a.name.localeCompare(b.name);
  });
}
