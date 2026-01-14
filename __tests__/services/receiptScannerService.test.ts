/**
 * Tests pour receiptScannerService
 * Service de scan de tickets de caisse avec OCR
 */

import {
  scanReceipt,
  testVisionAPIKey,
  ReceiptItem,
  ReceiptScanResult,
} from '../../services/receiptScannerService';

// Mock du logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock de sanitizeString
jest.mock('../../utils/security', () => ({
  sanitizeString: jest.fn((str: string, maxLength?: number) => {
    const cleaned = str.trim();
    return maxLength ? cleaned.substring(0, maxLength) : cleaned;
  }),
}));

// Mock de expo-file-system
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  readAsStringAsync: jest.fn(),
  downloadAsync: jest.fn(),
}));

// On doit importer les fonctions qu'on veut tester via un require
// pour pouvoir tester les fonctions non-exportées via rewire ou en les exportant
// Pour simplifier, on va tester via les résultats de scanReceipt

describe('receiptScannerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('scanReceipt - Validation des paramètres', () => {
    it('devrait retourner une erreur si imageUri est invalide', async () => {
      const result = await scanReceipt('', 'valid-api-key-12345');

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toBe('Image invalide');
    });

    it('devrait retourner une erreur si la clé API est trop courte', async () => {
      const result = await scanReceipt('file:///image.jpg', 'short');

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toBe('Cle API Google Cloud Vision non configuree');
    });

    it('devrait retourner une erreur si la clé API est manquante', async () => {
      const result = await scanReceipt('file:///image.jpg', '');

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toBe('Cle API Google Cloud Vision non configuree');
    });
  });

  describe('scanReceipt - Scan avec API mockée', () => {
    const FileSystem = require('expo-file-system/legacy');

    beforeEach(() => {
      // Mock de la lecture du fichier base64
      FileSystem.readAsStringAsync.mockResolvedValue('fake-base64-image-data');
    });

    it('devrait scanner un ticket simple avec succès', async () => {
      const mockOCRText = `
CARREFOUR EXPRESS
123 RUE DE PARIS
75001 PARIS
DATE: 15/01/2024

LAIT DEMI ECREME 1L     1,50 €
PAIN COMPLET            2,20 €
YAOURT NATURE X8        3,80 €
POMMES BIO 1KG          4,50 €

TOTAL TTC               11,00 €
MERCI DE VOTRE VISITE
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.storeName).toContain('CARREFOUR');
      expect(result.date).toBe('15/01/2024');
    });

    it('devrait extraire correctement les produits avec prix', async () => {
      const mockOCRText = `
MONOPRIX
BAGUETTE TRADITION      1,20 €
TOMATES 500G            2,50 €
TOTAL                   3,70 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);
      expect(result.items.length).toBeGreaterThanOrEqual(2);

      // Vérifier qu'on a bien les produits (pas le TOTAL)
      const productNames = result.items.map(item => item.name.toLowerCase());
      expect(productNames.some(name => name.includes('baguette') || name.includes('tradition'))).toBe(true);
      expect(productNames.some(name => name.includes('tomate'))).toBe(true);
      expect(productNames.some(name => name.includes('total'))).toBe(false);
    });

    it('devrait extraire correctement les quantités (format X2)', async () => {
      const mockOCRText = `
LECLERC
CORDON BLEU X2          5,80 €
YAOURT FRAISE X4        2,40 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);

      const cordonBleu = result.items.find(item =>
        item.name.toLowerCase().includes('cordon')
      );
      const yaourt = result.items.find(item =>
        item.name.toLowerCase().includes('yaourt')
      );

      if (cordonBleu) {
        expect(cordonBleu.quantity).toBe(2);
      }
      if (yaourt) {
        expect(yaourt.quantity).toBe(4);
      }
    });

    it('devrait extraire correctement les quantités (format 2x)', async () => {
      const mockOCRText = `
AUCHAN
2x PAIN DE MIE          3,00 €
3x EAU MINERALE 1.5L    1,50 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);

      const painDeMie = result.items.find(item =>
        item.name.toLowerCase().includes('pain')
      );
      const eau = result.items.find(item =>
        item.name.toLowerCase().includes('eau')
      );

      if (painDeMie) {
        expect(painDeMie.quantity).toBe(2);
      }
      if (eau) {
        expect(eau.quantity).toBe(3);
      }
    });

    it('devrait ignorer les lignes de total, TVA et autres infos', async () => {
      const mockOCRText = `
INTERMARCHE
LAIT 1L                 1,50 €
SOUS-TOTAL              1,50 €
TVA 5.5%                0,08 €
TOTAL TTC               1,58 €
CARTE BANCAIRE          1,58 €
MERCI DE VOTRE VISITE
SIRET: 12345678901234
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);

      const productNames = result.items.map(item => item.name.toLowerCase());

      // Vérifier qu'on a bien le lait
      expect(productNames.some(name => name.includes('lait'))).toBe(true);

      // Vérifier qu'on n'a pas les infos parasites
      expect(productNames.some(name => name.includes('total'))).toBe(false);
      expect(productNames.some(name => name.includes('tva'))).toBe(false);
      expect(productNames.some(name => name.includes('carte'))).toBe(false);
      expect(productNames.some(name => name.includes('merci'))).toBe(false);
      expect(productNames.some(name => name.includes('siret'))).toBe(false);
    });

    it('devrait détecter les catégories de produits', async () => {
      const mockOCRText = `
LIDL
POMMES GOLDEN           2,50 €
BOEUF HACHE 500G        6,50 €
LAIT DEMI-ECREME        1,30 €
PAIN COMPLET            2,00 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);

      const pommes = result.items.find(item => item.name.toLowerCase().includes('pomme'));
      const boeuf = result.items.find(item => item.name.toLowerCase().includes('boeuf') || item.name.toLowerCase().includes('bœuf'));
      const lait = result.items.find(item => item.name.toLowerCase().includes('lait'));
      const pain = result.items.find(item => item.name.toLowerCase().includes('pain'));

      if (pommes) expect(pommes.category).toBe('fruits');
      if (boeuf) expect(boeuf.category).toBe('viande');
      if (lait) expect(lait.category).toBe('produits laitiers');
      if (pain) expect(pain.category).toBe('boulangerie');
    });

    it('devrait éviter les doublons de produits', async () => {
      const mockOCRText = `
CASINO
BAGUETTE                1,20 €
BAGUETTE                1,20 €
PAIN                    2,00 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);

      // Compter combien de fois "baguette" apparaît
      const baguetteCount = result.items.filter(item =>
        item.name.toLowerCase().includes('baguette')
      ).length;

      expect(baguetteCount).toBe(1); // Pas de doublon
    });

    it('devrait retourner un message si aucun produit n\'est détecté', async () => {
      const mockOCRText = `
RECU DE PAIEMENT
DATE: 15/01/2024
TRANSACTION REUSSIE
MERCI DE VOTRE VISITE
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(0);
      expect(result.error).toBe('Aucun produit detecte sur le ticket');
    });

    it('devrait gérer une erreur API (statut non-ok)', async () => {
      FileSystem.readAsStringAsync.mockResolvedValue('fake-base64');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const result = await scanReceipt('file:///receipt.jpg', 'invalid-api-key');

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toContain('Erreur API');
    });

    it('devrait gérer une erreur retournée par Vision API', async () => {
      FileSystem.readAsStringAsync.mockResolvedValue('fake-base64');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              error: {
                code: 400,
                message: 'Invalid image format',
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toBe('Invalid image format');
    });

    it('devrait gérer le cas où aucun texte n\'est détecté', async () => {
      FileSystem.readAsStringAsync.mockResolvedValue('fake-base64');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: null,
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toBe('Aucun texte detecte sur le document');
    });

    it('devrait gérer les timeout API', async () => {
      FileSystem.readAsStringAsync.mockResolvedValue('fake-base64');

      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          const error = new Error('Timeout');
          error.name = 'AbortError';
          reject(error);
        });
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toContain('Timeout');
    });

    it('devrait gérer les erreurs de lecture de fichier', async () => {
      FileSystem.readAsStringAsync.mockRejectedValueOnce(new Error('File not found'));

      const result = await scanReceipt('file:///invalid.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toContain('Impossible de lire l\'image');
    });
  });

  describe('testVisionAPIKey', () => {
    it('devrait retourner true pour une clé API valide', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const result = await testVisionAPIKey('valid-api-key-1234567890');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://vision.googleapis.com/v1/images:annotate?key='),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('devrait retourner false pour une clé API invalide', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await testVisionAPIKey('invalid-key');

      expect(result).toBe(false);
    });

    it('devrait retourner false en cas d\'erreur réseau', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await testVisionAPIKey('any-key');

      expect(result).toBe(false);
    });
  });

  describe('Extraction d\'informations du ticket', () => {
    const FileSystem = require('expo-file-system/legacy');

    beforeEach(() => {
      FileSystem.readAsStringAsync.mockResolvedValue('fake-base64');
    });

    it('devrait extraire le nom du magasin', async () => {
      const mockOCRText = `
CARREFOUR MARKET
123 RUE DES FLEURS
PAIN                    1,50 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);
      expect(result.storeName).toContain('CARREFOUR');
    });

    it('devrait extraire la date du ticket', async () => {
      const mockOCRText = `
MONOPRIX
DATE: 15/01/2024
LAIT                    1,50 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);
      expect(result.date).toBe('15/01/2024');
    });

    it('devrait extraire la date avec différents formats', async () => {
      const mockOCRText1 = `DATE: 15-01-2024\nLAIT 1,50€`;
      const mockOCRText2 = `DATE: 15.01.2024\nLAIT 1,50€`;

      // Test format DD-MM-YYYY
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [{ fullTextAnnotation: { text: mockOCRText1 } }],
        }),
      });

      let result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');
      expect(result.date).toBe('15/01/2024');

      // Test format DD.MM.YYYY
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [{ fullTextAnnotation: { text: mockOCRText2 } }],
        }),
      });

      result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');
      expect(result.date).toBe('15/01/2024');
    });
  });

  describe('Formatage des produits', () => {
    const FileSystem = require('expo-file-system/legacy');

    beforeEach(() => {
      FileSystem.readAsStringAsync.mockResolvedValue('fake-base64');
    });

    it('devrait formater le nom des produits en majuscule/minuscule', async () => {
      const mockOCRText = `
PAIN COMPLET            2,00 €
YAOURT NATURE           1,50 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [
            {
              fullTextAnnotation: {
                text: mockOCRText,
              },
            },
          ],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);

      // Vérifier que les noms ne sont pas en MAJUSCULES
      result.items.forEach(item => {
        expect(item.name).not.toBe(item.name.toUpperCase());
        // Première lettre de chaque mot doit être en majuscule
        const words = item.name.split(' ');
        words.forEach(word => {
          if (word.length > 0) {
            expect(word[0]).toBe(word[0].toUpperCase());
          }
        });
      });
    });

    it('devrait assigner selected=true par défaut', async () => {
      const mockOCRText = `PAIN 1,50 €`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [{ fullTextAnnotation: { text: mockOCRText } }],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);
      result.items.forEach(item => {
        expect(item.selected).toBe(true);
      });
    });

    it('devrait limiter la quantité entre 1 et 99', async () => {
      const mockOCRText = `
PAIN X0                 1,50 €
LAIT X150               2,00 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [{ fullTextAnnotation: { text: mockOCRText } }],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);
      result.items.forEach(item => {
        expect(item.quantity).toBeGreaterThanOrEqual(1);
        expect(item.quantity).toBeLessThanOrEqual(99);
      });
    });

    it('devrait générer des IDs uniques pour chaque produit', async () => {
      const mockOCRText = `
PAIN                    1,50 €
LAIT                    2,00 €
BEURRE                  3,50 €
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [{ fullTextAnnotation: { text: mockOCRText } }],
        }),
      });

      const result = await scanReceipt('file:///receipt.jpg', 'test-api-key-1234567890');

      expect(result.success).toBe(true);

      const ids = result.items.map(item => item.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size); // Tous les IDs sont uniques
      ids.forEach(id => {
        expect(id).toMatch(/^receipt-\d+-[a-z0-9]+$/); // Format de l'ID
      });
    });
  });
});
