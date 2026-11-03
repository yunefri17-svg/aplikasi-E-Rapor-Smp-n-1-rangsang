import { Student } from '../types/erapor';

/**
 * Sorts an array of students strictly in alphabetical order (A-Z) by full name.
 * Uses Indonesian locale compare for proper dictionary order.
 */
export function sortStudentsAlphabetically(students: Student[]): Student[] {
  if (!students || students.length === 0) return [];
  return [...students].sort((a, b) => {
    const nameA = (a.name || '').trim();
    const nameB = (b.name || '').trim();
    return nameA.localeCompare(nameB, 'id', { sensitivity: 'base', numeric: true });
  });
}
