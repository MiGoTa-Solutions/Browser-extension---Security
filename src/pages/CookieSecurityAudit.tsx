import { useState, useEffect } from 'react';
import { Cookie, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/Skeleton';
import { mockCookies } from '../mocks/data';
import { CookieAudit } from '../types';

export function CookieSecurityAudit() {
  const [cookies, setCookies] = useState<CookieAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Implement actual cookie analysis with extension APIs
  const loadCookies = async () => {
    setIsLoading(true);
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCookies(mockCookies);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCookies();
  }, []);

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'danger': return 'danger';
      case 'warning': return 'suspicious';
      default: return 'safe';
    }
  };

  const getSecurityIcon = (secure: boolean) => {
    return secure ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-red-500" />
    );
  };

  const safeCookies = cookies.filter(c => c.riskLevel === 'safe');
  const warningCookies = cookies.filter(c => c.riskLevel === 'warning');
  const dangerCookies = cookies.filter(c => c.riskLevel === 'danger');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cookie Security Audit</h1>
          <p className="text-gray-600 mt-1">Analyze cookie security attributes and identify risks</p>
        </div>
        <Button onClick={loadCookies} className="flex items-center">
          <Cookie className="w-4 h-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Secure</p>
              <p className="text-2xl font-bold text-gray-900">{safeCookies.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Warning</p>
              <p className="text-2xl font-bold text-gray-900">{warningCookies.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">{dangerCookies.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Cookie className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{cookies.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cookie Security Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="w-full h-4" />
                  <div className="flex space-x-4">
                    <Skeleton className="w-20 h-3" />
                    <Skeleton className="w-20 h-3" />
                    <Skeleton className="w-20 h-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : cookies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Cookie className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No cookies found</p>
              <p className="text-sm">Visit a website to analyze cookies</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cookie Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Security Flags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cookies.map((cookie) => (
                    <tr key={cookie.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Cookie className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {cookie.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Path: {cookie.path}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cookie.domain}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <div className="flex items-center text-xs">
                            {getSecurityIcon(cookie.secure)}
                            <span className={cookie.secure ? 'text-green-600' : 'text-red-600'}>
                              Secure
                            </span>
                          </div>
                          <div className="flex items-center text-xs">
                            {getSecurityIcon(cookie.httpOnly)}
                            <span className={cookie.httpOnly ? 'text-green-600' : 'text-red-600'}>
                              HttpOnly
                            </span>
                          </div>
                          <div className="flex items-center text-xs">
                            {getSecurityIcon(!!cookie.sameSite)}
                            <span className={cookie.sameSite ? 'text-green-600' : 'text-red-600'}>
                              SameSite: {cookie.sameSite || 'None'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          status={getRiskLevelColor(cookie.riskLevel) as any}
                          label={cookie.riskLevel}
                          size="sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}