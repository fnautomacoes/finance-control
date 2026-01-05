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

    const contact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Contact GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contato', details: error instanceof Error ? error.message : 'Unknown' },
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

    const existing = await prisma.contact.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name, email, phone, taxId,
      address, city, state, postalCode, country,
      isCustomer, isSupplier, notes, isActive
    } = body;

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(taxId !== undefined && { taxId }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(postalCode !== undefined && { postalCode }),
        ...(country !== undefined && { country }),
        ...(isCustomer !== undefined && { isCustomer }),
        ...(isSupplier !== undefined && { isSupplier }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Contact PUT error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar contato', details: error instanceof Error ? error.message : 'Unknown' },
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

    const existing = await prisma.contact.findFirst({
      where: {
        id: params.id,
        organizationId: membership.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    // Check if contact has transactions
    const transactionCount = await prisma.transaction.count({
      where: { contactId: params.id },
    });

    if (transactionCount > 0) {
      // Soft delete
      await prisma.contact.update({
        where: { id: params.id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: 'Contato desativado (possui transações vinculadas)' });
    }

    await prisma.contact.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Contato excluído com sucesso' });
  } catch (error) {
    console.error('Contact DELETE error:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir contato', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
