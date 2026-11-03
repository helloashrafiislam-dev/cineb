/**
 * Content compliance helpers — provider authorization & site legal config.
 * Providers default to unverified; commercial embedding is never assumed.
 */

export type ProviderAuthStatus = 'verified' | 'unverified' | 'disabled';

export type ContentProviderKey = 'nexstream' | 'vidsrc' | 'owner_direct';

export interface ContentProviderRecord {
  id: string;
  providerKey: ContentProviderKey;
  displayName: string;
  sourceUrl: string;
  authorizationStatus: ProviderAuthStatus;
  authorizationEvidence: string;
  restrictions: string;
  notes: string;
  lastReviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ComplaintStatus =
  | 'received'
  | 'under_review'
  | 'content_disabled'
  | 'rejected'
  | 'resolved';

export interface CopyrightComplaint {
  id: string;
  complainantName: string;
  complainantEmail: string;
  complainantOrganization?: string;
  copyrightedWork: string;
  infringingUrl: string;
  tmdbId?: number;
  movieId?: string;
  description: string;
  goodFaithAffirmation: boolean;
  accuracyAffirmation: boolean;
  status: ComplaintStatus;
  adminNotes: string;
  disabledTmdbIds: number[];
  disabledMovieIds: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface SiteComplianceSettings {
  contactEmail: string;
  dmcaEmail: string;
  legalEntityName: string;
  siteName: string;
  /** When true (default), only Verified providers may serve embeds */
  requireVerifiedProvidersForPlayback: boolean;
}

export function getEnvSiteCompliance(): Pick<
  SiteComplianceSettings,
  'contactEmail' | 'dmcaEmail' | 'legalEntityName' | 'siteName'
> {
  const contact =
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.SITE_CONTACT_EMAIL?.trim() ||
    'contact@example.com';
  const dmca =
    process.env.DMCA_EMAIL?.trim() ||
    process.env.SITE_DMCA_EMAIL?.trim() ||
    contact;
  return {
    contactEmail: contact,
    dmcaEmail: dmca,
    legalEntityName:
      process.env.SITE_LEGAL_NAME?.trim() ||
      process.env.LEGAL_ENTITY_NAME?.trim() ||
      'CineStream',
    siteName: process.env.SITE_NAME?.trim() || 'CineStream'
  };
}

export function createDefaultProviders(now = new Date().toISOString()): ContentProviderRecord[] {
  return [
    {
      id: 'provider-nexstream',
      providerKey: 'nexstream',
      displayName: 'NexStream',
      sourceUrl: process.env.NEXSTREAM_API_BASE_URL?.trim() || 'https://api.codespecters.com',
      authorizationStatus: 'unverified',
      authorizationEvidence: '',
      restrictions:
        'Commercial embedding rights are not verified in this deployment. Do not treat public embed URLs as a license.',
      notes:
        'Third-party embed provider. Mark Verified only after you obtain written authorization covering commercial use and AdSense-funded pages.',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'provider-vidsrc',
      providerKey: 'vidsrc',
      displayName: 'Vidsrc',
      sourceUrl: process.env.VIDSRC_BASE_URL?.trim() || 'https://vidsrc.mov',
      authorizationStatus: 'unverified',
      authorizationEvidence: '',
      restrictions:
        'Public embed endpoints do not equal permission to commercially distribute copyrighted titles.',
      notes:
        'Third-party embed provider. Keep Disabled or Unverified unless you hold documented rights.',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'provider-owner-direct',
      providerKey: 'owner_direct',
      displayName: 'Owner Direct Stream URL',
      sourceUrl: 'admin-managed',
      authorizationStatus: 'unverified',
      authorizationEvidence: '',
      restrictions:
        'Admin-supplied streamingUrl values play only when this source is Verified, or when requireVerifiedProvidersForPlayback is turned off (not recommended).',
      notes:
        'Use only for titles you own or are contractually authorized to stream. Record license evidence before marking Verified.',
      createdAt: now,
      updatedAt: now
    }
  ];
}

export function createDefaultComplianceSettings(): SiteComplianceSettings {
  const env = getEnvSiteCompliance();
  return {
    ...env,
    requireVerifiedProvidersForPlayback: true
  };
}

export function isProviderAuthorizedForPlayback(
  provider: ContentProviderRecord | undefined,
  settings: SiteComplianceSettings
): boolean {
  if (!provider) return false;
  const status = provider.authorizationStatus;
  if (status === 'disabled') return false;
  if (!settings.requireVerifiedProvidersForPlayback) {
    // Policy relaxed by admin — still never play Disabled sources
    return status === 'verified' || status === 'unverified';
  }
  return status === 'verified';
}
