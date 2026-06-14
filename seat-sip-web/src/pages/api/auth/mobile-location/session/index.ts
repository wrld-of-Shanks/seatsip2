import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiBase}/api/v1/auth/mobile-location/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const payload = await response.json().catch(() => ({}));
    return res.status(response.status).json(payload);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to connect to authentication service' });
  }
}
