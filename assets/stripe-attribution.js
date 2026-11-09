/* Slate & Signal: adds the post's tracking tag to Stripe checkout links so each sale can be traced to the post that sent the visitor. No personal data is stored. */
(function () {
  'use strict';
  var KEY = 'ss-stripe-ref';
  function clean(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  var ref = '';
  try {
    var p = new URLSearchParams(window.location.search);
    var src = clean(p.get('utm_source')), content = clean(p.get('utm_content'));
    if (src) {
      ref = src + (content ? '_' + content : '');
      sessionStorage.setItem(KEY, ref);
    } else {
      ref = sessionStorage.getItem(KEY) || '';
    }
  } catch (_) { return; }
  if (!ref) return;
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
