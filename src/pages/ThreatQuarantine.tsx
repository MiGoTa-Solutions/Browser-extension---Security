import { useState } from 'react';
import { Shield, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { mockThreats } from '../mocks/data';
import { ThreatItem } from '../types';

export function ThreatQuarantine() {
  const [threats, setThreats] = useState<ThreatItem[]>(mockThreats);
  const [selectedThreat, setSelectedThreat] = useState<ThreatItem | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'release' | 'delete'>('release');

  // TODO: Implement actual threat management with extension APIs
  const handleAction = (threat: ThreatItem, action: 'release' | 'delete') => {
    setSelectedThreat(threat);
    setActionType(action);
    setActionModalOpen(true);
  };

  const confirmAction = () => {
    if (!selectedThreat) return;

    if (actionType === 'delete') {
      setThreats(prev => prev.filter(t => t.id !== selectedThreat.id));
    } else {
      setThreats(prev =>
        prev.map(t =>
          t.id === selectedThreat.id
            ? { ...t, status: 'released' as const }
            : t
        )
      );
    }

    setActionModalOpen(false);
    setSelectedThreat(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'suspicious';
      default: return 'safe';
    }
  };

  const getThreatTypeIcon = (threatType: string) => {
    switch (threatType) {
      case 'phishing': return <AlertTriangle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Threat Quarantine</h1>
        <p className="text-gray-600 mt-1">Manage and review quarantined security threats</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Threats</p>
              <p className="text-2xl font-bold text-gray-900">
                {threats.filter(t => t.status === 'quarantined').length}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Released</p>
              <p className="text-2xl font-bold text-gray-900">
                {threats.filter(t => t.status === 'released').length}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Trash2 className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Deleted</p>
              <p className="text-2xl font-bold text-gray-900">
                {threats.filter(t => t.status === 'deleted').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quarantined Threats</CardTitle>
        </CardHeader>
        <CardContent>
          {threats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No threats detected</p>
              <p className="text-sm">Your browsing is secure</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Threat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {threats.map((threat) => (
                    <tr key={threat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getThreatTypeIcon(threat.threatType)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {threat.url}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="capitalize text-sm text-gray-900">
                          {threat.threatType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          status={getSeverityColor(threat.severity) as any}
                          label={threat.severity}
                          size="sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(threat.dateDetected).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`capitalize text-sm px-2 py-1 rounded-full ${
                          threat.status === 'quarantined' ? 'bg-orange-100 text-orange-800' :
                          threat.status === 'released' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {threat.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {threat.status === 'quarantined' && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleAction(threat, 'release')}
                            >
                              Release
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleAction(threat, 'delete')}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={`${actionType === 'release' ? 'Release' : 'Delete'} Threat`}
      >
        {selectedThreat && (
          <div className="space-y-4">
            <p>
              Are you sure you want to {actionType} this threat?
            </p>
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-medium">{selectedThreat.url}</p>
              <p className="text-sm text-gray-600">
                Type: {selectedThreat.threatType} | Severity: {selectedThreat.severity}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setActionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'delete' ? 'danger' : 'success'}
                onClick={confirmAction}
              >
                {actionType === 'release' ? 'Release' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}