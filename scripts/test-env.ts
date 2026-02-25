/**
 * Script de test des variables d'environnement
 *
 * Usage: npx ts-node scripts/test-env.ts
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Récupérer __dirname dans un module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le fichier .env
config({ path: path.resolve(__dirname, '../.env') });

interface TestResult {
  name: string;
  value: string | undefined;
  status: 'OK' | 'MISSING' | 'WARNING';
  message?: string;
}

const results: TestResult[] = [];

// Tester les variables critiques
function testVar(name: string, envKey: string, required: boolean = true): void {
  const value = process.env[envKey];

  if (!value) {
    results.push({
      name,
      value,
      status: required ? 'MISSING' : 'WARNING',
      message: required ? 'Variable requise manquante' : 'Variable optionnelle non définie',
    });
  } else {
    results.push({
      name,
      value: value.substring(0, 20) + '...',
      status: 'OK',
    });
  }
}

console.log('🔍 Test des variables d\'environnement\n');

// Variables critiques
testVar('Supabase URL', 'EXPO_PUBLIC_SUPABASE_URL', true);
testVar('Supabase Anon Key', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', true);

// Variables API
testVar('Google Vision API', 'EXPO_PUBLIC_GOOGLE_VISION_API_KEY', false);
testVar('Mindee API', 'EXPO_PUBLIC_MINDEE_API_KEY', false);

// Autres
testVar('Feedback Email', 'EXPO_PUBLIC_FEEDBACK_EMAIL', false);

// Afficher les résultats
console.log('📊 Résultats:\n');

let hasErrors = false;
let hasWarnings = false;

results.forEach(result => {
  let icon = '✅';
  if (result.status === 'MISSING') {
    icon = '❌';
    hasErrors = true;
  } else if (result.status === 'WARNING') {
    icon = '⚠️';
    hasWarnings = true;
  }

  console.log(`${icon} ${result.name}: ${result.status}`);
  if (result.message) {
    console.log(`   ${result.message}`);
  }
  if (result.value && result.status === 'OK') {
    console.log(`   ${result.value}`);
  }
  console.log('');
});

// Conclusion
console.log('─────────────────────────────────\n');

if (hasErrors) {
  console.log('❌ Des variables critiques sont manquantes !');
  console.log('');
  console.log('💡 Actions à faire:');
  console.log('   1. Créer/vérifier le fichier .env à la racine du projet');
  console.log('   2. Copier les variables depuis env.example');
  console.log('   3. Vérifier que eas.json contient les mêmes variables dans "production.env"');
  console.log('');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️ Configuration partielle - certaines fonctionnalités peuvent ne pas marcher');
  process.exit(0);
} else {
  console.log('✅ Toutes les variables sont configurées correctement !');
  console.log('');
  console.log('📦 Vous pouvez maintenant builder:');
  console.log('   eas build --profile production --platform ios');
  console.log('   eas build --profile production --platform android');
  console.log('');
  process.exit(0);
}
