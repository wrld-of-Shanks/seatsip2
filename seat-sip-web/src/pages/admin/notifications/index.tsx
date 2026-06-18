'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api } from '@/services/api';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'city' | 'subscribers'>('all');
  const [city, setCity] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await api.notifications.history();
      if (res.success) setHistory(res.data);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    setResult(null);

    try {
      const res = await api.notifications.send({
        title,
        body,
        targetAudience,
        city: targetAudience === 'city' ? city : undefined,
      });
      if (res.success) {
        setResult(res);
        setTitle('');
        setBody('');
        setTargetAudience('all');
        setCity('');
        loadHistory();
      } else {
        setError(res.message || 'Failed to send');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Send Notification</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title"
          required
          maxLength={200}
        />
        <div className="w-full">
          <label className="block text-sm font-medium text-stone-700 mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification body"
            required
            maxLength={2000}
            rows={4}
            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <Select
          label="Target Audience"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value as any)}
          options={[
            { value: 'all', label: 'All Users' },
            { value: 'city', label: 'City' },
            { value: 'subscribers', label: 'Subscribers Only' },
          ]}
        />
        {targetAudience === 'city' && (
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Mumbai"
            required
          />
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
            <p className="font-medium">{result.message}</p>
            <p className="mt-1">In-App: {result.stats?.inApp} | Push Sent: {result.stats?.pushSent} | Push Failed: {result.stats?.pushFailed}</p>
          </div>
        )}
        <Button type="submit" disabled={sending}>
          {sending ? 'Sending...' : 'Send Notification'}
        </Button>
      </form>

      <h2 className="text-xl font-bold mb-4">Sent History</h2>
      {loadingHistory ? (
        <p className="text-stone-500">Loading...</p>
      ) : history.length === 0 ? (
        <p className="text-stone-500">No notifications sent yet.</p>
      ) : (
        <div className="space-y-3">
          {history.map((item: any, idx: number) => (
            <div key={idx} className="border border-stone-200 rounded-md p-3 text-sm">
              <p className="font-medium">{item.title}</p>
              <p className="text-stone-500 mt-1">
                Sent to {item.totalUsers} users | Push: {item.pushSent} | Audience: {item.targetAudience}
              </p>
              <p className="text-stone-400 text-xs mt-1">{new Date(item.sentAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
