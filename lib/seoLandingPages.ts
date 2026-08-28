export type SeoLandingPage = {
  slug: string;
  name: string;
  title: string;
  metaDescription: string;
  heroTagline: string;
  heroIntro: string;
  whatIs: string;
  whyCool: string[];
  steps: string[];
  ctaTitle: string;
  ctaSubtitle: string;
  vsCompetitor: string;
  faq: { question: string; answer: string }[];
};

const BENEFITS = [
  { title: 'Blazing speed', body: 'Generate results in seconds — no manual editing marathons.' },
  { title: 'Simple workflow', body: 'Upload, pick your settings, and let AI SLUTBOT handle the rest.' },
  { title: 'Private by design', body: 'Your uploads stay on your terms. We keep the flow discreet.' },
  { title: 'High quality', body: 'Modern neural models deliver sharp, realistic AI outputs.' },
  { title: 'Start free', body: 'Try the generator with Stars — no complicated signup traps.' },
];

export const SEO_LANDING_BENEFITS = BENEFITS;

function page(
  slug: string,
  name: string,
  title: string,
  metaDescription: string,
  heroTagline: string,
  heroIntro: string,
  whatIs: string,
  whyCool: string[],
  ctaTitle: string,
  ctaSubtitle: string,
  vsCompetitor: string,
  faq: SeoLandingPage['faq'],
): SeoLandingPage {
  return {
    slug,
    name,
    title,
    metaDescription,
    heroTagline,
    heroIntro,
    whatIs,
    whyCool,
    steps: [
      `Open the AI SLUTBOT ${name} generator.`,
      'Upload your photo from your phone or computer.',
      'Choose your style, quality, and generation settings.',
      'Download your result or refine it with another pass.',
    ],
    ctaTitle,
    ctaSubtitle,
    vsCompetitor,
    faq,
  };
}

export const SEO_LANDING_PAGES: SeoLandingPage[] = [
  page(
    'undress-ai',
    'Undress AI',
    'Undress AI Online — Photo to Nude Video',
    'Use Undress AI on AI SLUTBOT to turn a clothed photo into uncensored adult AI images and 5-second videos. Fast browser workflow, Star pricing, adults 18+ only.',
    'Technology that works for you',
    'Want to transform a photo without spending hours in an editor? Undress AI on AI SLUTBOT turns the process into a few clicks — fast, anonymous, and built for adults only.',
    'Undress AI uses advanced machine learning to reinterpret your uploaded photo into a new adult AI image or short clip. No complicated software: open the generator from any device, upload, adjust your prompt, and generate. AI SLUTBOT is built for speed, privacy, and uncensored creative control.',
    [
      'For beginners and power users alike — the workflow stays simple.',
      'Works in the browser: phone, tablet, or desktop.',
      'Pair still outputs with our video tools for motion in minutes.',
      'Stars keep pricing transparent before you generate.',
    ],
    'Undress any photo with AI',
    'Upload your image and let AI SLUTBOT do the work. Fast, secure, and anonymous.',
    'While Undress AI offers basic AI nude generation, AI SLUTBOT stands out with its superior realism and advanced customization options. Our platform provides a more refined experience, allowing users to create stunningly realistic nude images with greater control over the output, making it the best nude AI generator for detailed creations.',
    [
      {
        question: 'What is Undress AI and how does it work?',
        answer:
          'Undress AI is an adult AI generation tool on AI SLUTBOT. You upload a photo, choose settings, and our models produce a new AI-generated image or video based on your inputs.',
      },
      {
        question: 'Is Undress AI free to try?',
        answer:
          'You can start with Stars on AI SLUTBOT. Pack pricing and generation costs are shown before you confirm each run.',
      },
      {
        question: 'Who can use Undress AI?',
        answer:
          'You must be 18+ (or the age of majority where you live). Only upload content you have the right to use and never upload images of real people without consent.',
      },
    ],
  ),
  page(
    'deepnude-ai',
    'DeepNude AI',
    'DeepNude AI Generator — Uncensored Online',
    'DeepNude AI on AI SLUTBOT: upload a photo and generate realistic uncensored adult AI images and short videos in your browser. No legacy app, transparent Star costs, 18+ only.',
    'Next-gen adult AI generation',
    'DeepNude AI on AI SLUTBOT brings neural image synthesis to your browser. Upload once, generate in seconds, and iterate until the output matches your vision.',
    'DeepNude AI refers to deep-learning models that transform reference photos into new adult visuals. AI SLUTBOT hosts the pipeline online so you do not need local installs or technical setup — just upload, configure, and generate realistic outputs powered by modern AI.',
    [
      'High-detail outputs from current-generation models.',
      'Combine with AI SLUTBOT video tools for animated results.',
      'Clear Star pricing before every generation.',
      'Built for adults who want speed without sacrificing quality.',
    ],
    'Try DeepNude AI online',
    'Upload a photo and generate with AI SLUTBOT — no desktop app required.',
    'DeepNude AI was a pioneering AI nude generator, but AI SLUTBOT surpasses it with modern algorithms and enhanced safety features. We offer high-quality, uncensored nude images, ensuring user privacy and providing a better, more reliable platform for generating explicit content without compromising on quality or ethical considerations.',
    [
      {
        question: 'Is DeepNude AI the same as old DeepNude apps?',
        answer:
          'AI SLUTBOT is a modern web platform with its own models and terms. It is not affiliated with legacy DeepNude software, but offers a similar class of AI photo transformation online.',
      },
      {
        question: 'What file types can I upload?',
        answer: 'Common image formats such as JPG and PNG work best. Use clear, well-lit photos for stronger results.',
      },
      {
        question: 'Can I generate video with DeepNude AI?',
        answer: 'Yes. After your still image, you can continue in the AI SLUTBOT video generator for short motion clips.',
      },
    ],
  ),
  page(
    'nudify-ai',
    'Nudify AI',
    'Nudify AI — Turn Photos into Adult AI Art',
    'Nudify AI with AI SLUTBOT transforms uploads into explicit adult AI art and short clips. Simple upload flow, HD options, private browser generation. Must be 18 or older to use.',
    'From photo to AI art in clicks',
    'Nudify AI on AI SLUTBOT is for users who want quick adult transformations without a steep learning curve. Upload, generate, download — done.',
    'Nudify AI is a colloquial name for AI tools that restyle or reinterpret photos into nude or explicit adult imagery. On AI SLUTBOT, Nudify AI means our uncensored generator stack: upload your reference, tune prompts and quality, and receive a new AI-created visual in seconds.',
    [
      'Browser-based — nothing to install.',
      'Prompt-friendly for creative control.',
      'Optional HD and video upgrades on eligible plans.',
      'Discreet workflow designed for private use.',
    ],
    'Nudify photos with AI',
    'Start on AI SLUTBOT with a single upload. Results in seconds.',
    'Nudify AI provides a simple way to create AI nudes, yet AI SLUTBOT offers a far broader range of features and greater artistic control. Our AI nude generator excels in producing detailed and realistic nude images, allowing for intricate customization to meet specific user preferences and deliver truly personalized adult content.',
    [
      {
        question: 'How realistic is Nudify AI on AI SLUTBOT?',
        answer:
          'Quality depends on your source image, settings, and model. Clear photos and higher-quality tiers generally produce sharper, more coherent results.',
      },
      {
        question: 'Do I need an account?',
        answer: 'You can explore the Platform and purchase Stars with an account. Sign-in keeps your history and balance in sync.',
      },
      {
        question: 'Is my upload stored forever?',
        answer: 'See our Privacy Policy for retention details. We process uploads to provide the service and apply our content policies.',
      },
    ],
  ),
  page(
    'muke-ai',
    'Muke AI',
    'Muke AI — Fast Adult Image & Video Maker',
    'Muke AI on AI SLUTBOT is a streamlined adult generator: upload once, pick settings, download uncensored AI images or 5-second videos. Works on mobile and desktop. Adults only.',
    'Your shortcut to AI adult content',
    'Muke AI on AI SLUTBOT is built for users searching a fast, no-frills AI adult maker. Upload your photo and generate without wrestling with complex tools.',
    'Muke AI on AI SLUTBOT is our streamlined adult AI generation experience: one upload flow, transparent Star costs, and outputs you can download or extend into video. Whether you are experimenting or producing regularly, the platform keeps the steps minimal and the results high quality.',
    [
      'Minimal steps from upload to download.',
      'Works alongside AI SLUTBOT presets and prompts.',
      'Scale up with larger Star packs when you need volume.',
      'Adults-only platform with strict prohibited-content rules.',
    ],
    'Make adult AI content with Muke AI',
    'Upload on AI SLUTBOT and generate in minutes.',
    'Muke AI offers some AI nude creation capabilities, but AI SLUTBOT delivers a more powerful and versatile AI porn generator. Our platform allows for the creation of stunningly realistic nude images with unparalleled quality and extensive options for customization, ensuring users achieve their desired artistic vision effectively.',
    [
      {
        question: 'What makes Muke AI different?',
        answer:
          'Muke AI is a focused landing experience on AI SLUTBOT — same powerful generator, packaged for users who want the fastest path from photo to result.',
      },
      {
        question: 'Can I use Muke AI on mobile?',
        answer: 'Yes. The generator is responsive and works on modern mobile browsers.',
      },
      {
        question: 'Are outputs watermarked?',
        answer: 'Watermark-free exports depend on your plan. Check the pack features shown at checkout.',
      },
    ],
  ),
  page(
    'nude-ai',
    'Nude AI',
    'Nude AI Maker — Realistic Adult Images Online',
    'Nude AI on AI SLUTBOT creates realistic synthetic adult images and videos from your photo. Upload, generate in seconds, extend to motion. Try with Stars. Strictly 18+ entertainment.',
    'Technology that plays for you',
    'You want to edit a photo but lack the time or skills. Nude AI on AI SLUTBOT turns that into a couple of clicks — realistic adult results, quickly, anonymously, and without extra fuss.',
    'Nude AI is an artificial-intelligence tool that transforms your uploaded photo into a new adult visual in moments. Whether you are new to AI or experienced with prompts, the flow is the same: upload, select parameters, generate. Nude AI runs entirely online on AI SLUTBOT — log in from phone or desktop and create immediately.',
    [
      'For fun experiments or serious creative sessions.',
      'Intuitive controls — no Photoshop degree required.',
      'Free-to-try entry via Stars on the Platform.',
      'Extend stills into short AI videos when you want motion.',
    ],
    'Create with Nude AI for free',
    'Upload your photo and let AI SLUTBOT handle the rest. Fast, secure, and anonymous.',
    'Nude AI provides basic nude image generation, but AI SLUTBOT elevates the experience with its advanced AI nude generator tools and superior image quality. We empower users to create high-quality, realistic nude images, offering intricate customization and a seamless user experience that consistently delivers better results and artistic freedom.',
    [
      {
        question: 'What is Nude AI and how does it work?',
        answer:
          'Nude AI uses machine learning to generate new adult imagery from your upload and prompts. AI SLUTBOT hosts the models and returns downloadable results.',
      },
      {
        question: 'Is Nude AI free to use?',
        answer: 'You can start with Stars. Each generation shows its cost before you confirm.',
      },
      {
        question: 'Is Nude AI suitable for beginners?',
        answer: 'Yes. The upload-and-generate workflow is designed to be approachable while still offering advanced options.',
      },
    ],
  ),
  page(
    'ai-clothes-remover',
    'AI Clothes Remover',
    'AI Clothes Remover — Upload & Generate',
    'AI clothes remover on AI SLUTBOT reimagines clothed photos into uncensored adult AI outputs. Upload JPG/PNG, generate in seconds, optional video extension. Consent required. 18+ only.',
    'Remove outfits with AI precision',
    'AI Clothes Remover on AI SLUTBOT reimagines clothed photos into adult AI visuals using neural networks — no manual masking required.',
    'An AI clothes remover interprets clothing regions in a photo and synthesizes a new adult version of the subject. AI SLUTBOT provides this capability through our uncensored generator: upload a clear full-body or portrait image, adjust settings, and receive an AI-generated result. All outputs are synthetic and intended for adult entertainment only.',
    [
      'Handles varied poses and lighting when the source is clear.',
      'Iterate quickly with Star refills.',
      'Combine with video generation for animated outputs.',
      'Strict 18+ and consent policies apply to all uploads.',
    ],
    'Try the AI clothes remover',
    'Upload a photo on AI SLUTBOT and generate in seconds.',
    'While AI Clothes Remover focuses on undressing images, AI SLUTBOT provides a comprehensive AI nude generator for creating entirely new, realistic nude images from scratch. Our platform offers greater creative control, allowing users to generate explicit content with precision and high-quality realism, making it ideal for unique artistic expressions.',
    [
      {
        question: 'Does AI clothes remover work on any photo?',
        answer:
          'Best results come from high-resolution images with visible subjects. Blurry, heavily cropped, or low-light photos may produce weaker outputs.',
      },
      {
        question: 'Can I use photos of anyone?',
        answer:
          'No. You may only upload content you have rights to use. Non-consensual or deceptive use of real people is prohibited and may result in account termination.',
      },
      {
        question: 'How long does generation take?',
        answer: 'Most still images complete in seconds to a minute depending on queue load and quality settings.',
      },
    ],
  ),
  page(
    'deepsukebe-ai',
    'Deepsukebe AI',
    'Deepsukebe AI Alternative — Web Generator',
    'Looking for Deepsukebe AI? AI SLUTBOT offers a modern English-language alternative: uncensored adult photo-to-AI generation, video tools, legal pages, and content reporting. 18+ only.',
    'Modern AI for adult photo edits',
    'Looking for a Deepsukebe-style workflow? AI SLUTBOT delivers similar AI photo transformation with a current web stack and transparent pricing.',
    'Deepsukebe AI searches often refer to Japanese-market AI undress tools. AI SLUTBOT offers a comparable adult photo-to-AI pipeline in English, with Star packs, video extensions, and platform policies built for global users. Upload your image, generate, and download — all in the browser.',
    [
      'No legacy plugins or risky downloads.',
      'English-language support and legal pages.',
      'Video and HD options on eligible tiers.',
      'Content moderation and reporting tools built in.',
    ],
    'Generate with Deepsukebe-style AI',
    'Use AI SLUTBOT instead — safer, faster, and always online.',
    'Deepsukebe AI is known for its explicit content generation, but AI SLUTBOT offers a more sophisticated and user-friendly AI porn generator experience. We prioritize realism, customization, and user privacy, ensuring that every AI nude image created is of the highest quality and aligns perfectly with individual preferences, setting a new standard.',
    [
      {
        question: 'Is AI SLUTBOT affiliated with Deepsukebe?',
        answer: 'No. AI SLUTBOT is an independent platform. This page helps users find our modern alternative.',
      },
      {
        question: 'What languages does AI SLUTBOT support?',
        answer: 'The interface is in English. Prompts can be written in other languages depending on model behavior.',
      },
      {
        question: 'How do I report bad content?',
        answer: 'Use our content removal form or email legal@aislutbot.com for compliance issues.',
      },
    ],
  ),
  page(
    'face-swap-ai',
    'Face Swap AI',
    'Face Swap AI for Adult Images — Consent First',
    'Face Swap AI on AI SLUTBOT guides likeness in adult AI generations when you have rights and consent. No celebrity impersonation or non-consensual deepfakes. Verification may apply. 18+.',
    'Swap faces with neural precision',
    'Face Swap AI on AI SLUTBOT lets eligible users guide likeness in new adult generations — with verification and consent rules enforced.',
    'Face Swap AI uses reference images to influence facial features in a new AI output. On AI SLUTBOT, this class of feature is restricted: you must have rights and consent for any real person depicted. The tool is intended for authorized creators, synthetic characters, or fully AI-generated references — never for impersonation or harassment.',
    [
      'Works with AI SLUTBOT generation presets.',
      'Verification may be required for real likenesses.',
      'Clear prohibited-use rules in our Terms.',
      'Pair with video tools for face-guided motion.',
    ],
    'Try Face Swap AI responsibly',
    'Upload on AI SLUTBOT only with content you are authorized to use.',
    'Face Swap AI primarily focuses on altering faces, whereas AI SLUTBOT is a dedicated AI nude generator, offering comprehensive tools for creating entire nude images. Our platform excels in generating realistic nude content, providing extensive customization and high-quality outputs, far beyond simple face manipulations, for complete artistic control.',
    [
      {
        question: 'Can I face swap any celebrity?',
        answer:
          'No. Impersonating celebrities, public figures, or private individuals without consent is prohibited.',
      },
      {
        question: 'Do I need verification?',
        answer:
          'Real-person likeness use may require identity and consent verification per our Terms and 2257 policy.',
      },
      {
        question: 'Is Face Swap AI available on all plans?',
        answer: 'Feature availability depends on your account, plan, and current Platform settings.',
      },
    ],
  ),
  page(
    'face-swap-video-ai',
    'Face Swap Video AI',
    'Face Swap Video AI — Photo to 5s Clips',
    'Face Swap Video AI animates your upload into short adult AI videos on AI SLUTBOT. Still-to-video workflow, ~5 second clips, Star pricing shown upfront. Authorized use only. 18+.',
    'Faces that move the way you want',
    'Face Swap Video AI combines AI SLUTBOT still generation with our video pipeline so reference likeness can carry into motion — subject to consent rules.',
    'Face Swap Video AI extends face-guided generation from stills into short clips. Upload your source image, generate a base result, then animate it with AI SLUTBOT video tools. All face-related features require lawful, consensual use; non-consensual deepfakes are strictly banned.',
    [
      'Typical clips around 5 seconds; longer on eligible tiers.',
      'Iterate from still to video in one session.',
      'Star costs shown before each video render.',
      'Built for creators who need motion, not just frames.',
    ],
    'Animate with Face Swap Video AI',
    'Start with a photo on AI SLUTBOT and export a short AI video.',
    'While Face Swap Video AI specializes in video manipulation, AI SLUTBOT focuses on still AI nude image generation, delivering superior realism and detail. Our platform is optimized for creating stunningly realistic nude pictures with extensive customization options, making it the premier choice for high-quality static adult content.',
    [
      {
        question: 'How long are Face Swap Video AI clips?',
        answer: 'Duration depends on settings and plan. Many generations target short clips of about 5 seconds.',
      },
      {
        question: 'Can I use Face Swap Video AI on mobile?',
        answer: 'Yes, though video uploads and downloads work best on stable connections.',
      },
      {
        question: 'What if my video looks wrong?',
        answer: 'Try a clearer source photo, adjust prompts, or regenerate. Used Stars are generally non-refundable per our Terms.',
      },
    ],
  ),
  page(
    'face-swap-porn-ai',
    'Face Swap Porn AI',
    'Face Swap Porn AI — Authorized Adults Only',
    'Face Swap Porn AI on AI SLUTBOT for lawful adult creators with consent and rights to reference material. Explicit synthetic output, zero tolerance for minors or non-consensual likeness use.',
    'Adult face swap — consent required',
    'Face Swap Porn AI on AI SLUTBOT is for authorized adult creators only. Generate explicit AI content when you have the rights — never for deception or non-consensual use.',
    'Face Swap Porn AI describes adult-oriented face-guided generation on AI SLUTBOT. The Platform allows explicit synthetic content for adults 18+, but prohibits non-consensual likeness use, minors, and impersonation. Upload only lawful reference material, follow verification when required, and use our generator for entertainment or authorized production work.',
    [
      'Uncensored adult outputs for eligible users.',
      'Zero tolerance for non-consensual deepfakes.',
      'Reporting and removal tools on every page.',
      'Stars for transparent pay-per-generation pricing.',
    ],
    'Generate adult AI content legally',
    'Use Face Swap Porn AI on AI SLUTBOT only with proper consent and authorization.',
    'Face Swap Porn AI focuses on integrating faces into existing pornographic content, but AI SLUTBOT is an original AI porn generator that creates unique nude images from prompts. We offer complete creative freedom and high-quality output, allowing users to craft custom, realistic nude images that are truly original and tailored.',
    [
      {
        question: 'Is Face Swap Porn AI legal?',
        answer:
          'Laws vary by country. You are responsible for compliance. AI SLUTBOT prohibits illegal content regardless of jurisdiction.',
      },
      {
        question: 'Can I swap onto porn I downloaded?',
        answer:
          'Only if you have all necessary rights and consents. Unauthorized use of third-party material is prohibited.',
      },
      {
        question: 'How do I report abuse?',
        answer: 'Use /content-removal or email legal@aislutbot.com for urgent safety or legal reports.',
      },
    ],
  ),
];

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return SEO_LANDING_PAGES.find((p) => p.slug === slug);
}

export function getSeoLandingSlugs(): string[] {
  return SEO_LANDING_PAGES.map((p) => p.slug);
}
