/**
 * Money Value Object Tests
 *
 * Testes para o Value Object Money, garantindo precisão absoluta
 * em todas as operações monetárias.
 */

import { describe, it, expect } from 'vitest';
import { Money, money, cents, sumMoney } from '@/domain/core/value-objects';

describe('Money Value Object', () => {
  describe('Creation', () => {
    it('should create money from cents', () => {
      const m = Money.fromCents(10000, 'BRL');
      expect(m.toNumber()).toBe(100);
      expect(m.currency).toBe('BRL');
    });

    it('should create money from decimal string', () => {
      const m = Money.fromDecimal('100.50', 'USD');
      expect(m.toNumber()).toBe(100.5);
      expect(m.currency).toBe('USD');
    });

    it('should create money from number', () => {
      const m = Money.fromNumber(99.99, 'EUR');
      expect(m.toNumber()).toBe(99.99);
    });

    it('should create zero money', () => {
      const m = Money.zero('BRL');
      expect(m.isZero()).toBe(true);
    });

    it('should use helper function', () => {
      const m = money(150.75, 'BRL');
      expect(m.toNumber()).toBe(150.75);
    });

    it('should use cents helper', () => {
      const m = cents(9999, 'BRL');
      expect(m.toNumber()).toBe(99.99);
    });
  });

  describe('Precision', () => {
    it('should handle floating point issues correctly', () => {
      // 0.1 + 0.2 !== 0.3 in JavaScript, but should work with Money
      const a = money(0.1);
      const b = money(0.2);
      const sum = a.add(b);
      expect(sum.toNumber()).toBe(0.3);
    });

    it('should maintain precision in complex calculations', () => {
      const price = money(19.99);
      const quantity = 3;
      const discount = price.multiply(quantity).percentage(10);
      const total = price.multiply(quantity).subtract(discount);

      // 19.99 * 3 = 59.97
      // 10% de 59.97 = 5.997
      // 59.97 - 5.997 = 53.973
      expect(total.toNumber()).toBeCloseTo(53.973, 3);
    });

    it('should handle very small values', () => {
      const m = money(0.01);
      const half = m.divide(2);
      expect(half.toNumber()).toBe(0.005);
    });

    it('should handle very large values', () => {
      const m = money(999999999999.99);
      expect(m.toString()).toBe('999999999999.99');
    });
  });

  describe('Arithmetic Operations', () => {
    it('should add two money values', () => {
      const a = money(100);
      const b = money(50.50);
      expect(a.add(b).toNumber()).toBe(150.5);
    });

    it('should subtract two money values', () => {
      const a = money(100);
      const b = money(30.25);
      expect(a.subtract(b).toNumber()).toBe(69.75);
    });

    it('should multiply by a factor', () => {
      const m = money(25);
      expect(m.multiply(4).toNumber()).toBe(100);
      expect(m.multiply(0.5).toNumber()).toBe(12.5);
    });

    it('should divide by a divisor', () => {
      const m = money(100);
      expect(m.divide(4).toNumber()).toBe(25);
    });

    it('should throw on division by zero', () => {
      const m = money(100);
      expect(() => m.divide(0)).toThrow('Cannot divide by zero');
    });

    it('should calculate percentage', () => {
      const m = money(200);
      expect(m.percentage(15).toNumber()).toBe(30);
    });

    it('should return absolute value', () => {
      const m = money(-100);
      expect(m.abs().toNumber()).toBe(100);
    });

    it('should negate value', () => {
      const m = money(100);
      expect(m.negate().toNumber()).toBe(-100);
    });
  });

  describe('Currency Validation', () => {
    it('should throw on operations with different currencies', () => {
      const brl = money(100, 'BRL');
      const usd = money(100, 'USD');

      expect(() => brl.add(usd)).toThrow('Currency mismatch');
      expect(() => brl.subtract(usd)).toThrow('Currency mismatch');
    });

    it('should allow comparison only with same currency', () => {
      const brl = money(100, 'BRL');
      const usd = money(100, 'USD');

      expect(() => brl.greaterThan(usd)).toThrow('Currency mismatch');
    });
  });

  describe('Comparisons', () => {
    it('should compare equality', () => {
      const a = money(100);
      const b = money(100);
      const c = money(100.01);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('should compare greater than', () => {
      expect(money(100).greaterThan(money(50))).toBe(true);
      expect(money(100).greaterThan(money(100))).toBe(false);
    });

    it('should compare less than', () => {
      expect(money(50).lessThan(money(100))).toBe(true);
      expect(money(100).lessThan(money(100))).toBe(false);
    });

    it('should check if zero', () => {
      expect(money(0).isZero()).toBe(true);
      expect(money(0.01).isZero()).toBe(false);
    });

    it('should check if positive', () => {
      expect(money(100).isPositive()).toBe(true);
      expect(money(0).isPositive()).toBe(false);
      expect(money(-100).isPositive()).toBe(false);
    });

    it('should check if negative', () => {
      expect(money(-100).isNegative()).toBe(true);
      expect(money(0).isNegative()).toBe(false);
      expect(money(100).isNegative()).toBe(false);
    });
  });

  describe('Allocation', () => {
    it('should allocate equally without losing cents', () => {
      const m = money(100);
      const parts = m.allocate(3);

      expect(parts.length).toBe(3);
      // 100 / 3 = 33.33... mas deve somar exatamente 100
      const sum = sumMoney(parts);
      expect(sum.equals(m)).toBe(true);
    });

    it('should allocate 1 cent correctly', () => {
      const m = cents(1);
      const parts = m.allocate(3);

      // 1 centavo dividido por 3 = 1 parte recebe 1 centavo, 2 recebem 0
      const total = parts.reduce((sum, p) => sum + p.toCents(), BigInt(0));
      expect(total).toBe(BigInt(1));
    });

    it('should allocate by ratios', () => {
      const m = money(100);
      const parts = m.allocateByRatios([50, 30, 20]);

      expect(parts[0]!.toNumber()).toBe(50);
      expect(parts[1]!.toNumber()).toBe(30);
      expect(parts[2]!.toNumber()).toBe(20);
    });

    it('should handle uneven ratio allocation', () => {
      const m = money(100);
      const parts = m.allocateByRatios([1, 1, 1]);

      // Deve somar exatamente 100, mesmo com divisão por 3
      const sum = sumMoney(parts);
      expect(sum.equals(m)).toBe(true);
    });
  });

  describe('Currency Conversion', () => {
    it('should convert to another currency', () => {
      const brl = money(100, 'BRL');
      const usd = brl.convertTo('USD', 0.20); // 1 BRL = 0.20 USD

      expect(usd.currency).toBe('USD');
      expect(usd.toNumber()).toBe(20);
    });
  });

  describe('Formatting', () => {
    it('should format BRL correctly', () => {
      const m = money(1234.56, 'BRL');
      expect(m.format()).toBe('R$ 1.234,56');
    });

    it('should format USD correctly', () => {
      const m = money(1234.56, 'USD');
      expect(m.format()).toBe('$ 1,234.56');
    });

    it('should format without symbol', () => {
      const m = money(1234.56, 'BRL');
      expect(m.format({ showSymbol: false })).toBe('1.234,56');
    });

    it('should format with currency code', () => {
      const m = money(1234.56, 'BRL');
      expect(m.format({ showSymbol: false, showCode: true })).toBe('1.234,56 BRL');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const m = money(100.50, 'BRL');
      const json = m.toJSON();

      expect(json).toEqual({
        amount: '100.5',
        currency: 'BRL',
      });
    });

    it('should deserialize from JSON', () => {
      const json = { amount: '100.50', currency: 'BRL' as const };
      const m = Money.fromJSON(json);

      expect(m.toNumber()).toBe(100.5);
      expect(m.currency).toBe('BRL');
    });

    it('should round trip correctly', () => {
      const original = money(12345.67, 'USD');
      const json = original.toJSON();
      const restored = Money.fromJSON(json);

      expect(restored.equals(original)).toBe(true);
    });
  });

  describe('Sum Helper', () => {
    it('should sum array of money', () => {
      const values = [money(10), money(20), money(30)];
      const sum = sumMoney(values);

      expect(sum.toNumber()).toBe(60);
    });

    it('should throw on empty array', () => {
      expect(() => sumMoney([])).toThrow('Cannot sum empty array');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values', () => {
      const m = money(-50);
      expect(m.isNegative()).toBe(true);
      expect(m.abs().toNumber()).toBe(50);
    });

    it('should round to currency decimal places', () => {
      const m = money(10.999, 'BRL');
      const rounded = m.round();
      expect(rounded.toNumber()).toBe(11);
    });

    it('should convert to cents correctly', () => {
      const m = money(99.99);
      expect(m.toCents()).toBe(BigInt(9999));
    });

    it('should handle bigint cents', () => {
      const m = Money.fromCents(BigInt(999999999999), 'BRL');
      expect(m.toCents()).toBe(BigInt(999999999999));
    });
  });
});
