import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';

const router = Router();

const analyzeSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const SAFE_BROWSING_API_KEY = process.env.SAFE_BROWSING_API_KEY;
const URLSCAN_API_KEY = process.env.URLSCAN_API_KEY;
const OTX_API_KEY = process.env.OTX_API_KEY;

type DetectorVerdict = 'safe' | 'phishing' | 'malicious';
type DetectorRiskLevel = 'safe' | 'suspicious' | 'danger';

type SignalStatus = 'positive' | 'warning' | 'danger';

interface DetectorSignal {
  label: string;
  value: string;
  status: SignalStatus;
  hint?: string;
}

interface SafeBrowsingMatch {
  threatType: string;
  platformType: string;
  threatEntryType: string;
  threat: { url: string };
}

interface SafeBrowsingIntel {
  matches: SafeBrowsingMatch[];
  checkedAt: string;
}

interface UrlScanIntel {
  verdictLabel: string;
  malicious: boolean;
  suspicious: boolean;
  score?: number | null;
  tags: string[];
  indexedAt?: string;
  country?: string;
  result?: string;
  taskUrl?: string;
}

interface OtxPulseSummary {
  id: string;
  name: string;
  created: string;
}

interface OtxIntel {
  pulseCount: number;
  pulses: OtxPulseSummary[];
  reputation?: number | null;
  malwareFamilies: string[];
  references: string[];
}

interface VirusTotalStats {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
  timeout: number;
}

const EMPTY_STATS: VirusTotalStats = {
  harmless: 0,
  malicious: 0,
  suspicious: 0,
  undetected: 0,
  timeout: 0,
};

const FACTOR_WEIGHTS = {
  heuristics: 0.2,
  virusTotal: 0.3,
  safeBrowsing: 0.2,
  urlScan: 0.15,
  otx: 0.15,
} as const;

function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

function extractHostname(target: string): string {
  try {
    return new URL(target).hostname;
  } catch {
    return target;
  }
}

function mergeStats(stats?: Partial<VirusTotalStats> | null): VirusTotalStats {
  return {
    harmless: stats?.harmless ?? 0,
    malicious: stats?.malicious ?? 0,
    suspicious: stats?.suspicious ?? 0,
    undetected: stats?.undetected ?? 0,
    timeout: stats?.timeout ?? 0,
  };
}

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0.05, Number(value.toFixed(2))));
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function analyzeUrlHeuristics(url: string) {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const signals: DetectorSignal[] = [];
  let positiveChecks = 0;

  type HeuristicCheck = {
    label: string;
    value: string;
    status: SignalStatus;
    hint?: string;
    passed: number;
  };

  const checks: HeuristicCheck[] = [
    {
      label: 'HTTPS enforced',
      value: parsed.protocol === 'https:' ? 'Yes' : 'No',
      status: parsed.protocol === 'https:' ? 'positive' : 'warning',
      hint: parsed.protocol === 'https:' ? 'Secure transport detected' : 'Site does not enforce HTTPS',
      passed: parsed.protocol === 'https:' ? 1 : 0,
    },
    {
      label: 'Domain length',
      value: `${hostname.length} chars`,
      status: hostname.length > 35 ? 'danger' : hostname.length > 25 ? 'warning' : 'positive',
      hint: hostname.length > 35 ? 'Very long hostnames often hide malicious intent' : undefined,
      passed: hostname.length <= 35 ? 1 : 0,
    },
    {
      label: 'Subdomain depth',
      value: `${hostname.split('.').length - 1} levels`,
      status: hostname.split('.').length - 1 > 3 ? 'warning' : 'positive',
      hint: hostname.split('.').length - 1 > 3 ? 'Deeply nested subdomains may indicate deception' : undefined,
      passed: hostname.split('.').length - 1 <= 3 ? 1 : 0,
    },
    {
      label: 'IP address usage',
      value: /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ? 'Uses IP' : 'Domain name',
      status: /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ? 'danger' : 'positive',
      hint: /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ? 'Direct IP usage is common in phishing kits' : undefined,
      passed: /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ? 0 : 1,
    },
    {
      label: 'Suspicious keywords',
      value: /login|verify|update|secure|account|bank/i.test(url) ? 'Detected' : 'None',
      status: /login|verify|update|secure|account|bank/i.test(url) ? 'warning' : 'positive',
      hint: /login|verify|update|secure|account|bank/i.test(url) ? 'Common lure keywords present in URL' : undefined,
      passed: /login|verify|update|secure|account|bank/i.test(url) ? 0 : 1,
    },
  ];

  checks.forEach((check) => {
    signals.push({ label: check.label, value: check.value, status: check.status, hint: check.hint });
    positiveChecks += check.passed;
  });

  const heuristicsScore = clampConfidence(positiveChecks / checks.length);
  return { heuristicsScore, signals };
}

function buildStatSignals(stats: VirusTotalStats, reputation?: number, categories?: Record<string, string>) {
  const totalVotes = Math.max(1, stats.harmless + stats.malicious + stats.suspicious + stats.undetected + stats.timeout);
  const signals: DetectorSignal[] = [];

  signals.push({
    label: 'Harmless verdicts',
    value: `${stats.harmless} / ${totalVotes}`,
    status: stats.harmless / totalVotes >= 0.7 ? 'positive' : 'warning',
    hint: 'Community scanners that marked the domain as safe',
  });

  signals.push({
    label: 'Malicious verdicts',
    value: `${stats.malicious + stats.suspicious} / ${totalVotes}`,
    status: stats.malicious + stats.suspicious > 0 ? 'danger' : 'positive',
    hint: 'Vendors reporting malicious or suspicious behaviour',
  });

  signals.push({
    label: 'Undetected verdicts',
    value: `${stats.undetected} / ${totalVotes}`,
    status: stats.undetected / totalVotes >= 0.8 ? 'warning' : 'positive',
    hint: 'High undetected ratio can signal fresh campaigns',
  });

  if (typeof reputation === 'number') {
    signals.push({
      label: 'VirusTotal reputation score',
      value: reputation.toString(),
      status: reputation >= 0 ? 'positive' : reputation < -5 ? 'danger' : 'warning',
    });
  }

  if (categories && Object.keys(categories).length > 0) {
    const categoryList = Object.values(categories).slice(0, 3).join(', ');
    signals.push({
      label: 'Categorized as',
      value: categoryList,
      status: 'positive',
    });
  }

  return signals;
}

interface DetectorEvaluation {
  verdict: DetectorVerdict;
  riskLevel: DetectorRiskLevel;
  confidence: number;
  threats: string[];
  stats: VirusTotalStats;
}

interface RiskFactor {
  id: string;
  label: string;
  direction: 'safe' | 'malicious';
  weight: number;
  score: number;
  evidence: string;
  source: string;
}

function evaluateVerdict(stats: VirusTotalStats | null, heuristicsScore: number): DetectorEvaluation {
  const merged = mergeStats(stats);
  const totalVotes = Math.max(1, merged.harmless + merged.malicious + merged.suspicious + merged.undetected + merged.timeout);
  const harmlessRatio = merged.harmless / totalVotes;
  const maliciousRatio = (merged.malicious + merged.suspicious) / totalVotes;
  const unknownRatio = merged.undetected / totalVotes;

  let verdict: DetectorVerdict = 'phishing';
  let riskLevel: DetectorRiskLevel = 'suspicious';
  let confidence = heuristicsScore;
  const threats: string[] = [];

  if (harmlessRatio >= 0.7) {
    verdict = 'safe';
    riskLevel = 'safe';
    confidence = harmlessRatio;
  } else if (maliciousRatio >= 0.2) {
    verdict = 'malicious';
    riskLevel = 'danger';
    confidence = maliciousRatio;
    threats.push('Security engines flagged this domain as malicious.');
  } else if (unknownRatio >= 0.8) {
    verdict = 'phishing';
    riskLevel = 'danger';
    confidence = unknownRatio;
    threats.push('80% of security feeds had no label for this URL.');
  } else if (maliciousRatio >= 0.1) {
    verdict = 'phishing';
    riskLevel = 'danger';
    confidence = maliciousRatio;
    threats.push('Multiple vendors marked this URL as suspicious.');
  } else {
    verdict = heuristicsScore >= 0.6 ? 'safe' : 'phishing';
    riskLevel = heuristicsScore >= 0.6 ? 'safe' : 'danger';
    if (verdict !== 'safe') {
      threats.push('URL heuristics indicate heightened risk.');
    }
  }

  return {
    verdict,
    riskLevel,
    confidence: clampConfidence(confidence),
    threats,
    stats: merged,
  };
}

async function fetchVirusTotalIntel(url: string) {
  if (!VIRUSTOTAL_API_KEY) {
    return null;
  }

  const hostname = extractHostname(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`https://www.virustotal.com/api/v3/domains/${encodeURIComponent(hostname)}`, {
      method: 'GET',
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`[VirusTotal] ${response.status} ${message}`);
    }

    const payload = await response.json();
    const attributes = payload?.data?.attributes;
    if (!attributes) {
      return null;
    }

    return {
      stats: mergeStats(attributes.last_analysis_stats as Partial<VirusTotalStats>),
      reputation: attributes.reputation as number | undefined,
      categories: attributes.categories as Record<string, string> | undefined,
      tags: Array.isArray(attributes.tags) ? attributes.tags : [],
      raw: payload,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSafeBrowsingThreats(url: string): Promise<SafeBrowsingIntel | null> {
  if (!SAFE_BROWSING_API_KEY) {
    return null;
  }

  const body = {
    client: {
      clientId: 'secureshield',
      clientVersion: '1.0.0',
    },
    threatInfo: {
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }],
    },
  };

  const response = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`[SafeBrowsing] ${response.status} ${message}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.matches) || payload.matches.length === 0) {
    return null;
  }

  return {
    matches: payload.matches as SafeBrowsingMatch[],
    checkedAt: new Date().toISOString(),
  };
}

async function fetchUrlScanIntel(url: string): Promise<UrlScanIntel | null> {
  if (!URLSCAN_API_KEY) {
    return null;
  }

  const hostname = extractHostname(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const params = new URLSearchParams({ q: `domain:${hostname}`, size: '1' });
    const response = await fetch(`https://urlscan.io/api/v1/search/?${params.toString()}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'API-Key': URLSCAN_API_KEY,
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`[URLScan] ${response.status} ${message}`);
    }

    const payload = await response.json();
    const hit = Array.isArray(payload?.results) ? payload.results[0] : null;
    if (!hit) {
      return null;
    }

    const verdicts = hit?.verdicts ?? {};
    const overallScore = typeof verdicts.overall?.score === 'number' ? verdicts.overall.score : null;
    const malicious = Boolean(verdicts.malicious);
    const suspicious = Boolean(verdicts.suspicious);
    const verdictLabel = malicious
      ? 'Malicious verdict'
      : suspicious
      ? 'Suspicious verdict'
      : overallScore !== null
      ? `Score ${overallScore}`
      : 'No threats reported';

    return {
      verdictLabel,
      malicious,
      suspicious,
      score: overallScore,
      tags: Array.isArray(hit?.tags) ? hit.tags.slice(0, 5) : [],
      indexedAt: hit?.indexedAt ?? hit?.task?.time,
      country: hit?.page?.country,
      result: typeof hit?.result === 'string' ? hit.result : undefined,
      taskUrl: hit?.task?.url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOtxIntel(url: string): Promise<OtxIntel | null> {
  if (!OTX_API_KEY) {
    return null;
  }

  const hostname = extractHostname(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(hostname)}/general`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-OTX-API-KEY': OTX_API_KEY,
        },
        signal: controller.signal,
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`[OTX] ${response.status} ${message}`);
    }

    const payload = await response.json();
    const pulseInfo = payload?.pulse_info;
    const pulses = Array.isArray(pulseInfo?.pulses)
      ? (pulseInfo.pulses as Array<{ id: string; name: string; created: string }>).slice(0, 5)
      : [];

    return {
      pulseCount: typeof pulseInfo?.count === 'number' ? pulseInfo.count : pulses.length,
      pulses,
      reputation: typeof payload?.reputation === 'number' ? payload.reputation : null,
      malwareFamilies: Array.isArray(payload?.malware)
        ? payload.malware
            .map((entry: unknown) => {
              if (typeof entry === 'string') {
                return entry;
              }
              if (entry && typeof entry === 'object' && 'family' in entry && typeof entry.family === 'string') {
                return entry.family;
              }
              return null;
            })
            .filter((value: string | null): value is string => Boolean(value))
        : [],
      references: Array.isArray(payload?.references)
        ? payload.references.filter((ref: unknown): ref is string => typeof ref === 'string').slice(0, 5)
        : [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

router.post('/analyze', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = analyzeSchema.parse(req.body);
    const normalizedUrl = ensureProtocol(url.trim());

    const heuristics = analyzeUrlHeuristics(normalizedUrl);

    const [vtResult, safeResult, urlResult, otxResult] = await Promise.allSettled([
      fetchVirusTotalIntel(normalizedUrl),
      fetchSafeBrowsingThreats(normalizedUrl),
      fetchUrlScanIntel(normalizedUrl),
      fetchOtxIntel(normalizedUrl),
    ]);

    const vtIntel = vtResult.status === 'fulfilled' ? vtResult.value : null;
    if (vtResult.status === 'rejected') {
      console.warn('[SiteDetector] VirusTotal lookup failed', vtResult.reason);
    }

    const safeBrowsingIntel = safeResult.status === 'fulfilled' ? safeResult.value : null;
    if (safeResult.status === 'rejected') {
      console.warn('[SiteDetector] Safe Browsing lookup failed', safeResult.reason);
    }

    const urlScanIntel = urlResult.status === 'fulfilled' ? urlResult.value : null;
    if (urlResult.status === 'rejected') {
      console.warn('[SiteDetector] URLScan lookup failed', urlResult.reason);
    }

    const otxIntel = otxResult.status === 'fulfilled' ? otxResult.value : null;
    if (otxResult.status === 'rejected') {
      console.warn('[SiteDetector] OTX lookup failed', otxResult.reason);
    }

    const evaluation = evaluateVerdict(vtIntel?.stats ?? EMPTY_STATS, heuristics.heuristicsScore);
    const threats = [...evaluation.threats];
    const addThreat = (message: string) => {
      if (message && !threats.includes(message)) {
        threats.push(message);
      }
    };

    const factors: RiskFactor[] = [];
    let totalWeight = 0;
    let safeScoreTotal = 0;
    let maliciousScoreTotal = 0;

    const registerFactor = (factor: RiskFactor) => {
      const normalizedScore = clamp01(factor.score);
      const entry = { ...factor, score: normalizedScore };
      factors.push(entry);
      totalWeight += factor.weight;
      const weightedScore = factor.weight * normalizedScore;
      if (factor.direction === 'safe') {
        safeScoreTotal += weightedScore;
      } else {
        maliciousScoreTotal += weightedScore;
      }
    };

    const heuristicsDirection = heuristics.heuristicsScore >= 0.6 ? 'safe' : 'malicious';
    const heuristicsScore = heuristicsDirection === 'safe'
      ? heuristics.heuristicsScore
      : clamp01(1 - heuristics.heuristicsScore);
    registerFactor({
      id: 'heuristics-surface',
      label: 'Surface heuristics',
      direction: heuristicsDirection,
      weight: FACTOR_WEIGHTS.heuristics,
      score: heuristicsScore,
      evidence:
        heuristicsDirection === 'safe'
          ? 'Most quick checks passed (HTTPS, domain length, keywords)'
          : 'Multiple quick checks failed (HTTPS, keywords or host anomalies)',
      source: 'Heuristic analyzer',
    });

    if (vtIntel) {
      const vtStats = vtIntel.stats;
      const vtTotalVotes = Math.max(
        1,
        vtStats.harmless + vtStats.malicious + vtStats.suspicious + vtStats.undetected + vtStats.timeout,
      );
      const vtHarmlessRatio = vtStats.harmless / vtTotalVotes;
      const vtMaliciousRatio = (vtStats.malicious + vtStats.suspicious) / vtTotalVotes;
      const vtUnknownRatio = vtStats.undetected / vtTotalVotes;

      if (vtMaliciousRatio >= vtHarmlessRatio && vtMaliciousRatio >= 0.1) {
        registerFactor({
          id: 'virustotal-malicious',
          label: 'VirusTotal detections',
          direction: 'malicious',
          weight: FACTOR_WEIGHTS.virusTotal,
          score: vtMaliciousRatio,
          evidence: `${Math.round(vtMaliciousRatio * 100)}% of VT engines marked this domain malicious/suspicious`,
          source: 'VirusTotal',
        });
      } else if (vtHarmlessRatio >= 0.6) {
        registerFactor({
          id: 'virustotal-safe',
          label: 'VirusTotal harmless ratio',
          direction: 'safe',
          weight: FACTOR_WEIGHTS.virusTotal,
          score: vtHarmlessRatio,
          evidence: `${Math.round(vtHarmlessRatio * 100)}% of VT scanners marked harmless`,
          source: 'VirusTotal',
        });
      } else if (vtUnknownRatio >= 0.6) {
        registerFactor({
          id: 'virustotal-unknown',
          label: 'VirusTotal undetected',
          direction: 'malicious',
          weight: FACTOR_WEIGHTS.virusTotal,
          score: vtUnknownRatio,
          evidence: `${Math.round(vtUnknownRatio * 100)}% of VT engines had no label (potentially fresh campaign)`,
          source: 'VirusTotal',
        });
      }
    }

    if (safeBrowsingIntel) {
      registerFactor({
        id: 'safebrowsing-threat',
        label: 'Google Safe Browsing',
        direction: 'malicious',
        weight: FACTOR_WEIGHTS.safeBrowsing,
        score: 1,
        evidence: safeBrowsingIntel.matches.map((match) => match.threatType).join(', '),
        source: 'Google Safe Browsing',
      });
      addThreat(
        `Google Safe Browsing flagged this URL: ${safeBrowsingIntel.matches
          .map((match) => match.threatType)
          .join(', ')}`,
      );
    }

    if (urlScanIntel) {
      if (urlScanIntel.malicious) {
        registerFactor({
          id: 'urlscan-malicious',
          label: 'URLScan verdict',
          direction: 'malicious',
          weight: FACTOR_WEIGHTS.urlScan,
          score: 1,
          evidence: 'Latest sandbox crawl reported malicious artefacts',
          source: 'URLScan.io',
        });
        addThreat('URLScan reported a malicious verdict for the latest crawl.');
      } else if (urlScanIntel.suspicious) {
        registerFactor({
          id: 'urlscan-suspicious',
          label: 'URLScan suspicious indicators',
          direction: 'malicious',
          weight: FACTOR_WEIGHTS.urlScan,
          score: 0.7,
          evidence: urlScanIntel.verdictLabel,
          source: 'URLScan.io',
        });
        addThreat('URLScan reported suspicious artefacts for this domain.');
      } else {
        const safeScore = urlScanIntel.score !== null ? clamp01(1 - urlScanIntel.score / 100) : 0.6;
        registerFactor({
          id: 'urlscan-safe',
          label: 'URLScan crawl clean',
          direction: 'safe',
          weight: FACTOR_WEIGHTS.urlScan,
          score: safeScore,
          evidence: urlScanIntel.verdictLabel,
          source: 'URLScan.io',
        });
      }
    }

    if (otxIntel) {
      if (otxIntel.pulseCount > 0) {
        const normalizedPulseScore = clamp01(Math.min(1, otxIntel.pulseCount / 5));
        registerFactor({
          id: 'otx-pulses',
          label: 'AlienVault OTX pulses',
          direction: 'malicious',
          weight: FACTOR_WEIGHTS.otx,
          score: normalizedPulseScore,
          evidence: `${otxIntel.pulseCount} community threat pulses reference this domain`,
          source: 'AlienVault OTX',
        });
        addThreat(`AlienVault OTX lists this domain in ${otxIntel.pulseCount} active pulses.`);
      } else {
        registerFactor({
          id: 'otx-clean',
          label: 'AlienVault OTX reputation',
          direction: 'safe',
          weight: FACTOR_WEIGHTS.otx,
          score: 0.6,
          evidence: 'No threat pulses reference this domain',
          source: 'AlienVault OTX',
        });
      }
    }

    const weightDenominator = totalWeight || 1;
    const maliciousPercent = clamp01(maliciousScoreTotal / weightDenominator);
    const safePercent = clamp01(safeScoreTotal / weightDenominator);
    const unknownPercent = clamp01(1 - Math.min(1, maliciousPercent + safePercent));

    let finalVerdict = { ...evaluation, threats };
    const strongThreshold = 0.75;
    const mediumThreshold = 0.6;

    if (maliciousPercent >= strongThreshold) {
      addThreat('Aggregated signals report ≥75% malicious indicators.');
      finalVerdict = {
        ...finalVerdict,
        verdict: 'malicious',
        riskLevel: 'danger',
        confidence: clampConfidence(Math.max(finalVerdict.confidence, maliciousPercent)),
      };
    } else if (safePercent >= strongThreshold) {
      finalVerdict = {
        ...finalVerdict,
        verdict: 'safe',
        riskLevel: 'safe',
        confidence: clampConfidence(Math.max(finalVerdict.confidence, safePercent)),
      };
    } else if (maliciousPercent >= mediumThreshold) {
      addThreat('Majority of signals lean malicious.');
      finalVerdict = {
        ...finalVerdict,
        verdict: 'phishing',
        riskLevel: 'danger',
        confidence: clampConfidence(Math.max(finalVerdict.confidence, maliciousPercent)),
      };
    } else if (safePercent >= mediumThreshold) {
      finalVerdict = {
        ...finalVerdict,
        verdict: 'safe',
        riskLevel: 'safe',
        confidence: clampConfidence(Math.max(finalVerdict.confidence, safePercent)),
      };
    }

    const statSignals = vtIntel ? buildStatSignals(vtIntel.stats, vtIntel.reputation, vtIntel.categories) : [];

    const providerSignals: DetectorSignal[] = [];

    if (safeBrowsingIntel) {
      providerSignals.push({
        label: 'Google Safe Browsing',
        value: safeBrowsingIntel.matches.map((match) => match.threatType).join(', '),
        status: 'danger',
        hint: 'Flagged by Google Safe Browsing feeds',
      });
    }

    if (urlScanIntel) {
      providerSignals.push({
        label: 'URLScan verdict',
        value: urlScanIntel.verdictLabel,
        status: urlScanIntel.malicious ? 'danger' : urlScanIntel.suspicious ? 'warning' : 'positive',
        hint: urlScanIntel.score !== null ? `Score ${urlScanIntel.score}` : urlScanIntel.country ? `Country ${urlScanIntel.country}` : undefined,
      });
    }

    if (otxIntel) {
      providerSignals.push({
        label: 'AlienVault OTX pulses',
        value: `${otxIntel.pulseCount} pulses`,
        status: otxIntel.pulseCount > 0 ? 'warning' : 'positive',
        hint: otxIntel.pulses.map((pulse) => pulse.name).join(', ') || undefined,
      });
    }

    const signals: DetectorSignal[] = [...statSignals, ...providerSignals, ...heuristics.signals];

    const sourcesUsed: string[] = [];
    if (vtIntel) sourcesUsed.push('VirusTotal');
    if (safeBrowsingIntel) sourcesUsed.push('Google Safe Browsing');
    if (urlScanIntel) sourcesUsed.push('URLScan.io');
    if (otxIntel) sourcesUsed.push('AlienVault OTX');
    const sourceLabel = sourcesUsed.length > 0 ? sourcesUsed.join(' + ') : 'Heuristic Analyzer';

    return res.json({
      url: normalizedUrl,
      verdict: finalVerdict.verdict,
      riskLevel: finalVerdict.riskLevel,
      threats: finalVerdict.threats,
      analyzedAt: new Date().toISOString(),
      source: sourceLabel,
      confidence: finalVerdict.confidence,
      stats: finalVerdict.stats,
      signals,
      aggregateScores: {
        malicious: maliciousPercent,
        safe: safePercent,
        unknown: unknownPercent,
      },
      factors,
      intel: {
        reputation: vtIntel?.reputation ?? null,
        categories: vtIntel?.categories ?? {},
        tags: vtIntel?.tags ?? [],
        heuristicsOnly: sourcesUsed.length === 0,
        providers: {
          safeBrowsing: safeBrowsingIntel ?? undefined,
          urlScan: urlScanIntel ?? undefined,
          otx: otxIntel ?? undefined,
        },
      },
      raw: {
        virusTotal: vtIntel?.raw ?? null,
        safeBrowsing: safeBrowsingIntel,
        urlScan: urlScanIntel,
        otx: otxIntel,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: error.errors,
      });
    }

    console.error('[SiteDetector] analyze failed', error);
    return res.status(502).json({
      error: 'Site detector service unavailable',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
