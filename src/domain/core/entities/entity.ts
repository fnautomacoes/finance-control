/**
 * Base Entity
 *
 * Classe base para todas as entidades do domínio.
 * Entidades são identificadas por um ID único, não por seus atributos.
 */

import { nanoid } from 'nanoid';

export interface EntityProps {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class Entity<T extends EntityProps> {
  protected readonly _id: string;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;
  protected props: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

  constructor(props: T) {
    this._id = props.id ?? nanoid();
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();

    // Remove props gerenciadas pela classe base
    const { id, createdAt, updatedAt, ...rest } = props;
    this.props = rest as Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
  }

  get id(): string {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Atualiza o timestamp de modificação
   */
  protected touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Compara igualdade baseada no ID
   */
  equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (!(other instanceof Entity)) {
      return false;
    }
    return this._id === other._id;
  }

  /**
   * Retorna uma representação para serialização
   */
  abstract toJSON(): Record<string, unknown>;
}

/**
 * Base para Aggregate Roots
 *
 * Aggregate Root é a entidade principal de um agregado que:
 * - Garante a consistência do agregado
 * - É o único ponto de acesso externo ao agregado
 * - Publica eventos de domínio
 */
export abstract class AggregateRoot<T extends EntityProps> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}

/**
 * Interface base para eventos de domínio
 */
export interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Cria um evento de domínio
 */
export function createDomainEvent(
  eventType: string,
  aggregateId: string,
  payload: Record<string, unknown>
): DomainEvent {
  return {
    eventType,
    occurredAt: new Date(),
    aggregateId,
    payload,
  };
}
