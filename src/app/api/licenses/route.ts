import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateLicenseKey, PLANS } from '@/lib/license';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get('product');
  const status = searchParams.get('status');

  let query = 'SELECT * FROM licenses WHERE 1=1';
  const params: any[] = [];

  if (product && product !== 'all') {
    query += ' AND product = ?';
    params.push(product);
  }
  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';

  try {
    const [rows] = await pool.execute(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: 'error', message: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product, customer_name, customer_email, domain, mac_address, plan, expiry_date, notes } = body;

    if (!product || !customer_name || !customer_email || !domain || !plan || !expiry_date) {
      return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
    }

    const planDetails = (PLANS as any)[product]?.[plan];
    if (!planDetails) {
      return NextResponse.json({ status: 'error', message: 'Invalid plan or product' }, { status: 400 });
    }

    const payload = {
      product,
      domain,
      plan,
      mac_address: mac_address || undefined,
      max_users: planDetails.max_users,
      expiry_date,
      features: planDetails.features,
      issued_at: new Date().toISOString(),
    };

    const license_key = generateLicenseKey(payload);

    await pool.execute(
      `INSERT INTO licenses 
        (product, customer_name, customer_email, domain, mac_address, license_key, plan, max_users, expiry_date, status, features, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)`,
      [
        product, customer_name, customer_email, domain,
        mac_address || null, license_key, plan,
        planDetails.max_users, expiry_date,
        JSON.stringify(planDetails.features),
        notes || null
      ]
    );

    return NextResponse.json({
      status: 'success',
      message: 'License generated successfully',
      license_key,
    });

  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ status: 'error', message: 'A license for this domain & product already exists.' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
  }
}
