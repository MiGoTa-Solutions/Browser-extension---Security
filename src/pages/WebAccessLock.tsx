import { useState, useEffect } from 'react';
import { Lock, Unlock, Trash2, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { webAccessLockApi } from '../services/api';
import { notifyExtensionSync } from '../utils/extensionApi';
import { ThreeRadar } from '../components/ui/ThreeRadar';
import clsx from 'clsx';

// Mock type if not imported
interface TabLock { id: number; url: string; lock_name?: string; is_locked: boolean; }

export function WebAccessLock() {
  const { token } = useAuth();
  const [locks, setLocks] = useState<TabLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { if (token) fetchLocks(); }, [token]);

  const fetchLocks = async () => {
    if (!token) return;
    try {
      const data = await webAccessLockApi.list(token);
      setLocks(data.locks);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newUrl) return;
    try {
      await webAccessLockApi.create(token, { url: newUrl });
      setNewUrl('');
      fetchLocks();
      notifyExtensionSync();
    } catch (err) { alert('Failed to lock'); }
  };

  const handleToggle = async (id: number, state: boolean) => {
    if (!token) return;
    // Optimistic UI update
    setLocks(prev => prev.map(l => l.id === id ? { ...l, is_locked: !state } : l));
    try {
      await webAccessLockApi.toggleLock(token, id, !state);
      notifyExtensionSync();
    } catch { fetchLocks(); }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            Web Access Control
            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs rounded-full border border-blue-500/20">ACTIVE</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Manage restricted domains and access policies.</p>
        </div>
        <button 
          onClick={() => { setSyncing(true); setTimeout(() => setSyncing(false), 1000); fetchLocks(); notifyExtensionSync(); }}
          className={clsx("p-3 rounded-xl glass-card text-slate-500 hover:text-blue-500 transition-all", syncing && "animate-spin text-blue-500")}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Input & Radar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Radar Visual */}
          <div className="glass-panel p-1 rounded-2xl shadow-2xl">
             <ThreeRadar />
          </div>

          {/* Add Lock Form */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" /> New Restriction
            </h3>
            <form onSubmit={handleAddLock} className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="domain.com" 
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="cyber-input w-full px-4 py-3 rounded-xl"
                />
                <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">🌐</div>
              </div>
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-blue-500/25 transition-all">
                Lock Site
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-2xl overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex justify-between">
              <h3 className="font-semibold">Active Policies ({locks.length})</h3>
              <div className="flex gap-2 text-xs">
                 <span className="px-2 py-1 rounded bg-green-500/10 text-green-500">● Secure</span>
                 <span className="px-2 py-1 rounded bg-red-500/10 text-red-500">● Blocked</span>
              </div>
            </div>
            
            <div className="divide-y divide-slate-200 dark:divide-white/5 overflow-y-auto max-h-[600px]">
              {locks.length === 0 ? (
                 <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                    <Sparkles className="w-12 h-12 mb-4 text-slate-600 opacity-50" />
                    <p>No restrictions active. System is open.</p>
                 </div>
              ) : (
                locks.map(lock => (
                  <div key={lock.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={clsx(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        lock.is_locked ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                      )}>
                        {lock.is_locked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="font-medium text-lg">{lock.lock_name || lock.url}</h4>
                        <p className="text-xs text-slate-400 font-mono">{lock.url}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => handleToggle(lock.id, lock.is_locked)}
                         className={clsx(
                           "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                           lock.is_locked 
                             ? "bg-slate-100 dark:bg-slate-800 hover:bg-green-500 hover:text-white" 
                             : "bg-slate-100 dark:bg-slate-800 hover:bg-red-500 hover:text-white"
                         )}
                       >
                         {lock.is_locked ? 'Unlock' : 'Lock'}
                       </button>
                       <button 
                         onClick={() => { if(confirm("Delete rule?")) webAccessLockApi.delete(token!, lock.id).then(() => { fetchLocks(); notifyExtensionSync(); })}}
                         className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                       >
                         <Trash2 className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}