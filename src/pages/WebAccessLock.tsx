import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveAuthToken } from '../utils/chromeStorage'; // You need to export this from utils

// Simple API wrapper for the frontend
const API_URL = '/api/locks'; // Vite proxy handles localhost:4000

export function WebAccessLock() {
  const { token } = useAuth();
  const [locks, setLocks] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', url: '', pin: '' });
  const [loading, setLoading] = useState(false);

  // 1. CRITICAL: Sync Token to Chrome Storage on Load
  useEffect(() => {
    if (token) {
      saveAuthToken(token);
      // Trigger a sync in the background
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
      }
      fetchLocks();
    }
  }, [token]);

  const fetchLocks = async () => {
    const res = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) setLocks(data.locks);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pin || form.pin.length < 4) return alert('PIN must be 4+ chars');
    
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          pin: form.pin,
          tabs: [{ title: form.name, url: form.url }]
        })
      });
      
      if (res.ok) {
        setForm({ name: '', url: '', pin: '' });
        await fetchLocks();
        // Trigger immediate extension sync
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
        }
      }
    } catch (err) {
      alert('Failed to create lock');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (id: number) => {
    const pin = prompt('Enter PIN to Unlock Permanently:');
    if (!pin) return;

    const res = await fetch(`${API_URL}/${id}/unlock`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pin })
    });
    
    if (res.ok) {
      fetchLocks();
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
      }
    } else {
      alert('Incorrect PIN');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Web Access Lock</h1>
      
      {/* Create Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add New Lock</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Lock Name (e.g., Social Media)"
              className="p-2 border rounded"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Website URL (e.g., facebook.com)"
              className="p-2 border rounded"
              value={form.url}
              onChange={e => setForm({...form, url: e.target.value})}
              required
            />
          </div>
          <input
            type="password"
            placeholder="Set Security PIN (4+ chars)"
            className="w-full p-2 border rounded"
            value={form.pin}
            onChange={e => setForm({...form, pin: e.target.value})}
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Lock Website'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {locks.map(lock => (
          <div key={lock.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
            <div>
              <h3 className="font-bold text-gray-800">{lock.name}</h3>
              <p className="text-sm text-gray-500">
                {lock.domains.join(', ')}
              </p>
            </div>
            <button 
              onClick={() => handleUnlock(lock.id)}
              className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
            >
              Unlock Permanently
            </button>
          </div>
        ))}
        {locks.length === 0 && (
          <p className="text-center text-gray-500 py-8">No active locks found.</p>
        )}
      </div>
    </div>
  );
}