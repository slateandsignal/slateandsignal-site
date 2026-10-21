/* Slate & Signal: production-only, metadata-only measurement. */
(function () {
  'use strict';
  var loc = window.location, params = new URLSearchParams(loc.search);
  var production = loc.protocol === 'https:' && /^(www\.)?slateandsignal\.studio$/.test(loc.hostname);
  var blocked = false;
  try {
    if (params.get('analytics') === 'off') localStorage.setItem('ss-analytics-opt-out', '1');
    if (params.get('analytics') === 'on') localStorage.removeItem('ss-analytics-opt-out');
    blocked = localStorage.getItem('ss-analytics-opt-out') === '1';
  } catch (_) { blocked = params.get('analytics') === 'off'; }
  var privatePage = /^\/(p|r|cc|profiles|my-report|review|friend)(\/|$)/.test(loc.pathname) || params.has('r') || params.has('token') || params.has('t');
  var cohort = 'unclassified';
  try {
    if (['invited', 'test'].indexOf(params.get('audience')) !== -1) sessionStorage.setItem('ss-traffic-cohort', params.get('audience'));
    cohort = sessionStorage.getItem('ss-traffic-cohort') || 'unclassified';
  } catch (_) { cohort = params.get('audience') || 'unclassified'; }
  if (['invited', 'test'].indexOf(cohort) === -1) cohort = 'unclassified';
  if (!production || blocked || privatePage || cohort === 'test') return;
  var allowedQuery = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'audience', 'analytics'];
  // Do not expose unrecognized query strings to a tracker that reads the URL.
  var unknown = false; params.forEach(function (_, key) { if (allowedQuery.indexOf(key) === -1) unknown = true; });
  if (unknown) return;
  var cleanQuery = new URLSearchParams();
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function (key) {
    var value = params.get(key);
    if (value && /^[a-z0-9_-]{1,80}$/i.test(value)) cleanQuery.set(key, value);
  });
  // Metricool reads the real URL. Skip it if a value was not safe for campaign metadata.
  var metricoolSafe = true;
  params.forEach(function (value, key) { if (key.indexOf('utm_') === 0 && !cleanQuery.has(key)) metricoolSafe = false; });
  var referrer = '';
  try { var ref = new URL(document.referrer); referrer = ref.origin + '/'; } catch (_) {}
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-656HKKYWBH', {
    page_location: loc.origin + loc.pathname + (cleanQuery.toString() ? '?' + cleanQuery.toString() : ''),
    page_referrer: referrer,
    traffic_cohort: cohort,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  function script(src, done) {
    var element = document.createElement('script'); element.async = true; element.src = src;
    if (done) element.onload = done;
    document.head.appendChild(element);
  }
  script('https://www.googletagmanager.com/gtag/js?id=G-656HKKYWBH');
  if (params.has('audience') && ['invited','test'].indexOf(params.get('audience')) === -1) metricoolSafe = false;
  if (params.has('analytics') && ['on','off'].indexOf(params.get('analytics')) === -1) metricoolSafe = false;
  if (metricoolSafe && cohort !== 'invited') script('https://tracker.metricool.com/resources/be.js', function () {
    if (window.beTracker) window.beTracker.t({hash:'e1ec5ef17fb5951bb3b77b706c9ad04'});
  });
  var allowedEvents = ['service_click', 'checkout_click', 'quiz_start', 'quiz_result_shown'];
  window.ssTrack = function (name, service) {
    if (allowedEvents.indexOf(name) === -1) return;
    var fields = {traffic_cohort:cohort, transport_type:'beacon'};
    if (['content_style','profile','report'].indexOf(service) !== -1) fields.service = service;
    window.gtag('event', name, fields);
  };
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest && event.target.closest('a[href]'); if (!anchor) return;
    var target; try { target = new URL(anchor.href, loc.href); } catch (_) { return; }
    if (target.hostname === 'buy.stripe.com') {
      var service = /^\/report\//.test(loc.pathname) ? 'report' : /^\/profile\//.test(loc.pathname) ? 'profile' : null;
      if (service) window.ssTrack('checkout_click', service);
    } else if (target.origin === loc.origin) {
      var service = {'/content-style/':'content_style','/profile/':'profile','/report/':'report'}[target.pathname];
      if (service) window.ssTrack('service_click', service);
    }
  }, true);
})();
