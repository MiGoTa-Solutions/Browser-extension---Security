import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveAuthToken } from '../utils/chromeStorage';
import { notifyExtensionSync } from '../utils/extensionApi'; // Import fix

// Simple API wrapper for the frontend
const API_URL = '/api/locks';

export function WebAccessLock() {
  const { token } = useAuth();
  const [locks, setLocks] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', url: '', pin: '' });
  const [loading, setLoading] = useState(false);

  // 1. Sync Token & Fetch
  useEffect(() => {
    if (token) {
      saveAuthToken(token);
      notifyExtensionSync(); // Fixed: Safe sync call
      fetchLocks();
    }
  }, [token]);

  const fetchLocks = async () => {
    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setLocks(data.locks);
      }
    } catch (e) {
      console.error("Failed to fetch locks", e);
    }
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
        notifyExtensionSync(); // Fixed: Safe sync call
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

    try {
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
        notifyExtensionSync(); // Fixed: Safe sync call
      } else {
        alert('Incorrect PIN');
      }
    } catch (e) {
      alert('Connection error');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Web Access Lock</h1>
      
      {/* Create Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Add New Lock</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Lock Name (e.g., Social Media)"
              className="p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Website URL (e.g., facebook.com)"
              className="p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.url}
              onChange={e => setForm({...form, url: e.target.value})}
              required
            />
          </div>
          <input
            type="password"
            placeholder="Set Security PIN (4+ chars)"
            className="w-full p-2 border rounded border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.pin}
            onChange={e => setForm({...form, pin: e.target.value})}
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Saving...' : 'Lock Website'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {locks.map(lock => (
          <div key={lock.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div>
              <h3 className="font-bold text-gray-800">{lock.name}</h3>
              <p className="text-sm text-gray-500">
                {lock.domains.join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Locked</span>
              <button 
                onClick={() => handleUnlock(lock.id)}
                className="ml-2 px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
              >
                Unlock
              </button>
            </div>
          </div>
        ))}
        {locks.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">No active locks found.</p>
            <p className="text-sm text-gray-400 mt-1">Add a website above to secure it.</p>
          </div>
        )}
      </div>
    </div>
  );
}