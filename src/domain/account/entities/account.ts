/**
 * Account Entity
 *
 * Representa uma conta financeira (corrente, poupança, cartão, etc.)
 * É um Aggregate Root que gerencia seu próprio saldo e transações.
 */

import { AggregateRoot, EntityProps, createDomainEvent } from '@/domain/core/entities';
import { Money, Currency } from '@/domain/core/value-objects';
import { ValidationError, InvalidOperationError } from '@/domain/core/errors';

export type AccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'INVESTMENT'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'DIGITAL_WALLET'
  | 'OTHER';

export interface AccountProps extends EntityProps {
  organizationId: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: Money;
  initialDate: Date;
  // Configurações específicas de cartão de crédito
  creditLimit?: Money;
  closingDay?: number;
  dueDay?: number;
  // Dados bancários
  bankCode?: string;
  agencyNumber?: string;
  accountNumber?: string;
  // Aparência
  color: string;
  icon: string;
  // Status
  isActive: boolean;
  isArchived: boolean;
}

export class Account extends AggregateRoot<AccountProps> {
  private constructor(props: AccountProps) {
    super(props);
    this.validate();
  }

  // =========================================
  // FACTORY
  // =========================================

  static create(props: Omit<AccountProps, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'isArchived'>): Account {
    const account = new Account({
      ...props,
      isActive: true,
      isArchived: false,
    });

    account.addDomainEvent(
      createDomainEvent('AccountCreated', account.id, {
        organizationId: props.organizationId,
        name: props.name,
        type: props.type,
        currency: props.currency,
      })
    );

    return account;
  }

  static reconstitute(props: AccountProps): Account {
    return new Account(props);
  }

  // =========================================
  // GETTERS
  // =========================================

  get organizationId(): string {
    return this.props.organizationId;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): AccountType {
    return this.props.type;
  }

  get currency(): Currency {
    return this.props.currency;
  }

  get initialBalance(): Money {
    return this.props.initialBalance;
  }

  get initialDate(): Date {
    return this.props.initialDate;
  }

  get creditLimit(): Money | undefined {
    return this.props.creditLimit;
  }

  get closingDay(): number | undefined {
    return this.props.closingDay;
  }

  get dueDay(): number | undefined {
    return this.props.dueDay;
  }

  get bankCode(): string | undefined {
    return this.props.bankCode;
  }

  get agencyNumber(): string | undefined {
    return this.props.agencyNumber;
  }

  get accountNumber(): string | undefined {
    return this.props.accountNumber;
  }

  get color(): string {
    return this.props.color;
  }

  get icon(): string {
    return this.props.icon;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isArchived(): boolean {
    return this.props.isArchived;
  }

  get isCreditCard(): boolean {
    return this.props.type === 'CREDIT_CARD';
  }

  // =========================================
  // COMMANDS
  // =========================================

  updateName(name: string): void {
    this.assertNotArchived();

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Account name cannot be empty');
    }

    if (name.length > 100) {
      throw new ValidationError('Account name cannot exceed 100 characters');
    }

    this.props.name = name.trim();
    this.touch();

    this.addDomainEvent(
      createDomainEvent('AccountUpdated', this.id, { field: 'name', value: name })
    );
  }

  updateAppearance(color: string, icon: string): void {
    this.assertNotArchived();

    if (!this.isValidColor(color)) {
      throw new ValidationError('Invalid color format');
    }

    this.props.color = color;
    this.props.icon = icon;
    this.touch();
  }

  updateCreditCardSettings(creditLimit: Money, closingDay: number, dueDay: number): void {
    this.assertNotArchived();

    if (!this.isCreditCard) {
      throw new InvalidOperationError('Cannot set credit card settings on non-credit card account');
    }

    if (creditLimit.currency !== this.currency) {
      throw new ValidationError('Credit limit currency must match account currency');
    }

    if (closingDay < 1 || closingDay > 28) {
      throw new ValidationError('Closing day must be between 1 and 28');
    }

    if (dueDay < 1 || dueDay > 28) {
      throw new ValidationError('Due day must be between 1 and 28');
    }

    this.props.creditLimit = creditLimit;
    this.props.closingDay = closingDay;
    this.props.dueDay = dueDay;
    this.touch();
  }

  updateBankDetails(bankCode?: string, agencyNumber?: string, accountNumber?: string): void {
    this.assertNotArchived();

    this.props.bankCode = bankCode;
    this.props.agencyNumber = agencyNumber;
    this.props.accountNumber = accountNumber;
    this.touch();
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new InvalidOperationError('Account is already inactive');
    }

    this.props.isActive = false;
    this.touch();

    this.addDomainEvent(
      createDomainEvent('AccountDeactivated', this.id, { organizationId: this.organizationId })
    );
  }

  activate(): void {
    if (this.props.isActive) {
      throw new InvalidOperationError('Account is already active');
    }

    if (this.props.isArchived) {
      throw new InvalidOperationError('Cannot activate an archived account');
    }

    this.props.isActive = true;
    this.touch();

    this.addDomainEvent(
      createDomainEvent('AccountActivated', this.id, { organizationId: this.organizationId })
    );
  }

  archive(): void {
    if (this.props.isArchived) {
      throw new InvalidOperationError('Account is already archived');
    }

    this.props.isActive = false;
    this.props.isArchived = true;
    this.touch();

    this.addDomainEvent(
      createDomainEvent('AccountArchived', this.id, { organizationId: this.organizationId })
    );
  }

  // =========================================
  // VALIDAÇÕES
  // =========================================

  private validate(): void {
    if (!this.props.organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new ValidationError('Account name is required');
    }

    if (!this.props.type) {
      throw new ValidationError('Account type is required');
    }

    if (!this.props.currency) {
      throw new ValidationError('Currency is required');
    }

    if (this.props.initialBalance.currency !== this.props.currency) {
      throw new ValidationError('Initial balance currency must match account currency');
    }

    if (this.isCreditCard) {
      if (!this.props.creditLimit) {
        throw new ValidationError('Credit limit is required for credit card accounts');
      }
      if (!this.props.closingDay || !this.props.dueDay) {
        throw new ValidationError('Closing day and due day are required for credit card accounts');
      }
    }
  }

  private assertNotArchived(): void {
    if (this.props.isArchived) {
      throw new InvalidOperationError('Cannot modify an archived account');
    }
  }

  private isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  // =========================================
  // SERIALIZAÇÃO
  // =========================================

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      type: this.type,
      currency: this.currency,
      initialBalance: this.initialBalance.toJSON(),
      initialDate: this.initialDate.toISOString(),
      creditLimit: this.creditLimit?.toJSON(),
      closingDay: this.closingDay,
      dueDay: this.dueDay,
      bankCode: this.bankCode,
      agencyNumber: this.agencyNumber,
      accountNumber: this.accountNumber,
      color: this.color,
      icon: this.icon,
      isActive: this.isActive,
      isArchived: this.isArchived,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
