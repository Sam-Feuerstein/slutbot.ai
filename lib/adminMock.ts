export type MockPurchase = {
  id: string;
  planId: string;
  provider: 'nowpayments' | 'telegram_stars';
  status: 'paid' | 'pending';
  usdAmount: number;
  starsAmount: number;
  desires: number;
  createdAt: string;
};

export type MockAdminUser = {
  id: string;
  email: string;
  name: string;
  telegramUsername: string;
  googleLinked: boolean;
  telegramLinked: boolean;
  desires: number;
  banned: boolean;
  joinedAt: string;
  lastLoginAt: string;
  imageGens: number;
  videoGens: number;
  purchases: MockPurchase[];
};

export const MOCK_ADMIN_USERS: MockAdminUser[] = [
  {
    id: 'u_demo_1',
    email: 'demo.gmail@slutbot.ai',
    name: 'Demo Gmail',
    telegramUsername: '',
    googleLinked: true,
    telegramLinked: false,
    desires: 42,
    banned: false,
    joinedAt: '2026-08-12T14:20:00.000Z',
    lastLoginAt: '2026-08-23T10:00:00.000Z',
    imageGens: 18,
    videoGens: 3,
    purchases: [
      {
        id: 'p1',
        planId: 'passion',
        provider: 'nowpayments',
        status: 'paid',
        usdAmount: 75.68,
        starsAmount: 0,
        desires: 568,
        createdAt: '2026-08-12T14:25:00.000Z',
      },
    ],
  },
  {
    id: 'u_demo_2',
    email: '',
    name: 'Telegram User',
    telegramUsername: 'demo_stars',
    googleLinked: false,
    telegramLinked: true,
    desires: 8,
    banned: false,
    joinedAt: '2026-08-18T09:00:00.000Z',
    lastLoginAt: '2026-08-22T19:10:00.000Z',
    imageGens: 4,
    videoGens: 1,
    purchases: [
      {
        id: 'p2',
        planId: 'tease',
        provider: 'telegram_stars',
        status: 'paid',
        usdAmount: 9.99,
        starsAmount: 660,
        desires: 25,
        createdAt: '2026-08-18T09:05:00.000Z',
      },
    ],
  },
  {
    id: 'u_demo_3',
    email: 'banned.user@slutbot.ai',
    name: 'Banned Account',
    telegramUsername: 'banned_demo',
    googleLinked: true,
    telegramLinked: true,
    desires: 0,
    banned: true,
    joinedAt: '2026-07-30T11:00:00.000Z',
    lastLoginAt: '2026-08-01T08:00:00.000Z',
    imageGens: 2,
    videoGens: 0,
    purchases: [],
  },
];
