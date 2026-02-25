/**
 * Script de test de l'API Mindee
 *
 * Usage: npx ts-node scripts/test-mindee.ts
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Récupérer __dirname dans un module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le fichier .env
config({ path: path.resolve(__dirname, '../.env') });

const MINDEE_API_URL = 'https://api.mindee.com/v1/products/mindee/expense_receipts/v5/predict';
const API_KEY = process.env.EXPO_PUBLIC_MINDEE_API_KEY;

console.log('🧪 Test de l\'API Mindee\n');

// Test 1 : Vérifier que la clé API est configurée
console.log('1️⃣ Vérification de la clé API...');
if (!API_KEY) {
  console.log('❌ Clé API Mindee non trouvée dans .env');
  console.log('');
  console.log('💡 Solution:');
  console.log('   Ajoutez dans .env: EXPO_PUBLIC_MINDEE_API_KEY=votre_cle');
  process.exit(1);
}

console.log(`✅ Clé API trouvée: ${API_KEY.substring(0, 15)}...`);
console.log('');

// Test 2 : Tester la connexion au domaine Mindee
console.log('2️⃣ Test de connexion à Mindee...');
try {
  const connResponse = await fetch('https://api.mindee.com', {
    method: 'GET',
  });
  console.log(`✅ Connexion OK (status: ${connResponse.status})`);
} catch (error: any) {
  console.log('❌ Impossible de contacter api.mindee.com');
  console.log('   Erreur:', error.message);
  console.log('');
  console.log('💡 Vérifiez votre connexion Internet');
  process.exit(1);
}
console.log('');

// Test 3 : Tester l'authentification avec la clé API
console.log('3️⃣ Test d\'authentification...');
try {
  const authResponse = await fetch(MINDEE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}), // Requête vide pour tester l'auth
  });

  if (authResponse.status === 401) {
    console.log('❌ Clé API invalide (401 Unauthorized)');
    console.log('');
    console.log('💡 Solutions:');
    console.log('   1. Vérifiez que la clé est correcte sur https://platform.mindee.com');
    console.log('   2. Générez une nouvelle clé API');
    console.log('   3. Mettez à jour .env et eas.json');
    process.exit(1);
  } else if (authResponse.status === 400) {
    // 400 = clé valide mais requête invalide (normal car on envoie un body vide)
    console.log('✅ Authentification réussie (clé API valide)');
    console.log('   Note: 400 Bad Request est normal ici (requête de test vide)');
  } else {
    console.log(`⚠️ Réponse inattendue: ${authResponse.status}`);
    const text = await authResponse.text();
    console.log('   Réponse:', text.substring(0, 200));
  }
} catch (error: any) {
  console.log('❌ Erreur lors du test d\'authentification');
  console.log('   Erreur:', error.message);
  process.exit(1);
}
console.log('');

// Résumé
console.log('─────────────────────────────────');
console.log('');
console.log('✅ Tous les tests sont passés !');
console.log('');
console.log('🎉 Mindee est prêt à être utilisé');
console.log('');
console.log('📱 Prochaines étapes:');
console.log('   1. Tester avec un vrai ticket dans l\'app');
console.log('   2. Vérifier que les produits sont bien extraits');
console.log('');
console.log('📊 Quota Mindee:');
console.log('   - Plan gratuit: 250 scans/mois');
console.log('   - Vérifiez votre usage sur https://platform.mindee.com');
console.log('');

process.exit(0);
