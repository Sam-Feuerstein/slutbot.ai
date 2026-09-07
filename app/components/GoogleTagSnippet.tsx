import Script from 'next/script';

const GA_MEASUREMENT_ID = 'G-0Z284Q2D5T';

const GTAG_BOOT_SCRIPT = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`;

export default function GoogleTagSnippet() {
  return (
    <>
      <Script
        id="google-gtag-js"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-gtag"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: GTAG_BOOT_SCRIPT }}
      />
    </>
  );
}
