/**
 * Verifie l'authentification des Edge Functions.
 *
 * Contexte : le projet signe les jetons utilisateur en ES256, algorithme que la
 * passerelle Edge Functions ne sait pas verifier. Toute fonction laissee en
 * `verify_jwt = true` renvoie donc 401 avant meme de s'executer — 8 fonctions
 * sur 9 etaient dans ce cas, dont `delete-user` (exigence Apple) et le cron des
 * notifications push, casse silencieusement depuis mars 2026.
 *
 * La parade retenue : chaque fonction porte sa propre authentification et sort
 * de `verify_jwt`. Ce script verrouille les DEUX moities de cet invariant, en
 * appelant chaque fonction SANS en-tete Authorization :
 *
 *   - la passerelle ne doit PAS repondre a sa place  → pas de code UNAUTHORIZED_*
 *   - la fonction doit tout de meme REFUSER l'appel  → 401 avec son propre message
 *
 * Aucun credential requis, aucun effet de bord : tout est refuse.
 *
 * Usage: npx ts-node scripts/check-edge-functions.ts
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Codes emis par la PASSERELLE : leur presence prouve qu'elle a intercepte. */
const GATEWAY_CODES = [
  'UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM',
  'UNAUTHORIZED_NO_AUTH_HEADER',
  'UNAUTHORIZED_INVALID_TOKEN',
];

type Guard = 'self' | 'gateway';

interface Check {
  slug: string;
  /** 'self' : la fonction s'authentifie seule. 'gateway' : verify_jwt volontairement laisse a true. */
  guard: Guard;
  why: string;
}

const CHECKS: Check[] = [
  { slug: 'delete-user', guard: 'self', why: 'auth.getUser + userId == user.id' },
  { slug: 'validate-scan-credit', guard: 'self', why: 'auth.getUser avant decompte de credit' },
  { slug: 'generate-ai-recipe', guard: 'self', why: 'auth.getUser avant appel IA' },
  { slug: 'grant-referral-premium', guard: 'self', why: 'auth.getUser avant octroi premium' },
  { slug: 'ocr-scan', guard: 'self', why: 'auth.getUser avant consommation de credit OCR' },
  { slug: 'send-push-notifications', guard: 'self', why: 'secret partage x-cron-secret' },
  { slug: 'feedback', guard: 'gateway', why: 'appelee avec la cle anon (HS256)' },
];

function env(): { url: string; anon: string } {
  // .env du projet est en CRLF : le nettoyer avant de parser.
  const raw = readFileSync(path.join(ROOT, '.env'), 'utf8').replace(/\r/g, '');
  const vars: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  const url = vars.EXPO_PUBLIC_SUPABASE_URL;
  const anon = vars.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('✖ EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY absents de .env');
    process.exit(1);
  }
  return { url, anon };
}

async function main(): Promise<void> {
  const { url, anon } = env();
  console.log('🔍 Authentification des Edge Functions\n');

  const failures: string[] = [];

  for (const check of CHECKS) {
    let status = 0;
    let body = '';
    try {
      // apikey seule, volontairement SANS en-tete Authorization.
      const res = await fetch(`${url}/functions/v1/${check.slug}`, {
        method: 'POST',
        headers: { apikey: anon, 'Content-Type': 'application/json' },
        body: '{}',
      });
      status = res.status;
      body = (await res.text()).slice(0, 300);
    } catch (err) {
      failures.push(`${check.slug} — injoignable : ${(err as Error).message}`);
      console.log(`❌ ${check.slug} — injoignable`);
      continue;
    }

    const fromGateway = GATEWAY_CODES.some((c) => body.includes(c));
    const problems: string[] = [];

    if (check.guard === 'self') {
      if (fromGateway) {
        problems.push(
          'la passerelle intercepte encore (verify_jwt still true ?) — ' +
            'les jetons ES256 seront rejetes avant la fonction',
        );
      } else if (status !== 401) {
        problems.push(
          `attendu 401 emis par la fonction, recu ${status} — ` +
            'un appel non authentifie ne doit jamais aboutir',
        );
      }
    } else if (!fromGateway) {
      problems.push(`verify_jwt semble desactive alors que ${check.why}`);
    }

    if (problems.length === 0) {
      const by = check.guard === 'self' ? 'refus par la fonction' : 'refus par la passerelle';
      console.log(`✅ ${check.slug.padEnd(26)} ${by} (${check.why})`);
    } else {
      console.log(`❌ ${check.slug.padEnd(26)} ${problems.join(' | ')}`);
      for (const p of problems) failures.push(`${check.slug} — ${p}`);
    }
  }

  console.log('');
  if (failures.length > 0) {
    console.error(`✖ ${failures.length} probleme(s) :`);
    for (const f of failures) console.error(`  · ${f}`);
    process.exit(1);
  }
  console.log(`✅ ${CHECKS.length} fonctions : authentification conforme.`);
}

main();
