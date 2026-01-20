import { describe, it, expect } from 'vitest';
import {
  calculateDecayConstant,
  calculateDecayedActivity,
  calculateRequiredInitialActivity,
  calculateElapsedMinutes,
  isWithinShelfLife,
  calculateActivityAtTime,
  calculateBackwardSchedule,
  calculateProductionActivityWithOverage,
} from '../utils/decay.js';

describe('Decay Calculations', () => {
  describe('calculateDecayConstant', () => {
    it('should calculate decay constant for F-18 (half-life 109.8 min)', () => {
      const lambda = calculateDecayConstant(109.8);
      expect(lambda).toBeCloseTo(0.00631, 4);
    });

    it('should calculate decay constant for Tc-99m (half-life 360.6 min)', () => {
      const lambda = calculateDecayConstant(360.6);
      expect(lambda).toBeCloseTo(0.00192, 4);
    });
  });

  describe('calculateDecayedActivity', () => {
    it('should return initial activity at time 0', () => {
      const result = calculateDecayedActivity(100, 109.8, 0);
      expect(result).toBeCloseTo(100, 2);
    });

    it('should return half the activity after one half-life', () => {
      const result = calculateDecayedActivity(100, 109.8, 109.8);
      expect(result).toBeCloseTo(50, 1);
    });

    it('should return quarter activity after two half-lives', () => {
      const result = calculateDecayedActivity(100, 109.8, 219.6);
      expect(result).toBeCloseTo(25, 1);
    });

    it('should handle F-18 decay over 2 hours', () => {
      const result = calculateDecayedActivity(100, 109.8, 120);
      expect(result).toBeCloseTo(46.7, 1);
    });
  });

  describe('calculateRequiredInitialActivity', () => {
    it('should return target activity when time elapsed is 0', () => {
      const result = calculateRequiredInitialActivity(50, 109.8, 0);
      expect(result).toBeCloseTo(50, 2);
    });

    it('should return double activity for one half-life elapsed', () => {
      const result = calculateRequiredInitialActivity(50, 109.8, 109.8);
      expect(result).toBeCloseTo(100, 1);
    });

    it('should calculate correct initial activity for F-18 over 2 hours', () => {
      const result = calculateRequiredInitialActivity(50, 109.8, 120);
      expect(result).toBeCloseTo(107.1, 1);
    });
  });

  describe('calculateElapsedMinutes', () => {
    it('should calculate elapsed minutes correctly', () => {
      const start = new Date('2024-01-01T08:00:00Z');
      const end = new Date('2024-01-01T10:30:00Z');
      const result = calculateElapsedMinutes(start, end);
      expect(result).toBe(150);
    });

    it('should return 0 for same times', () => {
      const time = new Date('2024-01-01T08:00:00Z');
      const result = calculateElapsedMinutes(time, time);
      expect(result).toBe(0);
    });
  });

  describe('isWithinShelfLife', () => {
    it('should return true when within shelf life', () => {
      const production = new Date('2024-01-01T06:00:00Z');
      const target = new Date('2024-01-01T10:00:00Z');
      const result = isWithinShelfLife(production, target, 600);
      expect(result).toBe(true);
    });

    it('should return false when exceeding shelf life', () => {
      const production = new Date('2024-01-01T06:00:00Z');
      const target = new Date('2024-01-01T20:00:00Z');
      const result = isWithinShelfLife(production, target, 600);
      expect(result).toBe(false);
    });

    it('should return false when target is before production', () => {
      const production = new Date('2024-01-01T10:00:00Z');
      const target = new Date('2024-01-01T06:00:00Z');
      const result = isWithinShelfLife(production, target, 600);
      expect(result).toBe(false);
    });
  });

  describe('calculateActivityAtTime', () => {
    it('should calculate decayed activity at a future time', () => {
      const calibration = new Date('2024-01-01T08:00:00Z');
      const target = new Date('2024-01-01T10:00:00Z');
      const result = calculateActivityAtTime(100, calibration, target, 109.8);
      expect(result).toBeCloseTo(69.9, 1);
    });
  });

  describe('calculateBackwardSchedule', () => {
    it('should calculate correct backward schedule', () => {
      const delivery = new Date('2024-01-01T10:00:00Z');
      const result = calculateBackwardSchedule(delivery, 60, 15, 30, 45);
      
      expect(result.dispatchTime).toEqual(new Date('2024-01-01T09:00:00Z'));
      expect(result.packagingStartTime).toEqual(new Date('2024-01-01T08:45:00Z'));
      expect(result.qcStartTime).toEqual(new Date('2024-01-01T08:15:00Z'));
      expect(result.synthesisStartTime).toEqual(new Date('2024-01-01T07:30:00Z'));
    });
  });

  describe('calculateProductionActivityWithOverage', () => {
    it('should calculate production activity with overage', () => {
      const injectionTime = new Date('2024-01-01T10:00:00Z');
      const productionTime = new Date('2024-01-01T07:30:00Z');
      const result = calculateProductionActivityWithOverage(
        50,
        109.8,
        injectionTime,
        productionTime,
        15
      );
      expect(result).toBeGreaterThan(50 * 1.15);
    });
  });
});
