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
      creditCards,
      goals,
      investments,
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
      // Credit cards
      prisma.creditCard.findMany({
        where: { organizationId: orgId, isActive: true },
        include: { account: true },
      }),
      // Goals
      prisma.goal.findMany({
        where: { organizationId: orgId, isActive: true },
      }),
      // Investments
      prisma.investment.findMany({
        where: { organizationId: orgId },
        include: { transactions: true },
      }),
    ]);

    // Calculate totals
    const totalBankBalance = accounts
      .filter(a => ['CHECKING', 'SAVINGS', 'CASH'].includes(a.type))
      .reduce((sum, a) => sum + Number(a.balance), 0);

    const totalInvestments = investments.reduce((sum, inv) => {
      const invested = inv.transactions
        .filter(t => t.type === 'BUY')
        .reduce((s, t) => s + Number(t.totalValue), 0);
      const sold = inv.transactions
        .filter(t => t.type === 'SELL')
        .reduce((s, t) => s + Number(t.totalValue), 0);
      return sum + (invested - sold);
    }, 0);

    // Calculate income and expenses by category
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    const incomeByCostCenter: Record<string, number> = {};
    const expenseByCostCenter: Record<string, number> = {};

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
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

    // Cash results by account
    const cashResults = accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      const entradas = accountTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const saidas = accountTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        id: account.id,
        name: account.name,
        entradas,
        saidas,
        resultado: entradas - saidas,
        confirmedBalance: Number(account.balance),
        projectedBalance: Number(account.balance) + entradas - saidas,
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
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = monthTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      monthlyData.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        income,
        expense,
        balance: income - expense,
      });
    }

    // Balance sheet
    const balanceSheet = {
      ativo: {
        disponivel: totalBankBalance,
        realizavel: totalInvestments,
        total: totalBankBalance + totalInvestments,
      },
      passivo: {
        devedor: creditCards.reduce((sum, cc) => sum + Number(cc.currentBalance || 0), 0),
        exigivel: 0, // Could add loans, etc.
        total: creditCards.reduce((sum, cc) => sum + Number(cc.currentBalance || 0), 0),
      },
    };

    // Format credit cards
    const formattedCreditCards = creditCards.map(cc => ({
      id: cc.id,
      name: cc.name,
      color: cc.color,
      limit: Number(cc.creditLimit),
      currentBalance: Number(cc.currentBalance || 0),
      availableLimit: Number(cc.creditLimit) - Number(cc.currentBalance || 0),
      closingDay: cc.closingDay,
      dueDay: cc.dueDay,
    }));

    // Goals with progress
    const goalsWithProgress = goals.map(g => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      progress: (Number(g.currentAmount) / Number(g.targetAmount)) * 100,
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
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: Number(a.balance),
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
