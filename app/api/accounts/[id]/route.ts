import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma.service';
import { AuthService } from '@/infrastructure/services/auth.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const account = await prisma.account.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Calculate current balance
    const transactions = await prisma.transaction.findMany({
      where: { accountId: account.id },
    });

    let currentBalance = Number(account.initialBalance);
    transactions.forEach((t) => {
      if (t.type === 'INCOME') {
        currentBalance += Number(t.amount);
      } else if (t.type === 'EXPENSE') {
        currentBalance -= Number(t.amount);
      }
    });

    return NextResponse.json({
      ...account,
      initialBalance: Number(account.initialBalance),
      currentBalance,
      creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
    });
  } catch (error) {
    console.error('Account GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar conta', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existing = await prisma.account.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name, type, currency, initialBalance, initialDate, color, icon,
      creditLimit, closingDay, dueDay, bankCode, agencyNumber, accountNumber,
      isActive, isArchived
    } = body;

    const account = await prisma.account.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(currency && { currency }),
        ...(initialBalance !== undefined && { initialBalance }),
        ...(initialDate && { initialDate: new Date(initialDate) }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(creditLimit !== undefined && { creditLimit }),
        ...(closingDay !== undefined && { closingDay }),
        ...(dueDay !== undefined && { dueDay }),
        ...(bankCode !== undefined && { bankCode }),
        ...(agencyNumber !== undefined && { agencyNumber }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(isActive !== undefined && { isActive }),
        ...(isArchived !== undefined && { isArchived }),
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Account PUT error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar conta', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existing = await prisma.account.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Check if account has transactions
    const transactionCount = await prisma.transaction.count({
      where: { accountId: params.id },
    });

    if (transactionCount > 0) {
      // Archive instead of delete
      await prisma.account.update({
        where: { id: params.id },
        data: { isActive: false, isArchived: true },
      });
      return NextResponse.json({ message: 'Conta arquivada (possui transações vinculadas)' });
    }

    await prisma.account.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    console.error('Account DELETE error:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir conta', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
