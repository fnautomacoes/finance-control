/**
 * DateRange Value Object
 *
 * Representa um intervalo de datas, fundamental para:
 * - Filtros de relatórios
 * - Períodos de competência
 * - Metas e orçamentos
 * - Análises históricas
 */

import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  subDays,
  subMonths,
  subYears,
  addDays,
  addMonths,
  isWithinInterval,
  eachDayOfInterval,
  eachMonthOfInterval,
  differenceInDays,
  differenceInMonths,
  format,
  parseISO,
  isValid,
  isBefore,
  isAfter,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class DateRange {
  private readonly _start: Date;
  private readonly _end: Date;

  private constructor(start: Date, end: Date) {
    if (isAfter(start, end)) {
      throw new Error('Start date must be before or equal to end date');
    }
    this._start = startOfDay(start);
    this._end = endOfDay(end);
  }

  // =========================================
  // FACTORY METHODS
  // =========================================

  /**
   * Cria um intervalo a partir de duas datas
   */
  static create(start: Date | string, end: Date | string): DateRange {
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    const endDate = typeof end === 'string' ? parseISO(end) : end;

    if (!isValid(startDate) || !isValid(endDate)) {
      throw new Error('Invalid date provided');
    }

    return new DateRange(startDate, endDate);
  }

  /**
   * Mês atual
   */
  static currentMonth(): DateRange {
    const now = new Date();
    return new DateRange(startOfMonth(now), endOfMonth(now));
  }

  /**
   * Mês específico
   */
  static month(year: number, month: number): DateRange {
    const date = new Date(year, month - 1, 1);
    return new DateRange(startOfMonth(date), endOfMonth(date));
  }

  /**
   * Ano atual
   */
  static currentYear(): DateRange {
    const now = new Date();
    return new DateRange(startOfYear(now), endOfYear(now));
  }

  /**
   * Ano específico
   */
  static year(year: number): DateRange {
    const date = new Date(year, 0, 1);
    return new DateRange(startOfYear(date), endOfYear(date));
  }

  /**
   * Trimestre atual
   */
  static currentQuarter(): DateRange {
    const now = new Date();
    return new DateRange(startOfQuarter(now), endOfQuarter(now));
  }

  /**
   * Últimos N dias
   */
  static lastDays(days: number): DateRange {
    const now = new Date();
    return new DateRange(subDays(now, days - 1), now);
  }

  /**
   * Últimos N meses completos
   */
  static lastMonths(months: number): DateRange {
    const now = new Date();
    const start = startOfMonth(subMonths(now, months - 1));
    return new DateRange(start, endOfMonth(now));
  }

  /**
   * Desde uma data até hoje
   */
  static since(start: Date | string): DateRange {
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    return new DateRange(startDate, new Date());
  }

  /**
   * Um único dia
   */
  static singleDay(date: Date | string): DateRange {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return new DateRange(d, d);
  }

  /**
   * Todo o período (para consultas sem filtro de data)
   */
  static all(): DateRange {
    return new DateRange(new Date(1970, 0, 1), new Date(2099, 11, 31));
  }

  // =========================================
  // GETTERS
  // =========================================

  get start(): Date {
    return this._start;
  }

  get end(): Date {
    return this._end;
  }

  get startISO(): string {
    return this._start.toISOString();
  }

  get endISO(): string {
    return this._end.toISOString();
  }

  // =========================================
  // DURAÇÃO
  // =========================================

  /**
   * Número de dias no intervalo
   */
  get days(): number {
    return differenceInDays(this._end, this._start) + 1;
  }

  /**
   * Número de meses no intervalo (aproximado)
   */
  get months(): number {
    return differenceInMonths(this._end, this._start) + 1;
  }

  // =========================================
  // VERIFICAÇÕES
  // =========================================

  /**
   * Verifica se uma data está dentro do intervalo
   */
  contains(date: Date | string): boolean {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isWithinInterval(d, { start: this._start, end: this._end });
  }

  /**
   * Verifica se dois intervalos se sobrepõem
   */
  overlaps(other: DateRange): boolean {
    return !(isAfter(this._start, other._end) || isBefore(this._end, other._start));
  }

  /**
   * Verifica se este intervalo contém completamente outro
   */
  containsRange(other: DateRange): boolean {
    return !isBefore(other._start, this._start) && !isAfter(other._end, this._end);
  }

  // =========================================
  // TRANSFORMAÇÕES
  // =========================================

  /**
   * Expande o intervalo em N dias para cada lado
   */
  expand(days: number): DateRange {
    return new DateRange(subDays(this._start, days), addDays(this._end, days));
  }

  /**
   * Move o intervalo N dias para frente
   */
  shift(days: number): DateRange {
    return new DateRange(addDays(this._start, days), addDays(this._end, days));
  }

  /**
   * Retorna o mesmo período do mês anterior
   */
  previousMonth(): DateRange {
    return new DateRange(subMonths(this._start, 1), subMonths(this._end, 1));
  }

  /**
   * Retorna o mesmo período do ano anterior
   */
  previousYear(): DateRange {
    return new DateRange(subYears(this._start, 1), subYears(this._end, 1));
  }

  /**
   * Retorna o próximo mês
   */
  nextMonth(): DateRange {
    return new DateRange(addMonths(this._start, 1), addMonths(this._end, 1));
  }

  // =========================================
  // ITERAÇÃO
  // =========================================

  /**
   * Retorna todos os dias do intervalo
   */
  eachDay(): Date[] {
    return eachDayOfInterval({ start: this._start, end: this._end });
  }

  /**
   * Retorna o primeiro dia de cada mês no intervalo
   */
  eachMonth(): Date[] {
    return eachMonthOfInterval({ start: this._start, end: this._end });
  }

  /**
   * Divide o intervalo em sub-intervalos mensais
   */
  splitByMonth(): DateRange[] {
    const months = this.eachMonth();
    return months.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      // Ajusta para não ultrapassar os limites originais
      const effectiveStart = isBefore(monthStart, this._start) ? this._start : monthStart;
      const effectiveEnd = isAfter(monthEnd, this._end) ? this._end : monthEnd;
      return new DateRange(effectiveStart, effectiveEnd);
    });
  }

  // =========================================
  // FORMATAÇÃO
  // =========================================

  /**
   * Formata o intervalo para exibição
   */
  format(formatStr: string = 'dd/MM/yyyy'): string {
    const startStr = format(this._start, formatStr, { locale: ptBR });
    const endStr = format(this._end, formatStr, { locale: ptBR });

    if (startStr === endStr) {
      return startStr;
    }
    return `${startStr} - ${endStr}`;
  }

  /**
   * Formata de forma amigável (ex: "Janeiro 2024", "1º Trimestre 2024")
   */
  formatFriendly(): string {
    // Se for um mês completo
    if (
      this._start.getDate() === 1 &&
      this._end.getDate() === endOfMonth(this._start).getDate() &&
      this._start.getMonth() === this._end.getMonth()
    ) {
      return format(this._start, "MMMM 'de' yyyy", { locale: ptBR });
    }

    // Se for um ano completo
    if (
      this._start.getMonth() === 0 &&
      this._start.getDate() === 1 &&
      this._end.getMonth() === 11 &&
      this._end.getDate() === 31 &&
      this._start.getFullYear() === this._end.getFullYear()
    ) {
      return this._start.getFullYear().toString();
    }

    // Padrão
    return this.format();
  }

  // =========================================
  // SERIALIZAÇÃO
  // =========================================

  toJSON(): { start: string; end: string } {
    return {
      start: this.startISO,
      end: this.endISO,
    };
  }

  static fromJSON(json: { start: string; end: string }): DateRange {
    return DateRange.create(json.start, json.end);
  }

  /**
   * Para uso em query strings
   */
  toQueryString(): string {
    return `${format(this._start, 'yyyy-MM-dd')}_${format(this._end, 'yyyy-MM-dd')}`;
  }

  static fromQueryString(str: string): DateRange {
    const [start, end] = str.split('_');
    if (!start || !end) {
      throw new Error('Invalid date range query string');
    }
    return DateRange.create(start, end);
  }
}
