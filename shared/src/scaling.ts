export function scaleToServings(
  amount: number,
  baseServings: number,
  totalServings: number,
): number {
  return (amount * totalServings) / baseServings;
}
