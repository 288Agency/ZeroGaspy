// ============================================
// FIRST CAPTURE FLOW
// Première prise en main, déclenchée depuis l'onboarding : l'utilisateur scanne
// son ticket de courses et l'app est pleine avant la fin de la première minute.
// Sans ça, l'onboarding débouche sur un accueil à 0 € / 0 aliment, qui est le
// point de churn le plus probable du produit.
//
// Crée l'espace par défaut si l'utilisateur n'en a aucun (cas du nouveau venu).
//
// Volontairement SANS gating premium : le premier scan est toujours offert.
// Le quota (canScanReceipt) ne s'applique qu'aux scans lancés depuis
// l'inventaire — cf. handleOpenReceiptScan dans screens/InventoryListScreen.
// ============================================

import React, { useCallback, useEffect, useRef, useState } from 'react';

import ReceiptScannerModal from '../ReceiptScannerModal';
import ReceiptReviewModal from '../ReceiptReviewModal';
import { ensureDefaultList, addItemToList } from '../../utils/localStorage';
import { trackFoodAdded } from '../../services/analytics';
import { useGamification } from '../../contexts/GamificationContext';
import type { ReceiptScanResult, ReceiptItem } from '../../services/mindeeReceiptService';
import type { FoodItem } from '../../types';
import logger from '../../utils/logger';

export interface FirstCaptureFlowProps {
  /** Passe à true pour ouvrir le scanner de ticket */
  visible: boolean;
  /**
   * Appelé exactement une fois par ouverture, que l'utilisateur ait ajouté des
   * articles ou abandonné. `itemsAdded` vaut 0 en cas d'abandon.
   */
  onDone: (itemsAdded: number) => void;
}

export default function FirstCaptureFlow({ visible, onDone }: FirstCaptureFlowProps) {
  const { trackFoodAdded: trackFoodAddedXp } = useGamification();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [scannedItems, setScannedItems] = useState<ReceiptItem[]>([]);
  const [storeName, setStoreName] = useState<string | undefined>();
  const [receiptDate, setReceiptDate] = useState<string | undefined>();

  // Garde-fou : onDone ne doit partir qu'une fois par ouverture, sinon
  // l'onboarding avancerait de deux étapes d'un coup.
  const settled = useRef(false);

  useEffect(() => {
    if (visible) {
      settled.current = false;
      setScannerVisible(true);
    } else {
      setScannerVisible(false);
      setReviewVisible(false);
      setScannedItems([]);
    }
  }, [visible]);

  const finish = useCallback(
    (itemsAdded: number) => {
      if (settled.current) return;
      settled.current = true;
      setScannerVisible(false);
      setReviewVisible(false);
      setScannedItems([]);
      onDone(itemsAdded);
    },
    [onDone],
  );

  const handleScanComplete = useCallback((result: ReceiptScanResult) => {
    setScannedItems(result.items);
    setStoreName(result.storeName);
    setReceiptDate(result.date);
    setScannerVisible(false);
    setReviewVisible(true);
  }, []);

  const handleConfirm = useCallback(
    async (items: ReceiptItem[]) => {
      let added = 0;
      try {
        const list = await ensureDefaultList();
        const listId = list.id;
        for (const it of items) {
          const newItem: FoodItem = {
            id: it.id,
            name: it.name,
            quantity: it.quantity,
            category: it.category,
            expirationDate: it.expirationDate || '',
            status: 'active',
            price: it.price,
          };
          await addItemToList(listId, newItem);
          added += 1;
          trackFoodAddedXp(listId);
          trackFoodAdded({
            category: it.category,
            hasExpiryDate: Boolean(newItem.expirationDate),
            hasPrice: it.price != null,
            source: 'receipt_onboarding',
          });
        }
      } catch (err) {
        logger.error('[FirstCapture] ajout des articles du ticket échoué:', err);
      }
      finish(added);
    },
    [finish, trackFoodAddedXp],
  );

  return (
    <>
      <ReceiptScannerModal
        visible={scannerVisible}
        onClose={() => finish(0)}
        onScanComplete={handleScanComplete}
      />
      <ReceiptReviewModal
        visible={reviewVisible}
        items={scannedItems}
        storeName={storeName}
        date={receiptDate}
        onClose={() => finish(0)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
