/**
 * FYDELIO Cookie Banner & Consent Manager
 * Simple, vanilla JavaScript, RGPD-compliant
 * 
 * Usage: Ajoute ceci dans le <head> ou </body> de tes pages HTML
 * <script src="cookie-banner.js"></script>
 */

(function() {
  'use strict';

  // Configuration
  const STORAGE_KEY = 'fydelio_cookie_consent';
  const COOKIE_EXPIRY_DAYS = 365;

  // États de consentement
  const CONSENT_STATES = {
    NECESSARY: true,      // Toujours activé
    ANALYTICS: false,     // Optionnel (Google Analytics)
    MARKETING: false      // Optionnel (future use)
  };

  // Fonction pour créer/mettre à jour le cookie de consentement
  function setConsentCookie(consentObj) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);
    document.cookie = `${STORAGE_KEY}=${JSON.stringify(consentObj)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  }

  // Fonction pour récupérer le cookie de consentement
  function getConsentCookie() {
    const name = STORAGE_KEY + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (let cookie of cookieArray) {
      cookie = cookie.trim();
      if (cookie.indexOf(name) === 0) {
        try {
          return JSON.parse(cookie.substring(name.length));
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  // Fonction pour désactiver/activer Google Analytics selon le consentement
  function manageAnalytics(consent) {
    if (consent.analytics) {
      // Google Analytics déjà chargé? Rien à faire
      // Si pas déjà chargé, il sera chargé ci-dessous
    } else {
      // Désactiver Google Analytics si non consenti
      if (window.ga) {
        window['ga-disable-G-F359553M99'] = true;
      }
    }
  }

  // Créer et afficher le banneau de consentement
  function showConsentBanner() {
    const banner = document.createElement('div');
    banner.id = 'fydelio-cookie-banner';
    banner.className = 'fydelio-cookie-banner';
    banner.innerHTML = `
      <style>
        .fydelio-cookie-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #1f2937;
          color: #f3f4f6;
          padding: 20px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
        }

        .fydelio-cookie-banner.hidden {
          display: none;
        }

        .cookie-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          gap: 20px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .cookie-message {
          flex: 1;
          min-width: 250px;
        }

        .cookie-message h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .cookie-message p {
          margin: 0 0 12px 0;
          color: #d1d5db;
          font-size: 13px;
        }

        .cookie-message a {
          color: #2DD4BF;
          text-decoration: none;
          border-bottom: 1px solid #2DD4BF;
        }

        .cookie-message a:hover {
          color: #a7f3d0;
          border-color: #a7f3d0;
        }

        .cookie-controls {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          min-width: 200px;
        }

        .cookie-btn {
          padding: 10px 18px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .cookie-btn-accept {
          background: #0F766E;
          color: white;
        }

        .cookie-btn-accept:hover {
          background: #0a5d56;
        }

        .cookie-btn-reject {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .cookie-btn-reject:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .cookie-btn-manage {
          background: transparent;
          color: #2DD4BF;
          border: 1px solid #2DD4BF;
        }

        .cookie-btn-manage:hover {
          background: rgba(45, 212, 191, 0.1);
        }

        .cookie-preferences {
          display: none;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cookie-preferences.show {
          display: block;
        }

        .cookie-preference-item {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }

        .cookie-preference-item:last-child {
          margin-bottom: 0;
        }

        .cookie-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #0F766E;
        }

        .cookie-checkbox:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cookie-preference-label {
          flex: 1;
        }

        .cookie-preference-label strong {
          display: block;
          color: white;
          margin-bottom: 4px;
        }

        .cookie-preference-label small {
          color: #9ca3af;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .cookie-container {
            flex-direction: column;
            gap: 16px;
          }

          .cookie-controls {
            width: 100%;
            justify-content: stretch;
          }

          .cookie-btn {
            flex: 1;
            text-align: center;
          }
        }
      </style>

      <div class="cookie-container">
        <div class="cookie-message">
          <h3>🍪 Gestion des Cookies</h3>
          <p>
            FYDELIO utilise des cookies pour améliorer votre expérience et analyser le trafic du site (Google Analytics).
            Les cookies <strong>nécessaires</strong> au fonctionnement du site sont toujours activés.
            Vous pouvez <a href="/politique-cookies.html" target="_blank">en savoir plus sur nos cookies</a>.
          </p>

          <div class="cookie-preferences" id="cookiePreferences">
            <div class="cookie-preference-item">
              <input type="checkbox" id="cookieNecessary" class="cookie-checkbox" checked disabled>
              <div class="cookie-preference-label">
                <strong>Cookies Nécessaires</strong>
                <small>Obligatoires pour le fonctionnement du site (authentification, sécurité)</small>
              </div>
            </div>

            <div class="cookie-preference-item">
              <input type="checkbox" id="cookieAnalytics" class="cookie-checkbox">
              <div class="cookie-preference-label">
                <strong>Cookies Analytiques (Google Analytics)</strong>
                <small>Nous aident à comprendre comment vous utilisez le site pour l'améliorer</small>
              </div>
            </div>

            <div class="cookie-preference-item">
              <input type="checkbox" id="cookieMarketing" class="cookie-checkbox">
              <div class="cookie-preference-label">
                <strong>Cookies Marketing</strong>
                <small>Utilisés pour vous proposer du contenu et des offres pertinentes (futur)</small>
              </div>
            </div>

            <div style="margin-top: 12px; display: flex; gap: 8px;">
              <button class="cookie-btn cookie-btn-reject" id="btnSavePreferences">Enregistrer mes préférences</button>
            </div>
          </div>
        </div>

        <div class="cookie-controls">
          <button class="cookie-btn cookie-btn-reject" id="btnRejectAll">Tout refuser</button>
          <button class="cookie-btn cookie-btn-manage" id="btnManagePreferences">Personnaliser</button>
          <button class="cookie-btn cookie-btn-accept" id="btnAcceptAll">Tout accepter</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('btnAcceptAll').addEventListener('click', () => {
      const consent = { ...CONSENT_STATES, analytics: true, marketing: true };
      setConsentCookie(consent);
      manageAnalytics(consent);
      banner.classList.add('hidden');
      // Reload pour charger Google Analytics si pas déjà chargé
      // window.location.reload();
    });

    document.getElementById('btnRejectAll').addEventListener('click', () => {
      const consent = { ...CONSENT_STATES, analytics: false, marketing: false };
      setConsentCookie(consent);
      manageAnalytics(consent);
      banner.classList.add('hidden');
    });

    document.getElementById('btnManagePreferences').addEventListener('click', () => {
      const prefs = document.getElementById('cookiePreferences');
      prefs.classList.toggle('show');
    });

    document.getElementById('btnSavePreferences').addEventListener('click', () => {
      const consent = {
        necessary: true,
        analytics: document.getElementById('cookieAnalytics').checked,
        marketing: document.getElementById('cookieMarketing').checked
      };
      setConsentCookie(consent);
      manageAnalytics(consent);
      banner.classList.add('hidden');
    });
  }

  // Initialisation au chargement du DOM
  function init() {
    // Vérifier s'il y a déjà un consentement enregistré
    const existingConsent = getConsentCookie();

    if (!existingConsent) {
      // Pas de consentement encore, afficher le banneau
      showConsentBanner();
    } else {
      // Consentement trouvé, appliquer les préférences
      manageAnalytics(existingConsent);
    }
  }

  // Attendre que le DOM soit prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposer quelques fonctions globales (optionnel, pour debug)
  window.FYDELIOCookies = {
    getConsent: getConsentCookie,
    setConsent: setConsentCookie,
    showBanner: showConsentBanner
  };
})();
