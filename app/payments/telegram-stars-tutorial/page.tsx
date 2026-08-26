import type { Metadata } from 'next';
import PaymentTutorialLayout from '@/app/components/PaymentTutorialLayout';
import { buildPageMetadata } from '@/lib/seo';
import { TELEGRAM_STARS_PAYMENT_TUTORIAL } from '@/lib/paymentTutorials';

export const metadata: Metadata = buildPageMetadata({
  title: 'Telegram Stars Payment Tutorial',
  description:
    'Step-by-step guide to paying for AI SLUTBOT Slutcoins with a bank card, Apple Pay, or Google Pay through Telegram Stars.',
  path: '/payments/telegram-stars-tutorial',
});

export default function TelegramStarsPaymentTutorialPage() {
  return (
    <PaymentTutorialLayout
      tutorial={TELEGRAM_STARS_PAYMENT_TUTORIAL}
      alternateHref="/payments/crypto-tutorial"
      alternateLabel="Cryptocurrency payment tutorial"
    />
  );
}
