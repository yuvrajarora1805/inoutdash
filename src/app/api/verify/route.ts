import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyLicenseKey } from '@/lib/license';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const domain = searchParams.get('domain');
  const mac = searchParams.get('mac');
  const product = searchParams.get('product');
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  if (!key) {
    return NextResponse.json({ status: 'error', message: 'License key is required' }, { status: 400 });
  }

  // Verify cryptographic signature first
  const decoded = verifyLicenseKey(key);
  if (!decoded) {
    return NextResponse.json({ status: 'error', message: 'Invalid license key (signature mismatch)' }, { status: 403 });
  }

  // Check DB record
  try {
    let query = 'SELECT * FROM licenses WHERE license_key = ? LIMIT 1';
    const [rows]: any = await pool.execute(query, [key]);

    if (rows.length === 0) {
      return NextResponse.json({ status: 'error', message: 'License not found' }, { status: 404 });
    }

    const lic = rows[0];

    // Check product match
    if (product && lic.product !== product) {
      return NextResponse.json({ status: 'error', message: 'License product mismatch' }, { status: 403 });
    }

    // Check domain match (Disabled for localhost/intranet applications)
    // if (domain && lic.domain !== domain) {
    //   return NextResponse.json({ status: 'error', message: 'Domain not authorized for this license' }, { status: 403 });
    // }

    // MAC address binding check
    if (!lic.mac_address && mac) {
      // Auto-bind MAC on first use
      await pool.execute('UPDATE licenses SET mac_address = ? WHERE id = ?', [mac, lic.id]);
      lic.mac_address = mac;
    } else if (lic.mac_address && mac && lic.mac_address !== mac) {
      await logPing(lic.id, ip, mac, 'MAC_MISMATCH');
      return NextResponse.json({ status: 'error', message: 'Device not authorized (MAC mismatch)' }, { status: 403 });
    }

    // Status check
    if (lic.status === 'Revoked') {
      await logPing(lic.id, ip, mac, 'REVOKED');
      return NextResponse.json({ status: 'error', message: 'License has been revoked' }, { status: 403 });
    }
    if (lic.status === 'Suspended') {
      await logPing(lic.id, ip, mac, 'SUSPENDED');
      return NextResponse.json({ status: 'error', message: 'License is suspended' }, { status: 403 });
    }

    // Expiry check
    const expiryMs = new Date(lic.expiry_date).getTime() + 86400000; // end of day
    if (Date.now() > expiryMs) {
      await pool.execute("UPDATE licenses SET status = 'Expired' WHERE id = ?", [lic.id]);
      await logPing(lic.id, ip, mac, 'EXPIRED');
      return NextResponse.json({ status: 'error', message: 'License has expired', expiry_date: lic.expiry_date }, { status: 403 });
    }

    await logPing(lic.id, ip, mac || null, 'OK');

    return NextResponse.json({
      status: 'success',
      message: 'License is valid',
      product: lic.product,
      domain: lic.domain,
      plan: lic.plan,
      max_users: lic.max_users,
      expiry_date: lic.expiry_date,
      features: typeof lic.features === 'string' ? JSON.parse(lic.features) : lic.features,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
  }
}

async function logPing(license_id: number, ip: string, mac: string | null, status: string) {
  try {
    await pool.execute(
      'INSERT INTO license_pings (license_id, ip_address, mac_address, status) VALUES (?, ?, ?, ?)',
      [license_id, ip, mac, status]
    );
  } catch (e) {
    console.error('Failed to log ping:', e);
  }
}
