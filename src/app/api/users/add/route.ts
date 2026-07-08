import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { username, email, role, password } = await req.json();

    const userEmail = email || (username && (username.includes('@') ? username : `${username.toLowerCase()}@ridm.system`));

    if (!userEmail || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      uid: `user_${Date.now()}`,
      email: userEmail
    });
  } catch (error: any) {
    console.error('Error adding user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
