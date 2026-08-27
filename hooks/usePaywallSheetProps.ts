import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getMonthlySavings } from '../services/monthlySavingsService';
import i18n from '../i18n';

type Plan = 'annual' | 'monthly';

/** Formate un montant dans la devise du store, avec la locale de l'app. */
function formatPrice(amount: number, currencyCode?: string): string {
  if (!currencyCode) return amount.toFixed(2);
  try {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

const isAnnualPkg = (pkg: PurchasesPackage): boolean => {
  const id = pkg.identifier.toLowerCase();
  return id.includes('annual') || id.includes('yearly') || id.includes('year');
};

const isMonthlyPkg = (pkg: PurchasesPackage): boolean => {
  const id = pkg.identifier.toLowerCase();
  return id.includes('monthly') || id.includes('month');
};

/**
 * Adapter hook for PaywallSheet. Bridges DS plan-string API to RevenueCat
 * PurchasesPackage API. Returns props ready to spread into PaywallSheet.
 *
 * Filters family packages — solo plans only for PaywallSheet.
 */
export function usePaywallSheetProps() {
  const { packages, purchasePackage, restorePurchases } = useSubscription();
  const [savedThisMonthEUR, setSavedThisMonthEUR] = useState<number | undefined>(undefined);

  const soloPackages = useMemo(
    () => packages.filter((p) => !p.identifier.toLowerCase().includes('family')),
    [packages]
  );

  const annualPkg = useMemo(() => soloPackages.find(isAnnualPkg), [soloPackages]);
  const monthlyPkg = useMemo(() => soloPackages.find(isMonthlyPkg), [soloPackages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const eur = await getMonthlySavings();
        if (!cancelled) setSavedThisMonthEUR(eur);
      } catch {
        // proof point is optional — swallow + leave undefined
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubscribe = useCallback(
    async (plan: Plan) => {
      const pkg = plan === 'annual' ? annualPkg : monthlyPkg;
      if (!pkg) return;
      await purchasePackage(pkg);
    },
    [annualPkg, monthlyPkg, purchasePackage]
  );

  const onRestore = useCallback(() => {
    void restorePurchases();
  }, [restorePurchases]);

  // Le "/mois équivalent" et la remise doivent suivre la devise et le tarif
  // RÉELS du store : les coder en dur ne vaut que pour la boutique française.
  const annualMonthlyLabel = useMemo(() => {
    const product = annualPkg?.product;
    if (!product || !(product.price > 0)) return undefined;
    return `${formatPrice(product.price / 12, product.currencyCode)}/mois`;
  }, [annualPkg]);

  const annualSavingsPercent = useMemo(() => {
    const annual = annualPkg?.product.price;
    const monthly = monthlyPkg?.product.price;
    if (!annual || !monthly || monthly <= 0) return undefined;
    const percent = Math.round((1 - annual / (monthly * 12)) * 100);
    return percent > 0 ? percent : undefined;
  }, [annualPkg, monthlyPkg]);

  return {
    savedThisMonthEUR,
    onSubscribe,
    onRestore,
    annualPriceLabel: annualPkg?.product.priceString,
    monthlyPriceLabel: monthlyPkg?.product.priceString,
    annualMonthlyLabel,
    annualSavingsPercent,
  };
}
