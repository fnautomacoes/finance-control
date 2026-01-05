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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {
      organizationId: membership.organizationId,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    if (type) {
      where.type = type;
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Calculate current balance for each account based on transactions
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account: any) => {
        const transactions = await prisma.transaction.findMany({
          where: { accountId: account.id },
        });

        let currentBalance = Number(account.initialBalance);
        transactions.forEach((t: any) => {
          if (t.type === 'INCOME') {
            currentBalance += Number(t.amount);
          } else if (t.type === 'EXPENSE') {
            currentBalance -= Number(t.amount);
          }
        });

        return {
          ...account,
          initialBalance: Number(account.initialBalance),
          currentBalance,
          creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
        };
      })
    );

    return NextResponse.json(accountsWithBalance);
  } catch (error) {
    console.error('Accounts GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contas', details: error instanceof Error ? error.message : 'Unknown' },
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
    const { name, type, currency, initialBalance, color, icon, creditLimit, closingDay, dueDay, bankCode, agencyNumber, accountNumber } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Nome e tipo são obrigatórios' }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        organizationId: membership.organizationId,
        name,
        type,
        currency: currency || 'BRL',
        initialBalance: initialBalance || 0,
        color: color || '#6366f1',
        icon: icon || 'wallet',
        creditLimit,
        closingDay,
        dueDay,
        bankCode,
        agencyNumber,
        accountNumber,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Account POST error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
