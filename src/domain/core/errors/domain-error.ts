/**
 * Domain Errors
 *
 * Erros específicos do domínio que representam violações de regras de negócio.
 * São diferentes de erros técnicos (IO, rede, etc).
 */

/**
 * Classe base para todos os erros de domínio
 */
export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    this.details = details;

    // Mantém o stack trace correto
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
    };
  }
}

/**
 * Erro de validação de dados
 */
export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * Erro quando uma entidade não é encontrada
 */
export class EntityNotFoundError extends DomainError {
  constructor(entityType: string, identifier: string | Record<string, unknown>) {
    const details = typeof identifier === 'string' ? { id: identifier } : identifier;
    super(`${entityType} not found`, 'ENTITY_NOT_FOUND', { entityType, ...details });
  }
}

/**
 * Erro quando uma operação não é permitida pelo estado atual da entidade
 */
export class InvalidOperationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_OPERATION', details);
  }
}

/**
 * Erro quando há conflito de moedas em operações monetárias
 */
export class CurrencyMismatchError extends DomainError {
  constructor(expected: string, received: string) {
    super(
      `Currency mismatch: expected ${expected}, received ${received}`,
      'CURRENCY_MISMATCH',
      { expected, received }
    );
  }
}

/**
 * Erro quando o saldo é insuficiente para uma operação
 */
export class InsufficientBalanceError extends DomainError {
  constructor(
    accountId: string,
    required: string,
    available: string,
    currency: string
  ) {
    super(
      `Insufficient balance: required ${required} ${currency}, available ${available} ${currency}`,
      'INSUFFICIENT_BALANCE',
      { accountId, required, available, currency }
    );
  }
}

/**
 * Erro quando uma operação viola regras de negócio
 */
export class BusinessRuleViolationError extends DomainError {
  constructor(rule: string, message: string, details?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', { rule, ...details });
  }
}

/**
 * Erro de autenticação
 */
export class AuthenticationError extends DomainError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Erro de autorização (permissão negada)
 */
export class AuthorizationError extends DomainError {
  constructor(message: string = 'Permission denied') {
    super(message, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Erro quando um registro duplicado é detectado
 */
export class DuplicateEntityError extends DomainError {
  constructor(entityType: string, field: string, value: string) {
    super(
      `${entityType} with ${field} "${value}" already exists`,
      'DUPLICATE_ENTITY',
      { entityType, field, value }
    );
  }
}

/**
 * Erro de concorrência (registro foi modificado por outro usuário)
 */
export class ConcurrencyError extends DomainError {
  constructor(entityType: string, entityId: string) {
    super(
      `${entityType} was modified by another user. Please refresh and try again.`,
      'CONCURRENCY_ERROR',
      { entityType, entityId }
    );
  }
}

/**
 * Erro quando uma data está fora do período permitido
 */
export class DateOutOfRangeError extends DomainError {
  constructor(date: Date, minDate?: Date, maxDate?: Date) {
    const details: Record<string, string> = { date: date.toISOString() };
    if (minDate) details.minDate = minDate.toISOString();
    if (maxDate) details.maxDate = maxDate.toISOString();

    super('Date is out of allowed range', 'DATE_OUT_OF_RANGE', details);
  }
}
