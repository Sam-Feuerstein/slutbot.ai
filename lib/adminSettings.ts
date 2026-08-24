import { PREMIUM_PLANS } from '@/lib/premiumPlans';

export const ADMIN_SETTINGS_KEY = 'slutbot-admin-mock-v1';

export type PlanPriceRow = {
  id: string;
  desires: number;
  usdPrice: number;
  starsPrice: number;
};

export type AdminMockSettings = {
  costs: {
    image: number;
    videoBasic: number;
    videoBetter: number;
    videoBetter720: number;
    videoBetter1080: number;
  };
  plans: PlanPriceRow[];
  nowpayments: {
    apiKey: string;
    ipnSecret: string;
    sandbox: boolean;
    payCurrency: string;
  };
  telegram: {
    botToken: string;
    botUsername: string;
    webhookSecret: string;
  };
  email: {
    fromName: string;
    fromEmail: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPassword: string;
    offerSubject: string;
    offerBody: string;
    purchaseSubject: string;
    purchaseBody: string;
    resetSubject: string;
    resetBody: string;
  };
};

export function defaultPlanRows(): PlanPriceRow[] {
  return PREMIUM_PLANS.map((plan) => ({
    id: plan.id,
    desires: plan.desires,
    usdPrice: plan.price,
    starsPrice: plan.stars,
  }));
}

export function defaultAdminSettings(): AdminMockSettings {
  return {
    costs: {
      image: 2,
      videoBasic: 8,
      videoBetter: 16,
      videoBetter720: 24,
      videoBetter1080: 32,
    },
    plans: defaultPlanRows(),
    nowpayments: {
      apiKey: '',
      ipnSecret: '',
      sandbox: true,
      payCurrency: 'usdttrc20',
    },
    telegram: {
      botToken: '',
      botUsername: '',
      webhookSecret: '',
    },
    email: {
      fromName: 'SLUTBOT AI',
      fromEmail: 'offers@slutbot.ai',
      smtpHost: '',
      smtpPort: '587',
      smtpUser: '',
      smtpPassword: '',
      offerSubject: '{{name}}, extra Slutcoins this week',
      offerBody:
        'Hey {{name}},\n\nUnlock {{plan}} and keep generating. This offer is mock-only until SMTP is connected.\n\n— SLUTBOT AI',
      purchaseSubject: 'Your {{plan}} pack is ready',
      purchaseBody:
        'Hi {{name}},\n\nWe received your {{plan}} purchase ({{amount}}).\n{{desires}} Slutcoins were added to your wallet.\n\nThanks for playing.',
      resetSubject: 'Reset your SLUTBOT password',
      resetBody:
        'Hi {{name}},\n\nUse this link to restore access:\n{{resetLink}}\n\nIf you did not ask for this, ignore the email.',
    },
  };
}

export function loadAdminSettings(): AdminMockSettings {
  const base = defaultAdminSettings();
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<AdminMockSettings> & {
      costs?: Partial<AdminMockSettings['costs']> & { videoCheap?: number; videoCurrent?: number };
    };
    const parsedCosts: Partial<AdminMockSettings['costs']> & { videoCheap?: number; videoCurrent?: number } =
      parsed.costs || {};
    return {
      ...base,
      ...parsed,
      costs: {
        image: parsedCosts.image ?? base.costs.image,
        videoBasic: parsedCosts.videoBasic ?? parsedCosts.videoCheap ?? base.costs.videoBasic,
        videoBetter: parsedCosts.videoBetter ?? parsedCosts.videoCurrent ?? base.costs.videoBetter,
        videoBetter720: parsedCosts.videoBetter720 ?? base.costs.videoBetter720,
        videoBetter1080: parsedCosts.videoBetter1080 ?? base.costs.videoBetter1080,
      },
      plans: parsed.plans?.length ? parsed.plans : base.plans,
      nowpayments: { ...base.nowpayments, ...parsed.nowpayments },
      telegram: { ...base.telegram, ...parsed.telegram },
      email: { ...base.email, ...parsed.email },
    };
  } catch {
    return base;
  }
}

export function saveAdminSettings(next: AdminMockSettings) {
  window.localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(next));
}
