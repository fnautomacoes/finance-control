/**
 * Value Objects do Core Domain
 *
 * Value Objects são objetos imutáveis que representam conceitos do domínio
 * através de seus atributos, não de uma identidade.
 */

export { Money, money, cents, sumMoney, CURRENCY_CONFIG } from './money';
export type { Currency, CurrencyConfig } from './money';

export { DateRange } from './date-range';

export { Percentage, pct } from './percentage';
