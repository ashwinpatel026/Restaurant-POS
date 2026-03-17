export function formatDecimal(value: string | number, decimals = 2): string {
  if (value === null || value === undefined) return "";
  const num =
    typeof value === "number"
      ? value
      : Number(
          String(value)
            .replace(/,/g, "")
            .trim(),
        );
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(decimals);
}

