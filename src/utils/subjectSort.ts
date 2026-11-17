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
  'Koding dan Kecerdasan Artifisial',
  'Seni Budaya & Prakarya',
  'Muatan Lokal Budaya Melayu Riau ( BMR )',
  'Muatan Lokal Budaya Melayu Riau (BMR)' // Variant
];

function getOfficialRank(sub: Subject): number {
  if (sub.id === 'sub-ka') {
    return OFFICIAL_SUBJECT_ORDER.indexOf('Koding dan Kecerdasan Artifisial');
  }
  if (sub.id === 'sub-inf') {
    return OFFICIAL_SUBJECT_ORDER.indexOf('Informatika');
  }
  const lower = (sub.name || '').trim().toLowerCase();
  if (lower.includes('koding') && (lower.includes('kecerdasan artifisial') || lower.includes('ka'))) {
    return OFFICIAL_SUBJECT_ORDER.indexOf('Koding dan Kecerdasan Artifisial');
  }
  return OFFICIAL_SUBJECT_ORDER.findIndex(
    (name) => lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower)
  );
}

/**
 * Sort subjects based on official Kemendikbud order (keeping Koding dan Kecerdasan Artifisial
 * directly after Informatika), falling back to orderIndex and name.
 */
export function sortSubjects(subjects: Subject[]): Subject[] {
  return [...subjects].sort((a, b) => {
    const rankA = getOfficialRank(a);
    const rankB = getOfficialRank(b);

    if (rankA !== -1 && rankB !== -1) {
      if (rankA !== rankB) return rankA - rankB;
    }

    if (a.orderIndex !== undefined && b.orderIndex !== undefined && a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    if (rankA !== -1 && rankB === -1) return -1;
    if (rankB !== -1 && rankA === -1) return 1;

    return a.name.localeCompare(b.name);
  });
}
