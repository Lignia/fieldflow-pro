export const toTitleCase = (str: string): string =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const getInitials = (name: string): string => {
  const clean = toTitleCase(name);
  const parts = clean.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

export function formatCurrency(amount: number): string {
  return (
    amount.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}
