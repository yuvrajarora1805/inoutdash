import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [[{ total }]]: any = await pool.execute('SELECT COUNT(*) as total FROM licenses');
    const [[{ active }]]: any = await pool.execute("SELECT COUNT(*) as active FROM licenses WHERE status = 'Active' AND expiry_date > CURDATE()");
    const [[{ expired }]]: any = await pool.execute("SELECT COUNT(*) as expired FROM licenses WHERE expiry_date <= CURDATE() OR status = 'Expired'");
    const [[{ revoked }]]: any = await pool.execute("SELECT COUNT(*) as revoked FROM licenses WHERE status = 'Revoked'");
    const [[{ inout_count }]]: any = await pool.execute("SELECT COUNT(*) as inout_count FROM licenses WHERE product = 'inout'");
    const [[{ koha_count }]]: any = await pool.execute("SELECT COUNT(*) as koha_count FROM licenses WHERE product = 'koha'");
    const [[{ pings_today }]]: any = await pool.execute("SELECT COUNT(*) as pings_today FROM license_pings WHERE DATE(pinged_at) = CURDATE()");
    const [expiring_soon]: any = await pool.execute(
      "SELECT customer_name, domain, product, expiry_date FROM licenses WHERE status='Active' AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) ORDER BY expiry_date ASC LIMIT 5"
    );
    return NextResponse.json({ total, active, expired, revoked, inout_count, koha_count, pings_today, expiring_soon });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
  }
}
