/**
 * ====================================================================
 * 📧 FYDELIO — MODULE CAMPAGNES EMAIL (autonome)
 * --------------------------------------------------------------------
 * Ciblage multi-critères (âge, anniversaire, fidélité, abonnement)
 * + éditeur de design avec aperçu live + envoi via Edge Function.
 *
 * À CHARGER APRÈS fiddle-pro.js, dans dashboard-pro.html :
 *     <script src="fiddle-pro.js"></script>
 *     <script src="animations.js"></script>
 *     <script src="email-campagne.js"></script>
 *
 * Dépend de : window.dataClientsGlobal, window.currentRestoConfig,
 *             window._supabaseClient (fournis par fiddle-pro.js).
 *
 * ⚠️ IMPORTANT : retirer de fiddle-pro.js ET du <script> inline du
 *    dashboard l'ancien bloc "EMAIL MODAL" (fermerEmailModal /
 *    envoyerEmail / addEventListener btnOpenEmail) pour éviter les
 *    doublons. Ce fichier les remplace entièrement.
 * ====================================================================
 */
(function () {
    'use strict';

    // État du ciblage
    const ecState = { optin: 'abonnes', anniv: 'off', ageMin: null, ageMax: null, fid: 'off' };

    // ── Ouverture / fermeture de la modale ──
    window.fermerEmailModal = function () {
        document.getElementById('emailModal')?.classList.remove('active');
    };

    // ── Utilitaires ──
    function ecAge(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        if (d.getFullYear() < 1900 || d.getFullYear() > new Date().getFullYear()) return null;
        const now = new Date();
        let age = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
        return age;
    }
    function ecSeuil() {
        const cfg = window.currentRestoConfig;
        if (!cfg) return 10;
        return cfg.id === 'bistrot' ? 5 : 10;
    }
    function ecDernierScan(c) {
        const dates = [c.last_scan_bistrot, c.last_scan_villa, c.last_scan_le_cercle]
            .filter(Boolean).map(d => new Date(d).getTime());
        return dates.length ? Math.max(...dates) : null;
    }

    // ── Filtrage selon ecState ──
    function ecFiltrer() {
        let clients = (window.dataClientsGlobal || []).slice();
        if (ecState.optin === 'abonnes') clients = clients.filter(c => c.optin_email !== false);

        if (ecState.anniv !== 'off') {
            const now = new Date();
            clients = clients.filter(c => {
                if (!c.date_anniversaire) return false;
                const d = new Date(c.date_anniversaire);
                if (isNaN(d.getTime())) return false;
                if (ecState.anniv === 'mois') return d.getMonth() === now.getMonth();
                if (ecState.anniv === 'semaine') {
                    const cetteAnnee = new Date(now.getFullYear(), d.getMonth(), d.getDate());
                    const diff = (cetteAnnee - now) / 86400000;
                    return diff >= -0.5 && diff <= 7;
                }
                return true;
            });
        }

        if (ecState.ageMin !== null || ecState.ageMax !== null) {
            const min = ecState.ageMin ?? 0;
            const max = ecState.ageMax ?? 120;
            clients = clients.filter(c => {
                const a = ecAge(c.date_anniversaire);
                return a !== null && a >= min && a <= max;
            });
        }

        if (ecState.fid !== 'off') {
            const seuil = ecSeuil();
            clients = clients.filter(c => {
                const pts = parseInt(c.points) || 0;
                if (ecState.fid === 'proche')     return pts >= (seuil - 2) && pts < seuil;
                if (ecState.fid === 'recompense') return (c.recompenses_obtenues || 0) > 0;
                if (ecState.fid === 'actifs')     return pts >= 1;
                if (ecState.fid === 'inactifs') {
                    const last = ecDernierScan(c);
                    if (!last) return true;
                    return (Date.now() - last) / 86400000 > 60;
                }
                return true;
            });
        }
        return clients;
    }

    // ── Compteur en direct ──
    function ecMaj() {
        const cibles = ecFiltrer();
        const n = cibles.length;
        const countEl = document.getElementById('ec-count');
        const noteEl  = document.getElementById('ec-count-note');
        const footEl  = document.getElementById('ec-footer-count');
        if (countEl) countEl.textContent = n;
        if (footEl)  footEl.textContent = n + ' client' + (n > 1 ? 's' : '');
        if (noteEl) {
            if (ecState.ageMin !== null || ecState.ageMax !== null) {
                const base = (window.dataClientsGlobal || []);
                const avecDate = base.filter(c => ecAge(c.date_anniversaire) !== null).length;
                noteEl.textContent = `Calcul d'âge possible sur ${avecDate} client${avecDate>1?'s':''} ayant renseigné leur année de naissance.`;
            } else {
                noteEl.textContent = '';
            }
        }
        window._ecCibles = cibles;
    }

    // ── Chips génériques ──
    function ecBindChips(filtre, onPick) {
        document.querySelectorAll(`.ec-chip[data-ecfilter="${filtre}"]`).forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll(`.ec-chip[data-ecfilter="${filtre}"]`).forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                onPick(chip);
                ecMaj();
            });
        });
    }

    // ── Templates ──
    function ecAppliquerTemplate(type) {
        const nom = window.currentRestoConfig?.nom || 'notre restaurant';
        const sets = {
            vierge:  { titre: '', message: 'Bonjour {prenom},\n\n', cta: '', lien: '' },
            promo:   { titre: 'Une offre rien que pour vous 🎉', message: `Bonjour {prenom},\n\nPour vous remercier de votre fidélité chez ${nom}, profitez d'une offre exclusive lors de votre prochaine visite.\n\nÀ très vite !`, cta: 'J\'en profite', lien: '' },
            anniv:   { titre: 'Joyeux anniversaire {prenom} ! 🎂', message: `Toute l'équipe de ${nom} vous souhaite un très joyeux anniversaire !\n\nPassez nous voir ce mois-ci, une petite surprise vous attend.`, cta: 'Réserver ma table', lien: '' },
            relance: { titre: 'Vous nous manquez 👋', message: `Bonjour {prenom},\n\nÇa fait un moment qu'on ne vous a pas vu chez ${nom}. Vos points fidélité vous attendent toujours !\n\nAu plaisir de vous revoir bientôt.`, cta: 'Revenir nous voir', lien: '' },
        };
        const t = sets[type] || sets.vierge;
        document.getElementById('ec-titre').value     = t.titre;
        document.getElementById('ec-message').value   = t.message;
        document.getElementById('ec-cta-texte').value = t.cta;
        document.getElementById('ec-cta-lien').value  = t.lien;
        ecRenderPreview();
    }

    // ── HTML email (aperçu + envoi) ──
    function ecBuildHtml(prenomDemo) {
        const couleur = document.getElementById('ec-couleur-hex').value || '#0F766E';
        const titre   = (document.getElementById('ec-titre').value || '').trim();
        const message = (document.getElementById('ec-message').value || '').trim();
        const ctaTxt  = (document.getElementById('ec-cta-texte').value || '').trim();
        const ctaLien = (document.getElementById('ec-cta-lien').value || '').trim();
        const image   = (document.getElementById('ec-image').value || '').trim();
        const resto   = window.currentRestoConfig?.nom || 'FYDELIO';
        const esc = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const msgPerso = message.replace(/\{prenom\}/g, prenomDemo || '{prenom}');
        const paras = msgPerso.split('\n').map(l =>
            l.trim() ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">${esc(l)}</p>` : ''
        ).join('');
        const titrePerso = esc(titre.replace(/\{prenom\}/g, prenomDemo || '{prenom}'));
        return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  ${image ? `<img src="${esc(image)}" alt="" style="width:100%;display:block;">` : ''}
  <div style="height:5px;background:${esc(couleur)};"></div>
  <div style="padding:32px 28px;">
    ${titre ? `<h1 style="margin:0 0 18px;font-size:23px;font-weight:800;color:${esc(couleur)};line-height:1.25;">${titrePerso}</h1>` : ''}
    ${paras}
    ${ctaTxt ? `<div style="text-align:center;margin:28px 0 8px;">
      <a href="${esc(ctaLien) || '#'}" style="display:inline-block;background:${esc(couleur)};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">${esc(ctaTxt)}</a>
    </div>` : ''}
  </div>
  <div style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11.5px;color:#94a3b8;line-height:1.6;">
      Vous recevez cet email car vous êtes membre du programme de fidélité de ${esc(resto)}.<br>
      Pour vous désabonner, <a href="{unsubscribe}" style="color:#94a3b8;">cliquez ici</a>.
    </p>
  </div>
</div>`;
    }

    function ecRenderPreview() {
        const frame = document.getElementById('ec-preview');
        if (!frame) return;
        frame.srcdoc = `<body style="margin:0;background:#f1f5f9;padding:8px;">${ecBuildHtml('Marie')}</body>`;
    }

    // ── Envoi via l'Edge Function ──
    window.ecEnvoyer = async function () {
        const cibles  = window._ecCibles || ecFiltrer();
        const objet   = (document.getElementById('ec-objet').value || '').trim();
        const message = (document.getElementById('ec-message').value || '').trim();
        const btn     = document.getElementById('ec-btn-send');

        if (!objet)   { alert('Ajoutez un objet à votre email (onglet « Le message »).'); return; }
        if (!message) { alert('Votre message est vide (onglet « Le message »).'); return; }
        if (cibles.length === 0) { alert('Aucun client ne correspond à ce ciblage. Élargissez vos critères.'); return; }
        if (!confirm(`Envoyer cette campagne à ${cibles.length} client${cibles.length>1?'s':''} ?`)) return;

        btn.disabled = true;
        btn.innerHTML = '<div class="dash-spinner" style="width:16px;height:16px;border-width:2px;border-top-color:white;"></div> Envoi…';
        try {
            const { data: { session } } = await window._supabaseClient.auth.getSession();
            const contenuHtml = ecBuildHtml(null);
            const res = await fetch('https://qawfwbppnbnskxlkwstu.supabase.co/functions/v1/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
                body: JSON.stringify({
                    destinataires: cibles.map(c => ({ email: c.email, prenom: c.prenom || '' })),
                    objet, contenuHtml, contenu: message,
                    restaurant: window.currentRestoConfig?.nom || 'FYDELIO'
                })
            });
            const result = await res.json();
            if (result.ok) {
                alert(`✅ Campagne envoyée à ${result.envoyes} client${result.envoyes>1?'s':''} !`);
                window.fermerEmailModal();
            } else {
                throw new Error(result.error || 'Erreur inconnue');
            }
        } catch (err) {
            alert('Erreur : ' + err.message + '\n\nVérifiez que l\'Edge Function "send-email" est déployée et que BREVO_API_KEY est configuré.');
        }
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" style="width:14px;height:14px;"></i> Envoyer la campagne';
        if (window.lucide) lucide.createIcons();
    };

    // ── Branchement de tous les contrôles ──
    function ecInit() {
        // Ouverture de la modale
        document.getElementById('btnOpenEmail')?.addEventListener('click', () => {
            document.getElementById('emailModal')?.classList.add('active');
            setTimeout(() => {
                const restoEl = document.getElementById('ec-footer-resto');
                if (restoEl) restoEl.textContent = window.currentRestoConfig?.nom || '';
                ecMaj();
                ecRenderPreview();
                if (window.lucide) lucide.createIcons();
            }, 60);
        });
        // Fermeture en cliquant sur le fond
        document.getElementById('emailModal')?.addEventListener('click', e => {
            if (e.target === document.getElementById('emailModal')) window.fermerEmailModal();
        });

        // Onglets
        document.querySelectorAll('.ec-step-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.ec-step-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.ec-panel').forEach(p => p.classList.remove('active'));
                const cible = tab.dataset.ecstep === 'cible' ? 'ec-panel-cible' : 'ec-panel-design';
                document.getElementById(cible).classList.add('active');
                if (cible === 'ec-panel-design') ecRenderPreview();
            });
        });

        // Radios opt-in
        document.querySelectorAll('input[name="ec-optin"]').forEach(r => {
            r.addEventListener('change', () => { ecState.optin = r.value; ecMaj(); });
        });

        // Chips anniversaire & fidélité
        ecBindChips('anniv', (chip) => { ecState.anniv = chip.dataset.ecval; });
        ecBindChips('fid',   (chip) => { ecState.fid   = chip.dataset.ecval; });

        // Chips âge (préréglages)
        document.querySelectorAll('.ec-chip[data-ecfilter="age"]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.ec-chip[data-ecfilter="age"]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                ecState.ageMin = chip.dataset.ecmin === '' ? null : parseInt(chip.dataset.ecmin);
                ecState.ageMax = chip.dataset.ecmax === '' ? null : parseInt(chip.dataset.ecmax);
                document.getElementById('ec-age-min').value = ecState.ageMin ?? '';
                document.getElementById('ec-age-max').value = ecState.ageMax ?? '';
                ecMaj();
            });
        });

        // Champs âge fins
        ['ec-age-min', 'ec-age-max'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                const min = document.getElementById('ec-age-min').value;
                const max = document.getElementById('ec-age-max').value;
                ecState.ageMin = min === '' ? null : parseInt(min);
                ecState.ageMax = max === '' ? null : parseInt(max);
                document.querySelectorAll('.ec-chip[data-ecfilter="age"]').forEach(c => c.classList.remove('active'));
                ecMaj();
            });
        });

        // Couleur
        const col = document.getElementById('ec-couleur');
        const hex = document.getElementById('ec-couleur-hex');
        col?.addEventListener('input', () => { hex.value = col.value; ecRenderPreview(); });
        hex?.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) col.value = hex.value; ecRenderPreview(); });

        // Champs design → aperçu live
        ['ec-titre', 'ec-message', 'ec-cta-texte', 'ec-cta-lien', 'ec-image', 'ec-objet'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', ecRenderPreview);
        });

        // Templates
        document.querySelectorAll('.ec-tpl').forEach(tpl => {
            tpl.addEventListener('click', () => {
                document.querySelectorAll('.ec-tpl').forEach(t => t.classList.remove('active'));
                tpl.classList.add('active');
                ecAppliquerTemplate(tpl.dataset.ectpl);
            });
        });
    }

    // Le DOM est-il prêt ? (ce script est en fin de body, donc oui en général)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ecInit);
    } else {
        ecInit();
    }
})();
