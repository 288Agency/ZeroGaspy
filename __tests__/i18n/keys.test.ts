import fs from 'fs';
import path from 'path';
import fr from '../../i18n/locales/fr.json';
import en from '../../i18n/locales/en.json';

// Une clé t() absente des locales s'affiche BRUTE à l'écran ("sharing.share"),
// y compris dans les alertes et les labels VoiceOver. Ce test verrouille ça.

const ROOT = path.resolve(__dirname, '../..');
const DIRS = ['screens', 'components', 'services', 'utils', 'hooks', 'contexts', 'navigation'];
const PLURAL_SUFFIXES = ['', '_one', '_other', '_zero', '_two', '_few', '_many'];

type Dict = Record<string, unknown>;

function flatten(obj: Dict, prefix = ''): Set<string> {
  const out = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const nested of flatten(v as Dict, `${prefix}${k}.`)) out.add(nested);
    } else {
      out.add(`${prefix}${k}`);
    }
  }
  return out;
}

function sourceFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules') return [];
    if (e.isDirectory()) return sourceFiles(path.join(dir, e.name));
    return /\.tsx?$/.test(e.name) ? [path.join(abs, e.name)] : [];
  });
}

/** t('cle') / t("cle") / t(`cle`), avec les options éventuelles. */
const CALL = /\bt\(\s*['"`]([A-Za-z0-9_.]+)['"`]\s*(?:,\s*\{([^}]*)\})?/g;

function usedKeys(): { key: string; where: string }[] {
  const found: { key: string; where: string }[] = [];
  for (const file of DIRS.flatMap(sourceFiles).concat(path.join(ROOT, 'App.tsx'))) {
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(CALL)) {
      // un defaultValue explicite protège déjà l'affichage
      if ((m[2] ?? '').includes('defaultValue')) continue;
      const line = src.slice(0, m.index).split('\n').length;
      found.push({ key: m[1], where: `${path.relative(ROOT, file)}:${line}` });
    }
  }
  return found;
}

describe('clés i18n utilisées dans le code', () => {
  const frKeys = flatten(fr as Dict);
  const enKeys = flatten(en as Dict);
  const used = usedKeys();

  const resolves = (keys: Set<string>, key: string) =>
    PLURAL_SUFFIXES.some((s) => keys.has(key + s));

  it('trouve des appels t() à analyser', () => {
    expect(used.length).toBeGreaterThan(50);
  });

  it('résout toutes les clés en français', () => {
    const missing = used
      .filter(({ key }) => !resolves(frKeys, key))
      .map(({ key, where }) => `${where} -> ${key}`);
    expect(missing).toEqual([]);
  });

  it('résout toutes les clés en anglais', () => {
    const missing = used
      .filter(({ key }) => !resolves(enKeys, key))
      .map(({ key, where }) => `${where} -> ${key}`);
    expect(missing).toEqual([]);
  });
});
