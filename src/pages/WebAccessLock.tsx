import { useState, useEffect, useCallback, useMemo } from "react";
import { Lock, Unlock, Trash2, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { webAccessLockApi, ApiError } from "../services/api";
import { notifyExtensionSync } from "../utils/extensionApi";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { AlertDialog } from "../components/AlertDialog";
import { Toast } from "../components/Toast";

interface TabLock { id: number; url: string; lock_name?: string; is_locked: boolean; }
type ToastType = 'success' | 'error' | 'warning' | 'info';
const MIN_PIN_LENGTH = 4;

export function WebAccessLock() {
  const { token, user, setPin } = useAuth();
  const [locks, setLocks] = useState<TabLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSetupError, setPinSetupError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TabLock | null>(null);

  const hasPin = Boolean(user?.hasPin);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  const handleToastClose = useCallback(() => setToast(null), []);

  const handlePinRequired = useCallback(() => {
    showToast('Set the master PIN to continue.', 'warning');
    setPinModalOpen(true);
  }, [showToast]);

  const handleApiError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      const message = err.message || fallback;
      if (err.status === 403 && message.toLowerCase().includes('pin')) {
        handlePinRequired();
        return;
      }
      showToast(message, 'error');
      return;
    }

    showToast(fallback, 'error');
  }, [handlePinRequired, showToast]);

  const fetchLocks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await webAccessLockApi.list(token);
      setLocks(data.locks);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('We could not refresh the current restrictions.');
      handleApiError(err, 'We could not refresh the current restrictions.');
    } finally {
      setLoading(false);
    }
  }, [token, handleApiError]);

  useEffect(() => {
    fetchLocks();
  }, [fetchLocks]);

  useEffect(() => {
    if (!pinModalOpen) {
      setPinSetupError(null);
      setPinValue('');
    }
  }, [pinModalOpen]);

  const guardWithPin = useCallback((action: () => void | Promise<void>) => {
    if (hasPin) {
      void action();
      return;
    }

    setPendingAction(() => action);
    handlePinRequired();
  }, [hasPin, handlePinRequired]);

  useEffect(() => {
    if (hasPin && pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      void action();
    }
  }, [hasPin, pendingAction]);

  const handleAddLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const trimmed = newUrl.trim();
    if (!trimmed) return;

    const persistLock = async () => {
      try {
        await webAccessLockApi.create(token, { url: trimmed });
        setNewUrl('');
        await fetchLocks();
        notifyExtensionSync();
        showToast('Site locked successfully.', 'success');
      } catch (err) {
        console.error(err);
        handleApiError(err, 'Unable to add that domain. Please try again.');
      }
    };

    guardWithPin(persistLock);
  };

  const handleToggle = (id: number, state: boolean) => {
    if (!token) return;

    const toggleLock = async () => {
      setLocks(prev => prev.map(l => (l.id === id ? { ...l, is_locked: !state } : l)));
      try {
        await webAccessLockApi.toggleLock(token, id, !state);
        notifyExtensionSync();
        showToast(!state ? 'Restriction enforced.' : 'Restriction unlocked.', 'success');
      } catch (err) {
        fetchLocks();
        handleApiError(err, 'Unable to update that restriction right now.');
      }
    };

    guardWithPin(toggleLock);
  };

  const requestDelete = (lock: TabLock) => {
    if (!token) return;
    setDeleteTarget(lock);
  };

  const handleDeleteConfirm = useCallback(() => {
    if (!token || !deleteTarget) return;
    const target = deleteTarget;

    const deleteLock = async () => {
      try {
        await webAccessLockApi.delete(token, target.id);
        await fetchLocks();
        notifyExtensionSync();
        showToast('Restriction removed.', 'success');
      } catch (err) {
        console.error(err);
        handleApiError(err, 'Unable to remove that restriction.');
      }
    };

    guardWithPin(deleteLock);
  }, [token, deleteTarget, guardWithPin, fetchLocks, handleApiError, showToast]);

  const handleRefresh = async () => {
    if (!token) return;
    setSyncing(true);
    await fetchLocks();
    notifyExtensionSync();
    setSyncing(false);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = pinValue.trim();
    if (normalized.length < MIN_PIN_LENGTH) {
      setPinSetupError(`Use at least ${MIN_PIN_LENGTH} digits for your master PIN.`);
      return;
    }

    setPinSetupError(null);
    setPinSaving(true);
    try {
      await setPin(normalized);
      setPinModalOpen(false);
      showToast('Master PIN saved. You can continue.', 'success');
    } catch (err) {
      console.error(err);
      setPinSetupError(err instanceof Error ? err.message : 'Unable to save your PIN right now.');
    } finally {
      setPinSaving(false);
    }
  };

  const onboardingBanner = useMemo(() => {
    if (hasPin) return null;

    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-amber-900">
          <div className="rounded-xl bg-amber-100 p-2">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Create your master PIN</p>
            <p className="text-sm text-amber-800">
              We detected your account was created with Google. Set a PIN before managing restrictions to keep your suite secure.
            </p>
          </div>
        </div>
        <Button variant="warning" onClick={() => setPinModalOpen(true)}>
          Set PIN now
        </Button>
      </div>
    );
  }, [hasPin]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SecureShield</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Web access lock</h1>
            <p className="text-sm text-slate-500">
              Maintain a short list of domains that should stay blocked in every session.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
            disabled={loading || syncing}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Refreshing' : 'Refresh list'}
          </button>
        </div>
        {!hasPin && onboardingBanner}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add a restriction</h2>
        <p className="text-sm text-slate-500 mb-4">Enter a domain to keep it blocked across the suite.</p>
        <form onSubmit={handleAddLock} className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="restricted-domain">Domain</label>
          <input
            id="restricted-domain"
            type="text"
            placeholder="domain.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            disabled={!newUrl.trim()}
          >
            Lock site
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Active restrictions</h2>
            <p className="text-sm text-slate-500">{locks.length} {locks.length === 1 ? 'domain' : 'domains'} total</p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading</div>
          ) : locks.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No blocked domains yet.</div>
          ) : (
            locks.map((lock) => (
              <div key={lock.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${lock.is_locked ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-600'}`}>
                    {lock.is_locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{lock.lock_name || lock.url}</p>
                    <p className="text-sm text-slate-500">{lock.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(lock.id, lock.is_locked)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                  >
                    {lock.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    onClick={() => requestDelete(lock)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:text-red-600"
                    aria-label="Remove restriction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <AlertDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove restriction?"
        message={
          <span>
            You're about to remove <span className="font-semibold">{deleteTarget?.lock_name || deleteTarget?.url}</span>. This
            site will be accessible immediately.
          </span>
        }
        type="confirm"
        confirmText="Remove"
        cancelText="Keep locked"
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={handleToastClose}
        />
      )}

      <Modal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} title="Set your master PIN" size="sm">
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <Input
            label="Master PIN"
            type="password"
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            placeholder={`Enter a ${MIN_PIN_LENGTH}+ digit PIN`}
            error={pinSetupError || undefined}
          />
          <p className="text-sm text-slate-600">
            Your PIN encrypts lock actions across the app and extension. Choose digits you will remember.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setPinModalOpen(false)} disabled={pinSaving}>
              Cancel
            </Button>
            <Button type="submit" loading={pinSaving}>
              Save PIN
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
