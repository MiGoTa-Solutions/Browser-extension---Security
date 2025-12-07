import { useEffect, useMemo, useState } from 'react';
import { User, ShieldCheck, Bell, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../services/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { UserProfileResponse } from '../types';

const MIN_PIN_LENGTH = 4;

const timezones = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
];

export function Profile() {
  const { token, user, setPin, updateUserProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [form, setForm] = useState({
    displayName: '',
    avatarUrl: '',
    timezone: 'UTC',
    notificationsEmail: true,
    notificationsBrowser: true,
    autoLockNewTabs: true,
    autoSyncInterval: 5,
  });

  useEffect(() => {
    if (!token) return;
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await profileApi.get(token);
        setProfile(data);
        setForm({
          displayName: data.settings.displayName ?? '',
          avatarUrl: data.settings.avatarUrl ?? '',
          timezone: data.settings.timezone,
          notificationsEmail: data.settings.notificationsEmail,
          notificationsBrowser: data.settings.notificationsBrowser,
          autoLockNewTabs: data.settings.autoLockNewTabs,
          autoSyncInterval: data.settings.autoSyncInterval,
        });
      } catch (error) {
        console.error(error);
        setToast({ message: 'Unable to load profile at the moment.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [token]);

  const avatarUrl = useMemo(() => {
    if (form.avatarUrl) return form.avatarUrl;
    if (profile?.settings.avatarUrl) return profile.settings.avatarUrl;
    return '/icons/icon128.png';
  }, [form.avatarUrl, profile?.settings.avatarUrl]);

  const handleInputChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleNumberChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: Number(event.target.value) }));
  };

  const handleSelectChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleToggle = (field: 'notificationsEmail' | 'notificationsBrowser' | 'autoLockNewTabs') => () => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const payload = await profileApi.update(token, {
        displayName: form.displayName || null,
        avatarUrl: form.avatarUrl || null,
        timezone: form.timezone,
        notificationsEmail: form.notificationsEmail,
        notificationsBrowser: form.notificationsBrowser,
        autoLockNewTabs: form.autoLockNewTabs,
        autoSyncInterval: form.autoSyncInterval,
      });
      setProfile(payload);
      updateUserProfile({ ...payload.user, displayName: payload.settings.displayName });
      setToast({ message: 'Profile updated successfully.', type: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ message: 'Unable to save profile changes.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = pinValue.trim();
    if (trimmed.length < MIN_PIN_LENGTH) {
      setPinError(`Use at least ${MIN_PIN_LENGTH} digits for your master PIN.`);
      return;
    }
    setPinError(null);
    try {
      await setPin(trimmed);
      setPinModalOpen(false);
      setPinValue('');
      setToast({ message: 'Master PIN updated.', type: 'success' });
    } catch (error) {
      console.error(error);
      setPinError(error instanceof Error ? error.message : 'Unable to update PIN right now.');
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Sign in to manage your profile.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img src={avatarUrl} alt="User avatar" className="w-16 h-16 rounded-2xl border border-gray-200 object-cover" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{form.displayName || user.displayName || user.email}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${user.hasPin ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {user.hasPin ? 'Master PIN enabled' : 'Master PIN missing'}
          </div>
          {!user.hasPin && (
            <Button variant="warning" onClick={() => setPinModalOpen(true)}>
              Secure Account
            </Button>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Account Preferences</h2>
            <p className="text-sm text-gray-500">Update your public profile details.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Display name" value={form.displayName} onChange={handleInputChange('displayName')} placeholder="Jane Doe" />
          <Input label="Avatar URL" value={form.avatarUrl} onChange={handleInputChange('avatarUrl')} placeholder="https://" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="timezone-select">Timezone</label>
            <select
              id="timezone-select"
              value={form.timezone}
              onChange={handleSelectChange('timezone')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-rose-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500">Choose how SecureShield keeps you informed.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleCard
            label="Email alerts"
            description="Receive weekly summaries and urgent alerts via email."
            enabled={form.notificationsEmail}
            onToggle={handleToggle('notificationsEmail')}
          />
          <ToggleCard
            label="Browser notifications"
            description="Show high-priority alerts directly in the extension."
            enabled={form.notificationsBrowser}
            onToggle={handleToggle('notificationsBrowser')}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Extension preferences</h2>
            <p className="text-sm text-gray-500">Control how the extension enforces locks on every device.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleCard
            label="Auto re-lock new tabs"
            description="Automatically reapply restrictions after unlocking a site."
            enabled={form.autoLockNewTabs}
            onToggle={handleToggle('autoLockNewTabs')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sync-interval">Sync frequency (minutes)</label>
            <input
              id="sync-interval"
              type="number"
              min={1}
              max={60}
              value={form.autoSyncInterval}
              onChange={handleNumberChange('autoSyncInterval')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">Controls how often the extension refreshes lock status.</p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} disabled={loading || saving} className="min-w-[160px]">
          {saving ? 'Saving' : 'Save changes'}
        </Button>
      </div>

      <Modal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} title="Secure your account" size="sm">
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <Input
            label="Master PIN"
            type="password"
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            placeholder={`Enter a ${MIN_PIN_LENGTH}+ digit PIN`}
            error={pinError || undefined}
          />
          <p className="text-sm text-gray-500">
            The master PIN is required before locking or unlocking sites from any device.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setPinModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save PIN
            </Button>
          </div>
        </form>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="flex items-center gap-3 text-gray-700 font-medium">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading profile...
          </div>
        </div>
      )}
    </div>
  );
}

interface ToggleCardProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function ToggleCard({ label, description, enabled, onToggle }: ToggleCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left border rounded-2xl p-4 transition shadow-sm ${enabled ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 bg-white hover:border-gray-300'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <span
          className={`inline-flex h-6 w-11 items-center rounded-full transition ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </span>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}
