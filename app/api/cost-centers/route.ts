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
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: any = {
      organizationId: membership.organizationId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    const costCenters = await prisma.costCenter.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json(costCenters);
  } catch (error) {
    console.error('CostCenters GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar centros de custo', details: error instanceof Error ? error.message : 'Unknown' },
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
    const { name, code, color, parentId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const costCenter = await prisma.costCenter.create({
      data: {
        organizationId: membership.organizationId,
        name,
        code,
        color: color || '#6366f1',
        parentId,
      },
    });

    return NextResponse.json(costCenter, { status: 201 });
  } catch (error) {
    console.error('CostCenter POST error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar centro de custo', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
