'use client';

import { useMemo, useState } from 'react';
import {
  Field,
  MockNote,
  PageHeader,
  Panel,
  SaveButton,
  StatusChip,
  inputClass,
  useAdminSettings,
} from '../components/AdminUi';

const TEMPLATES = [
  {
    id: 'offer' as const,
    label: 'Launch offers',
    subjectKey: 'offerSubject' as const,
    bodyKey: 'offerBody' as const,
    vars: '{{name}} {{plan}}',
  },
  {
    id: 'purchase' as const,
    label: 'Purchase confirm',
    subjectKey: 'purchaseSubject' as const,
    bodyKey: 'purchaseBody' as const,
    vars: '{{name}} {{plan}} {{amount}} {{desires}}',
  },
  {
    id: 'reset' as const,
    label: 'Restore password',
    subjectKey: 'resetSubject' as const,
    bodyKey: 'resetBody' as const,
    vars: '{{name}} {{resetLink}}',
  },
];

export default function AdminEmailsPage() {
  const { settings, setSettings, saved, onSubmit } = useAdminSettings();
  const [tab, setTab] = useState<(typeof TEMPLATES)[number]['id']>('offer');
  const email = settings.email;
  const connected = Boolean(email.smtpHost && email.smtpUser);
  const active = useMemo(() => TEMPLATES.find((t) => t.id === tab) ?? TEMPLATES[0], [tab]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PageHeader
        kicker="Messaging"
        title="Email"
        description="SMTP + templates for offers, purchase receipts, and password restore. Email login comes after you approve this layout."
        action={
          <div className="flex items-center gap-3">
            <StatusChip connected={connected} />
            <SaveButton>Save email setup</SaveButton>
          </div>
        }
      />
      <MockNote />

      <Panel>
        <h2 className="text-lg font-black">Sending identity</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="From name">
            <input
              value={email.fromName}
              onChange={(e) => setSettings({ ...settings, email: { ...email, fromName: e.target.value } })}
              className={inputClass}
            />
          </Field>
          <Field label="From email">
            <input
              type="email"
              value={email.fromEmail}
              onChange={(e) => setSettings({ ...settings, email: { ...email, fromEmail: e.target.value } })}
              className={inputClass}
            />
          </Field>
          <Field label="SMTP host">
            <input
              value={email.smtpHost}
              onChange={(e) => setSettings({ ...settings, email: { ...email, smtpHost: e.target.value } })}
              placeholder="smtp.example.com"
              className={inputClass}
            />
          </Field>
          <Field label="Port">
            <input
              value={email.smtpPort}
              onChange={(e) => setSettings({ ...settings, email: { ...email, smtpPort: e.target.value } })}
              className={inputClass}
            />
          </Field>
          <Field label="SMTP user">
            <input
              value={email.smtpUser}
              onChange={(e) => setSettings({ ...settings, email: { ...email, smtpUser: e.target.value } })}
              placeholder="Paste later"
              className={inputClass}
            />
          </Field>
          <Field label="SMTP password">
            <input
              type="password"
              autoComplete="off"
              value={email.smtpPassword}
              onChange={(e) => setSettings({ ...settings, email: { ...email, smtpPassword: e.target.value } })}
              placeholder="Paste later"
              className={inputClass}
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Templates</h2>
            <p className="mt-1 text-sm text-white/40">Tokens: {active.vars}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((item) => (
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
                value={email[active.subjectKey]}
                onChange={(e) =>
                  setSettings({ ...settings, email: { ...email, [active.subjectKey]: e.target.value } })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Body">
              <textarea
                rows={12}
                value={email[active.bodyKey]}
                onChange={(e) => setSettings({ ...settings, email: { ...email, [active.bodyKey]: e.target.value } })}
                className={`${inputClass} min-h-[280px] resize-y font-mono text-[13px] leading-relaxed`}
              />
            </Field>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/40 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">Preview</p>
            <p className="mt-3 text-xs text-white/35">
              {email.fromName} &lt;{email.fromEmail}&gt;
            </p>
            <p className="mt-4 text-lg font-black leading-snug">{email[active.subjectKey]}</p>
            <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/70">
              {email[active.bodyKey]}
            </pre>
            <button
              type="button"
              disabled
              className="mt-6 rounded-full bg-white/8 px-4 py-2 text-xs font-bold text-white/35"
            >
              Send test (not wired)
            </button>
          </div>
        </div>
      </Panel>
      {saved ? <p className="text-sm text-[#ffb0c8]">Saved in this browser. No email was sent.</p> : null}
    </form>
  );
}
