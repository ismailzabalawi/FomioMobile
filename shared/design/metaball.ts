// Worklet-friendly metaball helper for fluid bridges
export function metaballPath(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  stretchLimit: number
): string {
  'worklet';
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d === 0 || d > stretchLimit) return '';

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const u1 = angle + Math.PI / 2;
  const u2 = angle - Math.PI / 2;

  const p1x = x1 + r1 * Math.cos(u1);
  const p1y = y1 + r1 * Math.sin(u1);
  const p2x = x1 + r1 * Math.cos(u2);
  const p2y = y1 + r1 * Math.sin(u2);

  const p3x = x2 + r2 * Math.cos(u1);
  const p3y = y2 + r2 * Math.sin(u1);
  const p4x = x2 + r2 * Math.cos(u2);
  const p4y = y2 + r2 * Math.sin(u2);

  const spread = Math.min(d * 0.2, (r1 + r2) * 0.6);

  return `
    M ${p1x} ${p1y}
    C ${p1x + spread} ${p1y} ${p3x - spread} ${p3y} ${p3x} ${p3y}
    L ${p4x} ${p4y}
    C ${p4x - spread} ${p4y} ${p2x + spread} ${p2y} ${p2x} ${p2y}
    Z
  `;
}
