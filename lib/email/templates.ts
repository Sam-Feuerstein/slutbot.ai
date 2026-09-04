import { ACCOUNT_PATH, GENERATOR_PATH, HELLO_EMAIL, SITE_DOMAIN, SITE_URL, checkoutHref } from '@/lib/site';

export const EMAIL_TEMPLATE_IDS = ['welcome', 'purchase', 'offer', 'reset'] as const;
export type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number];

export type EmailTemplates = {
  welcomeSubject: string;
  welcomeBody: string;
  purchaseSubject: string;
  purchaseBody: string;
  offerSubject: string;
  offerBody: string;
  resetSubject: string;
  resetBody: string;
};

export type EmailTemplateVars = Record<string, string>;

export function recipientName(name?: string | null, email?: string | null): string {
  const trimmed = (name || '').trim();
  if (trimmed) return trimmed;
  const local = (email || '').split('@')[0]?.trim();
  return local || 'there';
}

export function defaultEmailTemplates(): EmailTemplates {
  return {
    welcomeSubject: 'Welcome to AI SLUTBOT',
    welcomeBody: `Hi {{name}},

Your AI SLUTBOT account is ready.

Generate: {{generatorUrl}}
Manage your account: {{accountUrl}}

Stars never expire. After you pay, they land on your wallet immediately.

Need help? Reply to this email or write {{helloEmail}}.

— AI SLUTBOT
${SITE_DOMAIN}`,
    purchaseSubject: 'Your {{plan}} pack is ready',
    purchaseBody: `Hi {{name}},

We received your {{plan}} purchase ({{amount}}).
{{desires}} Stars were added to your wallet.

Manage your account: {{accountUrl}}

Thanks for playing.
— AI SLUTBOT (${SITE_DOMAIN})`,
    offerSubject: '{{name}}, extra Stars this week',
    offerBody: `Hey {{name}},

Unlock {{plan}} and keep generating on ${SITE_DOMAIN}.

Checkout: {{checkoutUrl}}

— AI SLUTBOT`,
    resetSubject: 'Reset your AI SLUTBOT password',
    resetBody: `Hi {{name}},

Use this link to restore access to your ${SITE_DOMAIN} account:
{{resetLink}}

If you did not ask for this, ignore the email.

— AI SLUTBOT`,
  };
}

export function applyEmailTokens(template: string, vars: EmailTemplateVars): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
}

export function baseEmailVars(input: { name?: string | null; email?: string | null }): EmailTemplateVars {
  const email = (input.email || '').trim().toLowerCase();
  return {
    name: recipientName(input.name, email),
    email,
    siteUrl: SITE_URL,
    siteDomain: SITE_DOMAIN,
    helloEmail: HELLO_EMAIL,
    generatorUrl: `${SITE_URL}${GENERATOR_PATH}`,
    accountUrl: `${SITE_URL}${ACCOUNT_PATH}`,
    plan: '',
    amount: '',
    desires: '',
    stars: '',
    resetLink: '',
    checkoutUrl: `${SITE_URL}${checkoutHref({ plan: 'flirt' })}`,
  };
}

export const EMAIL_TEMPLATE_META: {
  id: EmailTemplateId;
  label: string;
  subjectKey: keyof EmailTemplates;
  bodyKey: keyof EmailTemplates;
  vars: string;
}[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    subjectKey: 'welcomeSubject',
    bodyKey: 'welcomeBody',
    vars: '{{name}} {{email}} {{generatorUrl}} {{accountUrl}} {{helloEmail}} {{siteUrl}}',
  },
  {
    id: 'purchase',
    label: 'Purchase confirm',
    subjectKey: 'purchaseSubject',
    bodyKey: 'purchaseBody',
    vars: '{{name}} {{plan}} {{amount}} {{desires}} {{accountUrl}}',
  },
  {
    id: 'offer',
    label: 'Launch offers',
    subjectKey: 'offerSubject',
    bodyKey: 'offerBody',
    vars: '{{name}} {{plan}} {{checkoutUrl}} {{siteUrl}}',
  },
  {
    id: 'reset',
    label: 'Restore password',
    subjectKey: 'resetSubject',
    bodyKey: 'resetBody',
    vars: '{{name}} {{resetLink}}',
  },
];
