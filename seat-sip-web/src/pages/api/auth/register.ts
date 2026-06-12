import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const headers: Record<string, string> = {};
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiBase}/api/v1/auth/register`, {
      method: 'POST',
      headers,
      body: req,
      duplex: 'half',
    } as any);

    const contentType = response.headers.get('content-type') || '';
    res.status(response.status);

    if (contentType.includes('application/json')) {
      return res.json(await response.json());
    }

    return res.send(await response.text());
  } catch (error) {
    return res.status(500).json({ message: 'Unable to submit application' });
  }
}
