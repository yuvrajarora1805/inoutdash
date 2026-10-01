import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const expectedUser = process.env.ADMIN_USER || 'admin';
    const expectedPass = process.env.ADMIN_PASS || 'admin123';
    const secret = process.env.JWT_SECRET || 'fallback-secret';

    if (username === expectedUser && password === expectedPass) {
      // Create a simple tamper-proof hash for the session
      const token = crypto.createHmac('sha256', secret).update(expectedUser).digest('hex');
      
      const response = NextResponse.json({ status: 'success', message: 'Logged in successfully' });
      
      // Set HttpOnly cookie for 24 hours
      response.cookies.set({
        name: 'admin_session',
        value: token,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      return response;
    }

    return NextResponse.json({ status: 'error', message: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ status: 'success', message: 'Logged out successfully' });
  response.cookies.delete('admin_session');
  return response;
}
