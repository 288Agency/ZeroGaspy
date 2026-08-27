/**
 * Predicats partages sur les aliments.
 *
 * Un aliment consomme ou jete reste stocke dans sa liste : les statistiques,
 * le recap hebdo et l'export en dependent. Tout ce qui compte ou affiche
 * « ce qu'il y a dans le frigo » doit donc filtrer sur le statut.
 *
 * Ce predicat etait reecrit a l'identique dans une quinzaine de fichiers, et
 * `ListsScreen` avait fini par l'oublier : il annoncait « 1 aliment » sur une
 * liste que l'inventaire affichait vide. D'ou ce point unique.
 */

import type { FoodItem, List } from '../types';

/** Vrai tant que l'aliment est encore dans le frigo (ni consomme, ni jete). */
export function isActiveItem(item: FoodItem): boolean {
  return item.status !== 'consumed' && item.status !== 'thrown';
}

/** Les aliments encore presents, dans leur ordre d'origine. */
export function getActiveItems(items: FoodItem[]): FoodItem[] {
  return items.filter(isActiveItem);
}

/** Nombre d'aliments encore presents dans une liste. */
export function countActiveItems(list: Pick<List, 'items'>): number {
  return list.items.reduce((total, item) => (isActiveItem(item) ? total + 1 : total), 0);
}
