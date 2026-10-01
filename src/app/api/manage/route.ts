import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, action, expiry_date } = body;
    
    if (!id || !action) return NextResponse.json({ status: 'error', message: 'Missing id or action' }, { status: 400 });

    if (action === 'reset_mac') {
      await pool.execute('UPDATE licenses SET mac_address = NULL WHERE id = ?', [id]);
      return NextResponse.json({ status: 'success', message: 'Device has been delinked. The next device to connect will bind automatically.' });
    }

    if (action === 'link_mac') {
      const { mac_address } = body;
      if (!mac_address) return NextResponse.json({ status: 'error', message: 'Missing MAC address' }, { status: 400 });
      await pool.execute('UPDATE licenses SET mac_address = ? WHERE id = ?', [mac_address, id]);
      return NextResponse.json({ status: 'success', message: `Device linked successfully to ${mac_address}` });
    }

    if (action === 'update_expiry') {
      if (!expiry_date) return NextResponse.json({ status: 'error', message: 'Missing new expiry date' }, { status: 400 });
      await pool.execute('UPDATE licenses SET expiry_date = ?, status = IF(expiry_date >= CURDATE(), "Active", status) WHERE id = ?', [expiry_date, id]);
      return NextResponse.json({ status: 'success', message: `Expiry date updated successfully to ${expiry_date}` });
    }

    const statusMap: Record<string, string> = {
      revoke: 'Revoked',
      suspend: 'Suspended',
      activate: 'Active',
    };

    const newStatus = statusMap[action];
    if (!newStatus) return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });

    await pool.execute('UPDATE licenses SET status = ? WHERE id = ?', [newStatus, id]);
    return NextResponse.json({ status: 'success', message: `License ${action}d successfully` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: 'error', message: 'Server error' }, { status: 500 });
  }
}
