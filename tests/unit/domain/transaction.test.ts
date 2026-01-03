/**
 * Transaction Entity Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Transaction } from '@/domain/transaction/entities';
import { Money } from '@/domain/core/value-objects';

describe('Transaction Entity', () => {
  const baseProps = {
    organizationId: 'org-123',
    type: 'EXPENSE' as const,
    amount: Money.fromDecimal('100', 'BRL'),
    description: 'Test transaction',
    date: new Date('2026-01-03'),
    accountId: 'acc-123',
    categoryId: 'cat-123',
    recurrenceType: 'NONE' as const,
  };

  describe('Creation', () => {
    it('should create a completed transaction', () => {
      const transaction = Transaction.create(baseProps);

      expect(transaction.id).toBeDefined();
      expect(transaction.status).toBe('COMPLETED');
      expect(transaction.description).toBe('Test transaction');
      expect(transaction.isExpense).toBe(true);
    });

    it('should create a pending transaction', () => {
      const transaction = Transaction.createPending(baseProps);

      expect(transaction.status).toBe('PENDING');
      expect(transaction.isPending).toBe(true);
    });

    it('should validate required fields', () => {
      expect(() =>
        Transaction.create({
          ...baseProps,
          description: '',
        })
      ).toThrow('Description is required');
    });

    it('should validate positive amount', () => {
      expect(() =>
        Transaction.create({
          ...baseProps,
          amount: Money.fromDecimal('-100', 'BRL'),
        })
      ).toThrow('Amount must be positive');
    });

    it('should require destination account for transfers', () => {
      expect(() =>
        Transaction.create({
          ...baseProps,
          type: 'TRANSFER',
        })
      ).toThrow('Destination account is required for transfers');
    });

    it('should not allow same source and destination account', () => {
      expect(() =>
        Transaction.create({
          ...baseProps,
          type: 'TRANSFER',
          toAccountId: 'acc-123',
        })
      ).toThrow('Source and destination accounts must be different');
    });
  });

  describe('Signed Amount', () => {
    it('should return negative amount for expenses', () => {
      const expense = Transaction.create(baseProps);
      expect(expense.signedAmount.isNegative()).toBe(true);
    });

    it('should return positive amount for income', () => {
      const income = Transaction.create({
        ...baseProps,
        type: 'INCOME',
      });
      expect(income.signedAmount.isPositive()).toBe(true);
    });
  });

  describe('Status Management', () => {
    it('should complete a pending transaction', () => {
      const transaction = Transaction.createPending(baseProps);
      transaction.complete();

      expect(transaction.isCompleted).toBe(true);
    });

    it('should not complete an already completed transaction', () => {
      const transaction = Transaction.create(baseProps);

      expect(() => transaction.complete()).toThrow(
        'Only pending transactions can be completed'
      );
    });

    it('should cancel a transaction', () => {
      const transaction = Transaction.create(baseProps);
      transaction.cancel();

      expect(transaction.isCancelled).toBe(true);
    });

    it('should not cancel a reconciled transaction', () => {
      const transaction = Transaction.create(baseProps);
      transaction.reconcile('ext-123');

      expect(() => transaction.cancel()).toThrow(
        'Cannot cancel a reconciled transaction'
      );
    });
  });

  describe('Reconciliation', () => {
    it('should reconcile a completed transaction', () => {
      const transaction = Transaction.create(baseProps);
      transaction.reconcile('bank-tx-123');

      expect(transaction.isReconciled).toBe(true);
      expect(transaction.externalId).toBe('bank-tx-123');
      expect(transaction.reconciledAt).toBeDefined();
    });

    it('should not reconcile a pending transaction', () => {
      const transaction = Transaction.createPending(baseProps);

      expect(() => transaction.reconcile()).toThrow(
        'Only completed transactions can be reconciled'
      );
    });

    it('should unreconcile a transaction', () => {
      const transaction = Transaction.create(baseProps);
      transaction.reconcile();
      transaction.unreconcile();

      expect(transaction.isReconciled).toBe(false);
      expect(transaction.reconciledAt).toBeUndefined();
    });
  });

  describe('Modifications', () => {
    it('should update description', () => {
      const transaction = Transaction.create(baseProps);
      transaction.updateDescription('Updated description', 'Some notes');

      expect(transaction.description).toBe('Updated description');
      expect(transaction.notes).toBe('Some notes');
    });

    it('should not update description on cancelled transaction', () => {
      const transaction = Transaction.create(baseProps);
      transaction.cancel();

      expect(() =>
        transaction.updateDescription('New description')
      ).toThrow('Cannot modify a cancelled transaction');
    });

    it('should update amount', () => {
      const transaction = Transaction.create(baseProps);
      const newAmount = Money.fromDecimal('200', 'BRL');
      transaction.updateAmount(newAmount);

      expect(transaction.amount.equals(newAmount)).toBe(true);
    });

    it('should not update amount on reconciled transaction', () => {
      const transaction = Transaction.create(baseProps);
      transaction.reconcile();

      expect(() =>
        transaction.updateAmount(Money.fromDecimal('200', 'BRL'))
      ).toThrow('Cannot modify a reconciled transaction');
    });

    it('should update category', () => {
      const transaction = Transaction.create(baseProps);
      transaction.updateCategory('new-cat-123');

      expect(transaction.categoryId).toBe('new-cat-123');
    });
  });

  describe('Tags', () => {
    it('should add tags', () => {
      const transaction = Transaction.create(baseProps);
      transaction.addTag('importante');
      transaction.addTag('urgente');

      expect(transaction.tags).toContain('importante');
      expect(transaction.tags).toContain('urgente');
    });

    it('should normalize tags to lowercase', () => {
      const transaction = Transaction.create(baseProps);
      transaction.addTag('IMPORTANTE');

      expect(transaction.tags).toContain('importante');
    });

    it('should not add duplicate tags', () => {
      const transaction = Transaction.create(baseProps);
      transaction.addTag('tag');
      transaction.addTag('tag');

      expect(transaction.tags.filter((t) => t === 'tag').length).toBe(1);
    });

    it('should remove tags', () => {
      const transaction = Transaction.create(baseProps);
      transaction.addTag('tag');
      transaction.removeTag('tag');

      expect(transaction.tags).not.toContain('tag');
    });
  });

  describe('Domain Events', () => {
    it('should emit TransactionCreated event', () => {
      const transaction = Transaction.create(baseProps);
      const events = transaction.domainEvents;

      expect(events.length).toBe(1);
      expect(events[0]!.eventType).toBe('TransactionCreated');
    });

    it('should emit TransactionCompleted event', () => {
      const transaction = Transaction.createPending(baseProps);
      transaction.clearDomainEvents();
      transaction.complete();

      const events = transaction.domainEvents;
      expect(events.some((e) => e.eventType === 'TransactionCompleted')).toBe(true);
    });

    it('should clear domain events', () => {
      const transaction = Transaction.create(baseProps);
      expect(transaction.domainEvents.length).toBeGreaterThan(0);

      transaction.clearDomainEvents();
      expect(transaction.domainEvents.length).toBe(0);
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const transaction = Transaction.create(baseProps);
      const json = transaction.toJSON();

      expect(json.id).toBe(transaction.id);
      expect(json.type).toBe('EXPENSE');
      expect(json.status).toBe('COMPLETED');
      expect(json.amount).toEqual({ amount: '100', currency: 'BRL' });
    });
  });
});
