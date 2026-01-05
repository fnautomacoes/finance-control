/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma.service';
import { AuthService } from '@/infrastructure/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const payload = await AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: payload.userId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    const orgId = membership.organizationId;
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const accountIds = searchParams.get('accountIds')?.split(',').filter(Boolean) || [];
    const includePending = searchParams.get('includePending') === 'true';
    const excludeTransfers = searchParams.get('excludeTransfers') === 'true';

    // Default to last 7 days if no dates provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Set time to start/end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all accounts
    const allAccounts = await prisma.account.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        type: { not: 'CREDIT_CARD' } // Exclude credit cards from cash flow
      },
      orderBy: { name: 'asc' },
    });

    // Filter accounts if specific ones are selected
    const selectedAccounts = accountIds.length > 0
      ? allAccounts.filter((a: any) => accountIds.includes(a.id))
      : allAccounts;

    const selectedAccountIds = selectedAccounts.map((a: any) => a.id);

    // Build transaction where clause
    const transactionWhere: any = {
      organizationId: orgId,
      accountId: { in: selectedAccountIds },
      date: { gte: startDate, lte: endDate },
    };

    if (!includePending) {
      transactionWhere.status = 'COMPLETED';
    }

    if (excludeTransfers) {
      transactionWhere.type = { not: 'TRANSFER' };
    }

    // Fetch transactions in the date range
    const transactions = await prisma.transaction.findMany({
      where: transactionWhere,
      include: { account: true, category: true },
      orderBy: { date: 'asc' },
    });

    // Calculate initial balance for each account (before start date)
    const accountBalances: Record<string, number> = {};

    for (const account of selectedAccounts) {
      let balance = Number(account.initialBalance);

      // Get all transactions before start date for this account
      const priorTransactions = await prisma.transaction.findMany({
        where: {
          organizationId: orgId,
          accountId: account.id,
          date: { lt: startDate },
          ...(includePending ? {} : { status: 'COMPLETED' }),
          ...(excludeTransfers ? { type: { not: 'TRANSFER' } } : {}),
        },
      });

      priorTransactions.forEach((t: any) => {
        if (t.type === 'INCOME') {
          balance += Number(t.amount);
        } else if (t.type === 'EXPENSE') {
          balance -= Number(t.amount);
        }
      });

      accountBalances[account.id] = balance;
    }

    // Calculate total initial balance
    const totalInitialBalance = Object.values(accountBalances).reduce((sum, bal) => sum + bal, 0);

    // Generate daily data
    const dailyData: any[] = [];
    let runningBalance = totalInitialBalance;

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0] ?? '';
      const dayTransactions = transactions.filter((t: any) => {
        const tDate = new Date(t.date).toISOString().split('T')[0];
        return tDate === dateStr;
      });

      let dayIncome = 0;
      let dayExpense = 0;

      dayTransactions.forEach((t: any) => {
        if (t.type === 'INCOME') {
          dayIncome += Number(t.amount);
        } else if (t.type === 'EXPENSE') {
          dayExpense += Number(t.amount);
        }
      });

      const dayResult = dayIncome - dayExpense;
      runningBalance += dayResult;

      dailyData.push({
        date: dateStr,
        dateFormatted: currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        income: dayIncome,
        expense: dayExpense,
        result: dayResult,
        balance: runningBalance,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate totals for the period
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t: any) => {
      if (t.type === 'INCOME') {
        totalIncome += Number(t.amount);
      } else if (t.type === 'EXPENSE') {
        totalExpense += Number(t.amount);
      }
    });

    // Calculate final balance for each account
    const accountsWithBalances = selectedAccounts.map((account: any) => {
      const accountTransactions = transactions.filter((t: any) => t.accountId === account.id);
      let finalBalance = accountBalances[account.id] ?? 0;

      accountTransactions.forEach((t: any) => {
        if (t.type === 'INCOME') {
          finalBalance += Number(t.amount);
        } else if (t.type === 'EXPENSE') {
          finalBalance -= Number(t.amount);
        }
      });

      return {
        id: account.id,
        name: account.name,
        color: account.color,
        type: account.type,
        initialBalance: accountBalances[account.id] ?? 0,
        finalBalance,
      };
    });

    return NextResponse.json({
      accounts: allAccounts.map((a: any) => ({
        id: a.id,
        name: a.name,
        color: a.color,
        type: a.type,
      })),
      selectedAccounts: accountsWithBalances,
      summary: {
        initialBalance: totalInitialBalance,
        totalIncome,
        totalExpense,
        result: totalIncome - totalExpense,
        finalBalance: totalInitialBalance + totalIncome - totalExpense,
      },
      dailyData,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Cashflow GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar fluxo de caixa', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
