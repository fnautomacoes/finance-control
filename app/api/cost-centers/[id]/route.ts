import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma.service';
import { AuthService } from '@/infrastructure/services/auth.service';

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

    const existing = await prisma.costCenter.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Centro de custo não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, code, color, parentId, isActive } = body;

    const costCenter = await prisma.costCenter.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(color && { color }),
        ...(parentId !== undefined && { parentId }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(costCenter);
  } catch (error) {
    console.error('CostCenter PUT error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar centro de custo', details: error instanceof Error ? error.message : 'Unknown' },
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

    const existing = await prisma.costCenter.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Centro de custo não encontrado' }, { status: 404 });
    }

    // Check if cost center has transactions
    const transactionCount = await prisma.transaction.count({
      where: { costCenterId: params.id },
    });

    if (transactionCount > 0) {
      // Soft delete
      await prisma.costCenter.update({
        where: { id: params.id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: 'Centro de custo desativado (possui transações vinculadas)' });
    }

    await prisma.costCenter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Centro de custo excluído com sucesso' });
  } catch (error) {
    console.error('CostCenter DELETE error:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir centro de custo', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
