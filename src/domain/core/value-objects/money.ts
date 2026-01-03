/**
 * Money Value Object
 *
 * Representa um valor monetário com precisão absoluta.
 * Utiliza Decimal.js para evitar erros de ponto flutuante.
 *
 * Princípios:
 * - Imutabilidade: todas as operações retornam uma nova instância
 * - Precisão: usa Decimal para cálculos exatos
 * - Type Safety: a moeda é parte do tipo, evitando operações entre moedas diferentes
 *
 * @example
 * const price = Money.fromCents(10000, 'BRL'); // R$ 100,00
 * const tax = price.multiply(0.1); // R$ 10,00
 * const total = price.add(tax); // R$ 110,00
 */

import Decimal from 'decimal.js';

// Configuração global do Decimal.js para máxima precisão
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 9,
});

export type Currency = 'BRL' | 'USD' | 'EUR';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Real Brasileiro',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
};

export class Money {
  private readonly _amount: Decimal;
  private readonly _currency: Currency;

  private constructor(amount: Decimal, currency: Currency) {
    this._amount = amount;
    this._currency = currency;
  }

  // =========================================
  // FACTORY METHODS
  // =========================================

  /**
   * Cria Money a partir de um valor em centavos (inteiro)
   * Esta é a forma preferida para evitar erros de precisão
   */
  static fromCents(cents: number | bigint, currency: Currency): Money {
    const config = CURRENCY_CONFIG[currency];
    const divisor = new Decimal(10).pow(config.decimalPlaces);
    const amount = new Decimal(cents.toString()).div(divisor);
    return new Money(amount, currency);
  }

  /**
   * Cria Money a partir de um valor decimal (string)
   * Use string para evitar erros de ponto flutuante
   */
  static fromDecimal(value: string | Decimal, currency: Currency): Money {
    const amount = new Decimal(value);
    return new Money(amount, currency);
  }

  /**
   * Cria Money zero
   */
  static zero(currency: Currency): Money {
    return new Money(new Decimal(0), currency);
  }

  /**
   * Cria Money a partir de um valor numérico
   * ATENÇÃO: Use apenas para valores exatos (inteiros ou frações simples)
   */
  static fromNumber(value: number, currency: Currency): Money {
    // Converte para string primeiro para preservar a precisão visual
    const amount = new Decimal(value.toString());
    return new Money(amount, currency);
  }

  // =========================================
  // GETTERS
  // =========================================

  get amount(): Decimal {
    return this._amount;
  }

  get currency(): Currency {
    return this._currency;
  }

  get config(): CurrencyConfig {
    return CURRENCY_CONFIG[this._currency];
  }

  // =========================================
  // CONVERSÕES
  // =========================================

  /**
   * Retorna o valor em centavos (inteiro)
   */
  toCents(): bigint {
    const multiplier = new Decimal(10).pow(this.config.decimalPlaces);
    return BigInt(this._amount.mul(multiplier).round().toString());
  }

  /**
   * Retorna o valor como número
   * ATENÇÃO: Pode haver perda de precisão para valores muito grandes
   */
  toNumber(): number {
    return this._amount.toNumber();
  }

  /**
   * Retorna o valor como string decimal
   */
  toString(): string {
    return this._amount.toFixed(this.config.decimalPlaces);
  }

  /**
   * Retorna o valor formatado para exibição
   */
  format(options?: { showSymbol?: boolean; showCode?: boolean }): string {
    const { showSymbol = true, showCode = false } = options ?? {};
    const config = this.config;

    // Formata o número com separadores
    const [intPart, decPart] = this._amount.toFixed(config.decimalPlaces).split('.');
    const formattedInt = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSeparator);
    const formattedNumber = `${formattedInt}${config.decimalSeparator}${decPart}`;

    // Adiciona símbolo ou código
    if (showSymbol) {
      return `${config.symbol} ${formattedNumber}`;
    }
    if (showCode) {
      return `${formattedNumber} ${config.code}`;
    }
    return formattedNumber;
  }

  // =========================================
  // OPERAÇÕES ARITMÉTICAS
  // =========================================

  /**
   * Soma dois valores monetários
   * @throws Error se as moedas forem diferentes
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount.add(other._amount), this._currency);
  }

  /**
   * Subtrai dois valores monetários
   * @throws Error se as moedas forem diferentes
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount.sub(other._amount), this._currency);
  }

  /**
   * Multiplica por um fator (taxa, quantidade, etc.)
   */
  multiply(factor: number | string | Decimal): Money {
    const multiplier = new Decimal(factor.toString());
    return new Money(this._amount.mul(multiplier), this._currency);
  }

  /**
   * Divide por um divisor
   */
  divide(divisor: number | string | Decimal): Money {
    const div = new Decimal(divisor.toString());
    if (div.isZero()) {
      throw new Error('Cannot divide by zero');
    }
    return new Money(this._amount.div(div), this._currency);
  }

  /**
   * Retorna o valor absoluto
   */
  abs(): Money {
    return new Money(this._amount.abs(), this._currency);
  }

  /**
   * Retorna o valor negativo
   */
  negate(): Money {
    return new Money(this._amount.neg(), this._currency);
  }

  /**
   * Arredonda para o número de casas decimais da moeda
   */
  round(): Money {
    const rounded = this._amount.toDecimalPlaces(this.config.decimalPlaces, Decimal.ROUND_HALF_UP);
    return new Money(rounded, this._currency);
  }

  /**
   * Calcula percentual do valor
   */
  percentage(percent: number | string | Decimal): Money {
    const pct = new Decimal(percent.toString()).div(100);
    return this.multiply(pct);
  }

  // =========================================
  // COMPARAÇÕES
  // =========================================

  /**
   * Compara igualdade entre dois valores
   */
  equals(other: Money): boolean {
    if (this._currency !== other._currency) {
      return false;
    }
    return this._amount.equals(other._amount);
  }

  /**
   * Verifica se é maior que outro valor
   */
  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount.greaterThan(other._amount);
  }

  /**
   * Verifica se é maior ou igual a outro valor
   */
  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount.greaterThanOrEqualTo(other._amount);
  }

  /**
   * Verifica se é menor que outro valor
   */
  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount.lessThan(other._amount);
  }

  /**
   * Verifica se é menor ou igual a outro valor
   */
  lessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount.lessThanOrEqualTo(other._amount);
  }

  /**
   * Verifica se o valor é zero
   */
  isZero(): boolean {
    return this._amount.isZero();
  }

  /**
   * Verifica se o valor é positivo
   */
  isPositive(): boolean {
    return this._amount.isPositive() && !this._amount.isZero();
  }

  /**
   * Verifica se o valor é negativo
   */
  isNegative(): boolean {
    return this._amount.isNegative();
  }

  // =========================================
  // ALOCAÇÃO (Distribuição proporcional)
  // =========================================

  /**
   * Distribui o valor entre N partes iguais
   * Garante que a soma das partes seja igual ao valor original (sem perda de centavos)
   */
  allocate(parts: number): Money[] {
    if (parts <= 0) {
      throw new Error('Number of parts must be positive');
    }

    const totalCents = this.toCents();
    const baseAmount = totalCents / BigInt(parts);
    const remainder = totalCents % BigInt(parts);

    const allocations: Money[] = [];
    for (let i = 0; i < parts; i++) {
      // Os primeiros 'remainder' itens recebem 1 centavo extra
      const extra = BigInt(i) < remainder ? BigInt(1) : BigInt(0);
      allocations.push(Money.fromCents(baseAmount + extra, this._currency));
    }

    return allocations;
  }

  /**
   * Distribui o valor proporcionalmente de acordo com os pesos fornecidos
   */
  allocateByRatios(ratios: number[]): Money[] {
    if (ratios.length === 0) {
      throw new Error('Ratios array cannot be empty');
    }

    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    if (totalRatio === 0) {
      throw new Error('Sum of ratios cannot be zero');
    }

    const totalCents = this.toCents();
    const allocations: Money[] = [];
    let allocated = BigInt(0);

    for (let i = 0; i < ratios.length; i++) {
      if (i === ratios.length - 1) {
        // Último item recebe o restante para garantir soma exata
        allocations.push(Money.fromCents(totalCents - allocated, this._currency));
      } else {
        const share = (totalCents * BigInt(Math.round(ratios[i]! * 1000000))) / BigInt(Math.round(totalRatio * 1000000));
        allocations.push(Money.fromCents(share, this._currency));
        allocated += share;
      }
    }

    return allocations;
  }

  // =========================================
  // CONVERSÃO DE MOEDA
  // =========================================

  /**
   * Converte para outra moeda usando a taxa de câmbio fornecida
   */
  convertTo(targetCurrency: Currency, exchangeRate: number | string | Decimal): Money {
    const rate = new Decimal(exchangeRate.toString());
    const converted = this._amount.mul(rate);
    return new Money(converted, targetCurrency);
  }

  // =========================================
  // HELPERS PRIVADOS
  // =========================================

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(
        `Currency mismatch: cannot operate on ${this._currency} and ${other._currency}. ` +
        `Convert to same currency first.`
      );
    }
  }

  // =========================================
  // SERIALIZAÇÃO
  // =========================================

  toJSON(): { amount: string; currency: Currency } {
    return {
      amount: this._amount.toString(),
      currency: this._currency,
    };
  }

  static fromJSON(json: { amount: string; currency: Currency }): Money {
    return Money.fromDecimal(json.amount, json.currency);
  }
}

/**
 * Helper para criar Money rapidamente
 */
export function money(value: number | string, currency: Currency = 'BRL'): Money {
  return Money.fromDecimal(value.toString(), currency);
}

/**
 * Helper para criar Money em centavos
 */
export function cents(value: number | bigint, currency: Currency = 'BRL'): Money {
  return Money.fromCents(value, currency);
}

/**
 * Soma um array de Money
 */
export function sumMoney(values: Money[]): Money {
  if (values.length === 0) {
    throw new Error('Cannot sum empty array');
  }
  const currency = values[0]!.currency;
  return values.reduce((sum, val) => sum.add(val), Money.zero(currency));
}
