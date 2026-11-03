import { SchoolProfile } from '../types/erapor';

/**
 * Calculates current official Indonesian academic year and semester from system date.
 * Academic Calendar:
 * - July (month 7) to December (month 12): [Year]/[Year + 1] Semester Ganjil
 * - January (month 1) to June (month 6): [Year - 1]/[Year] Semester Genap
 */
export function getCurrentSystemAcademicYear(date: Date = new Date()): {
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  startYear: number;
  endYear: number;
} {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1 - 12

  if (month >= 7) {
    return {
      academicYear: `${year}/${year + 1}`,
      semester: 'Ganjil',
      startYear: year,
      endYear: year + 1
    };
  } else {
    return {
      academicYear: `${year - 1}/${year}`,
      semester: 'Genap',
      startYear: year - 1,
      endYear: year
    };
  }
}

/**
 * Generates dynamic academic years range for long-term usage (e.g. from 2023/2024 up to 10+ years ahead)
 */
export function getAvailableAcademicYears(
  baseStartYear: number = 2023,
  futureSpan: number = 10,
  existingYears: string[] = []
): string[] {
  const currentYear = new Date().getFullYear();
  const maxYear = Math.max(currentYear + futureSpan, 2035);
  const yearsSet = new Set<string>();

  // Generate continuous list
  for (let y = baseStartYear; y <= maxYear; y++) {
    yearsSet.add(`${y}/${y + 1}`);
  }

  // Include any extra years present in database records
  existingYears.forEach((yr) => {
    if (yr && yr.trim()) yearsSet.add(yr.trim());
  });

  return Array.from(yearsSet).sort((a, b) => {
    const startA = parseInt(a.split('/')[0]) || 0;
    const startB = parseInt(b.split('/')[0]) || 0;
    return startA - startB;
  });
}

/**
 * Generate standard Kemendikbud report date estimate
 */
export function getDefaultReportDate(academicYear: string, semester: 'Ganjil' | 'Genap'): string {
  const parts = academicYear.split('/');
  const startYear = parseInt(parts[0]) || new Date().getFullYear();
  const endYear = parseInt(parts[1]) || startYear + 1;

  if (semester === 'Ganjil') {
    return `19 Desember ${startYear}`;
  } else {
    return `26 Juni ${endYear}`;
  }
}

/**
 * Ensures profile has up-to-date academic year if autoAcademicYear is active
 */
export function syncProfileAcademicYear(profile: SchoolProfile): SchoolProfile {
  // If autoAcademicYear is explicitly disabled, retain user preference
  if (profile.autoAcademicYear === false) {
    return profile;
  }

  const current = getCurrentSystemAcademicYear();
  // If current profile has outdated year (e.g. 2024/2025), advance to current system year (e.g. 2026/2027)
  const isOutdated = profile.activeAcademicYear === '2024/2025' || !profile.activeAcademicYear;

  if (isOutdated) {
    return {
      ...profile,
      activeAcademicYear: current.academicYear,
      activeSemester: current.semester,
      reportDate: getDefaultReportDate(current.academicYear, current.semester),
      autoAcademicYear: true
    };
  }

  return {
    ...profile,
    autoAcademicYear: profile.autoAcademicYear ?? true
  };
}
