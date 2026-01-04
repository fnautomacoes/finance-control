import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma.service';
import { AuthService } from '@/infrastructure/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Busca usuário
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verifica senha
    const isValidPassword = await AuthService.verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Atualiza último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Gera token JWT
    const token = await AuthService.generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    // Cria sessão
    const sessionToken = await AuthService.generateSessionToken();
    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    const response = NextResponse.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    // Define cookie HTTP-only com o token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: errorMessage,
        stack: process.env.NODE_ENV !== 'production' ? errorStack : undefined,
        hint: 'Verifique a conexão com o banco de dados'
      },
      { status: 500 }
    );
  }
}
