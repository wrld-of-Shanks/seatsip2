'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Save, Settings as SettingsIcon, ToggleLeft, ToggleRight, Plus, Trash2, Edit } from 'lucide-react';

interface Setting {
  id: string;
  key: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number' | 'json';
  category: string;
  description: string;
}

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  description: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'features'>('general');
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };
    const role = getCookie('admin_role');
    if (role === 'CAFE_OWNER') {
      router.push('/dashboard');
      return;
    }

    loadSettings();
    loadFeatureFlags();
  }, []);

  async function loadSettings() {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFeatureFlags() {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/feature-flags`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setFeatureFlags(data.data);
      }
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    }
  }

  const handleSettingChange = async (settingId: string, value: any) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/settings/${settingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });
      loadSettings();
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const handleFeatureToggle = async (flagId: string, enabled: boolean) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/feature-flags/${flagId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });
      loadFeatureFlags();
    } catch (error) {
      console.error('Failed to update feature flag:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1];
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/settings/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      });
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) acc[setting.category] = [];
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, Setting[]>);

  const renderSettingInput = (setting: Setting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <button
            onClick={() => handleSettingChange(setting.id, !setting.value)}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ backgroundColor: setting.value ? '#8B5E3C' : '#D6D3D1' }}
          >
            <span
              className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ left: setting.value ? 'calc(100% - 1.25rem)' : '0.25rem' }}
            />
          </button>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={setting.value as number}
            onChange={(e) => handleSettingChange(setting.id, parseFloat(e.target.value))}
            className="w-48"
          />
        );
      default:
        return (
          <Input
            type="text"
            value={setting.value as string}
            onChange={(e) => handleSettingChange(setting.id, e.target.value)}
            className="w-48"
          />
        );
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Settings</h1>
          <p className="text-stone-600">Manage application configurations and feature flags</p>
        </div>
        <Button onClick={handleSaveSettings}>
          <Save size={18} className="mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="mb-6 border-b border-stone-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'features'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            Feature Flags
          </button>
        </nav>
      </div>

      {activeTab === 'general' && (
        <div className="space-y-8">
          {Object.entries(groupedSettings).map(([category, categorySettings]) => (
            <div key={category} className="bg-white border border-stone-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">{category}</h3>
              <div className="space-y-4">
                {categorySettings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        {setting.key}
                      </label>
                      <p className="text-sm text-stone-500">{setting.description}</p>
                    </div>
                    <div className="ml-4">{renderSettingInput(setting)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'features' && (
        <div className="bg-white border border-stone-200 rounded-lg">
          <div className="p-6 border-b border-stone-200">
            <h3 className="text-lg font-semibold text-stone-900 mb-2">Feature Flags</h3>
            <p className="text-sm text-stone-600">Enable or disable application features</p>
          </div>
          <div className="divide-y divide-stone-200">
            {featureFlags.map((flag) => (
              <div key={flag.id} className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-sm font-medium text-stone-900">{flag.name}</h4>
                    <code className="text-xs bg-stone-100 px-2 py-1 rounded">{flag.key}</code>
                  </div>
                  <p className="text-sm text-stone-500 mt-1">{flag.description}</p>
                </div>
                <button
                  onClick={() => handleFeatureToggle(flag.id, !flag.enabled)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: flag.enabled ? '#8B5E3C' : '#D6D3D1' }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ left: flag.enabled ? 'calc(100% - 1.25rem)' : '0.25rem' }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
