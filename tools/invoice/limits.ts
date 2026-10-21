export const invoiceLimits = {
  free: { perMonth: 3, savedItems: 0 },
  paid: { savedItems: 100 },
} as const;
