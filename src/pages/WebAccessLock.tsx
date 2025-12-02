import { useState, useEffect } from 'react';
import { Lock, Unlock, Trash2, Plus, Globe, Sparkles, RefreshCw } from 'lucide-react'; 
import { useAuth } from '../context/AuthContext';
import { webAccessLockApi } from '../services/api';
import { TabLock } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { notifyExtensionSync } from '../utils/extensionApi';

const GEMINI_API_KEY = 'AIzaSyDvHWTKIxHxGo1IWwEPZNqzvnBYuzUFVDc'; 

export function WebAccessLock() {
  const { token } = useAuth();
  const [locks, setLocks] = useState<TabLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

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

  const handleManualSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      await fetchLocks();
      await notifyExtensionSync();
    } finally {
      setTimeout(() => setSyncing(false), 500);
    }
  };

  const handleToggleLock = async (id: number, currentState: boolean) => {
    if (!token) return;
    setLocks(prev => prev.map(l => l.id === id ? { ...l, is_locked: !currentState } : l));
    try {
        await webAccessLockApi.toggleLock(token, id, !currentState);
        notifyExtensionSync(); 
    } catch (err) {
        alert("Failed to update lock status");
        fetchLocks(); 
    }
  };

  const handleAddLock = async (url: string, name?: string) => {
    if (!token) return;
    setSubmitting(true);
    try {
      await webAccessLockApi.create(token, { url, name });
      setNewUrl('');
      setNewName('');
      setSuggestions(prev => prev.filter(s => s !== url));
      await fetchLocks();
      notifyExtensionSync();
    } catch (err) {
      alert('Failed to add lock.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Delete this rule entirely?')) return;
    try {
      await webAccessLockApi.delete(token, id);
      await fetchLocks();
      notifyExtensionSync();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    setSuggestionError(null);

    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      setSuggestionError('AI Suggestions work only inside the extension.');
      setLoadingSuggestions(false);
      return;
    }

    const { websiteFrequency } = await chrome.storage.local.get('websiteFrequency');

    if (!websiteFrequency || Object.keys(websiteFrequency).length === 0) {
      setSuggestions([]);
      setSuggestionError('No browsing data yet. Browse more to get suggestions.');
      setLoadingSuggestions(false);
      return;
    }

    const prompt = `Analyze this frequency data: ${JSON.stringify(websiteFrequency)}. Suggest 3 distracting domains to lock. Return ONLY a JSON array of strings. Example: ["youtube.com"]`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      const sites = JSON.parse(text);
      
      const available = sites.filter((s: string) => !locks.some(l => l.url.includes(s)));
      setSuggestions(available);
      if (available.length === 0) setSuggestionError('You have locked all suggested sites.');

    } catch (e) {
      console.error(e);
      setSuggestionError('AI Analysis failed.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-8 h-8 text-blue-600" />
            Web Access Lock
          </h1>
          <p className="text-gray-500 mt-2">
            Block distracting or sensitive websites. Requires Master PIN to access.
          </p>
        </div>
        <button 
          onClick={handleManualSync} 
          disabled={syncing}
          className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-all ${syncing ? 'animate-spin text-blue-600' : ''}`}
          title="Sync with Extension"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={(e) => { e.preventDefault(); handleAddLock(newUrl, newName); }} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input label="Website URL" placeholder="e.g. facebook.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} required />
          </div>
          <div className="flex-1 w-full">
            <Input label="Display Name" placeholder="e.g. Social Media" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="mb-[2px]">
            <Button type="submit" loading={submitting}><Plus className="w-4 h-4 mr-2" /> Lock Site</Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-semibold">Locked Websites</h2></div>
        <div className="divide-y divide-gray-100">
            {locks.map(l => (
              <div key={l.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div className="flex gap-3 items-center">
                  <div className={`p-2 rounded-lg ${l.is_locked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {l.is_locked ? <Lock className="w-5 h-5"/> : <Unlock className="w-5 h-5"/>}
                  </div>
                  <div>
                    <h3 className={`font-medium ${!l.is_locked && 'text-gray-400 line-through'}`}>{l.lock_name || l.url}</h3>
                    <p className="text-sm text-gray-500">{l.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleLock(l.id, l.is_locked)} className="text-sm font-medium text-blue-600 hover:underline px-2">
                        {l.is_locked ? 'Unlock' : 'Re-lock'}
                    </button>
                    <button onClick={() => handleDelete(l.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-5 h-5"/>
                    </button>
                </div>
              </div>
            ))}
            {!loading && locks.length === 0 && <div className="p-8 text-center text-gray-400">No locks active.</div>}
        </div>
      </div>
    </div>
  );
}