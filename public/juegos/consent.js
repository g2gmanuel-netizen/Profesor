/* Sportmanía · consentimiento de cookies (Consent Mode v2) y medición.
   1) Rellena GA_ID con tu ID de Google Analytics 4 (G-XXXXXXXXXX).
   2) Rellena ADSENSE_CLIENT con tu ID de AdSense (ca-pub-XXXXXXXXXXXXXXXX).
   Mientras estén vacíos no se carga ningún script de Google. */
(function () {
  'use strict';
  var GA_ID = '';            // ej.: 'G-ABCDE12345'
  var ADSENSE_CLIENT = '';   // ej.: 'ca-pub-1234567890123456'
  var USE_GOOGLE_CMP = false; // pon true si usas el mensaje de consentimiento de Google (AdSense > Privacidad y mensajes)
  var KEY = 'sm-consent-v1';
  var base = (function () { try { return new URL('.', document.currentScript.src).href; } catch (e) { return '/'; } })();

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });

  var loadedGA = false, loadedAds = false, queue = [];
  function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

  function loadGA() {
    if (loadedGA || !GA_ID) return;
    loadedGA = true;
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag('js', new Date()); gtag('config', GA_ID, { anonymize_ip: true });
    queue.splice(0).forEach(function (q) { gtag('event', q[0], q[1]); });
  }
  function loadAds() {
    if (loadedAds || !ADSENSE_CLIENT) return;
    loadedAds = true;
    var s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADSENSE_CLIENT);
    document.head.appendChild(s);
  }
  function apply(c) {
    gtag('consent', 'update', {
      analytics_storage: c.analytics ? 'granted' : 'denied',
      ad_storage: c.ads ? 'granted' : 'denied',
      ad_user_data: c.ads ? 'granted' : 'denied',
      ad_personalization: c.ads ? 'granted' : 'denied',
    });
    if (c.analytics) loadGA();
    if (c.ads) loadAds();
  }

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }
  function closeBanner() { var b = document.getElementById('sm-cookies'); if (b) b.remove(); }
  function openBanner(settings) {
    closeBanner();
    var cur = read() || { analytics: false, ads: false };
    var b = el('<div id="sm-cookies" role="dialog" aria-live="polite" aria-label="Aviso de cookies" style="position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#0a0a0b;border-top:1px solid #2a2a2e;color:#ececec;font:14px/1.45 Barlow,system-ui,sans-serif;padding:14px max(16px,env(safe-area-inset-left,0px)) calc(14px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-right,0px))">' +
      '<div style="max-width:1000px;margin:0 auto;display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between">' +
      '<div style="flex:1 1 380px;min-width:0"><b>Usamos cookies.</b> Las técnicas son necesarias para guardar tu partida. Con tu permiso usamos también cookies de analítica (para mejorar el juego) y de publicidad (para financiarlo). Puedes cambiar de opinión cuando quieras. <a href="' + base + 'legal/cookies.html" style="color:#c8d82e">Más información</a>.' +
      (settings ? '<div style="margin-top:10px;display:grid;gap:6px"><label><input type="checkbox" checked disabled> Técnicas (siempre activas)</label><label><input id="sm-an" type="checkbox"' + (cur.analytics ? ' checked' : '') + '> Analítica (Google Analytics)</label><label><input id="sm-ad" type="checkbox"' + (cur.ads ? ' checked' : '') + '> Publicidad (Google AdSense)</label></div>' : '') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      (settings ? '<button id="sm-save" style="' + btn(true) + '">Guardar elección</button>' : '<button id="sm-cfg" style="' + btn(false) + '">Configurar</button><button id="sm-no" style="' + btn(false) + '">Rechazar</button><button id="sm-yes" style="' + btn(true) + '">Aceptar todo</button>') +
      '</div></div></div>');
    document.body.appendChild(b);
    function choose(c) { c.t = Date.now(); write(c); apply(c); closeBanner(); }
    var q = function (id) { return document.getElementById(id); };
    if (q('sm-yes')) q('sm-yes').onclick = function () { choose({ analytics: true, ads: true }); };
    if (q('sm-no')) q('sm-no').onclick = function () { choose({ analytics: false, ads: false }); };
    if (q('sm-cfg')) q('sm-cfg').onclick = function () { openBanner(true); };
    if (q('sm-save')) q('sm-save').onclick = function () { choose({ analytics: q('sm-an').checked, ads: q('sm-ad').checked }); };
  }
  function btn(primary) {
    return 'cursor:pointer;border-radius:3px;padding:9px 16px;font:700 14px Barlow Condensed,Arial Narrow,sans-serif;text-transform:uppercase;letter-spacing:.06em;' +
      (primary ? 'background:#c8d82e;color:#0a0a0b;border:1px solid #c8d82e' : 'background:transparent;color:#ececec;border:1px solid #3a3a40');
  }

  window.sm = {
    track: function (name, params) {
      if (loadedGA) gtag('event', name, params || {}); else if (GA_ID) queue.push([name, params || {}]);
    },
    openConsent: function () { openBanner(true); },
  };

  function init() {
    if (USE_GOOGLE_CMP) { loadGA(); loadAds(); }
    else { var c = read(); if (c) apply(c); else openBanner(false); }
    var links = document.querySelectorAll('[data-sm-cookies]');
    for (var i = 0; i < links.length; i++) links[i].addEventListener('click', function (e) { e.preventDefault(); openBanner(true); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
