/**
 * Fluid Dynamics Engine (Worklet-safe)
 * 
 * Implements physics-based liquid bridge calculations for fluid navigation animations.
 * Based on:
 * - Young-Laplace: Δp = γκ (pressure jump via curvature)
 * - Rayleigh-Plateau instability: λ > 2πr causes necking & pinch-off
 * - Capillary coalescence: Bridge growth via surface tension
 * 
 * All functions are worklet-safe for use with react-native-reanimated.
 */

import { interpolate, Extrapolate } from 'react-native-reanimated';

/**
 * Computes dynamic neck radius based on Rayleigh-Plateau instability
 * r_min ~ (μ²/ργ)^(1/3) * (t_p - t)^(2/3) (self-similar scaling)
 * Simplified: As distance increases, neck radius decreases non-linearly
 * 
 * @param baseRadius - Base radius of the circle
 * @param distance - Current distance between circles
 * @param maxStretch - Maximum stretch before pinch-off
 * @returns Computed neck radius
 */
export function computeNeckRadius(
  baseRadius: number,
  distance: number,
  maxStretch: number
): number {
  'worklet';
  // Normalized stretch ratio (0 = touching, 1 = max stretch)
  const stretchRatio = Math.min(distance / maxStretch, 1);
  
  // Non-linear necking: r_neck = r_base * (1 - stretchRatio)^(2/3)
  // This mimics the self-similar pinch-off behavior
  const neckFactor = Math.pow(1 - stretchRatio, 0.667);
  
  // Minimum neck radius before complete pinch-off (prevents visual artifacts)
  const minNeck = baseRadius * 0.08;
  return Math.max(baseRadius * neckFactor, minNeck);
}

/**
 * Computes curvature-based spread for Bezier control points
 * Based on Young-Laplace: κ = Δp/γ where higher curvature = tighter neck
 * Surface tension tries to minimize surface area, creating the "hourglass" shape
 * 
 * @param distance - Current distance between circles
 * @param maxStretch - Maximum stretch before pinch-off
 * @param neckRadius - Current neck radius
 * @param baseRadius - Base radius of the circle
 * @returns Spread factor for Bezier control points
 */
export function computeCurvatureSpread(
  distance: number,
  maxStretch: number,
  neckRadius: number,
  baseRadius: number
): number {
  'worklet';
  // As bridge stretches, curvature increases (inversely proportional to neck radius)
  // High curvature = inward pull = smaller spread
  const curvature = baseRadius / Math.max(neckRadius, 0.1);
  
  // Spread factor: starts wide (0.5), narrows with stretch and curvature
  // This creates the characteristic hourglass meniscus shape
  const baseSpread = 0.5;
  const stretchPenalty = interpolate(
    distance,
    [0, maxStretch * 0.5, maxStretch],
    [0, 0.2, 0.4],
    Extrapolate.CLAMP
  );
  
  // Surface tension effect: higher curvature pulls inward
  const curvatureEffect = Math.min(curvature * 0.05, 0.25);
  
  return Math.max(baseSpread - stretchPenalty - curvatureEffect, 0.05);
}

/**
 * Metaball-style liquid bridge with physics-based necking
 * Simulates capillary coalescence (merging) and Rayleigh-Plateau pinch-off (detaching)
 * 
 * @param x1, y1, r1 - First circle (anchor point)
 * @param x2, y2, r2 - Second circle (moving point)
 * @param stretchLimit - Max distance before bridge ruptures (pinch-off)
 * @returns SVG path string for the liquid bridge
 */
export function getMetaballPath(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  stretchLimit: number
): string {
  'worklet';
  
  // Calculate Euclidean distance between centers
  const distance = Math.hypot(x2 - x1, y2 - y1);
  
  // Rayleigh-Plateau instability: Bridge ruptures when stretched too far
  // λ > 2πr perturbations grow exponentially, causing pinch-off
  if (distance === 0 || distance > stretchLimit) {
    return '';
  }
  
  // Compute dynamic neck radii based on non-linear scaling
  const effectiveR1 = computeNeckRadius(r1, distance, stretchLimit);
  const effectiveR2 = computeNeckRadius(r2, distance, stretchLimit);
  
  // Direction angle from circle 1 to circle 2
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpAnglePos = angle + Math.PI / 2;
  const perpAngleNeg = angle - Math.PI / 2;
  
  // Tangent points on first circle (with dynamic radius for necking)
  const p1x = x1 + effectiveR1 * Math.cos(perpAnglePos);
  const p1y = y1 + effectiveR1 * Math.sin(perpAnglePos);
  const p2x = x1 + effectiveR1 * Math.cos(perpAngleNeg);
  const p2y = y1 + effectiveR1 * Math.sin(perpAngleNeg);
  
  // Tangent points on second circle
  const p3x = x2 + effectiveR2 * Math.cos(perpAnglePos);
  const p3y = y2 + effectiveR2 * Math.sin(perpAnglePos);
  const p4x = x2 + effectiveR2 * Math.cos(perpAngleNeg);
  const p4y = y2 + effectiveR2 * Math.sin(perpAngleNeg);
  
  // Compute curvature-based spread for the meniscus
  const avgRadius = (r1 + r2) / 2;
  const spread = computeCurvatureSpread(distance, stretchLimit, (effectiveR1 + effectiveR2) / 2, avgRadius);
  
  // Midpoint for control point calculation (center of liquid bridge)
  const mx = x1 + (x2 - x1) * 0.5;
  const my = y1 + (y2 - y1) * 0.5;
  
  // Neck midpoint: The narrowest part of the bridge
  // Compute neck radius at midpoint for the hourglass effect
  const midNeckRadius = computeNeckRadius(avgRadius, distance, stretchLimit) * 0.6;
  
  // Control points create the inward curve (surface tension minimizing area)
  // Perpendicular offset creates the characteristic liquid bridge shape
  const perpDx = (y2 - y1);
  const perpDy = (x1 - x2);
  const perpLen = Math.hypot(perpDx, perpDy);
  const normPerpDx = perpLen > 0 ? perpDx / perpLen : 0;
  const normPerpDy = perpLen > 0 ? perpDy / perpLen : 0;
  
  // Neck inset based on surface tension (Young-Laplace curvature effect)
  const neckInset = (avgRadius - midNeckRadius) * (1 + spread);
  
  // Control points for cubic Bezier curves (creating smooth meniscus)
  const ctrl1x = mx + normPerpDx * neckInset;
  const ctrl1y = my + normPerpDy * neckInset;
  const ctrl2x = mx - normPerpDx * neckInset;
  const ctrl2y = my - normPerpDy * neckInset;
  
  // Additional control points for smoother cubic curves
  const t = 0.33; // Position along the bridge for intermediate controls
  const mid1x = x1 + (x2 - x1) * t;
  const mid1y = y1 + (y2 - y1) * t;
  const mid2x = x1 + (x2 - x1) * (1 - t);
  const mid2y = y1 + (y2 - y1) * (1 - t);
  
  // Build the liquid bridge path using cubic Bezier curves
  // This creates a smooth, physically-plausible meniscus shape
  return `
    M ${p1x} ${p1y}
    C ${mid1x + normPerpDx * neckInset * 0.7} ${mid1y + normPerpDy * neckInset * 0.7}
      ${ctrl1x} ${ctrl1y}
      ${mx + normPerpDx * midNeckRadius} ${my + normPerpDy * midNeckRadius}
    C ${ctrl1x} ${ctrl1y}
      ${mid2x + normPerpDx * neckInset * 0.7} ${mid2y + normPerpDy * neckInset * 0.7}
      ${p3x} ${p3y}
    L ${p4x} ${p4y}
    C ${mid2x - normPerpDx * neckInset * 0.7} ${mid2y - normPerpDy * neckInset * 0.7}
      ${ctrl2x} ${ctrl2y}
      ${mx - normPerpDx * midNeckRadius} ${my - normPerpDy * midNeckRadius}
    C ${ctrl2x} ${ctrl2y}
      ${mid1x - normPerpDx * neckInset * 0.7} ${mid1y - normPerpDy * neckInset * 0.7}
      ${p2x} ${p2y}
    Z
  `;
}

/**
 * Computes bridge opacity based on Rayleigh-Plateau necking phase
 * Opacity decreases as the bridge approaches critical pinch-off
 * 
 * @param distance - Current distance between circles
 * @param stretchLimit - Maximum stretch before pinch-off
 * @param phase - 'merge' (compose merging into bar) or 'bud' (scroll-to-top budding from bar)
 * @returns Opacity value between 0 and 1
 */
export function computeBridgeOpacity(
  distance: number,
  stretchLimit: number,
  phase: 'merge' | 'bud'
): number {
  'worklet';
  
  if (phase === 'merge') {
    // Merging: Opacity is full when close, fades as bridge stretches
    // Represents the bridge becoming thinner and more transparent
    return interpolate(
      distance,
      [0, stretchLimit * 0.6, stretchLimit * 0.85, stretchLimit],
      [1, 0.85, 0.4, 0],
      Extrapolate.CLAMP
    );
  } else {
    // Budding: Bridge appears as drop separates, then fades at pinch-off
    return interpolate(
      distance,
      [0, stretchLimit * 0.2, stretchLimit * 0.6, stretchLimit],
      [0, 0.6, 0.9, 0],
      Extrapolate.CLAMP
    );
  }
}


