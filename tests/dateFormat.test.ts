import assert from 'node:assert/strict';
import { normalizeDateToIso } from '../src/utils/dateFormat';

const cases: Array<[string | number | Date | null | undefined, string, string]> = [
  ['2013-05-14', '2013-05-14', 'standard ISO'],
  ['2013-5-4', '2013-05-04', 'unpadded ISO'],
  ['2013/05/14', '2013-05-14', 'slash ISO'],
  ['2013-05-14T00:00:00.000Z', '2013-05-14', 'ISO timestamp'],
  ['14/05/2013', '2013-05-14', 'DD/MM/YYYY Indonesian'],
  ['14-05-2013', '2013-05-14', 'DD-MM-YYYY Indonesian'],
  ['5.2.2013', '2013-02-05', 'D.M.YYYY'],
  ['14/05/13', '2013-05-14', 'DD/MM/YY 2000s'],
  ['14 Mei 2013', '2013-05-14', 'Indonesian month Mei'],
  ['05 Agustus 2012', '2012-08-05', 'Indonesian month Agustus'],
  ['12 Des 2011', '2011-12-12', 'Indonesian abbreviated Des'],
  ['May 14, 2013', '2013-05-14', 'English Month DD, YYYY'],
  [41408, '2013-05-14', 'Excel serial number'],
  ['41408', '2013-05-14', 'Excel serial string'],
  ['20130514', '2013-05-14', 'Compact YYYYMMDD'],
  ['14052013', '2013-05-14', 'Compact DDMMYYYY'],
  ['', '', 'empty string'],
  ['-', '', 'dash placeholder'],
  [null, '', 'null value']
];

for (const [input, expected, label] of cases) {
  const actual = normalizeDateToIso(input);
  assert.equal(actual, expected, `Failed case (${label}): input=${String(input)} got=${actual}`);
}

console.log(`dateFormat tests passed: ${cases.length}/${cases.length}`);
