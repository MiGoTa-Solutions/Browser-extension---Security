import { useState } from 'react';
import { Search, Globe } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { StatusBadge } from '../components/StatusBadge';
import { Spinner } from '../components/Spinner';
import { SiteAnalysisResult } from '../types';

export function MaliciousSiteDetector() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SiteAnalysisResult | null>(null);
  const [error, setError] = useState('');

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  // TODO: Implement actual site analysis with threat intelligence APIs
  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Please enter a URL to analyze');
      return;
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    setError('');
    setIsAnalyzing(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock analysis result
      const mockResult: SiteAnalysisResult = {
        url: url.trim(),
        riskLevel: Math.random() > 0.7 ? 'danger' : Math.random() > 0.4 ? 'suspicious' : 'safe',
        threats: Math.random() > 0.5 ? ['Phishing indicators detected', 'Suspicious redirects'] : [],
        timestamp: new Date().toISOString(),
        details: {
          malwareDetected: Math.random() > 0.8,
          phishingIndicators: Math.floor(Math.random() * 5),
          suspiciousContent: Math.random() > 0.6 ? ['Hidden iframes', 'Suspicious scripts'] : [],
          certificateValid: Math.random() > 0.3
        }
      };

      setResult(mockResult);
    } catch (err) {
      setError('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Malicious Site Detector</h1>
        <p className="text-gray-600 mt-1">Analyze websites for potential security threats</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Website Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Website URL"
                placeholder="Enter website URL (e.g., example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                error={error}
                disabled={isAnalyzing}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                loading={isAnalyzing}
                className="flex items-center"
              >
                {!isAnalyzing && <Search className="w-4 h-4 mr-2" />}
                Analyze
              </Button>
            </div>
          </div>

          {isAnalyzing && (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
              <span className="ml-3 text-gray-600">Analyzing website security...</span>
            </div>
          )}

          {result && !isAnalyzing && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Globe className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">{result.url}</div>
                    <div className="text-sm text-gray-500">
                      Analyzed on {new Date(result.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <StatusBadge status={result.riskLevel} size="lg" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card padding="sm">
                  <h4 className="font-semibold text-gray-900 mb-2">Security Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Certificate Valid:</span>
                      <span className={result.details.certificateValid ? 'text-green-600' : 'text-red-600'}>
                        {result.details.certificateValid ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Malware Detected:</span>
                      <span className={result.details.malwareDetected ? 'text-red-600' : 'text-green-600'}>
                        {result.details.malwareDetected ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phishing Indicators:</span>
                      <span className={result.details.phishingIndicators > 0 ? 'text-orange-600' : 'text-green-600'}>
                        {result.details.phishingIndicators}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card padding="sm">
                  <h4 className="font-semibold text-gray-900 mb-2">Threats Found</h4>
                  {result.threats.length === 0 ? (
                    <p className="text-sm text-green-600">No threats detected</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-red-600">
                      {result.threats.map((threat, index) => (
                        <li key={index}>• {threat}</li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}