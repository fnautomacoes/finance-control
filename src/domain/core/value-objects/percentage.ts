/**
 * Percentage Value Object
 *
 * Representa um valor percentual com precisão.
 * Usado para:
 * - Taxas de juros
 * - Alíquotas de impostos
 * - Rentabilidade
 * - Margens
 */

import Decimal from 'decimal.js';

export class Percentage {
  private readonly _value: Decimal; // Armazenado como fração (10% = 0.10)

  private constructor(value: Decimal) {
    this._value = value;
  }

  // =========================================
  // FACTORY METHODS
  // =========================================

  /**
   * Cria a partir do valor percentual (10 = 10%)
   */
  static fromPercent(value: number | string): Percentage {
    const decimal = new Decimal(value.toString()).div(100);
    return new Percentage(decimal);
  }

  /**
   * Cria a partir da fração (0.10 = 10%)
   */
  static fromDecimal(value: number | string | Decimal): Percentage {
    const decimal = new Decimal(value.toString());
    return new Percentage(decimal);
  }

  /**
   * Cria a partir de dois valores (parte/total)
   */
  static fromRatio(part: number | string, total: number | string): Percentage {
    const p = new Decimal(part.toString());
    const t = new Decimal(total.toString());

    if (t.isZero()) {
      return new Percentage(new Decimal(0));
    }

    return new Percentage(p.div(t));
  }

  /**
   * Zero percent
   */
  static zero(): Percentage {
    return new Percentage(new Decimal(0));
  }

  /**
   * 100%
   */
  static oneHundred(): Percentage {
    return new Percentage(new Decimal(1));
  }

  // =========================================
  // GETTERS
  // =========================================

  /**
   * Valor como fração (10% = 0.10)
   */
  get decimal(): Decimal {
    return this._value;
  }

  /**
   * Valor como percentual (10% = 10)
   */
  get percent(): Decimal {
    return this._value.mul(100);
  }

  // =========================================
  // CONVERSÕES
  // =========================================

  toNumber(): number {
    return this._value.toNumber();
  }

  toPercentNumber(): number {
    return this.percent.toNumber();
  }

  toString(): string {
    return this.percent.toFixed(2);
  }

  /**
   * Formata para exibição (ex: "10,50%")
   */
  format(options?: { decimalPlaces?: number; locale?: 'pt-BR' | 'en-US' }): string {
    const { decimalPlaces = 2, locale = 'pt-BR' } = options ?? {};
    const value = this.percent.toFixed(decimalPlaces);

    if (locale === 'pt-BR') {
      return value.replace('.', ',') + '%';
    }
    return value + '%';
  }

  // =========================================
  // OPERAÇÕES
  // =========================================

  /**
   * Soma dois percentuais
   */
  add(other: Percentage): Percentage {
    return new Percentage(this._value.add(other._value));
  }

  /**
   * Subtrai dois percentuais
   */
  subtract(other: Percentage): Percentage {
    return new Percentage(this._value.sub(other._value));
  }

  /**
   * Multiplica por um fator
   */
  multiply(factor: number | string | Decimal): Percentage {
    const f = new Decimal(factor.toString());
    return new Percentage(this._value.mul(f));
  }

  /**
   * Divide por um divisor
   */
  divide(divisor: number | string | Decimal): Percentage {
    const d = new Decimal(divisor.toString());
    if (d.isZero()) {
      throw new Error('Cannot divide by zero');
    }
    return new Percentage(this._value.div(d));
  }

  /**
   * Calcula o complemento (100% - valor)
   */
  complement(): Percentage {
    return new Percentage(new Decimal(1).sub(this._value));
  }

  /**
   * Valor absoluto
   */
  abs(): Percentage {
    return new Percentage(this._value.abs());
  }

  // =========================================
  // COMPARAÇÕES
  // =========================================

  equals(other: Percentage): boolean {
    return this._value.equals(other._value);
  }

  greaterThan(other: Percentage): boolean {
    return this._value.greaterThan(other._value);
  }

  lessThan(other: Percentage): boolean {
    return this._value.lessThan(other._value);
  }

  isZero(): boolean {
    return this._value.isZero();
  }

  isPositive(): boolean {
    return this._value.isPositive() && !this._value.isZero();
  }

  isNegative(): boolean {
    return this._value.isNegative();
  }

  // =========================================
  // SERIALIZAÇÃO
  // =========================================

  toJSON(): string {
    return this._value.toString();
  }

  static fromJSON(value: string): Percentage {
    return Percentage.fromDecimal(value);
  }
}

/**
 * Helper para criar percentual rapidamente
 */
export function pct(value: number | string): Percentage {
  return Percentage.fromPercent(value);
}
