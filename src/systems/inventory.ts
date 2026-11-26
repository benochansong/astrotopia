import { items, type ItemId } from "../data/content";
export const STACK_LIMIT = 99;
export const INVENTORY_SIZE = 24;
export type Inventory = Partial<Record<ItemId, number>>;
export const occupiedSlots = (inventory: Inventory) =>
  Object.values(inventory).reduce(
    (a, n) => a + Math.ceil((n ?? 0) / STACK_LIMIT),
    0,
  );
export function addItem(
  inventory: Inventory,
  id: ItemId,
  count: number,
  capacity = INVENTORY_SIZE,
): boolean {
  if (!Object.hasOwn(items, id) || !Number.isInteger(count) || count < 1)
    return false;
  const next = { ...inventory, [id]: (inventory[id] ?? 0) + count };
  if (occupiedSlots(next) > capacity) return false;
  inventory[id] = next[id];
  return true;
}
export function inventorySlots(
  inventory: Inventory,
): { id: ItemId; count: number }[] {
  return Object.entries(inventory).flatMap(([id, n]) =>
    Array.from({ length: Math.ceil((n ?? 0) / STACK_LIMIT) }, (_, i) => ({
      id: id as ItemId,
      count: Math.min(STACK_LIMIT, (n ?? 0) - i * STACK_LIMIT),
    })),
  );
}
