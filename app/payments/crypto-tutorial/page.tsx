import type { Metadata } from 'next';
import PaymentTutorialLayout from '@/app/components/PaymentTutorialLayout';
import { buildPageMetadata } from '@/lib/seo';
import { CRYPTO_PAYMENT_TUTORIAL } from '@/lib/paymentTutorials';

export const metadata: Metadata = buildPageMetadata({
  title: 'Crypto Payment Tutorial',
  description:
    'Step-by-step guide to paying for AI SLUTBOT Slutcoins with cryptocurrency via NOWPayments and Trust Wallet.',
  path: '/payments/crypto-tutorial',
});

export default function CryptoPaymentTutorialPage() {
  return (
    <PaymentTutorialLayout
      tutorial={CRYPTO_PAYMENT_TUTORIAL}
      alternateHref="/payments/telegram-stars-tutorial"
      alternateLabel="Telegram Stars payment tutorial"
    />
  );
}
