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

    // État local pour recherche + tri (améliorations)
    let pouletData = [];
    let pouletQuery = '';
    let pouletTri = { col: 'poulets', sens: 'desc' };

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
        .poulet-kpi{background:white;border:1px solid rgba(0,0,0,0.06);border-radius:18px;padding:20px;box-shadow:0 4px 16px rgba(0,0,0,0.03);transition:transform 0.18s,box-shadow 0.18s;}
        .poulet-kpi:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(194,65,12,0.10);}
        .poulet-kpi-ico{width:40px;height:40px;border-radius:11px;background:rgba(194,65,12,0.1);color:#C2410C;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:12px;}
        .poulet-kpi-val{font-size:28px;font-weight:800;color:#0F172A;line-height:1;}
        .poulet-kpi-lbl{font-size:12px;color:#64748B;font-weight:600;margin-top:6px;}

        /* Barre d'outils : recherche poulet */
        .poulet-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .poulet-search{position:relative;flex:1;min-width:200px;max-width:340px;}
        .poulet-search input{width:100%;padding:10px 14px 10px 38px;border:1px solid #E2E8F0;border-radius:12px;font-size:13px;font-family:inherit;color:#0F172A;background:#F8FAFC;transition:0.2s;}
        .poulet-search input:focus{outline:none;border-color:#C2410C;background:white;box-shadow:0 0 0 3px rgba(194,65,12,0.08);}
        .poulet-search i{position:absolute;left:13px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:#94A3B8;}

        .poulet-row{display:flex;align-items:center;gap:14px;padding:14px 24px;border-bottom:1px solid #F8FAFC;transition:background 0.15s;cursor:pointer;}
        .poulet-row:hover{background:#FFFAF7;}
        .poulet-badge{width:38px;height:38px;border-radius:11px;background:rgba(194,65,12,0.1);color:#C2410C;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;}
        .poulet-progress{display:flex;gap:3px;margin-top:5px;}
        .poulet-dot{width:9px;height:9px;border-radius:50%;background:#E2E8F0;}
        .poulet-dot.on{background:#C2410C;}
        .poulet-count{background:rgba(194,65,12,0.1);color:#C2410C;font-size:12px;font-weight:800;padding:4px 12px;border-radius:100px;}
        .poulet-offerts{font-size:11px;color:#94A3B8;margin-top:4px;}

        /* Tri */
        .poulet-sortbar{display:flex;gap:6px;padding:12px 24px;border-bottom:1px solid #F1F5F9;flex-wrap:wrap;}
        .poulet-sort-btn{padding:5px 12px;border-radius:8px;border:1px solid #E2E8F0;background:white;font-size:12px;font-weight:700;cursor:pointer;color:#64748B;font-family:inherit;transition:0.2s;}
        .poulet-sort-btn.active{background:#C2410C;color:white;border-color:#C2410C;}
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
                        <p class="dash-page-sub">Carnet de 10 poulets achetés = 1 offert. Clients de la carte poulet.</p>
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
                        <div class="dash-table-actions">
                            <span class="dash-table-count" id="pk-liste-count">— clients</span>
                        </div>
                    </div>
                    <div class="poulet-toolbar" style="padding:14px 24px 0;">
                        <div class="poulet-search">
                            <i data-lucide="search"></i>
                            <input type="text" id="poulet-search-input" placeholder="Rechercher un client poulet…">
                        </div>
                    </div>
                    <div class="poulet-sortbar">
                        <button class="poulet-sort-btn active" data-psort="poulets">Plus de poulets</button>
                        <button class="poulet-sort-btn" data-psort="poulets_offerts">Plus d'offerts</button>
                        <button class="poulet-sort-btn" data-psort="prenom">Nom (A→Z)</button>
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

    function echapper(s) {
        return (s || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function initiales(c) {
        const i = ((c.prenom || '')[0] || '') + ((c.nom || '')[0] || '');
        return (i || (c.email || '?')[0] || '?').toUpperCase();
    }

    // ── Rendu de la liste (filtrée + triée) ──
    function rendreListe() {
        const list = document.getElementById('poulet-list');
        if (!list) return;

        let rows = pouletData.slice();

        // Recherche
        if (pouletQuery) {
            const q = pouletQuery.toLowerCase();
            rows = rows.filter(c =>
                (c.prenom || '').toLowerCase().includes(q) ||
                (c.nom || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q));
        }

        // Tri
        const { col, sens } = pouletTri;
        rows.sort((a, b) => {
            let va, vb;
            if (col === 'prenom') { va = (a.prenom || '').toLowerCase(); vb = (b.prenom || '').toLowerCase(); }
            else if (col === 'poulets_offerts') { va = a.poulets_offerts || 0; vb = b.poulets_offerts || 0; }
            else { va = a.poulets || 0; vb = b.poulets || 0; }
            if (va < vb) return sens === 'asc' ? -1 : 1;
            if (va > vb) return sens === 'asc' ? 1 : -1;
            return 0;
        });

        const countEl = document.getElementById('pk-liste-count');
        if (countEl) countEl.textContent = `${rows.length} client${rows.length > 1 ? 's' : ''}`;

        if (rows.length === 0) {
            list.innerHTML = `<div style="padding:40px;text-align:center;color:#94A3B8;font-size:14px;">
                <div style="font-size:32px;margin-bottom:8px;">🍗</div>
                <div style="font-weight:700;">${pouletQuery ? 'Aucun client ne correspond à cette recherche' : 'Aucun poulet enregistré pour l\\'instant'}</div>
                <div style="font-size:12px;margin-top:8px;">Les clients apparaissent dès leur premier poulet scanné.</div>
            </div>`;
            return;
        }

        list.innerHTML = rows.map(c => {
            const p = Math.max(0, Math.min(SEUIL, c.poulets || 0));
            const dots = Array.from({length: SEUIL}, (_, i) =>
                `<div class="poulet-dot ${i < p ? 'on' : ''}"></div>`).join('');
            const offerts = c.poulets_offerts || 0;
            const nomComplet = `${echapper(c.prenom || '')} ${echapper(c.nom || '')}`.trim() || '—';
            return `
            <div class="poulet-row" data-email="${echapper(c.email || '')}">
                <div class="poulet-badge">${initiales(c)}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:700;color:#0F172A;">${nomComplet}</div>
                    <div style="font-size:12px;color:#64748B;">${echapper(c.email || '')}</div>
                    <div class="poulet-progress">${dots}</div>
                </div>
                <div style="text-align:right;">
                    <div class="poulet-count">${p}/${SEUIL}</div>
                    ${offerts > 0 ? `<div class="poulet-offerts">🎁 ${offerts} offert${offerts>1?'s':''}</div>` : ''}
                </div>
            </div>`;
        }).join('');

        // Clic sur une ligne → fiche client native (si disponible)
        list.querySelectorAll('.poulet-row[data-email]').forEach(row => {
            row.addEventListener('click', () => {
                const email = row.getAttribute('data-email');
                if (typeof window.ouvrirFicheClient === 'function') {
                    window.ouvrirFicheClient(email);
                }
            });
        });

        if (window.lucide) lucide.createIcons();
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
            if (list) list.innerHTML = `<div style="padding:40px;text-align:center;color:#EF4444;">Erreur : ${echapper(error.message)}</div>`;
            return;
        }
        pouletData = data || [];
        rendreListe();
    }

    // ── Brancher recherche + tri ──
    function brancherOutils() {
        const search = document.getElementById('poulet-search-input');
        if (search) {
            search.addEventListener('input', () => {
                pouletQuery = search.value.trim();
                rendreListe();
            });
        }
        document.querySelectorAll('.poulet-sort-btn[data-psort]').forEach(btn => {
            btn.addEventListener('click', () => {
                const col = btn.getAttribute('data-psort');
                document.querySelectorAll('.poulet-sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                pouletTri.col = col;
                pouletTri.sens = col === 'prenom' ? 'asc' : 'desc';
                rendreListe();
            });
        });
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
        brancherOutils();
        if (window.lucide) lucide.createIcons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
