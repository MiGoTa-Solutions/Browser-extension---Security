import { useState, useEffect } from 'react';
import { Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/Skeleton';
import { mockDOManomalies } from '../mocks/data';
import { DOMAnomaly } from '../types';

export function DOMContentInspection() {
  const [anomalies, setAnomalies] = useState<DOMAnomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // TODO: Implement actual DOM inspection with content script
  const loadAnomalies = async () => {
    setIsLoading(true);
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAnomalies(mockDOManomalies);
    setIsLoading(false);
  };

  const handleScan = async () => {
    setIsScanning(true);
    // TODO: Trigger DOM scan on active tab
    await new Promise(resolve => setTimeout(resolve, 2000));
    await loadAnomalies();
    setIsScanning(false);
  };

  useEffect(() => {
    loadAnomalies();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'suspicious';
      default: return 'safe';
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    switch (type) {
      case 'suspicious_script': return 'Suspicious Script';
      case 'hidden_iframe': return 'Hidden iframe';
      case 'form_hijack': return 'Form Hijacking';
      case 'click_jacking': return 'Clickjacking';
      default: return type;
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'hidden_iframe':
      case 'click_jacking':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Eye className="w-4 h-4 text-orange-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DOM Content Inspection</h1>
          <p className="text-gray-600 mt-1">Monitor and analyze DOM anomalies in real-time</p>
        </div>
        <Button
          onClick={handleScan}
          loading={isScanning}
          className="flex items-center"
        >
          {!isScanning && <RefreshCw className="w-4 h-4 mr-2" />}
          Scan Active Tab
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {anomalies.filter(a => a.severity === 'high').length}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Eye className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Medium Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {anomalies.filter(a => a.severity === 'medium').length}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Low Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {anomalies.filter(a => a.severity === 'low').length}
              </p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Scanned</p>
              <p className="text-2xl font-bold text-gray-900">{anomalies.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detected DOM Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                  </div>
                  <Skeleton className="w-20 h-6 rounded-full" />
                </div>
              ))}
            </div>
          ) : anomalies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No DOM anomalies detected</p>
              <p className="text-sm">The current page appears clean</p>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-shrink-0">
                    {getAnomalyIcon(anomaly.anomalyType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {getAnomalyTypeLabel(anomaly.anomalyType)}
                      </h4>
                      <StatusBadge
                        status={getSeverityColor(anomaly.severity) as any}
                        label={anomaly.severity}
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Element: <code className="bg-gray-100 px-1 rounded">{anomaly.element}</code>
                    </p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>Found on: {anomaly.url}</span>
                      <span>{new Date(anomaly.dateDetected).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}