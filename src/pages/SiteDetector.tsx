import { useState } from 'react';
import { Search, Globe } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { StatusBadge } from '../components/StatusBadge';
import { Spinner } from '../components/Spinner';
import { SiteAnalysisResult, SiteDetectorVerdict, SiteDetectorFactor } from '../types';
import { siteDetectorApi, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getActiveTabUrl } from '../utils/extensionApi';

export function MaliciousSiteDetector() {
  const { token } = useAuth();
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SiteAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [verdictMeta, setVerdictMeta] = useState<SiteDetectorVerdict | null>(null);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const analyzeTarget = async (targetUrl: string) => {
    if (!targetUrl.trim()) {
      setError('Please enter a URL to analyze');
      return;
    }

    if (!validateUrl(targetUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    if (!token) {
      setError('You must be signed in to analyze websites');
      return;
    }

    setError('');
    setVerdictMeta(null);
    setResult(null);
    setIsAnalyzing(true);

    try {
      const payload = await siteDetectorApi.analyze(token, { url: targetUrl.trim() });

      const suspiciousSignals = payload.signals?.filter((signal) => signal.status !== 'positive') ?? [];
      const maliciousFactors = payload.factors?.filter((factor) => factor.direction === 'malicious') ?? [];
      const httpsSignal = payload.signals?.find((signal) => signal.label === 'HTTPS enforced');
      const maliciousPercent = payload.aggregateScores ? Math.round((payload.aggregateScores.malicious || 0) * 100) : null;

      const mappedResult: SiteAnalysisResult = {
        url: payload.url,
        riskLevel: payload.riskLevel,
        threats: payload.threats,
        timestamp: payload.analyzedAt,
        details: {
          malwareDetected: payload.verdict === 'malicious',
          phishingIndicators:
            maliciousPercent !== null
              ? maliciousPercent
              : payload.verdict === 'phishing'
                ? Math.max(1, payload.stats?.suspicious ?? 0)
                : payload.stats?.suspicious ?? 0,
          suspiciousContent: [
            ...suspiciousSignals.map((signal) => `${signal.label}: ${signal.value}`),
            ...maliciousFactors.map((factor) => `${factor.label}: ${factor.evidence}`),
          ],
          certificateValid: httpsSignal ? httpsSignal.value === 'Yes' : payload.verdict === 'safe',
        },
      };

      setResult(mappedResult);
      setVerdictMeta(payload);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Analysis failed. Please try again.');
      } else {
        setError('Analysis failed. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    await analyzeTarget(url);
  };

  const handleAnalyzeCurrentSite = async () => {
    setPrefillLoading(true);
    setError('');
    try {
      const currentUrl = await getActiveTabUrl();
      if (!currentUrl) {
        setError('Unable to detect the current site. Enter a URL manually.');
        return;
      }

      setUrl(currentUrl);
      await analyzeTarget(currentUrl);
    } finally {
      setPrefillLoading(false);
    }
  };

  const signalTone = (status: 'positive' | 'warning' | 'danger') => {
    switch (status) {
      case 'positive':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'danger':
      default:
        return 'border-red-200 bg-red-50';
    }
  };

  const confidencePercent = typeof verdictMeta?.confidence === 'number'
    ? Math.round(Math.min(1, Math.max(0, verdictMeta.confidence)) * 100)
    : null;
  const stats = verdictMeta?.stats;
  const aggregateScores = verdictMeta?.aggregateScores;
  const factors = verdictMeta?.factors ?? [];

  const factorTone = (direction: 'safe' | 'malicious') =>
    direction === 'safe' ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900';

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
            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleAnalyzeCurrentSite}
                disabled={isAnalyzing || prefillLoading}
                loading={prefillLoading}
              >
                Use current site
              </Button>
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

              {verdictMeta && (
                <div className="space-y-4">
                  <div className="p-4 border border-gray-100 rounded-lg bg-white shadow-sm">
                    <div className="text-sm text-gray-500">Signal Source</div>
                    <div className="text-gray-900 font-medium">
                      {verdictMeta.source}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Raw verdict: <span className="font-semibold uppercase">{verdictMeta.verdict}</span>
                    </div>
                  </div>

                  {confidencePercent !== null && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Confidence</span>
                        <span className="font-semibold text-gray-900">{confidencePercent}%</span>
                      </div>
                      <div className="h-2 bg-white/60 rounded-full mt-2">
                        <div
                          className={`h-full rounded-full ${result?.riskLevel === 'safe' ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${confidencePercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {aggregateScores && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[{
                        label: 'Malicious evidence',
                        value: Math.round((aggregateScores.malicious || 0) * 100),
                        tone: 'bg-red-100 text-red-700 border border-red-200',
                      }, {
                        label: 'Safe evidence',
                        value: Math.round((aggregateScores.safe || 0) * 100),
                        tone: 'bg-green-100 text-green-700 border border-green-200',
                      }].map(({ label, value, tone }) => (
                        <div key={label} className={`p-4 rounded-lg shadow-sm ${tone}`}>
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span>{label}</span>
                            <span>{value}%</span>
                          </div>
                          <div className="h-2 bg-white/40 rounded-full mt-2">
                            <div className="h-full rounded-full bg-current" style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[{
                        label: 'Harmless',
                        value: stats.harmless,
                      }, {
                        label: 'Malicious',
                        value: stats.malicious,
                      }, {
                        label: 'Suspicious',
                        value: stats.suspicious,
                      }, {
                        label: 'Undetected',
                        value: stats.undetected,
                      }].map(({ label, value }) => (
                        <div key={label} className="p-3 rounded-lg bg-white border border-gray-100">
                          <div className="text-xs uppercase text-gray-500">{label}</div>
                          <div className="text-lg font-semibold text-gray-900">{value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {verdictMeta.signals && verdictMeta.signals.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Signals reviewed</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {verdictMeta.signals.map((signal, index) => (
                          <div
                            key={`${signal.label}-${index}`}
                            className={`border-l-4 p-3 rounded-lg shadow-sm ${signalTone(signal.status)}`}
                          >
                            <div className="text-xs uppercase text-gray-600">{signal.label}</div>
                            <div className="text-lg font-semibold text-gray-900">{signal.value}</div>
                            {signal.hint && <p className="text-xs text-gray-600 mt-1">{signal.hint}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {factors.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Decision factors</h4>
                      <div className="space-y-2">
                        {factors.map((factor) => {
                          const impact = Math.round(factor.weight * factor.score * 100);
                          return (
                            <div
                              key={factor.id}
                              className={`p-3 rounded-lg border ${factorTone(factor.direction)}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-semibold">{factor.label}</div>
                                  <div className="text-xs text-gray-600">{factor.source}</div>
                                </div>
                                <span className="text-sm font-semibold">{impact}%</span>
                              </div>
                              <p className="text-sm text-gray-700 mt-1">{factor.evidence}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

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