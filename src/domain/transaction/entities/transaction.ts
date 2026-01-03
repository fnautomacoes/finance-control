/**
 * Transaction Entity
 *
 * Representa uma transação financeira (receita, despesa ou transferência).
 * É um Aggregate Root que gerencia suas próprias regras de negócio.
 */

import { AggregateRoot, EntityProps, createDomainEvent } from '@/domain/core/entities';
import { Money, Currency, DateRange } from '@/domain/core/value-objects';
import { ValidationError, InvalidOperationError } from '@/domain/core/errors';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type RecurrenceType =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL';

export interface TransactionProps extends EntityProps {
  organizationId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: Money;
  exchangeRate?: number;
  description: string;
  notes?: string;
  date: Date;
  competenceDate?: Date;
  // Relacionamentos
  accountId: string;
  toAccountId?: string; // Para transferências
  categoryId: string;
  costCenterId?: string;
  projectId?: string;
  contactId?: string;
  // Recorrência
  recurrenceType: RecurrenceType;
  recurrenceEndDate?: Date;
  recurrenceParentId?: string;
  // Extras
  attachments: string[];
  tags: string[];
  // Conciliação
  isReconciled: boolean;
  reconciledAt?: Date;
  externalId?: string;
}

export class Transaction extends AggregateRoot<TransactionProps> {
  private constructor(props: TransactionProps) {
    super(props);
    this.validate();
  }

  // =========================================
  // FACTORY
  // =========================================

  static create(
    props: Omit<
      TransactionProps,
      'id' | 'createdAt' | 'updatedAt' | 'status' | 'isReconciled' | 'reconciledAt' | 'attachments' | 'tags'
    > & { attachments?: string[]; tags?: string[] }
  ): Transaction {
    const transaction = new Transaction({
      ...props,
      status: 'COMPLETED',
      isReconciled: false,
      attachments: props.attachments ?? [],
      tags: props.tags ?? [],
    });

    transaction.addDomainEvent(
      createDomainEvent('TransactionCreated', transaction.id, {
        organizationId: props.organizationId,
        type: props.type,
        amount: props.amount.toJSON(),
        accountId: props.accountId,
        categoryId: props.categoryId,
        date: props.date.toISOString(),
      })
    );

    return transaction;
  }

  static createPending(
    props: Omit<
      TransactionProps,
      'id' | 'createdAt' | 'updatedAt' | 'status' | 'isReconciled' | 'reconciledAt' | 'attachments' | 'tags'
    > & { attachments?: string[]; tags?: string[] }
  ): Transaction {
    const transaction = new Transaction({
      ...props,
      status: 'PENDING',
      isReconciled: false,
      attachments: props.attachments ?? [],
      tags: props.tags ?? [],
    });

    transaction.addDomainEvent(
      createDomainEvent('TransactionScheduled', transaction.id, {
        organizationId: props.organizationId,
        type: props.type,
        amount: props.amount.toJSON(),
        date: props.date.toISOString(),
      })
    );

    return transaction;
  }

  static reconstitute(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  // =========================================
  // GETTERS
  // =========================================

  get organizationId(): string {
    return this.props.organizationId;
  }

  get type(): TransactionType {
    return this.props.type;
  }

  get status(): TransactionStatus {
    return this.props.status;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get currency(): Currency {
    return this.props.amount.currency;
  }

  get exchangeRate(): number | undefined {
    return this.props.exchangeRate;
  }

  get description(): string {
    return this.props.description;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get date(): Date {
    return this.props.date;
  }

  get competenceDate(): Date {
    return this.props.competenceDate ?? this.props.date;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get toAccountId(): string | undefined {
    return this.props.toAccountId;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get costCenterId(): string | undefined {
    return this.props.costCenterId;
  }

  get projectId(): string | undefined {
    return this.props.projectId;
  }

  get contactId(): string | undefined {
    return this.props.contactId;
  }

  get recurrenceType(): RecurrenceType {
    return this.props.recurrenceType;
  }

  get recurrenceEndDate(): Date | undefined {
    return this.props.recurrenceEndDate;
  }

  get recurrenceParentId(): string | undefined {
    return this.props.recurrenceParentId;
  }

  get attachments(): readonly string[] {
    return this.props.attachments;
  }

  get tags(): readonly string[] {
    return this.props.tags;
  }

  get isReconciled(): boolean {
    return this.props.isReconciled;
  }

  get reconciledAt(): Date | undefined {
    return this.props.reconciledAt;
  }

  get externalId(): string | undefined {
    return this.props.externalId;
  }

  get isTransfer(): boolean {
    return this.props.type === 'TRANSFER';
  }

  get isIncome(): boolean {
    return this.props.type === 'INCOME';
  }

  get isExpense(): boolean {
    return this.props.type === 'EXPENSE';
  }

  get isPending(): boolean {
    return this.props.status === 'PENDING';
  }

  get isCompleted(): boolean {
    return this.props.status === 'COMPLETED';
  }

  get isCancelled(): boolean {
    return this.props.status === 'CANCELLED';
  }

  get isRecurrent(): boolean {
    return this.props.recurrenceType !== 'NONE';
  }

  /**
   * Retorna o valor com sinal (positivo para receita, negativo para despesa)
   */
  get signedAmount(): Money {
    if (this.isExpense) {
      return this.props.amount.negate();
    }
    return this.props.amount;
  }

  // =========================================
  // COMMANDS
  // =========================================

  updateDescription(description: string, notes?: string): void {
    this.assertNotCancelled();

    if (!description || description.trim().length === 0) {
      throw new ValidationError('Description cannot be empty');
    }

    if (description.length > 255) {
      throw new ValidationError('Description cannot exceed 255 characters');
    }

    this.props.description = description.trim();
    this.props.notes = notes?.trim();
    this.touch();

    this.addDomainEvent(
      createDomainEvent('TransactionUpdated', this.id, { field: 'description' })
    );
  }

  updateAmount(amount: Money): void {
    this.assertNotCancelled();
    this.assertNotReconciled();

    if (amount.isNegative() || amount.isZero()) {
      throw new ValidationError('Amount must be positive');
    }

    const oldAmount = this.props.amount;
    this.props.amount = amount;
    this.touch();

    this.addDomainEvent(
      createDomainEvent('TransactionAmountChanged', this.id, {
        oldAmount: oldAmount.toJSON(),
        newAmount: amount.toJSON(),
      })
    );
  }

  updateDate(date: Date, competenceDate?: Date): void {
    this.assertNotCancelled();
    this.assertNotReconciled();

    this.props.date = date;
    this.props.competenceDate = competenceDate;
    this.touch();

    this.addDomainEvent(
      createDomainEvent('TransactionDateChanged', this.id, {
        date: date.toISOString(),
        competenceDate: competenceDate?.toISOString(),
      })
    );
  }

  updateCategory(categoryId: string): void {
    this.assertNotCancelled();

    if (!categoryId) {
      throw new ValidationError('Category ID is required');
    }

    this.props.categoryId = categoryId;
    this.touch();
  }

  updateClassifications(options: {
    costCenterId?: string | null;
    projectId?: string | null;
    contactId?: string | null;
  }): void {
    this.assertNotCancelled();

    if (options.costCenterId !== undefined) {
      this.props.costCenterId = options.costCenterId ?? undefined;
    }
    if (options.projectId !== undefined) {
      this.props.projectId = options.projectId ?? undefined;
    }
    if (options.contactId !== undefined) {
      this.props.contactId = options.contactId ?? undefined;
    }

    this.touch();
  }

  addTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    if (!this.props.tags.includes(normalizedTag)) {
      this.props.tags = [...this.props.tags, normalizedTag];
      this.touch();
    }
  }

  removeTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    this.props.tags = this.props.tags.filter((t) => t !== normalizedTag);
    this.touch();
  }

  addAttachment(url: string): void {
    if (!this.props.attachments.includes(url)) {
      this.props.attachments = [...this.props.attachments, url];
      this.touch();
    }
  }

  removeAttachment(url: string): void {
    this.props.attachments = this.props.attachments.filter((a) => a !== url);
    this.touch();
  }

  complete(): void {
    if (this.props.status !== 'PENDING') {
      throw new InvalidOperationError('Only pending transactions can be completed');
    }

    this.props.status = 'COMPLETED';
    this.touch();

    this.addDomainEvent(
      createDomainEvent('TransactionCompleted', this.id, { date: new Date().toISOString() })
    );
  }

  cancel(): void {
    if (this.props.status === 'CANCELLED') {
      throw new InvalidOperationError('Transaction is already cancelled');
    }

    if (this.props.isReconciled) {
      throw new InvalidOperationError('Cannot cancel a reconciled transaction');
    }

    this.props.status = 'CANCELLED';
    this.touch();

    this.addDomainEvent(
      createDomainEvent('TransactionCancelled', this.id, { date: new Date().toISOString() })
    );
  }

  reconcile(externalId?: string): void {
    if (this.props.status !== 'COMPLETED') {
      throw new InvalidOperationError('Only completed transactions can be reconciled');
    }

    if (this.props.isReconciled) {
      throw new InvalidOperationError('Transaction is already reconciled');
    }

    this.props.isReconciled = true;
    this.props.reconciledAt = new Date();
    this.props.externalId = externalId;
    this.touch();

    this.addDomainEvent(
      createDomainEvent('TransactionReconciled', this.id, { externalId })
    );
  }

  unreconcile(): void {
    if (!this.props.isReconciled) {
      throw new InvalidOperationError('Transaction is not reconciled');
    }

    this.props.isReconciled = false;
    this.props.reconciledAt = undefined;
    this.touch();
  }

  // =========================================
  // VALIDAÇÕES
  // =========================================

  private validate(): void {
    if (!this.props.organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    if (!this.props.type) {
      throw new ValidationError('Transaction type is required');
    }

    if (!this.props.accountId) {
      throw new ValidationError('Account ID is required');
    }

    if (!this.props.categoryId) {
      throw new ValidationError('Category ID is required');
    }

    if (!this.props.description || this.props.description.trim().length === 0) {
      throw new ValidationError('Description is required');
    }

    if (this.props.amount.isNegative() || this.props.amount.isZero()) {
      throw new ValidationError('Amount must be positive');
    }

    if (this.isTransfer && !this.props.toAccountId) {
      throw new ValidationError('Destination account is required for transfers');
    }

    if (this.isTransfer && this.props.accountId === this.props.toAccountId) {
      throw new ValidationError('Source and destination accounts must be different');
    }

    if (this.props.recurrenceEndDate && this.props.recurrenceEndDate < this.props.date) {
      throw new ValidationError('Recurrence end date must be after transaction date');
    }
  }

  private assertNotCancelled(): void {
    if (this.props.status === 'CANCELLED') {
      throw new InvalidOperationError('Cannot modify a cancelled transaction');
    }
  }

  private assertNotReconciled(): void {
    if (this.props.isReconciled) {
      throw new InvalidOperationError('Cannot modify a reconciled transaction');
    }
  }

  // =========================================
  // QUERIES
  // =========================================

  isInDateRange(range: DateRange): boolean {
    return range.contains(this.props.date);
  }

  isInCompetenceDateRange(range: DateRange): boolean {
    return range.contains(this.competenceDate);
  }

  // =========================================
  // SERIALIZAÇÃO
  // =========================================

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      type: this.type,
      status: this.status,
      amount: this.amount.toJSON(),
      exchangeRate: this.exchangeRate,
      description: this.description,
      notes: this.notes,
      date: this.date.toISOString(),
      competenceDate: this.competenceDate.toISOString(),
      accountId: this.accountId,
      toAccountId: this.toAccountId,
      categoryId: this.categoryId,
      costCenterId: this.costCenterId,
      projectId: this.projectId,
      contactId: this.contactId,
      recurrenceType: this.recurrenceType,
      recurrenceEndDate: this.recurrenceEndDate?.toISOString(),
      recurrenceParentId: this.recurrenceParentId,
      attachments: [...this.attachments],
      tags: [...this.tags],
      isReconciled: this.isReconciled,
      reconciledAt: this.reconciledAt?.toISOString(),
      externalId: this.externalId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
