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
    const entityType = searchParams.get('entityType');

    const where: any = {
      organizationId: membership.organizationId,
      isActive: true,
    };

    if (entityType) {
      where.entityType = entityType;
    }

    const customFields = await prisma.customField.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(customFields);
  } catch (error) {
    console.error('CustomFields GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar campos personalizados', details: error instanceof Error ? error.message : 'Unknown' },
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
    const { name, fieldType, options, entityType, isRequired } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const customField = await prisma.customField.create({
      data: {
        organizationId: membership.organizationId,
        name,
        fieldType: fieldType || 'text',
        options: options || [],
        entityType: entityType || 'contact',
        isRequired: isRequired || false,
      },
    });

    return NextResponse.json(customField, { status: 201 });
  } catch (error) {
    console.error('CustomField POST error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar campo personalizado', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
