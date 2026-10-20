export const LimitKind = {
  fileSize: "fileSize",
  batchCount: "batchCount",
  perDay: "perDay",
  perMonth: "perMonth",
  savedItems: "savedItems",
} as const;

export type LimitKind = (typeof LimitKind)[keyof typeof LimitKind];

export const limitKinds: readonly LimitKind[] = [
  LimitKind.fileSize,
  LimitKind.batchCount,
  LimitKind.perDay,
  LimitKind.perMonth,
  LimitKind.savedItems,
];
