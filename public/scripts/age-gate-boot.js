(function () {
  try {
    var p = location.pathname || '';
    if (p.indexOf('/admin') === 0 || p.indexOf('/checkout') === 0) return;
    if (localStorage.getItem('slutbot-age-consent-v1') === '1') return;
    document.documentElement.setAttribute('data-age-gate', '1');
  } catch (e) {
    document.documentElement.setAttribute('data-age-gate', '1');
  }
})();
