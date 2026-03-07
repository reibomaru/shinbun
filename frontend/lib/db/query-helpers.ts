/**
 * Pure helper functions extracted from queries.ts for testability.
 */

/**
 * Build Prisma-compatible orderBy array from an object.
 * Each key-value pair becomes a separate object in the array,
 * with a fallback `{ createdAt: "desc" }` appended.
 */
export function buildOrderByArray(orderBy: object): object[] {
  if (Object.keys(orderBy).length > 0) {
    return [
      ...Object.entries(orderBy).map(([k, v]) => ({ [k]: v })),
      { createdAt: "desc" as const },
    ];
  }
  return [{ createdAt: "desc" as const }];
}

/**
 * Scale a 0-1 importance score to 0-100 integer, clamped to [0, 100].
 */
export function scaleImportanceScore(value: number | null | undefined): number {
  const scaled = Math.round((value ?? 0) * 100);
  return Math.max(0, Math.min(100, scaled));
}
