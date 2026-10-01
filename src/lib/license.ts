import crypto from 'crypto';

const SECRET = process.env.LICENSE_SECRET || 'omvky-super-secret-key-2024';

export interface LicensePayload {
  product: 'inout' | 'koha';
  domain: string;
  plan: string;
  mac_address?: string;
  max_users: number;
  expiry_date: string;
  features: string[];
  issued_at: string;
}

/**
 * Generates an encrypted, HMAC-signed license key.
 * Format: base64(JSON payload) + "." + HMAC-SHA256 signature
 */
export function generateLicenseKey(payload: LicensePayload): string {
  const jsonStr = JSON.stringify(payload);
  const encoded = Buffer.from(jsonStr).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex').substring(0, 16).toUpperCase();
  // Format as readable segments: AAAA-BBBB-...-SIGPART
  const sigPart = sig.match(/.{1,4}/g)?.join('-') || sig;
  return `${encoded}.${sigPart}`;
}

/**
 * Validates a license key and returns the decoded payload or null.
 */
export function verifyLicenseKey(key: string): LicensePayload | null {
  try {
    const lastDotIdx = key.lastIndexOf('.');
    if (lastDotIdx === -1) return null;

    const encoded = key.substring(0, lastDotIdx);
    const providedSig = key.substring(lastDotIdx + 1);

    const expectedSig = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex').substring(0, 16).toUpperCase();
    const expectedSigFormatted = expectedSig.match(/.{1,4}/g)?.join('-') || expectedSig;

    if (providedSig !== expectedSigFormatted) return null;

    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    return decoded as LicensePayload;
  } catch {
    return null;
  }
}

export const PLANS = {
  inout: {
    Basic: {
      price: '₹4,999/yr',
      max_users: 5,
      features: ['Student Entry/Exit Tracking', 'Basic Reports', 'Single Location', 'Email Support', 'Dashboard Access'],
    },
    Professional: {
      price: '₹9,999/yr',
      max_users: 25,
      features: ['Everything in Basic', 'Multiple Locations', 'Advanced Reports & CSV Export', 'Backup & Restore', 'User Management', 'Notice Board', 'Priority Email Support'],
    },
    Enterprise: {
      price: '₹19,999/yr',
      max_users: 999,
      features: ['Everything in Professional', 'Koha LMS Integration', 'Custom Branding', 'API Access', 'MAC Address Device Lock', 'Dedicated Support', 'SLA Guarantee', 'Multi-Branch Support'],
    },
  },
  koha: {
    Basic: {
      price: '₹9,999/yr',
      max_users: 5,
      features: ['Cataloging (MARC21)', 'Basic OPAC', 'Circulation Module', 'Single Library Branch', 'Email Support'],
    },
    Professional: {
      price: '₹24,999/yr',
      max_users: 25,
      features: ['Everything in Basic', 'Advanced OPAC', 'Acquisitions Module', 'Serials Management', 'ILL Support', 'Multiple Branches', 'SIP2 Integration', 'Priority Support'],
    },
    Enterprise: {
      price: '₹49,999/yr',
      max_users: 999,
      features: ['Everything in Professional', 'Z39.50 Targets', 'EDI Support', 'Custom Plugin Development', 'API Access', 'MAC Address Device Lock', 'On-premise Deployment', 'Dedicated Engineer', '24/7 SLA Support'],
    },
  },
};
