/**
 * Smoke test iOS — pilote l'app sur simulateur et echoue si un ecran casse.
 *
 * Les trois bugs les plus graves trouves en aout 2026 (boucle de rendu infinie
 * sur les Defis, cle i18n brute dans le donut Impact, prix paywall en dur)
 * etaient TOUS visibles a l'ecran et invisibles aux tests unitaires.
 * Ce script comble ce trou : il ouvre chaque ecran et verifie qu'il rend bien
 * ce qu'on attend, sans erreur React Native.
 *
 * Prerequis : idb (`brew tap facebook/fb && brew trust facebook/fb &&
 * brew install idb-companion idb-cli`), un simulateur demarre, Metro lance.
 *
 * Usage: npx ts-node scripts/smoke-ios.ts
 */

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BUNDLE_ID = 'com.zerogaspy.app';

/** Signatures d'erreur React Native visibles dans l'arbre d'accessibilite. */
const RN_ERRORS = [
  'Maximum update depth exceeded',
  'Render Error',
  'Element type is invalid',
  'undefined is not an object',
  'is not a function',
];

/**
 * Une cle i18n non resolue s'affiche brute a l'ecran (« sharing.share »).
 * On ne peut pas se contenter d'un motif « mot.mot » : les identifiants SF
 * Symbols exposes en accessibilite (person.fill, wineglass.fill…) y repondent
 * aussi. On exige donc un vrai namespace de fr.json comme prefixe.
 */
const I18N_NAMESPACES: string[] = Object.keys(
  JSON.parse(
    readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../i18n/locales/fr.json'),
      'utf8',
    ),
  ) as Record<string, unknown>,
);

function looksLikeRawI18nKey(text: string): boolean {
  const dot = text.indexOf('.');
  if (dot <= 0) return false;
  if (/\s/.test(text)) return false;
  return I18N_NAMESPACES.includes(text.slice(0, dot));
}

interface Node {
  AXLabel?: string | null;
  frame?: { x: number; y: number; width: number; height: number };
}

interface Step {
  name: string;
  /** Labels a taper successivement pour atteindre l'ecran. */
  path: { label?: string; xy?: readonly [number, number] }[];
  /** Au moins un de ces textes doit etre present une fois l'ecran ouvert. */
  expect: string[];
}

// Onglets : la barre native n'expose pas ses items, on tape aux quarts.
const TAB = { home: [50, 832], lists: [151, 832], recipes: [251, 832], impact: [352, 832] } as const;

const STEPS: Step[] = [
  { name: 'Accueil', path: [{ xy: TAB.home }], expect: ['À SURVEILLER'] },
  { name: 'Listes', path: [{ xy: TAB.lists }], expect: ['Mes Listes'] },
  { name: 'Recettes', path: [{ xy: TAB.recipes }], expect: ['Idées recettes'] },
  { name: 'Impact', path: [{ xy: TAB.impact }], expect: ['Mon Impact', 'BILAN DE CONSOMMATION'] },
  { name: 'Paywall', path: [{ xy: TAB.impact }, { label: 'Statistiques avancées' }],
    expect: ['Continuer avec Premium'] },
  { name: 'Defis', path: [{ xy: TAB.home }, { label: 'Défi de la semaine' }],
    expect: ['Défis de la Semaine'] },
  { name: 'Planificateur', path: [{ xy: TAB.home }, { label: 'Planifier les repas' }],
    expect: ['Planning de la semaine'] },
  { name: 'Compte', path: [{ xy: TAB.home }, { label: 'Profil' }],
    expect: ['Mon Compte'] },
];

const sh = (cmd: string, args: string[]): string => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function bootedUdid(): string {
  const out = sh('xcrun', ['simctl', 'list', 'devices', 'booted']);
  const m = out.match(/\(([0-9A-F-]{36})\) \(Booted\)/);
  if (!m) {
    console.error('✖ Aucun simulateur demarre. Lancez-en un puis relancez.');
    process.exit(1);
  }
  return m[1];
}

function tree(udid: string): Node[] {
  const out = sh('idb', ['ui', 'describe-all', '--udid', udid]);
  try {
    return JSON.parse(out) as Node[];
  } catch {
    return [];
  }
}

const labels = (nodes: Node[]): string[] =>
  nodes.map((n) => (n.AXLabel ?? '').trim()).filter(Boolean);

function tapLabel(udid: string, needle: string): boolean {
  // L'arbre est en espace de contenu scrollable : un element hors viewport
  // (hauteur ecran ~874pt) doit etre ramene a l'ecran avant d'etre tape.
  for (let i = 0; i < 12; i++) {
    const hit = tree(udid).find((n) => (n.AXLabel ?? '').toLowerCase().includes(needle.toLowerCase()));
    if (hit?.frame) {
      const cx = Math.round(hit.frame.x + hit.frame.width / 2);
      const cy = Math.round(hit.frame.y + hit.frame.height / 2);
      // Borne basse a 60 : les boutons de barre superieure sont vers y=86,
      // un seuil plus haut les rendait « introuvables » a tort.
      if (cy > 60 && cy < 780) {
        sh('idb', ['ui', 'tap', '--udid', udid, String(cx), String(cy)]);
        sleep(2500);
        return true;
      }
      const [from, to] = cy >= 780 ? [700, 320] : [320, 700];
      sh('idb', ['ui', 'swipe', '--udid', udid, '--delta', '20', '--duration', '0.25',
        '201', String(from), '201', String(to)]);
      sleep(1200);
      continue;
    }
    sh('idb', ['ui', 'swipe', '--udid', udid, '--delta', '20', '--duration', '0.25',
      '201', '700', '201', '320']);
    sleep(1200);
  }
  return false;
}

/**
 * Ramene l'app a la racine avant chaque etape. Deux pieges : une feuille modale
 * laissee ouverte (paywall) avale les taps, et sur un ecran EMPILE (Defis,
 * Planificateur) la barre d'onglets n'existe pas — taper un onglet n'y fait rien.
 */
function resetToRoot(udid: string): void {
  // 1. refermer une eventuelle feuille modale
  for (let i = 0; i < 2; i++) {
    sh('idb', ['ui', 'swipe', '--udid', udid, '--delta', '20', '--duration', '0.25',
      '201', '300', '201', '850']);
    sleep(900);
  }

  // 2. depiler jusqu'a retrouver la barre d'onglets
  for (let i = 0; i < 4; i++) {
    const nodes = tree(udid);
    if (nodes.some((n) => (n.AXLabel ?? '').includes("Barre d'onglets")
      || (n.AXLabel ?? '').includes('Barre d\u2019onglets'))) return;
    const back = nodes.find((n) => (n.AXLabel ?? '').startsWith('Retour'));
    if (!back?.frame) return;
    sh('idb', ['ui', 'tap', '--udid', udid,
      String(Math.round(back.frame.x + back.frame.width / 2)),
      String(Math.round(back.frame.y + back.frame.height / 2))]);
    sleep(2000);
  }
}

function main(): void {
  const udid = bootedUdid();
  console.log(`🔍 Smoke test iOS — simulateur ${udid}\n`);

  sh('xcrun', ['simctl', 'terminate', udid, BUNDLE_ID]);
  sleep(2000);
  sh('xcrun', ['simctl', 'launch', udid, BUNDLE_ID]);
  sleep(20000);

  // Un arbre d'accessibilite reduit au seul noeud Application signifie qu'une
  // BOITE DE DIALOGUE NATIVE recouvre l'app (invite de notation App Store,
  // permission systeme...) : ses noeuds n'y apparaissent pas. Sans ce
  // diagnostic, chaque etape echoue en annoncant « rien a l'ecran », ce qui
  // laisse croire a une app cassee.
  const initial = tree(udid);
  if (initial.length === 0) {
    console.error("✖ L'app ne repond pas (Metro lance ? bundle installe ?)");
    process.exit(1);
  }
  if (initial.length === 1) {
    console.error(
      "✖ L'app est lancee mais son contenu est inaccessible : une boite de\n" +
        '  dialogue native la recouvre probablement (invite de notation App Store,\n' +
        '  permission systeme). Fermez-la sur le simulateur puis relancez.',
    );
    process.exit(1);
  }

  const failures: string[] = [];

  for (const step of STEPS) {
    resetToRoot(udid);

    let reached = true;
    for (const hop of step.path) {
      if (hop.xy) {
        sh('idb', ['ui', 'tap', '--udid', udid, String(hop.xy[0]), String(hop.xy[1])]);
        sleep(3000);
      } else if (hop.label && !tapLabel(udid, hop.label)) {
        reached = false;
        break;
      }
    }

    const found = labels(tree(udid));
    const problems: string[] = [];

    if (!reached) {
      problems.push('ecran inatteignable');
    } else if (!step.expect.some((e) => found.some((l) => l.includes(e)))) {
      problems.push(`aucun de [${step.expect.join(' | ')}] a l'ecran`);
    }

    for (const rn of RN_ERRORS) {
      if (found.some((l) => l.includes(rn))) problems.push(`erreur RN : ${rn}`);
    }

    for (const l of found) {
      for (const part of l.split(',').map((p) => p.trim())) {
        if (looksLikeRawI18nKey(part)) problems.push(`cle i18n brute : ${part}`);
      }
    }

    if (problems.length === 0) {
      console.log(`✅ ${step.name}`);
    } else {
      console.log(`❌ ${step.name}`);
      for (const p of problems) {
        console.log(`     ${p}`);
        failures.push(`${step.name} — ${p}`);
      }
    }
  }

  console.log('');
  if (failures.length > 0) {
    console.error(`✖ ${failures.length} probleme(s) :`);
    for (const f of failures) console.error(`  · ${f}`);
    process.exit(1);
  }
  console.log(`✅ ${STEPS.length} ecrans OK, aucune erreur RN, aucune cle i18n brute.`);
}

main();
