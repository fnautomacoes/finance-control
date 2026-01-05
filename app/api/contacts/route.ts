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
    const search = searchParams.get('search');
    const type = searchParams.get('type'); // customer, supplier, all
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: any = {
      organizationId: membership.organizationId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search } },
      ];
    }

    if (type === 'customer') {
      where.isCustomer = true;
    } else if (type === 'supplier') {
      where.isSupplier = true;
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Contacts GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contatos', details: error instanceof Error ? error.message : 'Unknown' },
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
    const {
      name, email, phone, taxId,
      address, city, state, postalCode, country,
      isCustomer, isSupplier, notes
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        organizationId: membership.organizationId,
        name,
        email,
        phone,
        taxId,
        address,
        city,
        state,
        postalCode,
        country: country || 'BR',
        isCustomer: isCustomer || false,
        isSupplier: isSupplier || false,
        notes,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Contact POST error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar contato', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
