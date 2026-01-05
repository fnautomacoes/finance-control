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
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type'); // INCOME, EXPENSE, or null for all
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = { organizationId: orgId };

    if (accountId) {
      where.accountId = accountId;
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Get account for initial balance calculation
    let initialBalance = 0;
    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });
      if (account) {
        initialBalance = Number(account.initialBalance);

        // Calculate balance from all transactions before the filter period
        if (startDate) {
          const priorTransactions = await prisma.transaction.findMany({
            where: {
              organizationId: orgId,
              accountId,
              date: { lt: new Date(startDate) },
            },
          });

          priorTransactions.forEach((t: any) => {
            if (t.type === 'INCOME') {
              initialBalance += Number(t.amount);
            } else if (t.type === 'EXPENSE') {
              initialBalance -= Number(t.amount);
            }
          });
        }
      }
    }

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t: any) => {
      if (t.type === 'INCOME') {
        totalIncome += Number(t.amount);
      } else if (t.type === 'EXPENSE') {
        totalExpense += Number(t.amount);
      }
    });

    // Calculate running balance for each transaction (from oldest to newest)
    const sortedTransactions = [...transactions].reverse();
    let runningBalance = initialBalance;

    const transactionsWithBalance = sortedTransactions.map((t: any) => {
      if (t.type === 'INCOME') {
        runningBalance += Number(t.amount);
      } else if (t.type === 'EXPENSE') {
        runningBalance -= Number(t.amount);
      }
      return {
        ...t,
        amount: Number(t.amount),
        runningBalance,
      };
    }).reverse(); // Reverse back to show newest first

    return NextResponse.json({
      transactions: transactionsWithBalance,
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        initialBalance,
        finalBalance: initialBalance + totalIncome - totalExpense,
      },
    });
  } catch (error) {
    console.error('Transactions GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar transações', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { description, amount, type, date, categoryId, accountId, notes, costCenterId, projectId, contactId } = body;

    if (!description || !amount || !type || !date || !categoryId || !accountId) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        organizationId: membership.organizationId,
        description,
        amount,
        type,
        date: new Date(date),
        categoryId,
        accountId,
        notes,
        costCenterId,
        projectId,
        contactId,
        status: 'COMPLETED',
      },
      include: {
        category: true,
        account: true,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Transaction POST error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar transação', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
