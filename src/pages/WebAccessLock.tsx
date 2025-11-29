import React, { useState, useEffect } from 'react';
import { Lock, Trash2, Plus, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { webAccessLockApi } from '../services/api';
import { TabLock } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { notifyExtensionSync } from '../utils/extensionApi';

export function WebAccessLock() {
  const { token } = useAuth();
  const [locks, setLocks] = useState<TabLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) fetchLocks();
  }, [token]);

  const fetchLocks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await webAccessLockApi.list(token);
      setLocks(data.locks);
    } catch (err) {
      console.error('Failed to fetch locks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !token) return;

    setSubmitting(true);
    try {
      await webAccessLockApi.create(token, { url: newUrl, name: newName });
      setNewUrl('');
      setNewName('');
      await fetchLocks();
      notifyExtensionSync(); // Tell extension to update immediately
    } catch (err) {
      alert('Failed to add lock. It might already exist.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Are you sure you want to unlock this site?')) return;
    try {
      await webAccessLockApi.delete(token, id);
      await fetchLocks();
      notifyExtensionSync();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lock className="w-8 h-8 text-blue-600" />
          Web Access Lock
        </h1>
        <p className="text-gray-500 mt-2">
          Block distracting or sensitive websites. You will need your Master PIN to access them.
        </p>
      </div>

      {/* Add Lock Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Add New Website</h2>
        <form onSubmit={handleAddLock} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input
              label="Website URL"
              placeholder="e.g. facebook.com"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
            />
          </div>
          <div className="flex-1 w-full">
            <Input
              label="Display Name (Optional)"
              placeholder="e.g. Social Media"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="mb-[2px]">
            <Button type="submit" loading={submitting}>
              <Plus className="w-4 h-4 mr-2" />
              Lock Site
            </Button>
          </div>
        </form>
      </div>

      {/* Locks List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Locked Websites</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : locks.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No websites locked yet. Add one above!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {locks.map((lock) => (
              <div key={lock.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Globe className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{lock.lock_name || lock.url}</h3>
                    <p className="text-sm text-gray-500">{lock.url}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(lock.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove Lock"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}