/**
 * ====================================================================
 * 🤖 FYDELIO — MODULE FYDEL'INTELLIGENCE (autonome)
 * --------------------------------------------------------------------
 * Analyse IA enrichie : envoie à l'Edge Function un maximum de signaux
 * exploitables (récompenses, inactifs, proches du cadeau, anniversaires,
 * tranches d'âge, taux d'engagement, panier de points…) et affiche un
 * résultat structuré.
 *
 * À CHARGER APRÈS fiddle-pro.js, dans dashboard-pro.html :
 *     <script src="fiddle-pro.js"></script>
 *     <script src="animations.js"></script>
 *     <script src="email-campagne.js"></script>
 *     <script src="fydel-intelligence.js"></script>
 *
 * Dépend de : window.dataClientsGlobal, window.currentRestoConfig,
 *             window._supabaseClient (fournis par fiddle-pro.js).
 *
 * ⚠️ IMPORTANT : retirer de fiddle-pro.js ET du <script> inline du
 *    dashboard l'ancien bloc IA (lancerAnalyseIA, attendreFiddle,
 *    afficherResultatIA, afficherErreurIA, resetBtnIA) pour éviter les
 *    doublons. Ce fichier les remplace entièrement.
 *
 * Le bouton appelle toujours onclick="lancerAnalyseIA()" → fonction
 * exposée sur window ci-dessous, donc aucun changement HTML requis.
 * ====================================================================
 */
(function () {
    'use strict';

    const IA_ENDPOINT = 'https://qawfwbppnbnskxlkwstu.supabase.co/functions/v1/IA';

    // ── Attendre que fiddle-pro ait initialisé Supabase + la config ──
    async function attendreFiddle() {
        let n = 0;
        while ((!window._supabaseClient || !window.currentRestoConfig) && n < 30) {
            await new Promise(r => setTimeout(r, 200)); n++;
        }
        return !!(window._supabaseClient && window.currentRestoConfig);
    }

    // ── Utilitaires ──
    function seuilDe(config) {
        return config.id === 'bistrot' ? 5 : 10;
    }
    function ageDepuis(dateStr) {
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
    function dernierScan(c) {
        const dates = [c.last_scan_bistrot, c.last_scan_villa, c.last_scan_le_cercle]
            .filter(Boolean).map(d => new Date(d).getTime());
        return dates.length ? Math.max(...dates) : null;
    }

    // ── Construction du jeu de données enrichi ──
    function construireStats(clients, config) {
        const colPoints = config.colPoints || 'points';
        const seuil = seuilDe(config);
        const now = new Date();

        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
        const debutMoisPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const finMoisPrec = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const totalClients     = clients.length;
        const totalPoints      = clients.reduce((a, c) => a + (parseInt(c[colPoints]) || 0), 0);
        const totalRecompenses = clients.reduce((a, c) => a + (parseInt(c.recompenses_obtenues) || 0), 0);

        const abonnes    = clients.filter(c => c.optin_email !== false).length;
        const desabonnes = totalClients - abonnes;

        const nouveauxCeMois     = clients.filter(c => new Date(c.created_at) >= debutMois).length;
        const nouveauxMoisPrec   = clients.filter(c => {
            const d = new Date(c.created_at);
            return d >= debutMoisPrec && d <= finMoisPrec;
        }).length;

        // Fidélité
        const clientsAvecRecompense = clients.filter(c => (c.recompenses_obtenues || 0) > 0).length;
        const prochesDuCadeau = clients.filter(c => {
            const p = parseInt(c[colPoints]) || 0;
            return p >= (seuil - 2) && p < seuil;
        }).length;
        const actifs = clients.filter(c => (parseInt(c[colPoints]) || 0) >= 1).length;
        const sansAucunPoint = totalClients - actifs;

        // Inactifs (dernier scan > 60 jours, ou jamais scanné)
        const inactifs = clients.filter(c => {
            const last = dernierScan(c);
            if (!last) return true;
            return (Date.now() - last) / 86400000 > 60;
        }).length;

        // Anniversaires ce mois-ci
        const anniversairesCeMois = clients.filter(c => {
            if (!c.date_anniversaire) return false;
            const d = new Date(c.date_anniversaire);
            return !isNaN(d.getTime()) && d.getMonth() === now.getMonth();
        }).length;

        // Tranches d'âge (sur ceux qui ont une année exploitable)
        const ages = clients.map(c => ageDepuis(c.date_anniversaire)).filter(a => a !== null);
        const tranchesAge = {
            moins_25: ages.filter(a => a < 25).length,
            de_25_40: ages.filter(a => a >= 25 && a < 40).length,
            de_40_60: ages.filter(a => a >= 40 && a < 60).length,
            plus_60:  ages.filter(a => a >= 60).length,
        };
        const ageMoyen = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;

        // Indicateurs dérivés
        const moyennePoints   = totalClients ? +(totalPoints / totalClients).toFixed(1) : 0;
        const tauxAbonnement  = totalClients ? Math.round((abonnes / totalClients) * 100) : 0;
        const tauxRecompense  = totalClients ? Math.round((clientsAvecRecompense / totalClients) * 100) : 0;
        const tauxInactifs    = totalClients ? Math.round((inactifs / totalClients) * 100) : 0;
        const croissanceMois  = nouveauxMoisPrec > 0
            ? Math.round(((nouveauxCeMois - nouveauxMoisPrec) / nouveauxMoisPrec) * 100)
            : null;

        return {
            restaurant: config.nom,
            seuilPoints: seuil,
            // volumes
            totalClients, totalPoints, totalRecompenses,
            abonnes, desabonnes,
            nouveauxCeMois, nouveauxMoisPrec, croissanceMois,
            // fidélité
            clientsAvecRecompense, prochesDuCadeau, actifs, sansAucunPoint, inactifs,
            anniversairesCeMois,
            // démographie
            tranchesAge, ageMoyen, clientsAvecAgeConnu: ages.length,
            // taux
            moyennePoints, tauxAbonnement, tauxRecompense, tauxInactifs,
        };
    }

    // ── Lancement de l'analyse (exposé sur window pour le onclick) ──
    window.lancerAnalyseIA = async function () {
        const btn = document.getElementById('btnLancerIA');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="dash-spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#0F766E;"></div> Analyse…';
        }

        document.getElementById('ia-placeholder').style.display = 'none';
        document.getElementById('ia-result').style.display      = 'none';
        document.getElementById('ia-error').style.display       = 'none';
        document.getElementById('ia-loading').style.display     = 'block';

        const ok = await attendreFiddle();
        if (!ok) { afficherErreurIA('Dashboard non initialisé. Réessayez dans quelques secondes.'); resetBtnIA(); return; }

        const clients = window.dataClientsGlobal || [];
        const config  = window.currentRestoConfig;
        const stats   = construireStats(clients, config);

        try {
            const { data: { session } } = await window._supabaseClient.auth.getSession();
            const res = await fetch(IA_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
                body: JSON.stringify(stats)
            });
            const result = await res.json();
            if (!result.ok) throw new Error(result.error || 'Erreur inconnue');
            afficherResultatIA(result.analyse, stats);
        } catch (err) {
            afficherErreurIA(err.message);
        }
        resetBtnIA();
    };

    // ── Affichage du résultat enrichi ──
    function afficherResultatIA(a, stats) {
        document.getElementById('ia-loading').style.display = 'none';
        const noteClass = a.note_globale?.startsWith('A') ? 'fydel-note--a'
                        : a.note_globale?.startsWith('B') ? 'fydel-note--b' : 'fydel-note--c';

        // Petite barre de métriques clés (calculées en local, pas besoin de l'IA)
        const metric = (label, valeur) => `
            <div style="flex:1;min-width:120px;background:#F8FAFC;border:1px solid #EEF2F6;border-radius:14px;padding:14px 16px;">
                <div style="font-size:22px;font-weight:800;color:#0F172A;line-height:1;">${valeur}</div>
                <div style="font-size:11.5px;color:#64748B;font-weight:600;margin-top:6px;">${label}</div>
            </div>`;

        const croissanceTxt = stats.croissanceMois === null
            ? '—'
            : (stats.croissanceMois >= 0 ? '+' : '') + stats.croissanceMois + '%';

        const barreMetriques = `
            <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
                ${metric('Abonnés', stats.tauxAbonnement + '%')}
                ${metric('Proches du cadeau', stats.prochesDuCadeau)}
                ${metric('Ont eu une récompense', stats.tauxRecompense + '%')}
                ${metric('Inactifs (+60j)', stats.tauxInactifs + '%')}
                ${metric('Croissance vs mois préc.', croissanceTxt)}
            </div>`;

        const result = document.getElementById('ia-result');
        result.style.display = 'block';
        result.innerHTML = `
            <div class="fydel-result">
                <span class="fydel-note ${noteClass}">
                    <i data-lucide="award" style="width:15px;height:15px;"></i>
                    Note globale : ${a.note_globale || '—'}
                </span>
                <p class="fydel-resume">${a.resume || ''}</p>

                ${barreMetriques}

                <div class="fydel-cols">
                    <div class="fydel-block">
                        <div class="fydel-block-title forts"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Points forts</div>
                        ${(a.points_forts || []).map(p => `<div class="fydel-li"><div class="pt pt--green"></div>${p}</div>`).join('') || '<div class="fydel-li" style="color:#94A3B8;">—</div>'}
                    </div>
                    <div class="fydel-block">
                        <div class="fydel-block-title faibles"><i data-lucide="wrench" style="width:14px;height:14px;"></i> À améliorer</div>
                        ${(a.points_ameliorer || []).map(p => `<div class="fydel-li"><div class="pt pt--orange"></div>${p}</div>`).join('') || '<div class="fydel-li" style="color:#94A3B8;">—</div>'}
                    </div>
                </div>

                <div class="fydel-conseil">
                    <div class="fydel-conseil-label"><i data-lucide="lightbulb" style="width:14px;height:14px;"></i> Conseil prioritaire cette semaine</div>
                    <div class="fydel-conseil-txt">${a.conseil_prioritaire || ''}</div>
                </div>

                ${Array.isArray(a.actions) && a.actions.length ? `
                <div class="fydel-block" style="margin-bottom:18px;">
                    <div class="fydel-block-title" style="color:#0F766E;"><i data-lucide="list-checks" style="width:14px;height:14px;"></i> Plan d'action</div>
                    ${a.actions.map(act => `<div class="fydel-li"><div class="pt" style="background:#0F766E;"></div>${act}</div>`).join('')}
                </div>` : ''}

                <div class="fydel-prediction">
                    <i data-lucide="rocket" class="pred-ico" style="width:18px;height:18px;"></i>
                    <span>${a.prediction || ''}</span>
                </div>

                <div class="fydel-cta-relance">
                    <div class="fydel-cta-relance-txt">
                        Prêt à agir ? <strong>Relancez vos clients</strong> directement depuis le dashboard.
                    </div>
                    <button class="btn-relance" onclick="document.getElementById('btnOpenEmail').click()">
                        <i data-lucide="send" style="width:15px;height:15px;"></i>
                        Relancer mes abonnés
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    function afficherErreurIA(msg) {
        document.getElementById('ia-loading').style.display = 'none';
        document.getElementById('ia-error').style.display   = 'block';
        document.getElementById('ia-error-msg').innerHTML   = `<strong>Erreur :</strong> ${msg}<br><small>Vérifiez que l'Edge Function "IA" est déployée et que ANTHROPIC_API_KEY est configuré dans Supabase → Secrets.</small>`;
    }

    function resetBtnIA() {
        const btn = document.getElementById('btnLancerIA');
        if (!btn) return;
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles" style="width:17px;height:17px;"></i> Analyser mes performances';
        if (window.lucide) lucide.createIcons();
    }

    // Exposer attendreFiddle si d'autres modules en ont besoin (réutilisation)
    if (!window.attendreFiddle) window.attendreFiddle = attendreFiddle;
})();
