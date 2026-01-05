/* eslint-disable @typescript-eslint/no-explicit-any */
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

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
      include: {
        category: true,
        account: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Transaction GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar transação', details: error instanceof Error ? error.message : 'Unknown' },
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

    // Verify transaction belongs to organization
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { description, amount, type, date, categoryId, accountId, notes, costCenterId, projectId, contactId, status } = body;

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount }),
        ...(type !== undefined && { type }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(accountId !== undefined && { accountId }),
        ...(notes !== undefined && { notes }),
        ...(costCenterId !== undefined && { costCenterId }),
        ...(projectId !== undefined && { projectId }),
        ...(contactId !== undefined && { contactId }),
        ...(status !== undefined && { status }),
      },
      include: {
        category: true,
        account: true,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Transaction PUT error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar transação', details: error instanceof Error ? error.message : 'Unknown' },
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

    // Verify transaction belongs to organization
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transaction DELETE error:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir transação', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
