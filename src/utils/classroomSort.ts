import { Classroom } from '../types/erapor';

/**
 * Extracts numeric grade and section from classroom object or string
 * Examples:
 * - "Kelas VII.1" -> grade: 7, section: 1
 * - "Kelas VII.2" -> grade: 7, section: 2
 * - "Kelas VIII.1" -> grade: 8, section: 1
 * - "Kelas IX.3" -> grade: 9, section: 3
 */
export const parseClassroomRank = (classroom: Classroom | string | undefined | null) => {
  if (!classroom) return { grade: 999, section: 999, name: '' };

  const name = typeof classroom === 'string' ? classroom : (classroom.name || classroom.id || '');
  const gradeLevel = typeof classroom === 'string' ? '' : (classroom.gradeLevel || '');

  let grade = 0;
  if (gradeLevel) {
    const parsed = parseInt(gradeLevel, 10);
    if (!isNaN(parsed) && parsed > 0) grade = parsed;
  }

  const strUpper = name.toUpperCase();

  // Roman numeral detection (check VIII before VII, check IX before single letters)
  if (strUpper.includes('VIII')) {
    grade = 8;
  } else if (strUpper.includes('VII')) {
    grade = 7;
  } else if (strUpper.includes('IX')) {
    grade = 9;
  } else if (strUpper.includes('7') || strUpper.includes('VII')) {
    grade = 7;
  } else if (strUpper.includes('8') || strUpper.includes('VIII')) {
    grade = 8;
  } else if (strUpper.includes('9') || strUpper.includes('IX')) {
    grade = 9;
  }

  // Extract section (e.g. ".1", " 1", "-1", " 01", ".2")
  let section = 0;
  const numMatch = strUpper.match(/[\.\s\-_]([0-9]+)/);
  if (numMatch) {
    section = parseInt(numMatch[1], 10);
  } else {
    // If letters like A, B, C
    const letterMatch = strUpper.match(/[\.\s\-_]([A-Z])$/);
    if (letterMatch) {
      section = letterMatch[1].charCodeAt(0) - 64;
    }
  }

  return { grade, section, name };
};

export const compareClassrooms = (
  a: Classroom | string | undefined | null,
  b: Classroom | string | undefined | null
): number => {
  const aRank = parseClassroomRank(a);
  const bRank = parseClassroomRank(b);

  if (aRank.grade !== bRank.grade) {
    return aRank.grade - bRank.grade;
  }
  if (aRank.section !== bRank.section) {
    return aRank.section - bRank.section;
  }
  return aRank.name.localeCompare(bRank.name, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Strictly sorts classrooms in order:
 * VII.1, VII.2, VII.3, VIII.1, VIII.2, VIII.3, IX.1, IX.2, IX.3
 */
export const sortClassrooms = (classrooms: Classroom[]): Classroom[] => {
  if (!classrooms || classrooms.length === 0) return [];
  return [...classrooms].sort(compareClassrooms);
};

export const sortClassroomNames = (names: string[]): string[] => {
  if (!names || names.length === 0) return [];
  return [...names].sort(compareClassrooms);
};
