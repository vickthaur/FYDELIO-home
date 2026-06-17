/**
 * ====================================================================
 * 🍗 FYDELIO — MODULE DASHBOARD CARTE POULET (autonome)
 * --------------------------------------------------------------------
 * Affiche une vue "Carte Poulet" dans le dashboard, UNIQUEMENT pour
 * Le Cercle (resto_id = le_cercle → compte d'Olivier).
 *
 * S'auto-injecte : ajoute l'entrée de menu dans la sidebar + la vue
 * dans .dash-content, donc AUCUNE modification du HTML n'est requise.
 *
 * À CHARGER APRÈS fiddle-pro.js dans dashboard-pro.html :
 *     <script src="fiddle-pro.js"></script>
 *     <script src="animations.js"></script>
 *     <script src="email-campagne.js"></script>
 *     <script src="fydel-intelligence.js"></script>
 *     <script src="fydel-poulet.js"></script>
 *
 * Dépend de : window._supabaseClient, window.currentRestoConfig
 *             (fournis par fiddle-pro.js).
 * Lit les vues SQL : vue_poulet_le_cercle, vue_poulet_le_cercle_stats.
 * ====================================================================
 */
(function () {
    'use strict';

    const SEUIL = 10;

    // ── Attendre que fiddle-pro ait initialisé Supabase + la config ──
    async function attendrePret() {
        let n = 0;
        while ((!window._supabaseClient || !window.currentRestoConfig) && n < 40) {
            await new Promise(r => setTimeout(r, 200)); n++;
        }
        return !!(window._supabaseClient && window.currentRestoConfig);
    }

    // ── Styles spécifiques poulet (injectés une fois) ──
    function injecterStyles() {
        if (document.getElementById('fydel-poulet-style')) return;
        const s = document.createElement('style');
        s.id = 'fydel-poulet-style';
        s.textContent = `
        .poulet-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
        @media(max-width:760px){.poulet-kpi-grid{grid-template-columns:1fr 1fr;}}
        .poulet-kpi{background:white;border:1px solid rgba(0,0,0,0.06);border-radius:18px;padding:20px;box-shadow:0 4px 16px rgba(0,0,0,0.03);}
        .poulet-kpi-ico{width:40px;height:40px;border-radius:11px;background:rgba(194,65,12,0.1);color:#C2410C;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:12px;}
        .poulet-kpi-val{font-size:28px;font-weight:800;color:#0F172A;line-height:1;}
        .poulet-kpi-lbl{font-size:12px;color:#64748B;font-weight:600;margin-top:6px;}
        .poulet-row{display:flex;align-items:center;gap:14px;padding:14px 24px;border-bottom:1px solid #F8FAFC;transition:background 0.15s;}
        .poulet-row:hover{background:#FFFAF7;}
        .poulet-badge{width:38px;height:38px;border-radius:11px;background:rgba(194,65,12,0.1);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
        .poulet-progress{display:flex;gap:3px;margin-top:5px;}
        .poulet-dot{width:9px;height:9px;border-radius:50%;background:#E2E8F0;}
        .poulet-dot.on{background:#C2410C;}
        .poulet-count{background:rgba(194,65,12,0.1);color:#C2410C;font-size:12px;font-weight:800;padding:4px 12px;border-radius:100px;}
        .poulet-offerts{font-size:11px;color:#94A3B8;margin-top:4px;}
        `;
        document.head.appendChild(s);
    }

    // ── Injection de l'entrée sidebar + la vue ──
    function injecterUI() {
        // 1) Entrée de menu, après "Récompenses" si présent, sinon en fin de groupe
        const nav = document.querySelector('.sidebar-nav-group');
        if (nav && !document.getElementById('nav-poulet')) {
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'sidebar-nav-item';
            a.id = 'nav-poulet';
            a.innerHTML = `
                <div class="sidebar-nav-icon"><i data-lucide="drumstick"></i></div>
                <span>Carte Poulet</span>`;
            const apresReco = document.getElementById('nav-recompenses');
            if (apresReco && apresReco.parentNode) {
                apresReco.parentNode.insertBefore(a, apresReco.nextSibling);
            } else {
                nav.appendChild(a);
            }
        }

        // 2) Vue dans .dash-content
        const content = document.querySelector('.dash-content');
        if (content && !document.getElementById('view-poulet')) {
            const v = document.createElement('div');
            v.id = 'view-poulet';
            v.style.display = 'none';
            v.innerHTML = `
                <div class="dash-page-header animate-on-scroll">
                    <div>
                        <h1 class="dash-page-title">🍗 Carte Poulet</h1>
                        <p class="dash-page-sub">Carnet de 10 poulets achetés = 1 offert. Clients ayant au moins 1 poulet.</p>
                    </div>
                </div>
                <div class="poulet-kpi-grid" id="poulet-kpis">
                    <div class="poulet-kpi"><div class="poulet-kpi-ico">👥</div><div class="poulet-kpi-val" id="pk-clients">—</div><div class="poulet-kpi-lbl">Clients actifs</div></div>
                    <div class="poulet-kpi"><div class="poulet-kpi-ico">🍗</div><div class="poulet-kpi-val" id="pk-encours">—</div><div class="poulet-kpi-lbl">Poulets en cours</div></div>
                    <div class="poulet-kpi"><div class="poulet-kpi-ico">🎁</div><div class="poulet-kpi-val" id="pk-offerts">—</div><div class="poulet-kpi-lbl">Poulets offerts (total)</div></div>
                    <div class="poulet-kpi"><div class="poulet-kpi-ico">✅</div><div class="poulet-kpi-val" id="pk-pleines">—</div><div class="poulet-kpi-lbl">Cartes pleines</div></div>
                </div>
                <div class="dash-table-card animate-on-scroll">
                    <div class="dash-table-header">
                        <div class="dash-table-title-group"><h2 class="dash-table-title">Clients fidélité poulet</h2></div>
                    </div>
                    <div id="poulet-list">
                        <div style="padding:40px;text-align:center;color:#94A3B8;">
                            <div class="dash-spinner" style="margin:0 auto 12px;"></div>Chargement…
                        </div>
                    </div>
                </div>`;
            content.appendChild(v);
        }
    }

    // ── Chargement des données poulet ──
    async function chargerPoulet() {
        const ok = await attendrePret();
        if (!ok) return;

        const list = document.getElementById('poulet-list');

        // KPIs (vue de stats)
        try {
            const { data: stats } = await window._supabaseClient
                .from('vue_poulet_le_cercle_stats').select('*').maybeSingle();
            if (stats) {
                document.getElementById('pk-clients').textContent  = stats.clients_actifs ?? 0;
                document.getElementById('pk-encours').textContent  = stats.poulets_en_cours ?? 0;
                document.getElementById('pk-offerts').textContent  = stats.poulets_offerts_total ?? 0;
                document.getElementById('pk-pleines').textContent  = stats.cartes_pleines ?? 0;
            }
        } catch (e) { /* stats non bloquantes */ }

        // Liste détaillée (vue principale)
        const { data, error } = await window._supabaseClient
            .from('vue_poulet_le_cercle').select('*');

        if (error) {
            list.innerHTML = `<div style="padding:40px;text-align:center;color:#EF4444;">Erreur : ${error.message}</div>`;
            return;
        }
        if (!data || data.length === 0) {
            list.innerHTML = `<div style="padding:40px;text-align:center;color:#94A3B8;font-size:14px;">
                <div style="font-size:32px;margin-bottom:8px;">🍗</div>
                <div style="font-weight:700;">Aucun poulet enregistré pour l'instant</div>
                <div style="font-size:12px;margin-top:8px;">Les clients apparaissent dès leur premier poulet scanné.</div>
            </div>`;
            return;
        }

        list.innerHTML = data.map(c => {
            const p = c.poulets || 0;
            const dots = Array.from({length: SEUIL}, (_, i) =>
                `<div class="poulet-dot ${i < p ? 'on' : ''}"></div>`).join('');
            const offerts = c.poulets_offerts || 0;
            return `
            <div class="poulet-row">
                <div class="poulet-badge">🍗</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:700;color:#0F172A;">${c.prenom||''} ${c.nom||''}</div>
                    <div style="font-size:12px;color:#64748B;">${c.email||''}</div>
                    <div class="poulet-progress">${dots}</div>
                </div>
                <div style="text-align:right;">
                    <div class="poulet-count">${p}/${SEUIL}</div>
                    ${offerts > 0 ? `<div class="poulet-offerts">🎁 ${offerts} offert${offerts>1?'s':''}</div>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    // ── Brancher la navigation vers la vue poulet ──
    function brancherNav() {
        const navPoulet = document.getElementById('nav-poulet');
        if (!navPoulet) return;

        navPoulet.addEventListener('click', (e) => {
            e.preventDefault();
            // Masquer toutes les vues connues + la nôtre
            document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
            // Activer l'état visuel
            document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
            navPoulet.classList.add('active');
            // Afficher la vue poulet
            const vue = document.getElementById('view-poulet');
            if (vue) vue.style.display = 'block';
            chargerPoulet();
            // Fermer le menu mobile si ouvert
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar')?.classList.remove('mobile-open');
                document.getElementById('dashBackdrop')?.classList.remove('active');
            }
            if (window.lucide) lucide.createIcons();
        });

        // Quand on clique une AUTRE entrée, s'assurer que la vue poulet se masque
        document.querySelectorAll('.sidebar-nav-item:not(#nav-poulet)').forEach(item => {
            item.addEventListener('click', () => {
                const vue = document.getElementById('view-poulet');
                if (vue) vue.style.display = 'none';
            });
        });
    }

    // ── Initialisation : seulement pour Le Cercle ──
    async function init() {
        const ok = await attendrePret();
        if (!ok) return;

        // 🔒 Garde-fou : on n'active le module QUE pour Le Cercle (Olivier)
        if (window.currentRestoConfig.id !== 'le_cercle') return;

        injecterStyles();
        injecterUI();
        brancherNav();
        if (window.lucide) lucide.createIcons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
