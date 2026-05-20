import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getMonthlySavings } from '../services/monthlySavingsService';

type Plan = 'annual' | 'monthly';

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

  return {
    savedThisMonthEUR,
    onSubscribe,
    onRestore,
    annualPriceLabel: annualPkg?.product.priceString,
    monthlyPriceLabel: monthlyPkg?.product.priceString,
  };
}
