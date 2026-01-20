export function calculateDecayConstant(halfLifeMinutes: number): number {
  return Math.log(2) / halfLifeMinutes;
}

export function calculateDecayedActivity(
  initialActivity: number,
  halfLifeMinutes: number,
  elapsedMinutes: number
): number {
  const lambda = calculateDecayConstant(halfLifeMinutes);
  return initialActivity * Math.exp(-lambda * elapsedMinutes);
}

export function calculateRequiredInitialActivity(
  targetActivity: number,
  halfLifeMinutes: number,
  elapsedMinutes: number
): number {
  const lambda = calculateDecayConstant(halfLifeMinutes);
  return targetActivity / Math.exp(-lambda * elapsedMinutes);
}

export function calculateElapsedMinutes(startTime: Date, endTime: Date): number {
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60);
}

export function isWithinShelfLife(
  productionTime: Date,
  targetTime: Date,
  shelfLifeMinutes: number
): boolean {
  const elapsedMinutes = calculateElapsedMinutes(productionTime, targetTime);
  return elapsedMinutes >= 0 && elapsedMinutes <= shelfLifeMinutes;
}

export function calculateActivityAtTime(
  initialActivity: number,
  calibrationTime: Date,
  targetTime: Date,
  halfLifeMinutes: number
): number {
  const elapsedMinutes = calculateElapsedMinutes(calibrationTime, targetTime);
  return calculateDecayedActivity(initialActivity, halfLifeMinutes, elapsedMinutes);
}

export function calculateBackwardSchedule(
  deliveryTime: Date,
  travelTimeMinutes: number,
  packagingTimeMinutes: number,
  qcTimeMinutes: number,
  synthesisTimeMinutes: number
): {
  dispatchTime: Date;
  packagingStartTime: Date;
  qcStartTime: Date;
  synthesisStartTime: Date;
} {
  const dispatchTime = new Date(deliveryTime.getTime() - travelTimeMinutes * 60 * 1000);
  const packagingStartTime = new Date(dispatchTime.getTime() - packagingTimeMinutes * 60 * 1000);
  const qcStartTime = new Date(packagingStartTime.getTime() - qcTimeMinutes * 60 * 1000);
  const synthesisStartTime = new Date(qcStartTime.getTime() - synthesisTimeMinutes * 60 * 1000);

  return {
    dispatchTime,
    packagingStartTime,
    qcStartTime,
    synthesisStartTime,
  };
}

export function calculateProductionActivityWithOverage(
  requestedActivity: number,
  halfLifeMinutes: number,
  injectionTime: Date,
  productionTime: Date,
  overagePercent: number
): number {
  const elapsedMinutes = calculateElapsedMinutes(productionTime, injectionTime);
  const requiredAtProduction = calculateRequiredInitialActivity(
    requestedActivity,
    halfLifeMinutes,
    elapsedMinutes
  );
  return requiredAtProduction * (1 + overagePercent / 100);
}
