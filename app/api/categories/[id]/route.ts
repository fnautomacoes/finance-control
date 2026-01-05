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

    const category = await prisma.category.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Category GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar categoria', details: error instanceof Error ? error.message : 'Unknown' },
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

    const existing = await prisma.category.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, color, icon, parentId, isActive, sortOrder } = body;

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(parentId !== undefined && { parentId }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Category PUT error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar categoria', details: error instanceof Error ? error.message : 'Unknown' },
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

    const existing = await prisma.category.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json({ error: 'Categorias do sistema não podem ser deletadas' }, { status: 400 });
    }

    // Check if category has transactions
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: params.id },
    });

    if (transactionCount > 0) {
      // Soft delete - just deactivate
      await prisma.category.update({
        where: { id: params.id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: 'Categoria desativada (possui transações vinculadas)' });
    }

    // Hard delete if no transactions
    await prisma.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Category DELETE error:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir categoria', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
