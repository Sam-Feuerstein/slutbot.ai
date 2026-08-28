export const AGE_CONSENT_STORAGE_KEY = 'slutbot-age-consent-v1';
export const AGE_CONSENT_EVENT = 'slutbot-age-consent';
export const AGE_GATE_ATTR = 'data-age-gate';

/** Keep in sync with public/scripts/age-gate-boot.js */
export const AGE_GATE_BOOT_SCRIPT = `(function(){try{var p=location.pathname||'';if(p.indexOf('/admin')===0||p.indexOf('/checkout')===0)return;if(localStorage.getItem('${AGE_CONSENT_STORAGE_KEY}')==='1')return;document.documentElement.setAttribute('${AGE_GATE_ATTR}','1');}catch(e){document.documentElement.setAttribute('${AGE_GATE_ATTR}','1');}})();`;

export function clearAgeGateAttr() {
  if (typeof document === 'undefined') return;
  document.documentElement.removeAttribute(AGE_GATE_ATTR);
}

export function hasAgeConsent(): boolean {
  try {
    return localStorage.getItem(AGE_CONSENT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function shouldShowAgeGate(pathname: string): boolean {
  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout')) return false;
  return !hasAgeConsent();
}
