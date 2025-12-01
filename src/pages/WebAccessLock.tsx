import { useState, useEffect } from 'react';
import { Lock, Trash2, Plus, Globe, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { webAccessLockApi } from '../services/api';
import { TabLock } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { notifyExtensionSync } from '../utils/extensionApi';

const GEMINI_API_KEY = 'AIzaSyCxFvQnPLhcTDRnVmKBOdQ20jOKY2Z1hA4'; // Unified Key

export function WebAccessLock() {
  const { token } = useAuth();
  const [locks, setLocks] = useState<TabLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // AI Suggestions State
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
    if (!token || !confirm('Unlock this site?')) return;
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
      
      // Filter out already locked sites
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lock className="w-8 h-8 text-blue-600" />
          Web Access Lock
        </h1>
        <p className="text-gray-500 mt-2">
          Block distracting or sensitive websites. Requires Master PIN to access.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Add New Website</h2>
          <button onClick={handleGetSuggestions} disabled={loadingSuggestions} className="text-sm text-purple-600 font-medium flex items-center hover:text-purple-700 disabled:opacity-60">
            <Sparkles className="w-4 h-4 mr-1" />
            {loadingSuggestions ? 'Analyzing...' : 'AI Suggestions'}
          </button>
        </div>

        {showSuggestions && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
            {loadingSuggestions ? (
              <div className="text-purple-800 text-sm">Reading browsing habits...</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {suggestionError && <div className="text-red-500 text-sm">{suggestionError}</div>}
                {suggestions.map(site => (
                  <div key={site} className="flex items-center bg-white px-3 py-1 rounded-full border border-purple-200 shadow-sm">
                    <span className="text-sm text-purple-700 mr-2">{site}</span>
                    <button onClick={() => handleAddLock(site, site)} className="text-xs font-bold text-purple-600 hover:text-purple-900">+ Lock</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                  <div className="p-2 bg-red-100 rounded-lg"><Globe className="w-5 h-5 text-red-600"/></div>
                  <div><h3 className="font-medium">{l.lock_name || l.url}</h3><p className="text-sm text-gray-500">{l.url}</p></div>
                </div>
                <button onClick={() => handleDelete(l.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>
            ))}
            {!loading && locks.length === 0 && <div className="p-8 text-center text-gray-400">No locks active.</div>}
        </div>
      </div>
    </div>
  );
}