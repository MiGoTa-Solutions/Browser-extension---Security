import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { mockBlockedSites } from '../mocks/data';
import { BlockedSite } from '../types';

export function WebAccessLock() {
  const [blockedSites, setBlockedSites] = useState<BlockedSite[]>(mockBlockedSites);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newReason, setNewReason] = useState('');

  // TODO: Implement actual URL blocking functionality
  const handleAddSite = () => {
    if (!newUrl.trim()) return;
    
    const newSite: BlockedSite = {
      id: Date.now().toString(),
      url: newUrl.trim(),
      dateAdded: new Date().toISOString().split('T')[0],
      reason: newReason.trim() || undefined
    };
    
    setBlockedSites(prev => [...prev, newSite]);
    setNewUrl('');
    setNewReason('');
    setIsModalOpen(false);
  };

  // TODO: Implement actual URL unblocking functionality
  const handleRemoveSite = (id: string) => {
    setBlockedSites(prev => prev.filter(site => site.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Web Access Lock</h1>
          <p className="text-gray-600 mt-1">Control and block access to specific websites</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Blocked Site
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blocked Websites ({blockedSites.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {blockedSites.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Lock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No websites are currently blocked</p>
              <p className="text-sm">Add a website to start protecting your browsing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedSites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{site.url}</div>
                    {site.reason && (
                      <div className="text-sm text-gray-500 mt-1">{site.reason}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      Blocked on {site.dateAdded}
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveSite(site.id)}
                    aria-label={`Remove ${site.url} from blocked list`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Blocked Website"
      >
        <div className="space-y-4">
          <Input
            label="Website URL"
            placeholder="e.g., malicious-site.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            helperText="Enter the full domain or URL to block"
          />
          <Input
            label="Reason (Optional)"
            placeholder="e.g., Known phishing site"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
          />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSite} disabled={!newUrl.trim()}>
              Add Site
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}