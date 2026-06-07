/**
 * Plan price formatting helpers (INR)
 */

export const formatPlanPrice = (monthlyCost: number | string | null | undefined): string => {
  const amount = Number(monthlyCost ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Free';
  }
  return `₹${amount.toLocaleString('en-IN')}/mo`;
};

export const parsePlanCost = (monthlyCost: number | string | null | undefined): number => {
  const amount = Number(monthlyCost ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};
