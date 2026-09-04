import connectDB from '@/lib/db/mongodb';
import { PlatformSettings } from '@/lib/models';
import { defaultEmailTemplates, type EmailTemplates } from '@/lib/email/templates';

type EmailSettingsDoc = {
  emailWelcomeSubject?: string;
  emailWelcomeBody?: string;
  emailPurchaseSubject?: string;
  emailPurchaseBody?: string;
  emailOfferSubject?: string;
  emailOfferBody?: string;
  emailResetSubject?: string;
  emailResetBody?: string;
};

function pick(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value : '';
  return text.trim() ? text : fallback;
}

export async function getEmailTemplates(): Promise<EmailTemplates> {
  const defaults = defaultEmailTemplates();
  await connectDB();
  const doc = (await PlatformSettings.findOne({ key: 'platform' }).lean()) as EmailSettingsDoc | null;
  return {
    welcomeSubject: pick(doc?.emailWelcomeSubject, defaults.welcomeSubject),
    welcomeBody: pick(doc?.emailWelcomeBody, defaults.welcomeBody),
    purchaseSubject: pick(doc?.emailPurchaseSubject, defaults.purchaseSubject),
    purchaseBody: pick(doc?.emailPurchaseBody, defaults.purchaseBody),
    offerSubject: pick(doc?.emailOfferSubject, defaults.offerSubject),
    offerBody: pick(doc?.emailOfferBody, defaults.offerBody),
    resetSubject: pick(doc?.emailResetSubject, defaults.resetSubject),
    resetBody: pick(doc?.emailResetBody, defaults.resetBody),
  };
}

export async function setEmailTemplates(input: Partial<EmailTemplates>): Promise<EmailTemplates> {
  const current = await getEmailTemplates();
  const next: EmailTemplates = {
    welcomeSubject: input.welcomeSubject ?? current.welcomeSubject,
    welcomeBody: input.welcomeBody ?? current.welcomeBody,
    purchaseSubject: input.purchaseSubject ?? current.purchaseSubject,
    purchaseBody: input.purchaseBody ?? current.purchaseBody,
    offerSubject: input.offerSubject ?? current.offerSubject,
    offerBody: input.offerBody ?? current.offerBody,
    resetSubject: input.resetSubject ?? current.resetSubject,
    resetBody: input.resetBody ?? current.resetBody,
  };

  await connectDB();
  await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    {
      $set: {
        emailWelcomeSubject: next.welcomeSubject,
        emailWelcomeBody: next.welcomeBody,
        emailPurchaseSubject: next.purchaseSubject,
        emailPurchaseBody: next.purchaseBody,
        emailOfferSubject: next.offerSubject,
        emailOfferBody: next.offerBody,
        emailResetSubject: next.resetSubject,
        emailResetBody: next.resetBody,
      },
    },
    { upsert: true },
  );

  return next;
}
