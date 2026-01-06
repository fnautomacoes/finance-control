/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma.service';
import { AuthService } from '@/infrastructure/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const payload = await AuthService.verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: payload.userId },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    const orgId = membership.organizationId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch all data in parallel
    const [
      accounts,
      transactions,
      categories,
      goals,
      assets,
      allTransactions, // All transactions to calculate current balance
    ] = await Promise.all([
      // Accounts with balances
      prisma.account.findMany({
        where: { organizationId: orgId, isActive: true },
        orderBy: { name: 'asc' },
      }),
      // Transactions for current month
      prisma.transaction.findMany({
        where: {
          organizationId: orgId,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        include: { category: true, account: true },
      }),
      // Categories
      prisma.category.findMany({
        where: { organizationId: orgId, isActive: true },
      }),
      // Goals
      prisma.goal.findMany({
        where: { organizationId: orgId, isActive: true },
      }),
      // Assets (investments)
      prisma.asset.findMany({
        where: { organizationId: orgId, isActive: true },
        include: { operations: true },
      }),
      // All transactions for balance calculation
      prisma.transaction.findMany({
        where: { organizationId: orgId },
      }),
    ]);

    // Calculate current balance for each account
    const accountsWithBalance = accounts.map((account: any) => {
      const accountTxns = allTransactions.filter((t: any) => t.accountId === account.id);
      let balance = Number(account.initialBalance) || 0;
      accountTxns.forEach((t: any) => {
        if (t.type === 'INCOME') {
          balance += Number(t.amount);
        } else if (t.type === 'EXPENSE') {
          balance -= Number(t.amount);
        }
      });
      return { ...account, currentBalance: balance };
    });

    // Credit cards are accounts with type CREDIT_CARD
    const creditCardAccounts = accountsWithBalance.filter((a: any) => a.type === 'CREDIT_CARD');

    // Calculate totals
    const totalBankBalance = accountsWithBalance
      .filter((a: any) => ['CHECKING', 'SAVINGS', 'CASH'].includes(a.type))
      .reduce((sum: number, a: any) => sum + Number(a.currentBalance), 0);

    // Calculate investment totals from assets
    const totalInvestments = assets.reduce((sum: number, asset: any) => {
      const bought = asset.operations
        .filter((op: any) => op.operationType === 'BUY')
        .reduce((s: number, op: any) => s + Number(op.totalAmount), 0);
      const sold = asset.operations
        .filter((op: any) => op.operationType === 'SELL')
        .reduce((s: number, op: any) => s + Number(op.totalAmount), 0);
      return sum + (bought - sold);
    }, 0);

    // Calculate income and expenses by category
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    const incomeByCostCenter: Record<string, number> = {};
    const expenseByCostCenter: Record<string, number> = {};

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t: any) => {
      const amount = Number(t.amount);
      const categoryName = t.category?.name || 'Sem categoria';
      const costCenter = t.costCenter || 'Sem centro';

      if (t.type === 'INCOME') {
        totalIncome += amount;
        incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + amount;
        incomeByCostCenter[costCenter] = (incomeByCostCenter[costCenter] || 0) + amount;
      } else if (t.type === 'EXPENSE') {
        totalExpense += amount;
        expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + amount;
        expenseByCostCenter[costCenter] = (expenseByCostCenter[costCenter] || 0) + amount;
      }
    });

    // Cash results by account (excluding credit cards)
    const cashAccounts = accountsWithBalance.filter((a: any) => a.type !== 'CREDIT_CARD');
    const cashResults = cashAccounts.map((account: any) => {
      const accountTransactions = transactions.filter((t: any) => t.accountId === account.id);
      const entradas = accountTransactions
        .filter((t: any) => t.type === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      const saidas = accountTransactions
        .filter((t: any) => t.type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      return {
        id: account.id,
        name: account.name,
        entradas,
        saidas,
        resultado: entradas - saidas,
        confirmedBalance: Number(account.currentBalance),
        projectedBalance: Number(account.currentBalance) + entradas - saidas,
      };
    });

    // Monthly cashflow (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleDateString('pt-BR', { month: 'short' });

      const monthTransactions = await prisma.transaction.findMany({
        where: {
          organizationId: orgId,
          date: { gte: monthStart, lte: monthEnd },
        },
      });

      const income = monthTransactions
        .filter((t: any) => t.type === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      const expense = monthTransactions
        .filter((t: any) => t.type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      monthlyData.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        income,
        expense,
        balance: income - expense,
      });
    }

    // Credit card debt from credit card accounts (negative balance = debt)
    const creditCardDebt = creditCardAccounts.reduce((sum: number, cc: any) => {
      const balance = Number(cc.currentBalance);
      return sum + (balance < 0 ? Math.abs(balance) : 0);
    }, 0);

    // Balance sheet
    const balanceSheet = {
      ativo: {
        disponivel: totalBankBalance,
        realizavel: totalInvestments,
        total: totalBankBalance + totalInvestments,
      },
      passivo: {
        devedor: creditCardDebt,
        exigivel: 0,
        total: creditCardDebt,
      },
    };

    // Format credit cards from accounts
    const formattedCreditCards = creditCardAccounts.map((cc: any) => ({
      id: cc.id,
      name: cc.name,
      color: cc.color || '#6366f1',
      limit: Number(cc.creditLimit) || 0,
      currentBalance: Math.abs(Number(cc.currentBalance)),
      availableLimit: (Number(cc.creditLimit) || 0) - Math.abs(Number(cc.currentBalance)),
      closingDay: cc.closingDay || 1,
      dueDay: cc.dueDay || 10,
    }));

    // Goals with progress
    const goalsWithProgress = goals.map((g: any) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount || 0),
      progress: Number(g.targetAmount) > 0 ? (Number(g.currentAmount || 0) / Number(g.targetAmount)) * 100 : 0,
    }));

    return NextResponse.json({
      summary: {
        totalPatrimony: totalBankBalance + totalInvestments,
        totalBankBalance,
        totalInvestments,
        activeGoals: goals.length,
        totalIncome,
        totalExpense,
      },
      accounts: cashAccounts.map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: Number(a.currentBalance),
        color: a.color,
      })),
      cashResults,
      monthlyData,
      incomeByCategory: Object.entries(incomeByCategory).map(([name, value]) => ({ name, value })),
      expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })),
      incomeByCostCenter: Object.entries(incomeByCostCenter).map(([name, value]) => ({ name, value })),
      expenseByCostCenter: Object.entries(expenseByCostCenter).map(([name, value]) => ({ name, value })),
      creditCards: formattedCreditCards,
      goals: goalsWithProgress,
      balanceSheet,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar dashboard', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
