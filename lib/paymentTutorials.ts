import { SUPPORT_EMAIL } from '@/lib/site';

export const PAYMENT_SUPPORT_EMAIL = SUPPORT_EMAIL;

export type PaymentTutorialStep = {
  title: string;
  paragraphs?: string[];
  listItems?: string[];
  images?: string[];
  tips?: { title: string; paragraphs: string[] }[];
};

export type PaymentTutorial = {
  badge: string;
  title: string;
  intro: string[];
  steps: PaymentTutorialStep[];
  supportTitle: string;
  supportText: string;
};

export const CRYPTO_PAYMENT_TUTORIAL: PaymentTutorial = {
  badge: 'Cryptocurrency',
  title: 'How to pay for subscription using Cryptocurrency',
  intro: [
    'If you’re new to crypto, start by creating a crypto wallet or signing up on an exchange. If you already own cryptocurrency, feel free to jump straight to Step 3.',
  ],
  steps: [
    {
      title: 'Step 1 — Download a Crypto Wallet',
      paragraphs: [
        'There are many crypto wallet apps to choose from. In this tutorial, we’ll use Trust Wallet as an example.',
        'You can download it from the App Store (iOS) or Google Play (Android), or use the browser extension.',
        'Tap the icon below to download Trust Wallet:',
        'After installing Trust Wallet, follow the instructions in the app to create your first wallet.',
        'Important: Carefully write down and safely store your recovery phrase (seed phrase). Losing it means losing permanent access to your funds.',
      ],
      images: [
        '/payments/tutorials/crypto/appstore.avif',
        '/payments/tutorials/crypto/play-market.avif',
        '/payments/tutorials/crypto/chrome.avif',
        '/payments/tutorials/crypto/1crypto.avif',
        '/payments/tutorials/crypto/2crypto.avif',
      ],
    },
    {
      title: 'Step 2 — Buying Cryptocurrency in the Trust Wallet App',
      paragraphs: [
        'On the main wallet screen, tap the «Fund» button to open the purchase page, then tap «Buy Crypto».',
        'Enter the fiat currency you want to pay with and select USDT on the TRC20 (Tron) network. This is the only crypto we accept.',
        'Please note that the price may vary depending on your region and the amount. You may also be required to complete KYC (identity verification) during this step.',
        'We only accept USDT TRC20. Sending any other coin or USDT on a different network (ERC20, BEP20, SOL, etc.) will not credit your pack.',
      ],
      images: [
        '/payments/tutorials/crypto/3crypto.avif',
        '/payments/tutorials/crypto/4crypto.avif',
        '/payments/tutorials/crypto/5crypto.avif',
      ],
    },
    {
      title: 'Step 3 — Place Your Order with Cryptocurrency',
      paragraphs: [
        'On AI SLUTBOT, choose your Slutcoin pack, open checkout, select Crypto (USDT TRC20 only), and click Pay. You will be redirected to the NOWPayments page.',
      ],
    },
    {
      title: 'Step 4 — Complete the Payment in Your Wallet',
      paragraphs: [
        'On the NOWPayments page, pay with USDT on the TRC20 (Tron) network only. Do not switch coin or network.',
        'Copy the payment amount and the wallet address shown on the order page.',
        'In Trust Wallet, select USDT (TRC20), tap “Send”, paste the payment address, enter the exact amount, and confirm the transaction.',
        'Once the payment is successfully sent, your AI SLUTBOT Slutcoins will be activated right away! 🔥',
      ],
      images: [
        '/payments/tutorials/crypto/8crypto.avif',
        '/payments/tutorials/crypto/9crypto.avif',
        '/payments/tutorials/crypto/10crypto.avif',
        '/payments/tutorials/crypto/11crypto.avif',
        '/payments/tutorials/crypto/12crypto.avif',
        '/payments/tutorials/crypto/13crypto.avif',
      ],
    },
    {
      title: 'Tips',
      listItems: [
        'The most common mistake is sending USDT on the wrong network. We only accept USDT TRC20 (Tron). USDT on ETH, BSC, or Solana will not credit your order.',
        'Another common mistake is when the order gets stuck in a “partially paid” status. This usually happens if you forgot to account for the network fee (gas fee). Send the exact amount shown after network fees.',
        `If you encounter any payment issues, please contact our support via email at ${PAYMENT_SUPPORT_EMAIL} and we will help you immediately!`,
      ],
    },
  ],
  supportTitle: 'Still have questions about crypto payment?',
  supportText: `Email us at ${PAYMENT_SUPPORT_EMAIL} and our team will help you complete the payment.`,
};

export const TELEGRAM_STARS_PAYMENT_TUTORIAL: PaymentTutorial = {
  badge: 'Telegram Stars',
  title: 'How to pay for subscription using Bank Card via Telegram',
  intro: [
    'Purchasing Slutcoins with a bank card is done through Telegram in a simple two-step process. Follow the guide below for screenshots and troubleshooting tips.',
  ],
  steps: [
    {
      title: 'Step 1 — Select your plan and click Buy now',
      paragraphs: [
        'Go to the subscription page, select the Slutcoin pack you want, and click Buy now. On checkout, choose Telegram Stars and click Pay.',
      ],
    },
    {
      title: 'Step 2 — Confirm the Telegram payment popup',
      paragraphs: [
        'After tapping “Card with Telegram”, you will be instantly redirected to Telegram, where a payment popup for your AI SLUTBOT subscription will appear.',
      ],
      images: ['/payments/tutorials/stars/stars-step-2.avif'],
    },
    {
      title: 'Step 3 — Buy Telegram Stars',
      paragraphs: [
        'Since you don’t have any Stars yet, click the “Confirm and Pay” button showing your pack’s Star amount (for example, 1,000 Stars for the Flirt pack).',
      ],
      images: ['/payments/tutorials/stars/tg-stars-variants.avif'],
    },
    {
      title: 'Step 4 — Pay with your preferred method',
      paragraphs: ['Choose the amount of Stars you need and pay instantly using:'],
      listItems: ['Your bank card', 'Google Pay', 'Apple Pay', 'Or other available methods'],
      images: ['/payments/tutorials/stars/tg-stars-apple-confirm.avif'],
    },
    {
      title: 'Step 5 — Credits activated automatically',
      paragraphs: [
        'Right after the purchase, Stars will be automatically deducted and your AI SLUTBOT Slutcoins will be activated! 🔥',
      ],
    },
    {
      title: 'Important Tips',
      tips: [
        {
          title: 'If Stars were not automatically deducted for the subscription',
          paragraphs: [
            'Simply return to the subscription page and repeat Step 1 and Step 2. This usually solves the issue.',
          ],
        },
        {
          title: 'Can’t pay with your card?',
          paragraphs: [
            'Try using Apple Pay or Google Pay in the Telegram mobile app. You can also try the web version of Telegram. If it still doesn’t work, you can easily pay with Cryptocurrency instead.',
          ],
        },
        {
          title: 'Price may vary slightly due to Telegram’s fees',
          paragraphs: [
            'The final amount may be a bit higher than shown on the website. We don’t add any extra markup — this is purely Telegram’s commission.',
          ],
        },
        {
          title: 'Didn’t receive your credits after payment?',
          paragraphs: [
            `No problem! Email ${PAYMENT_SUPPORT_EMAIL} with your Telegram username and pack details — we will manually add the credits within a few minutes.`,
          ],
        },
      ],
    },
  ],
  supportTitle: 'Still have questions about payment using bank card via Telegram?',
  supportText: `Email us at ${PAYMENT_SUPPORT_EMAIL} and our team will help you complete the payment.`,
};
