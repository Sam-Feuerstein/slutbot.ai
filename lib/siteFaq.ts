import { HELLO_EMAIL } from '@/lib/site';

export type SiteFaqItem = {
  question: string;
  answer: string;
};

export const SITE_FAQ: SiteFaqItem[] = [
  {
    question: 'What photo formats can I upload?',
    answer: 'You can upload JPG or PNG photos.',
  },
  {
    question: 'Do I need an account to generate?',
    answer: "Yes. Just sign in first, and you're ready to generate.",
  },
  {
    question: 'Can I generate both images and videos from one photo?',
    answer: 'Yes! You can use the same uploaded photo to create both images and videos.',
  },
  {
    question: 'How long are the videos?',
    answer: '5 seconds, and can be up to 20 seconds on ULTRA.',
  },
  {
    question: 'How many Stars does one image cost?',
    answer: 'One image costs 8 Stars. But our prices might rise in the near future.',
  },
  {
    question: 'What does ULTRA unlock that other packs do not?',
    answer:
      "ULTRA gives you 30% more credit, a custom prompt to generate spicier pictures and porn (the limit is your imagination), and longer videos up to 20 seconds. And you'll also be the first to play with our newest beta features.",
  },
  {
    question: 'Do unused Stars expire?',
    answer: 'Nope! Your Stars never expire and stay safely on your account, to use whenever you want.',
  },
  {
    question: 'How do I pay with a credit or debit card?',
    answer:
      "Simply buy the Stars that match your pack through our Telegram bot, and they'll be credited to your account instantly.",
  },
  {
    question: 'Can I pay with Apple Pay or Google Pay?',
    answer: "Yes! Apple Pay and Google Pay are both available through Telegram. It's what most of our users use.",
  },
  {
    question: 'Will AISLUTBOT show up as an adult charge on my bank statement?',
    answer: 'No. The charge appears as Telegram rather than an adult site.',
  },
  {
    question: 'What happens if I upload a photo of a minor?',
    answer: 'WE TERMINATE YOUR ACCOUNT.',
  },
  {
    question: 'Can I use AISLUTBOT on my phone?',
    answer: 'Yes! AISLUTBOT works on your phone, and we even have an app. Download it here.',
  },
  {
    question: 'What is a custom prompt, and which pack gets it?',
    answer:
      'A custom prompt lets you describe what you want to create and gives you more control over your generations. Custom prompts are included with ULTRA.',
  },
  {
    question: 'How do I contact support if payment or generation fails?',
    answer: `Just email our support team at ${HELLO_EMAIL} and we will be happy to help.`,
  },
  {
    question: 'How about privacy?',
    answer:
      'Your privacy matters to us. We automatically delete your uploaded photos and generated content every 48 hours or so, so make sure to download anything you would like to keep.',
  },
];
