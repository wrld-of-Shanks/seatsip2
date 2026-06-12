import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Clear the admin_token and admin_role cookies
  res.setHeader('Set-Cookie', [
    'admin_token=; Path=/; SameSite=Strict; Max-Age=0',
    'admin_role=; Path=/; SameSite=Strict; Max-Age=0',
  ]);

  return res.status(200).json({ success: true });
}
