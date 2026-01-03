/**
 * Category Entity
 *
 * Representa uma categoria de transação (receita ou despesa).
 * Suporta hierarquia (categorias e subcategorias).
 */

import { Entity, EntityProps } from '@/domain/core/entities';
import { ValidationError, InvalidOperationError } from '@/domain/core/errors';
import { TransactionType } from '@/domain/transaction/entities';

export interface CategoryProps extends EntityProps {
  organizationId: string;
  parentId?: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
}

export class Category extends Entity<CategoryProps> {
  private constructor(props: CategoryProps) {
    super(props);
    this.validate();
  }

  // =========================================
  // FACTORY
  // =========================================

  static create(
    props: Omit<CategoryProps, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'isSystem' | 'sortOrder'> & {
      sortOrder?: number;
    }
  ): Category {
    return new Category({
      ...props,
      sortOrder: props.sortOrder ?? 0,
      isActive: true,
      isSystem: false,
    });
  }

  static createSystem(
    props: Omit<CategoryProps, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'isSystem' | 'sortOrder'> & {
      sortOrder?: number;
    }
  ): Category {
    return new Category({
      ...props,
      sortOrder: props.sortOrder ?? 0,
      isActive: true,
      isSystem: true,
    });
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(props);
  }

  // =========================================
  // GETTERS
  // =========================================

  get organizationId(): string {
    return this.props.organizationId;
  }

  get parentId(): string | undefined {
    return this.props.parentId;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): TransactionType {
    return this.props.type;
  }

  get color(): string {
    return this.props.color;
  }

  get icon(): string {
    return this.props.icon;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get isSubcategory(): boolean {
    return this.props.parentId !== undefined;
  }

  get isIncomeCategory(): boolean {
    return this.props.type === 'INCOME';
  }

  get isExpenseCategory(): boolean {
    return this.props.type === 'EXPENSE';
  }

  // =========================================
  // COMMANDS
  // =========================================

  updateName(name: string): void {
    this.assertNotSystem();

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Category name cannot be empty');
    }

    if (name.length > 100) {
      throw new ValidationError('Category name cannot exceed 100 characters');
    }

    this.props.name = name.trim();
    this.touch();
  }

  updateAppearance(color: string, icon: string): void {
    if (!this.isValidColor(color)) {
      throw new ValidationError('Invalid color format');
    }

    this.props.color = color;
    this.props.icon = icon;
    this.touch();
  }

  updateSortOrder(sortOrder: number): void {
    if (sortOrder < 0) {
      throw new ValidationError('Sort order cannot be negative');
    }

    this.props.sortOrder = sortOrder;
    this.touch();
  }

  moveToParent(parentId: string | undefined): void {
    this.assertNotSystem();

    if (parentId === this.id) {
      throw new InvalidOperationError('Category cannot be its own parent');
    }

    this.props.parentId = parentId;
    this.touch();
  }

  deactivate(): void {
    this.assertNotSystem();

    if (!this.props.isActive) {
      throw new InvalidOperationError('Category is already inactive');
    }

    this.props.isActive = false;
    this.touch();
  }

  activate(): void {
    if (this.props.isActive) {
      throw new InvalidOperationError('Category is already active');
    }

    this.props.isActive = true;
    this.touch();
  }

  // =========================================
  // VALIDAÇÕES
  // =========================================

  private validate(): void {
    if (!this.props.organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new ValidationError('Category name is required');
    }

    if (!this.props.type) {
      throw new ValidationError('Category type is required');
    }

    // Transferências não devem ter categoria específica
    if (this.props.type === 'TRANSFER') {
      throw new ValidationError('Categories cannot be of type TRANSFER');
    }
  }

  private assertNotSystem(): void {
    if (this.props.isSystem) {
      throw new InvalidOperationError('Cannot modify a system category');
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
      parentId: this.parentId,
      name: this.name,
      type: this.type,
      color: this.color,
      icon: this.icon,
      sortOrder: this.sortOrder,
      isActive: this.isActive,
      isSystem: this.isSystem,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

/**
 * Categorias padrão do sistema
 */
export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salário', icon: 'briefcase', color: '#22c55e' },
  { name: 'Investimentos', icon: 'trending-up', color: '#3b82f6' },
  { name: 'Freelance', icon: 'laptop', color: '#8b5cf6' },
  { name: 'Vendas', icon: 'shopping-bag', color: '#f59e0b' },
  { name: 'Aluguéis', icon: 'home', color: '#06b6d4' },
  { name: 'Outras Receitas', icon: 'plus-circle', color: '#64748b' },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Moradia', icon: 'home', color: '#ef4444' },
  { name: 'Alimentação', icon: 'utensils', color: '#f97316' },
  { name: 'Transporte', icon: 'car', color: '#eab308' },
  { name: 'Saúde', icon: 'heart', color: '#ec4899' },
  { name: 'Educação', icon: 'graduation-cap', color: '#8b5cf6' },
  { name: 'Lazer', icon: 'gamepad-2', color: '#06b6d4' },
  { name: 'Vestuário', icon: 'shirt', color: '#14b8a6' },
  { name: 'Serviços', icon: 'wrench', color: '#6366f1' },
  { name: 'Impostos', icon: 'file-text', color: '#dc2626' },
  { name: 'Outras Despesas', icon: 'minus-circle', color: '#64748b' },
];
