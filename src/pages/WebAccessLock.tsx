import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  MousePointerSquare,
  Plus,
  Shield,
  Trash2,
  Unlock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { tabLockApi } from '../services/api';
import { TabInfo, TabLock } from '../types';
import { isExtensionContext, getActiveTab, getCurrentTabs, lockTabs, unlockTabs } from '../utils/extensionApi';

const INITIAL_FORM = {
  name: '',
  note: '',
  isGroup: false,
};

function parseTabInput(value: string): TabInfo[] {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('Add at least one tab URL');
  }
  
  if (lines.length > 20) {
    throw new Error(`Too many URLs (${lines.length}). Maximum is 20 tabs per lock`);
  }

  const validTabs: TabInfo[] = [];
  const invalidUrls: string[] = [];

  lines.forEach((line) => {
    // Skip if it's just a domain without protocol
    const urlValue = line.startsWith('http://') || line.startsWith('https://') 
      ? line 
      : `https://${line}`;
    
    try {
      const url = new URL(urlValue);
      
      // Validate it's a web URL
      if (!url.protocol.startsWith('http')) {
        invalidUrls.push(line);
        return;
      }
      
      // Block chrome:// and other internal URLs
      if (url.protocol === 'chrome:' || url.protocol === 'about:' || url.protocol === 'chrome-extension:') {
        invalidUrls.push(line);
        return;
      }
      
      validTabs.push({
        title: url.hostname.replace(/^www\./, ''),
        url: url.toString(),
      });
    } catch (error) {
      invalidUrls.push(line);
    }
  });
  
  if (invalidUrls.length > 0 && validTabs.length === 0) {
    throw new Error(`All URLs are invalid: ${invalidUrls.slice(0, 3).join(', ')}${invalidUrls.length > 3 ? '...' : ''}`);
  }
  
  if (invalidUrls.length > 0) {
    console.warn('[WebAccessLock] Skipped invalid URLs:', invalidUrls);
  }
  
  if (validTabs.length === 0) {
    throw new Error('No valid URLs found');
  }

  return validTabs;
}

export function WebAccessLock() {
  const { user, token, setPin } = useAuth();
  const [locks, setLocks] = useState<TabLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState<'unlock' | 'relock'>('unlock');
  const [activeLock, setActiveLock] = useState<TabLock | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [formState, setFormState] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [createPinValue, setCreatePinValue] = useState('');
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [pinSetupValue, setPinSetupValue] = useState('');
  const [pinSetupError, setPinSetupError] = useState('');
  const [pinSetupLoading, setPinSetupLoading] = useState(false);
  const [extensionMode, setExtensionMode] = useState(false);
  const [loadingCurrentTabs, setLoadingCurrentTabs] = useState(false);
  const [queuedTabs, setQueuedTabs] = useState<TabInfo[]>([]);
  const [singleLinkInput, setSingleLinkInput] = useState('');
  const [bulkLinksInput, setBulkLinksInput] = useState('');
  const [quickLockLoading, setQuickLockLoading] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isQuickLockModalOpen, setIsQuickLockModalOpen] = useState(false);
  const [quickLockPinValue, setQuickLockPinValue] = useState('');
  const [quickLockPinError, setQuickLockPinError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [lockToDelete, setLockToDelete] = useState<TabLock | null>(null);
  const [deletePinValue, setDeletePinValue] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setExtensionMode(isExtensionContext());
  }, []);

  const resetCreateForm = useCallback(() => {
    setFormState({ ...INITIAL_FORM });
    setQueuedTabs([]);
    setSingleLinkInput('');
    setBulkLinksInput('');
    setFormError('');
    setCreatePinValue('');
  }, []);

  const addTabsToQueue = useCallback(
    (newTabs: TabInfo[]) => {
      if (!newTabs.length) return;
      
      let duplicatesSkipped = 0;
      
      setQueuedTabs((prev) => {
        const existingUrls = new Set(prev.map((tab) => tab.url));
        const combined = [...prev];

        newTabs.forEach((tab) => {
          if (!existingUrls.has(tab.url)) {
            combined.push(tab);
            existingUrls.add(tab.url);
          } else {
            duplicatesSkipped++;
          }
        });

        if (combined.length > 1 && !formState.isGroup) {
          setFormState((prevState) => ({ ...prevState, isGroup: true }));
        }

        return combined;
      });
      
      // Show feedback for duplicates
      if (duplicatesSkipped > 0) {
        setFormError(`${duplicatesSkipped} duplicate link${duplicatesSkipped > 1 ? 's' : ''} skipped`);
        setTimeout(() => setFormError(''), 3000);
      }
    },
    [formState.isGroup]
  );

  const handleRemoveTab = useCallback((url: string) => {
    setQueuedTabs((prev) => {
      const next = prev.filter((tab) => tab.url !== url);
      if (next.length <= 1 && prev.length > 1) {
        setFormState((prevState) => ({ ...prevState, isGroup: false }));
      }
      return next;
    });
  }, []);

  const handleClearQueuedTabs = useCallback(() => {
    setQueuedTabs([]);
    setFormState((prevState) => ({ ...prevState, isGroup: false }));
  }, []);

  const openCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  const fetchLocks = useCallback(async () => {
    if (!token) {
      setLocks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await tabLockApi.list(token);
      setLocks(response.locks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locks');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLocks();
  }, [fetchLocks]);

  const lockedCount = useMemo(() => locks.filter((lock) => lock.status === 'locked').length, [locks]);
  const unlockedCount = useMemo(
    () => locks.filter((lock) => lock.status === 'unlocked').length,
    [locks]
  );
  const groupCount = useMemo(() => locks.filter((lock) => lock.isGroup).length, [locks]);
  const groupLocks = useMemo(() => locks.filter((lock) => lock.isGroup), [locks]);

  const handleLoadCurrentTabs = async () => {
    setLoadingCurrentTabs(true);
    setFormError('');
    try {
      const currentTabs = await getCurrentTabs();
      if (currentTabs.length === 0) {
        setFormError('No tabs found to lock');
        return;
      }
      addTabsToQueue(currentTabs);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to load current tabs');
    } finally {
      setLoadingCurrentTabs(false);
    }
  };

  const handleAddSingleLink = () => {
    if (!singleLinkInput.trim()) {
      setFormError('Enter a link to add');
      return;
    }

    try {
      const [tab] = parseTabInput(singleLinkInput.trim());
      addTabsToQueue([tab]);
      setSingleLinkInput('');
      setFormError('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid link provided');
    }
  };

  const handleAddBulkLinks = () => {
    if (!bulkLinksInput.trim()) {
      setFormError('Enter one or more links to add');
      return;
    }

    try {
      const tabs = parseTabInput(bulkLinksInput);
      addTabsToQueue(tabs);
      setBulkLinksInput('');
      setFormError('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid links supplied');
    }
  };

  const handleQuickLockCurrentTab = () => {
    if (!token) {
      setError('You must be logged in to lock tabs');
      return;
    }
    if (!extensionMode) {
      setError('Quick lock is only available in the Chrome extension popup');
      return;
    }
    if (!user?.hasPin) {
      setError('Create a security PIN before locking tabs');
      setIsPinSetupOpen(true);
      return;
    }

    setQuickLockPinValue('');
    setQuickLockPinError('');
    setIsQuickLockModalOpen(true);
  };

  const confirmQuickLock = async () => {
    if (!token) {
      setQuickLockPinError('You must be logged in');
      return;
    }
    
    if (!quickLockPinValue.trim()) {
      setQuickLockPinError('Enter your security PIN');
      return;
    }
    
    if (quickLockPinValue.trim().length < 4 || quickLockPinValue.trim().length > 12) {
      setQuickLockPinError('PIN must be 4-12 characters');
      return;
    }

    setQuickLockLoading(true);
    setQuickLockPinError('');
    try {
      const activeTab = await getActiveTab();
      const payload = {
        name: activeTab.title ? `Locked: ${activeTab.title}` : 'Locked Current Tab',
        isGroup: false,
        tabs: [activeTab],
        pin: quickLockPinValue.trim(),
      };
      const response = await tabLockApi.create(token, payload);
      setLocks((prev) => [response.lock, ...prev]);

      try {
        await lockTabs(response.lock.id, response.lock.tabs, quickLockPinValue.trim());
      } catch (chromeError) {
        console.error('[WebAccessLock] Unable to close current tab', chromeError);
      }

      setIsQuickLockModalOpen(false);
      setQuickLockPinValue('');
    } catch (err) {
      setQuickLockPinError(err instanceof Error ? err.message : 'Unable to lock current tab');
    } finally {
      setQuickLockLoading(false);
    }
  };

  const handleCreateLock = async () => {
    if (!token) {
      setFormError('You must be logged in to create a lock');
      return;
    }
    
    if (!user?.hasPin) {
      setFormError('Create a security PIN first to lock tabs');
      setIsPinSetupOpen(true);
      return;
    }

    if (!formState.name.trim()) {
      setFormError('Lock name is required');
      return;
    }
    
    if (formState.name.trim().length < 2) {
      setFormError('Lock name must be at least 2 characters');
      return;
    }
    
    if (formState.name.trim().length > 120) {
      setFormError('Lock name must be 120 characters or less');
      return;
    }
    
    // Check for duplicate lock names
    const duplicateName = locks.find(
      (lock) => lock.name.toLowerCase() === formState.name.trim().toLowerCase()
    );
    if (duplicateName) {
      setFormError(`A lock named "${formState.name.trim()}" already exists`);
      return;
    }

    if (queuedTabs.length === 0) {
      setFormError('Add at least one tab to lock');
      return;
    }
    
    if (queuedTabs.length > 20) {
      setFormError(`Too many tabs (${queuedTabs.length}). Maximum is 20 tabs per lock`);
      return;
    }

    if (!createPinValue.trim()) {
      setFormError('Enter your security PIN to lock these tabs');
      return;
    }
    
    if (createPinValue.trim().length < 4 || createPinValue.trim().length > 12) {
      setFormError('PIN must be 4-12 characters');
      return;
    }

    setFormError('');
    setFormLoading(true);
    try {
      const payload = {
        name: formState.name.trim(),
        note: formState.note.trim() || undefined,
        isGroup: formState.isGroup || queuedTabs.length > 1,
        tabs: queuedTabs,
        pin: createPinValue.trim(),
      };
      const response = await tabLockApi.create(token, payload);
      setLocks((prev) => [response.lock, ...prev]);

      // If in extension mode and lock is created, immediately close the tabs
      if (extensionMode) {
        try {
          await lockTabs(response.lock.id, response.lock.tabs, createPinValue.trim());
          console.log(`[WebAccessLock] Locked ${response.lock.tabs.length} tabs via Chrome API`);
        } catch (err) {
          console.error('[WebAccessLock] Failed to lock tabs via Chrome API:', err);
          // Don't fail the whole operation if Chrome API fails
        }
      }

      resetCreateForm();
      setIsCreateModalOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to create lock';
      
      // Provide better error messages for common issues
      if (errorMessage.includes('Incorrect PIN')) {
        setFormError('Incorrect PIN. Please try again');
      } else if (errorMessage.includes('PIN not set')) {
        setFormError('Please set up your security PIN first');
        setIsPinSetupOpen(true);
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setFormError('Network error. Please check your connection and try again');
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setFormError('Session expired. Please sign in again');
      } else {
        setFormError(errorMessage);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const openPinModal = (lock: TabLock, mode: 'unlock' | 'relock') => {
    setActiveLock(lock);
    setPinMode(mode);
    setPinValue('');
    setPinError('');
    setIsPinModalOpen(true);
  };

  const openDeleteModal = (lock: TabLock) => {
    setLockToDelete(lock);
    setDeletePinValue('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handlePinAction = async () => {
    if (!token) {
      setPinError('You must be logged in');
      return;
    }
    
    if (!activeLock) {
      setPinError('No lock selected');
      return;
    }
    
    if (!pinValue.trim()) {
      setPinError('Enter your security PIN');
      return;
    }
    
    if (pinValue.trim().length < 4 || pinValue.trim().length > 12) {
      setPinError('PIN must be 4-12 characters');
      return;
    }

    setPinLoading(true);
    try {
      const response =
        pinMode === 'unlock'
          ? await tabLockApi.unlock(token, activeLock.id, pinValue.trim())
          : await tabLockApi.relock(token, activeLock.id, pinValue.trim());

      setLocks((prev) => prev.map((lock) => (lock.id === response.lock.id ? response.lock : lock)));

      // If in extension mode, trigger Chrome API action
      if (extensionMode) {
        try {
          if (pinMode === 'unlock') {
            await unlockTabs(activeLock.id, pinValue.trim());
            console.log(`[WebAccessLock] Unlocked tabs via Chrome API for lock ${activeLock.id}`);
          } else {
            await lockTabs(activeLock.id, activeLock.tabs, pinValue.trim());
            console.log(`[WebAccessLock] Re-locked tabs via Chrome API for lock ${activeLock.id}`);
          }
        } catch (err) {
          console.error('[WebAccessLock] Failed to execute Chrome API action:', err);
        }
      }

      setIsPinModalOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      
      if (errorMessage.includes('Incorrect PIN')) {
        setPinError('Incorrect PIN. Please try again');
      } else if (errorMessage.includes('Lock not found')) {
        setPinError('Lock not found. It may have been deleted');
        setIsPinModalOpen(false);
        await fetchLocks();
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setPinError('Network error. Please check your connection');
      } else {
        setPinError(errorMessage);
      }
    } finally {
      setPinLoading(false);
    }
  };

  const handleDeleteLock = async () => {
    if (!token) {
      setDeleteError('You must be logged in');
      return;
    }
    
    if (!lockToDelete) {
      setDeleteError('No lock selected for deletion');
      return;
    }
    
    if (!deletePinValue.trim()) {
      setDeleteError('Enter your security PIN to delete this lock');
      return;
    }
    
    if (deletePinValue.trim().length < 4 || deletePinValue.trim().length > 12) {
      setDeleteError('PIN must be 4-12 characters');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      await tabLockApi.remove(token, lockToDelete.id, deletePinValue.trim());
      setLocks((prev) => prev.filter((lock) => lock.id !== lockToDelete.id));

      if (extensionMode) {
        try {
          await unlockTabs(lockToDelete.id, deletePinValue.trim());
        } catch (err) {
          console.error('[WebAccessLock] Failed to release lock in extension context:', err);
        }
      }

      setIsDeleteModalOpen(false);
      setLockToDelete(null);
      setDeletePinValue('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to delete lock';
      
      if (errorMessage.includes('Incorrect PIN')) {
        setDeleteError('Incorrect PIN. Please try again');
      } else if (errorMessage.includes('Lock not found')) {
        setDeleteError('Lock not found. It may have been already deleted');
        setIsDeleteModalOpen(false);
        await fetchLocks();
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        setDeleteError('Network error. Please check your connection');
      } else {
        setDeleteError(errorMessage);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePinSetup = async () => {
    if (!pinSetupValue.trim()) {
      setPinSetupError('PIN is required');
      return;
    }

    if (pinSetupValue.trim().length < 4 || pinSetupValue.trim().length > 12) {
      setPinSetupError('PIN must be 4-12 characters');
      return;
    }

    setPinSetupLoading(true);
    try {
      await setPin(pinSetupValue.trim());
      setIsPinSetupOpen(false);
      setPinSetupValue('');
    } catch (err) {
      setPinSetupError(err instanceof Error ? err.message : 'Unable to set PIN');
    } finally {
      setPinSetupLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Web Access Lock</h1>
          <p className="text-gray-600 mt-1">
            Lock sensitive tabs or tab groups and unlock them securely with your PIN
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="flex items-center"
          disabled={!user?.hasPin}
        >
          <Plus className="w-4 h-4 mr-2" />
          Lock Tabs
        </Button>
      </div>

      {(extensionMode || groupLocks.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {extensionMode && (
            <Button
              variant="secondary"
              className="flex items-center"
              onClick={handleQuickLockCurrentTab}
              disabled={!user?.hasPin || quickLockLoading}
            >
              {quickLockLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MousePointerSquare className="w-4 h-4 mr-2" />
              )}
              Lock Current Tab
            </Button>
          )}
          {groupLocks.length > 0 && (
            <Button variant="secondary" className="flex items-center" onClick={() => setIsGroupModalOpen(true)}>
              <Layers className="w-4 h-4 mr-2" />
              Show Group Tabs
            </Button>
          )}
        </div>
      )}

      {!user?.hasPin && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Secure Web Lock with a PIN</h3>
              <p className="text-sm text-gray-600 mt-1">
                Create a security PIN to start locking tabs and groups.
              </p>
            </div>
            <Button variant="warning" onClick={() => setIsPinSetupOpen(true)} className="flex items-center">
              <KeyRound className="w-4 h-4 mr-2" />
              Create PIN
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Locked Tabs</p>
              <p className="text-2xl font-bold text-gray-900">{lockedCount}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Unlock className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Unlocked</p>
              <p className="text-2xl font-bold text-gray-900">{unlockedCount}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Tab Groups</p>
              <p className="text-2xl font-bold text-gray-900">{groupCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locked Tabs</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {loading ? (
            <p className="text-gray-500">Loading tab locks...</p>
          ) : locks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No locked tabs yet</p>
              <p className="text-sm">Lock a tab or group to keep it private until you need it.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {locks.map((lock) => (
                <div key={lock.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-semibold text-gray-900">{lock.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            lock.status === 'locked'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {lock.status === 'locked' ? 'Locked' : 'Unlocked'}
                        </span>
                        {lock.isGroup && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Group
                          </span>
                        )}
                      </div>
                      {lock.note && <p className="text-sm text-gray-500 mt-1">{lock.note}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        Locked at {new Date(lock.lockedAt).toLocaleString()}
                      </p>
                      {lock.unlockedAt && (
                        <p className="text-xs text-gray-500">
                          Last unlocked {new Date(lock.unlockedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:justify-end">
                      <Button
                        size="sm"
                        variant={lock.status === 'locked' ? 'warning' : 'success'}
                        onClick={() => openPinModal(lock, lock.status === 'locked' ? 'unlock' : 'relock')}
                        disabled={!user?.hasPin}
                      >
                        {lock.status === 'locked' ? (
                          <span className="flex items-center justify-center">
                            <Unlock className="w-4 h-4 mr-1" /> Unlock
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <Lock className="w-4 h-4 mr-1" /> Re-lock
                          </span>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openDeleteModal(lock)}
                        className="flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {lock.tabs.map((tab, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-1 text-sm text-gray-700 md:flex-row md:items-center md:justify-between"
                      >
                        <span className="font-medium">{tab.title}</span>
                        <a
                          href={tab.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {tab.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          resetCreateForm();
          setIsCreateModalOpen(false);
        }}
        title="Lock Tabs"
      >
        <div className="space-y-5">
          <Input
            label="Lock Name"
            placeholder="e.g., Client Research Tabs"
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            label="Note (optional)"
            placeholder="Describe what's inside"
            value={formState.note}
            onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Input
                label="Single Link"
                placeholder="https://example.com"
                value={singleLinkInput}
                onChange={(event) => setSingleLinkInput(event.target.value)}
              />
              <Button size="sm" variant="secondary" onClick={handleAddSingleLink} className="w-full md:w-auto">
                Add Link
              </Button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bulk Links</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="One URL per line"
                value={bulkLinksInput}
                onChange={(event) => setBulkLinksInput(event.target.value)}
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" variant="secondary" onClick={handleAddBulkLinks}>
                  Add Bulk Links
                </Button>
              </div>
            </div>
          </div>

          {extensionMode && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLoadCurrentTabs}
              disabled={loadingCurrentTabs}
              className="flex items-center ml-auto"
            >
              {loadingCurrentTabs && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Add All Open Tabs
            </Button>
          )}

          <Input
            label="Security PIN"
            type="password"
            value={createPinValue}
            onChange={(event) => setCreatePinValue(event.target.value)}
            helperText="Enter your PIN to confirm locking these tabs"
          />

          <div className="border border-dashed border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Tabs queued ({queuedTabs.length})</p>
              {queuedTabs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearQueuedTabs}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            {queuedTabs.length === 0 ? (
              <p className="text-sm text-gray-500">Add a single link, paste bulk links, or import active tabs.</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-auto pr-1">
                {queuedTabs.map((tab) => (
                  <div
                    key={tab.url}
                    className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{tab.title || tab.url}</p>
                      <a
                        href={tab.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline break-all"
                      >
                        {tab.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTab(tab.url)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="lock-group-toggle"
              type="checkbox"
              checked={formState.isGroup}
              onChange={(event) => setFormState((prev) => ({ ...prev, isGroup: event.target.checked }))}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="lock-group-toggle" className="text-sm text-gray-700">
              Treat as a tab group
            </label>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                resetCreateForm();
                setIsCreateModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateLock} loading={formLoading}>
              Save Lock
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isQuickLockModalOpen}
        onClose={() => {
          if (quickLockLoading) return;
          setIsQuickLockModalOpen(false);
        }}
        title="Lock Current Tab"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter your security PIN to lock the active Chrome tab immediately.
          </p>
          <Input
            label="Security PIN"
            type="password"
            value={quickLockPinValue}
            onChange={(event) => setQuickLockPinValue(event.target.value)}
            helperText="Required to secure the current tab"
          />
          {quickLockPinError && <p className="text-sm text-red-600">{quickLockPinError}</p>}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsQuickLockModalOpen(false)} disabled={quickLockLoading}>
              Cancel
            </Button>
            <Button onClick={confirmQuickLock} loading={quickLockLoading}>
              Lock Tab
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title={pinMode === 'unlock' ? 'Unlock Tabs' : 'Re-lock Tabs'}
      >
        <div className="space-y-4">
          <Input
            label="Security PIN"
            type="password"
            value={pinValue}
            onChange={(event) => setPinValue(event.target.value)}
            helperText="Enter the PIN you created during onboarding"
          />
          {pinError && <p className="text-sm text-red-600">{pinError}</p>}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsPinModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePinAction} loading={pinLoading}>
              {pinMode === 'unlock' ? 'Unlock' : 'Re-lock'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isPinSetupOpen} onClose={() => setIsPinSetupOpen(false)} title="Create Security PIN">
        <div className="space-y-4">
          <Input
            label="New PIN"
            type="password"
            value={pinSetupValue}
            onChange={(event) => setPinSetupValue(event.target.value)}
            helperText="4-12 characters"
          />
          {pinSetupError && <p className="text-sm text-red-600">{pinSetupError}</p>}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsPinSetupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePinSetup} loading={pinSetupLoading}>
              Save PIN
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title="Group Tab Locks">
        {groupLocks.length === 0 ? (
          <p className="text-sm text-gray-600">Create a grouped lock to see it listed here.</p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
            {groupLocks.map((lock) => (
              <div key={lock.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{lock.name}</h4>
                    {lock.note && <p className="text-sm text-gray-500">{lock.note}</p>}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      lock.status === 'locked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {lock.status === 'locked' ? 'Locked' : 'Unlocked'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Locked {new Date(lock.lockedAt).toLocaleString()}
                  {lock.unlockedAt && ` • Last unlocked ${new Date(lock.unlockedAt).toLocaleString()}`}
                </p>
                <div className="mt-3 space-y-2">
                  {lock.tabs.map((tab, index) => (
                    <div
                      key={`${lock.id}-${index}`}
                      className="flex flex-col gap-1 text-sm md:flex-row md:items-center md:justify-between"
                    >
                      <span className="text-gray-700 truncate md:mr-3">{tab.title}</span>
                      <a
                        href={tab.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {tab.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (deleteLoading) return;
          setIsDeleteModalOpen(false);
          setDeleteError('');
          setLockToDelete(null);
          setDeletePinValue('');
        }}
        title="Delete Locked Site"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will permanently delete <span className="font-semibold">{lockToDelete?.name}</span> and allow
            access to its sites again. Enter your security PIN to confirm.
          </p>
          <Input
            label="Security PIN"
            type="password"
            value={deletePinValue}
            onChange={(event) => setDeletePinValue(event.target.value)}
            helperText="PIN is required to delete a lock"
          />
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteLock} loading={deleteLoading}>
              Delete Lock
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}