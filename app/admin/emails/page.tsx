'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetchInit } from '@/lib/adminApi';
import {
  Field,
  PageHeader,
  Panel,
  SaveButton,
  StatusChip,
  inputClass,
} from '../components/AdminUi';
import {
  EMAIL_TEMPLATE_META,
  applyEmailTokens,
  baseEmailVars,
  defaultEmailTemplates,
  type EmailTemplateId,
  type EmailTemplates,
} from '@/lib/email/templates';

function templatesEqual(a: EmailTemplates, b: EmailTemplates): boolean {
  return (Object.keys(a) as Array<keyof EmailTemplates>).every((key) => a[key] === b[key]);
}

export default function AdminEmailsPage() {
  const defaults = useMemo(() => defaultEmailTemplates(), []);
  const [templates, setTemplates] = useState<EmailTemplates>(defaults);
  const [savedTemplates, setSavedTemplates] = useState<EmailTemplates>(defaults);
  const [tab, setTab] = useState<EmailTemplateId>('welcome');
  const [fromName, setFromName] = useState('AI SLUTBOT');
  const [fromEmail, setFromEmail] = useState('');
  const [smtpReady, setSmtpReady] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [audience, setAudience] = useState('invoice_unpaid');
  const [audiences, setAudiences] = useState<Array<{ id: string; label: string; hint: string }>>([]);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [audienceHint, setAudienceHint] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('SEND');
  const [confirmInput, setConfirmInput] = useState('');
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState('');

  const active = EMAIL_TEMPLATE_META.find((item) => item.id === tab) ?? EMAIL_TEMPLATE_META[0];
  const dirty = !templatesEqual(templates, savedTemplates);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/email-settings', adminFetchInit);
      const data = (await res.json()) as {
        templates?: EmailTemplates;
        smtpConfigured?: boolean;
        fromName?: string;
        fromEmail?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message || 'Could not load email templates.');
        return;
      }
      const loaded = { ...defaults, ...data.templates };
      setTemplates(loaded);
      setSavedTemplates(loaded);
      setSmtpReady(Boolean(data.smtpConfigured));
      setFromName(data.fromName || 'AI SLUTBOT');
      setFromEmail(data.fromEmail || '');
    } catch {
      setError('Could not load email templates.');
    } finally {
      setLoading(false);
    }
  }, [defaults]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadAudience = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/email-campaigns?audience=${encodeURIComponent(id)}`, adminFetchInit);
      const data = (await res.json()) as {
        audiences?: Array<{ id: string; label: string; hint: string }>;
        confirmPhrase?: string;
        count?: number;
        hint?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message || 'Could not load audience count.');
        return;
      }
      if (data.audiences?.length) setAudiences(data.audiences);
      if (data.confirmPhrase) setConfirmPhrase(data.confirmPhrase);
      setAudienceCount(typeof data.count === 'number' ? data.count : 0);
      setAudienceHint(data.hint || '');
    } catch {
      setError('Could not load audience count.');
    }
  }, []);

  useEffect(() => {
    if (tab !== 'offer') return;
    void loadAudience(audience);
  }, [tab, audience, loadAudience]);

  function updateTemplates(next: EmailTemplates) {
    setTemplates(next);
    setSaved(false);
  }

  async function saveTemplates() {
    setSaving(true);
    setSaved(false);
    setError('');
    setNote('');
    try {
      const res = await fetch('/api/admin/email-settings', {
        ...adminFetchInit,
        method: 'PUT',
        body: JSON.stringify(templates),
      });
      const data = (await res.json()) as { templates?: EmailTemplates; message?: string };
      if (!res.ok) {
        setError(data.message || 'Could not save templates.');
        return;
      }
      const stored = { ...defaults, ...data.templates };
      setTemplates(stored);
      setSavedTemplates(stored);
      setSaved(true);
    } catch {
      setError('Could not save templates.');
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await saveTemplates();
  }

  async function sendTest() {
    setTesting(true);
    setNote('');
    setError('');
    try {
      const res = await fetch('/api/admin/email-settings/test', {
        ...adminFetchInit,
        method: 'POST',
        body: JSON.stringify({ template: tab, to: testTo, templates }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message || 'Could not send test email.');
        return;
      }
      setNote(
        dirty
          ? `Test ${active.label.toLowerCase()} email sent to ${testTo.trim().toLowerCase()} (uses your current draft — click SAVE to store it).`
          : `Test ${active.label.toLowerCase()} email sent to ${testTo.trim().toLowerCase()}.`,
      );
    } catch {
      setError('Could not send test email.');
    } finally {
      setTesting(false);
    }
  }

  async function sendCampaign() {
    if (confirmInput.trim() !== confirmPhrase) {
      setError(`Type ${confirmPhrase} to email this list.`);
      return;
    }
    setCampaignBusy(true);
    setError('');
    setNote('');
    setSaved(false);
    setCampaignProgress('Saving template and starting…');
    let afterId = '';
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    try {
      for (;;) {
        const res = await fetch('/api/admin/email-campaigns', {
          ...adminFetchInit,
          method: 'POST',
          body: JSON.stringify({
            audience,
            confirm: confirmPhrase,
            afterId: afterId || undefined,
            templates,
          }),
        });
        const data = (await res.json()) as {
          sent?: number;
          failed?: number;
          skipped?: number;
          done?: boolean;
          afterId?: string;
          errors?: string[];
          message?: string;
        };
        if (!res.ok) {
          setError(data.message || 'Could not send Launch offer.');
          return;
        }
        sent += data.sent || 0;
        failed += data.failed || 0;
        skipped += data.skipped || 0;
        setCampaignProgress(
          `Sent ${sent.toLocaleString()} · skipped ${skipped.toLocaleString()} · failed ${failed.toLocaleString()}`,
        );
        if (data.errors?.length) setError(data.errors.join(' · '));
        if (data.done) break;
        const nextAfter = data.afterId || '';
        if (!nextAfter || nextAfter === afterId) {
          setError('Campaign stopped before the list finished. Try again.');
          break;
        }
        afterId = nextAfter;
      }
      if (dirty) {
        const stored = { ...templates };
        setSavedTemplates(stored);
        setSaved(true);
      }
      setNote(
        `Launch offer finished. Sent ${sent.toLocaleString()}, skipped ${skipped.toLocaleString()} (emailed this audience in the last 7 days), failed ${failed.toLocaleString()}.`,
      );
      setConfirmInput('');
      await loadAudience(audience);
    } catch {
      setError('Could not send Launch offer.');
    } finally {
      setCampaignBusy(false);
    }
  }

  const previewVars = {
    ...baseEmailVars({ name: 'Alex', email: testTo || 'alex@example.com' }),
    plan: 'Flirt',
    amount: '$19.94',
    desires: '1,500',
    stars: '1,500',
    resetLink: 'https://aislutbot.com/login',
    checkoutUrl: 'https://aislutbot.com/checkout?plan=flirt',
  };
  const previewSubject = applyEmailTokens(templates[active.subjectKey], previewVars);
  const previewBody = applyEmailTokens(templates[active.bodyKey], previewVars);

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-5">
        <PageHeader
          kicker="Messaging"
          title="Email"
          description="Edit a template, then click SAVE. Nothing is stored until you save. Welcome still does not auto-send."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip connected={smtpReady} />
              {dirty ? (
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-200">
                  Unsaved changes
                </span>
              ) : null}
              <SaveButton disabled={saving || loading || !dirty}>
                {saving ? 'Saving…' : 'SAVE'}
              </SaveButton>
            </div>
          }
        />

        <Panel>
          <h2 className="text-lg font-black">Sending identity</h2>
          <p className="mt-1 text-sm text-white/40">
            From address is {fromEmail || 'hello@aislutbot.com'}. SMTP lives in env:{' '}
            <span className="font-mono text-white/55">SMTP_HOST</span>,{' '}
            <span className="font-mono text-white/55">SMTP_USER</span>,{' '}
            <span className="font-mono text-white/55">SMTP_PASSWORD</span>
            {smtpReady ? '.' : ' — not set yet, so mail will not send.'}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="From name">
              <input value={fromName} readOnly className={`${inputClass} opacity-80`} />
            </Field>
            <Field label="From email">
              <input type="email" value={fromEmail} readOnly className={`${inputClass} opacity-80`} />
            </Field>
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Templates</h2>
              <p className="mt-1 text-sm text-white/40">Tokens: {active.vars}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {EMAIL_TEMPLATE_META.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                    tab === item.id ? 'bg-[#ff2d78] text-white' : 'bg-white/8 text-white/55'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <Field label="Subject">
                <input
                  value={templates[active.subjectKey]}
                  disabled={loading}
                  onChange={(e) => updateTemplates({ ...templates, [active.subjectKey]: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Body">
                <textarea
                  rows={14}
                  value={templates[active.bodyKey]}
                  disabled={loading}
                  onChange={(e) => updateTemplates({ ...templates, [active.bodyKey]: e.target.value })}
                  className={`${inputClass} min-h-[320px] resize-y font-mono text-[13px] leading-relaxed`}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <SaveButton disabled={saving || loading || !dirty}>
                  {saving ? 'Saving…' : 'SAVE'}
                </SaveButton>
                {dirty ? (
                  <span className="text-sm text-amber-200/90">You have unsaved changes on this template.</span>
                ) : saved ? (
                  <span className="text-sm text-[#bbf7d0]">Saved to database.</span>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    updateTemplates({
                      ...templates,
                      [active.subjectKey]: defaults[active.subjectKey],
                      [active.bodyKey]: defaults[active.bodyKey],
                    })
                  }
                  className="text-sm font-semibold text-[#ff6b9d] hover:text-white"
                >
                  Restore default {active.label.toLowerCase()} copy
                </button>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/40 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">Preview</p>
              <p className="mt-3 text-xs text-white/35">
                {fromName} &lt;{fromEmail || 'hello@aislutbot.com'}&gt;
              </p>
              <p className="mt-4 text-lg font-black leading-snug">{previewSubject}</p>
              <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/70">
                {previewBody}
              </pre>
              <div className="mt-6">
                <Field
                  label="Send test to"
                  hint={
                    dirty
                      ? 'Sends your current draft. Click SAVE first if you want this copy stored for real sends.'
                      : 'Sends the saved template from the database.'
                  }
                >
                  <input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </Field>
              </div>
              <button
                type="button"
                disabled={testing || loading || !testTo.trim()}
                onClick={() => void sendTest()}
                className="mt-3 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-40"
              >
                {testing ? 'Sending…' : smtpReady ? 'Send test' : 'Send test (SMTP not configured)'}
              </button>
            </div>
          </div>
        </Panel>
      </form>

      {tab === 'offer' ? (
        <Panel>
          <h2 className="text-lg font-black">Send Launch offer</h2>
          <p className="mt-1 text-sm text-white/40">
            This emails real users from hello@aislutbot.com. Telegram-only accounts and banned users are skipped.
            Anyone already sent this audience in the last 7 days is skipped.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
            <Field label="Audience">
              <select
                value={audience}
                disabled={campaignBusy}
                onChange={(e) => {
                  setAudience(e.target.value);
                  setAudienceCount(null);
                  setAudienceHint('');
                  setConfirmInput('');
                }}
                className={inputClass}
              >
                {(audiences.length
                  ? audiences
                  : [
                      { id: 'invoice_unpaid', label: 'Invoice created, never paid' },
                      { id: 'checkout_reached', label: 'Reached checkout' },
                    ]
                ).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Recipients</p>
              <p className="mt-1 text-2xl font-black">
                {audienceCount == null ? '…' : audienceCount.toLocaleString()}
              </p>
            </div>
          </div>
          {audienceHint ? <p className="mt-3 text-sm text-white/45">{audienceHint}</p> : null}
          {dirty ? (
            <p className="mt-3 text-sm text-amber-200/90">
              You have unsaved Launch offer copy. Click SAVE above before sending, or the send will store your current
              draft automatically.
            </p>
          ) : null}
          <Field label={`Type ${confirmPhrase} to confirm`}>
            <input
              value={confirmInput}
              disabled={campaignBusy || !smtpReady || !audienceCount}
              onChange={(e) => setConfirmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (confirmInput.trim() === confirmPhrase) void sendCampaign();
                }
              }}
              placeholder={confirmPhrase}
              className={inputClass}
              autoComplete="off"
            />
          </Field>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={
                campaignBusy ||
                !smtpReady ||
                !audienceCount ||
                confirmInput.trim() !== confirmPhrase
              }
              onClick={() => void sendCampaign()}
              className="rounded-full bg-[#ff2d78] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {campaignBusy
                ? 'Sending…'
                : audienceCount == null
                  ? 'Counting…'
                  : `Email ${audienceCount.toLocaleString()} people`}
            </button>
            {campaignProgress ? <p className="text-sm text-white/55">{campaignProgress}</p> : null}
          </div>
        </Panel>
      ) : null}

      {error ? <p className="text-sm text-[#ffb0c8]">{error}</p> : null}
      {note ? <p className="text-sm text-[#bbf7d0]">{note}</p> : null}
    </div>
  );
}
