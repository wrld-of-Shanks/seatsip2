import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const email = typeof req.query.email === 'string' ? req.query.email : '';
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiBase}/api/v1/auth/check-email?email=${encodeURIComponent(email)}`);
    const payload = await response.json().catch(() => ({}));
    return res.status(response.status).json(payload);
  } catch {
    return res.status(200).json({ available: true });
  }
}
