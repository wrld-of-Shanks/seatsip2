import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    // Call backend auth endpoint
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return res.status(backendResponse.status).json(data);
    }

    // Allow ADMIN and CAFE_OWNER into the panel
    const userRole = data.data?.user?.role;
    if (userRole !== 'ADMIN' && userRole !== 'CAFE_OWNER') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin or Cafe Owner access only.' });
    }

    // Set cookie with token and role
    res.setHeader('Set-Cookie', [
      `admin_token=${data.data.accessToken}; Path=/; SameSite=Strict; Max-Age=86400`,
      `admin_role=${userRole}; Path=/; SameSite=Strict; Max-Age=86400`,
    ]);

    return res.status(200).json({ success: true, user: data.data.user });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
