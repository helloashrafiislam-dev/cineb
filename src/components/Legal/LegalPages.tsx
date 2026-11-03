import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { LegalPageLayout, LegalSection } from './LegalPageLayout.tsx';
import { api } from '../../services/api.ts';

export type LegalPageId =
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'copyright'
  | 'dmca'
  | 'disclaimer';

interface SiteLegalInfo {
  siteName: string;
  legalEntityName: string;
  contactEmail: string;
  dmcaEmail: string;
}

interface LegalPagesProps {
  page: LegalPageId;
  onBack: () => void;
  onNavigateLegal: (page: LegalPageId) => void;
}

const DEFAULT_LEGAL: SiteLegalInfo = {
  siteName: 'CineStream',
  legalEntityName: 'CineStream',
  contactEmail: 'contact@example.com',
  dmcaEmail: 'contact@example.com'
};

function useSiteLegal() {
  const [info, setInfo] = useState<SiteLegalInfo>(DEFAULT_LEGAL);
  useEffect(() => {
    api.getSiteLegal().then(setInfo).catch(() => undefined);
  }, []);
  return info;
}

export const LegalPages: React.FC<LegalPagesProps> = ({ page, onBack, onNavigateLegal }) => {
  const legal = useSiteLegal();

  switch (page) {
    case 'about':
      return <AboutPage legal={legal} onBack={onBack} onNavigateLegal={onNavigateLegal} />;
    case 'contact':
      return <ContactPage legal={legal} onBack={onBack} />;
    case 'privacy':
      return <PrivacyPage legal={legal} onBack={onBack} onNavigateLegal={onNavigateLegal} />;
    case 'terms':
      return <TermsPage legal={legal} onBack={onBack} onNavigateLegal={onNavigateLegal} />;
    case 'copyright':
      return <CopyrightPage legal={legal} onBack={onBack} onNavigateLegal={onNavigateLegal} />;
    case 'dmca':
      return <DmcaPage legal={legal} onBack={onBack} />;
    case 'disclaimer':
      return <DisclaimerPage legal={legal} onBack={onBack} onNavigateLegal={onNavigateLegal} />;
    default:
      return <AboutPage legal={legal} onBack={onBack} onNavigateLegal={onNavigateLegal} />;
  }
};

function AboutPage({
  legal,
  onBack,
  onNavigateLegal
}: {
  legal: SiteLegalInfo;
  onBack: () => void;
  onNavigateLegal: (p: LegalPageId) => void;
}) {
  return (
    <LegalPageLayout
      title="About Us"
      subtitle={`${legal.siteName} helps people discover movies and TV metadata. We do not claim ownership of studio titles.`}
      onBack={onBack}
    >
      <LegalSection title="What this website is">
        <p>
          {legal.siteName} is a discovery and catalog experience operated by {legal.legalEntityName}.
          We show titles, posters, trailers, and descriptions primarily sourced from The Movie Database
          (TMDB) and, where configured, from our own curated local catalog.
        </p>
        <p>
          Playback, when available, only appears for sources that an administrator has marked as
          authorized in our Content Compliance settings. A publicly reachable embed URL is not treated
          as proof of a commercial license.
        </p>
      </LegalSection>
      <LegalSection title="What we are not">
        <p>
          We are not a Hollywood studio, rights holder, or pirate distribution service. We do not
          claim that every title on this site is copyright-free, and we do not promise unlimited free
          streaming of copyrighted films.
        </p>
      </LegalSection>
      <LegalSection title="Third-party services">
        <p>
          Metadata and imagery may come from TMDB under their API and attribution terms. Streaming
          embeds or direct links, if enabled, come from separately configured providers or from
          administrator-supplied URLs. Those providers remain responsible for their own distribution
          rights; our role is limited to linking or embedding when authorization is recorded.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          Questions about the project: {' '}
          <a className="text-red-400 hover:underline" href={`mailto:${legal.contactEmail}`}>
            {legal.contactEmail}
          </a>
          . Copyright notices: see our{' '}
          <button type="button" className="text-red-400 hover:underline cursor-pointer" onClick={() => onNavigateLegal('dmca')}>
            DMCA / Copyright Removal
          </button>{' '}
          page.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

function ContactPage({ legal, onBack }: { legal: SiteLegalInfo; onBack: () => void }) {
  return (
    <LegalPageLayout
      title="Contact Us"
      subtitle="Reach the site operator for general questions, partnership inquiries, or legal notices."
      onBack={onBack}
    >
      <LegalSection title="General contact">
        <p>
          Email:{' '}
          <a className="text-red-400 hover:underline" href={`mailto:${legal.contactEmail}`}>
            {legal.contactEmail}
          </a>
        </p>
        <p>Operator: {legal.legalEntityName}</p>
      </LegalSection>
      <LegalSection title="Copyright / DMCA">
        <p>
          For copyright complaints, use the dedicated form on the DMCA page or email{' '}
          <a className="text-red-400 hover:underline" href={`mailto:${legal.dmcaEmail}`}>
            {legal.dmcaEmail}
          </a>
          . Please include the copyrighted work, the exact URL on this site, and your contact details.
        </p>
      </LegalSection>
      <LegalSection title="Response time">
        <p>
          We aim to acknowledge legitimate copyright notices within a few business days. Complex
          disputes may take longer while we verify ownership claims and disable disputed playback.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

function PrivacyPage({
  legal,
  onBack,
  onNavigateLegal
}: {
  legal: SiteLegalInfo;
  onBack: () => void;
  onNavigateLegal: (p: LegalPageId) => void;
}) {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How we handle information when you browse this site."
      onBack={onBack}
    >
      <LegalSection title="Overview">
        <p>
          {legal.legalEntityName} operates {legal.siteName}. This policy explains what limited data we
          process. We do not sell personal information.
        </p>
      </LegalSection>
      <LegalSection title="Information we may collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>Basic technical logs (IP address, browser type, pages requested) for security and reliability.</li>
          <li>Admin account credentials for operators who sign into the dashboard.</li>
          <li>Information you voluntarily submit through contact or copyright complaint forms.</li>
          <li>Advertising-related metrics for configured ad slots (impressions/clicks) when ads are enabled.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Cookies and local storage">
        <p>
          We may use cookies or local/session storage for admin sessions, ad frequency caps, and basic
          preferences. Third-party ad networks (such as Google AdSense, when enabled) may set their own
          cookies subject to their policies and applicable consent requirements.
        </p>
      </LegalSection>
      <LegalSection title="Third parties">
        <p>
          TMDB, streaming providers, analytics, and advertising partners process data under their own
          terms when their services load. Review those providers’ privacy policies for details.
        </p>
      </LegalSection>
      <LegalSection title="Your choices">
        <p>
          You may request access to or deletion of personal data you submitted to us by emailing{' '}
          <a className="text-red-400 hover:underline" href={`mailto:${legal.contactEmail}`}>
            {legal.contactEmail}
          </a>
          . See also our{' '}
          <button type="button" className="text-red-400 hover:underline cursor-pointer" onClick={() => onNavigateLegal('terms')}>
            Terms
          </button>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

function TermsPage({
  legal,
  onBack,
  onNavigateLegal
}: {
  legal: SiteLegalInfo;
  onBack: () => void;
  onNavigateLegal: (p: LegalPageId) => void;
}) {
  return (
    <LegalPageLayout title="Terms and Conditions" subtitle={`Rules for using ${legal.siteName}.`} onBack={onBack}>
      <LegalSection title="Acceptance">
        <p>
          By using {legal.siteName}, you agree to these Terms and our{' '}
          <button type="button" className="text-red-400 hover:underline cursor-pointer" onClick={() => onNavigateLegal('privacy')}>
            Privacy Policy
          </button>
          . If you disagree, please stop using the site.
        </p>
      </LegalSection>
      <LegalSection title="Service description">
        <p>
          The site provides movie/TV discovery, metadata browsing, and—only when authorized—links or
          embeds to playback sources. Availability of any title can change without notice. We do not
          guarantee uninterrupted access or that every listed title can be streamed.
        </p>
      </LegalSection>
      <LegalSection title="User responsibilities">
        <ul className="list-disc pl-5 space-y-1">
          <li>Do not attempt to bypass access controls, DRM, or geographic restrictions.</li>
          <li>Do not scrape, attack, or overload the service.</li>
          <li>Do not use the site to infringe copyrights or other rights.</li>
          <li>Respect third-party terms for TMDB, advertisers, and any streaming providers.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Intellectual property">
        <p>
          Site branding, layout, and original text belong to {legal.legalEntityName}. Movie titles,
          artwork, trailers, and related marks belong to their respective owners. TMDB content is used
          under TMDB’s terms with required attribution.
        </p>
      </LegalSection>
      <LegalSection title="Disclaimers and limitation">
        <p>
          The service is provided “as is.” To the fullest extent permitted by law, {legal.legalEntityName}{' '}
          is not liable for indirect or consequential damages arising from use of the site or third-party
          players. See the{' '}
          <button type="button" className="text-red-400 hover:underline cursor-pointer" onClick={() => onNavigateLegal('disclaimer')}>
            Disclaimer
          </button>
          .
        </p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>We may update these Terms. Continued use after changes means you accept the revised Terms.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}

function CopyrightPage({
  legal,
  onBack,
  onNavigateLegal
}: {
  legal: SiteLegalInfo;
  onBack: () => void;
  onNavigateLegal: (p: LegalPageId) => void;
}) {
  return (
    <LegalPageLayout
      title="Copyright Policy"
      subtitle="How we treat copyrighted works and third-party content."
      onBack={onBack}
    >
      <LegalSection title="Respect for rights holders">
        <p>
          {legal.siteName} respects intellectual property. We do not download, host, re-upload, or
          redistribute movie files as a general practice. We do not claim that catalog metadata equals
          a streaming license.
        </p>
      </LegalSection>
      <LegalSection title="Metadata vs. playback">
        <p>
          TMDB metadata (titles, posters, overviews, trailers) is used for discovery and attribution.
          Playback embeds or direct stream URLs are enabled only when a content source is marked
          Verified in our admin Content Compliance tools with recorded authorization evidence—or when
          an operator explicitly changes that policy (not recommended without legal review).
        </p>
      </LegalSection>
      <LegalSection title="Unverified providers">
        <p>
          Third-party embed providers ship as Unverified by default. An open embed endpoint is not
          treated as commercial authorization for AdSense-funded pages.
        </p>
      </LegalSection>
      <LegalSection title="Reporting infringement">
        <p>
          Rights holders can submit a notice via our{' '}
          <button type="button" className="text-red-400 hover:underline cursor-pointer" onClick={() => onNavigateLegal('dmca')}>
            DMCA / Copyright Removal
          </button>{' '}
          form or email{' '}
          <a className="text-red-400 hover:underline" href={`mailto:${legal.dmcaEmail}`}>
            {legal.dmcaEmail}
          </a>
          . Identified titles may be disabled pending review.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

function DisclaimerPage({
  legal,
  onBack,
  onNavigateLegal
}: {
  legal: SiteLegalInfo;
  onBack: () => void;
  onNavigateLegal: (p: LegalPageId) => void;
}) {
  return (
    <LegalPageLayout title="Disclaimer" subtitle="Important limitations of liability and content accuracy." onBack={onBack}>
      <LegalSection title="No ownership claim">
        <p>
          Unless expressly stated for a specific original work created by us, {legal.legalEntityName}{' '}
          does not own the copyrights in the films, shows, posters, or trailers referenced on this site.
        </p>
      </LegalSection>
      <LegalSection title="Third-party content">
        <p>
          External players, ads, and linked sites are outside our direct control. We are not responsible
          for their availability, accuracy, privacy practices, or legality. If a provider’s commercial
          embedding rights cannot be verified, we treat that provider as unverified.
        </p>
      </LegalSection>
      <LegalSection title="No legal advice">
        <p>
          Pages such as Privacy, Terms, and Copyright explain our practices in plain language. They are
          not legal advice. Consult a qualified attorney for your jurisdiction.
        </p>
      </LegalSection>
      <LegalSection title="AdSense and advertising">
        <p>
          Enabling Google AdSense (or other networks) does not mean Google has approved every page or
          that approval is guaranteed. We prohibit encouraging ad clicks, fake play buttons that are
          actually ads, or forcing users through ads to reach content.
        </p>
      </LegalSection>
      <LegalSection title="Related pages">
        <p>
          <button type="button" className="text-red-400 hover:underline cursor-pointer" onClick={() => onNavigateLegal('copyright')}>
            Copyright Policy
          </button>
          {' · '}
          <button type="button" className="text-red-400 hover:underline cursor-pointer" onClick={() => onNavigateLegal('dmca')}>
            DMCA
          </button>
          {' · '}
          <button type="button" className="text-red-400 hover:underline cursor-pointer" onClick={() => onNavigateLegal('terms')}>
            Terms
          </button>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

function DmcaPage({ legal, onBack }: { legal: SiteLegalInfo; onBack: () => void }) {
  const [form, setForm] = useState({
    complainantName: '',
    complainantEmail: '',
    complainantOrganization: '',
    copyrightedWork: '',
    infringingUrl: typeof window !== 'undefined' ? window.location.origin : '',
    tmdbId: '',
    movieId: '',
    description: '',
    goodFaithAffirmation: false,
    accuracyAffirmation: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitDmcaComplaint({
        ...form,
        tmdbId: form.tmdbId ? parseInt(form.tmdbId, 10) : undefined,
        movieId: form.movieId || undefined
      });
      setSuccessId(res.complaintId);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LegalPageLayout
      title="DMCA / Copyright Removal Request"
      subtitle="Submit a copyright complaint. Identified titles can be disabled while we review."
      onBack={onBack}
    >
      <LegalSection title="How we handle notices">
        <p>
          Email for copyright: {' '}
          <a className="text-red-400 hover:underline" href={`mailto:${legal.dmcaEmail}`}>
            {legal.dmcaEmail}
          </a>
          . You may also use the form below. If you include a TMDB id or local movie id, we attempt to
          disable playback for that title immediately pending human review.
        </p>
        <p>
          This process is designed in the spirit of notice-and-takedown practices. It does not create a
          false claim that we are a U.S. DMCA safe-harbor registrant unless you separately complete that
          registration.
        </p>
      </LegalSection>

      {successId ? (
        <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/40 p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <CheckCircle2 className="w-5 h-5" />
            Complaint received
          </div>
          <p className="text-sm text-emerald-200/80">
            Reference ID: <span className="font-mono">{successId}</span>. Keep this for follow-up with{' '}
            {legal.dmcaEmail}.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs space-y-1">
              <span className="text-neutral-400">Your name *</span>
              <input
                required
                value={form.complainantName}
                onChange={e => setForm(f => ({ ...f, complainantName: e.target.value }))}
                className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-neutral-400">Your email *</span>
              <input
                required
                type="email"
                value={form.complainantEmail}
                onChange={e => setForm(f => ({ ...f, complainantEmail: e.target.value }))}
                className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <label className="block text-xs space-y-1">
            <span className="text-neutral-400">Organization (optional)</span>
            <input
              value={form.complainantOrganization}
              onChange={e => setForm(f => ({ ...f, complainantOrganization: e.target.value }))}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-neutral-400">Copyrighted work *</span>
            <input
              required
              value={form.copyrightedWork}
              onChange={e => setForm(f => ({ ...f, copyrightedWork: e.target.value }))}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
              placeholder="e.g. Film title and year"
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-neutral-400">Infringing URL on this site *</span>
            <input
              required
              value={form.infringingUrl}
              onChange={e => setForm(f => ({ ...f, infringingUrl: e.target.value }))}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs space-y-1">
              <span className="text-neutral-400">TMDB ID (optional)</span>
              <input
                value={form.tmdbId}
                onChange={e => setForm(f => ({ ...f, tmdbId: e.target.value }))}
                className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-neutral-400">Local movie ID (optional)</span>
              <input
                value={form.movieId}
                onChange={e => setForm(f => ({ ...f, movieId: e.target.value }))}
                className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <label className="block text-xs space-y-1">
            <span className="text-neutral-400">Description of infringement *</span>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex items-start gap-2 text-xs text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={form.goodFaithAffirmation}
              onChange={e => setForm(f => ({ ...f, goodFaithAffirmation: e.target.checked }))}
              className="mt-0.5 accent-red-600"
            />
            <span>
              I have a good-faith belief that use of the material is not authorized by the copyright
              owner, its agent, or the law. *
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={form.accuracyAffirmation}
              onChange={e => setForm(f => ({ ...f, accuracyAffirmation: e.target.checked }))}
              className="mt-0.5 accent-red-600"
            />
            <span>
              The information in this notice is accurate, and I am authorized to act on behalf of the
              owner of an exclusive right that is allegedly infringed. *
            </span>
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold cursor-pointer disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit complaint
          </button>
        </form>
      )}
    </LegalPageLayout>
  );
}
