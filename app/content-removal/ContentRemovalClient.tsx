'use client';

import { useState } from 'react';
import SiteHeader from '../components/SiteHeader';

const inputClass =
  'mt-1.5 w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-3 text-base outline-none focus:border-[#ff2d78]/70';

export default function ContentRemovalClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/content-removal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, contentUrl, description }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message || 'Could not submit your request.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Could not submit your request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full text-white">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Content Removal &amp; Complaints</h1>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-white/65 sm:text-base">
          <p>
            Any reported complaint will be resolved and a response will be provided back to the requestor within 5
            business days or sooner.
          </p>
          <p>
            For legal complaints, non-consensual content, trafficking, abuse, coercion, or urgent safety reports, email{' '}
            <a href="mailto:legal@aislutbot.com" className="text-white underline underline-offset-2 hover:text-white/80">
              legal@aislutbot.com
            </a>
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] sm:p-8">
          {submitted ? (
            <div className="space-y-3">
              <p className="text-lg font-bold text-white">Request received</p>
              <p className="text-sm leading-relaxed text-white/65">
                Thank you for your submission. We will review your complaint and respond to the email address you
                provided within 5 business days or sooner.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black">Submit a removal request</h2>
              <p className="mt-2 text-sm text-white/55">
                Provide as much detail as possible so we can locate and review the content.
              </p>

              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
                  Your name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
                  Email address
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
                  Content URL <span className="normal-case tracking-normal text-white/30">(optional)</span>
                  <input
                    type="url"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    className={inputClass}
                    placeholder="https://"
                  />
                </label>

                <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
                  Description of complaint
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`${inputClass} min-h-[140px] resize-y`}
                    placeholder="Describe the content and why you are requesting removal."
                    required
                  />
                </label>

                {error ? <p className="text-sm text-[#ffb0c8]">{error}</p> : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-12 rounded-full bg-[#ff2d78] py-3 text-sm font-bold text-white hover:bg-[#ff1a6b] disabled:opacity-50"
                >
                  {loading ? 'Submitting…' : 'Submit request'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
