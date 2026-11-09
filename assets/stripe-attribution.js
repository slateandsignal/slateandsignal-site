/* Slate & Signal: carry a campaign/post label into Stripe Checkout. No payment or personal details are read. */
(function () {
  'use strict';
  var KEY = 'ss-stripe-ref';
  function clean(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  var p = new URLSearchParams(window.location.search);
  var src = clean(p.get('utm_source')), content = clean(p.get('utm_content'));
  var ref = src ? src + (content ? '_' + content : '') : '';
  if (ref) {
    try { sessionStorage.setItem(KEY, ref); } catch (_) { /* Current-page tracking still works when storage is unavailable. */ }
  } else {
    try { ref = sessionStorage.getItem(KEY) || ''; } catch (_) {}
  }
  if (!/^[a-z0-9_-]{1,200}$/.test(ref)) return;
  var links = document.querySelectorAll('a[href^="https://buy.stripe.com/"]');
  for (var i = 0; i < links.length; i++) {
    try {
      var u = new URL(links[i].href);
      if (!u.searchParams.has('client_reference_id')) {
        u.searchParams.set('client_reference_id', ref);
        links[i].href = u.toString();
      }
    } catch (_) {}
  }
})();
