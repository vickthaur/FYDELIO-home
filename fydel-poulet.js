/**
 * ====================================================================
 * 🍗 FYDELIO — MODULE DASHBOARD CARTE POULET (autonome)
 * --------------------------------------------------------------------
 * Vue "Carte Poulet" pour Le Cercle (Olivier) UNIQUEMENT.
 * Refonte : utilise EXACTEMENT les mêmes composants visuels que la
 * vue "Base Clients" native du dashboard (dash-kpi-card, dash-table,
 * dash-page-header, dash-table-card…) au lieu de styles maison.
 *
 * S'auto-injecte : entrée sidebar + vue #view-poulet. Aucun HTML à
 * modifier. À charger APRÈS fiddle-pro.js dans dashboard-pro.html :
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

    // État local (données + tri + recherche), comme la base clients
    let pouletData = [];
    let pouletTri  = { col: 'poulets', sens: 'desc' };
    let pouletQuery = '';

    // ── Attendre que fiddle-pro ait initialisé Supabase + la config ──
    async function attendrePret() {
        let n = 0;
        while ((!window._supabaseClient || !window.currentRestoConfig) && n < 40) {
            await new Promise(r => setTimeout(r, 200)); n++;
        }
        return !!(window._supabaseClient && window.currentRestoConfig);
    }

    // ── Styles : on s'appuie sur les classes natives du dashboard.
    //    Seuls quelques utilitaires propres au poulet sont ajoutés
    //    (pastilles de progression + accent orange sur l'icône sidebar). ──
    function injecterStyles() {
        if (document.getElementById('fydel-poulet-style')) return;
        const s = document.createElement('style');
        s.id = 'fydel-poulet-style';
        s.textContent = `
        /* Cellule "fidélité poulet" dans la table (pastilles + compteur) */
        .pp-progress{display:flex;gap:3px;align-items:center;}
        .pp-dot{width:9px;height:9px;border-radius:50%;background:#E2E8F0;}
        .pp-dot.on{background:#C2410C;}
        .pp-count{display:inline-flex;align-items:center;gap:6px;background:rgba(194,65,12,0.1);color:#C2410C;font-size:12px;font-weight:800;padding:4px 12px;border-radius:100px;}
        .pp-offerts{display:inline-flex;align-items:center;gap:5px;background:rgba(217,119,6,0.1);color:#D97706;font-size:11px;font-weight:800;padding:3px 10px;border-radius:100px;}
        /* Accent orange réservé à l'icône poulet de la sidebar */
        #nav-poulet .sidebar-nav-icon{color:#C2410C;}
        /* Avatar orange dans la fiche client poulet */
        .pp-avatar{background:rgba(194,65,12,0.12);color:#C2410C;}
        `;
        document.head.appendChild(s);
    }

    // ── Injection de l'entrée sidebar + la vue (calquée sur view-clients) ──
    function injecterUI() {
        // 1) Entrée de menu, juste après "Récompenses"
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

        // 2) Vue, en réutilisant exactement la structure de view-clients
        const content = document.querySelector('.dash-content');
        if (content && !document.getElementById('view-poulet')) {
            const v = document.createElement('div');
            v.id = 'view-poulet';
            v.style.display = 'none';
            v.innerHTML = `
                <div class="dash-page-header animate-on-scroll">
                    <div>
                        <h1 class="dash-page-title">Carte Poulet</h1>
                        <p class="dash-page-sub">10 poulets achetés = 1 offert. Suivi des clients de la carte poulet.</p>
                    </div>
                    <div class="dash-page-date">
                        <i data-lucide="drumstick" style="width:14px;height:14px;"></i>
                        <span>Le Cercle</span>
                    </div>
                </div>

                <div class="dash-kpi-grid">
                    <div class="dash-kpi-card dash-kpi-card--amber animate-on-scroll">
                        <div class="dash-kpi-top">
                            <div class="dash-kpi-icon"><i data-lucide="users"></i></div>
                            <div class="dash-kpi-trend"><i data-lucide="trending-up" style="width:13px;height:13px;"></i>Actif</div>
                        </div>
                        <div class="dash-kpi-value" id="pk-clients">—</div>
                        <div class="dash-kpi-label">Clients carte poulet</div>
                        <div class="dash-kpi-bar"><div class="dash-kpi-bar-fill" style="width:72%"></div></div>
                    </div>
                    <div class="dash-kpi-card dash-kpi-card--teal animate-on-scroll">
                        <div class="dash-kpi-top">
                            <div class="dash-kpi-icon"><i data-lucide="drumstick"></i></div>
                            <div class="dash-kpi-trend"><i data-lucide="trending-up" style="width:13px;height:13px;"></i>En cours</div>
                        </div>
                        <div class="dash-kpi-value" id="pk-encours">—</div>
                        <div class="dash-kpi-label">Poulets en cours</div>
                        <div class="dash-kpi-bar"><div class="dash-kpi-bar-fill" style="width:58%"></div></div>
                    </div>
                    <div class="dash-kpi-card dash-kpi-card--purple animate-on-scroll">
                        <div class="dash-kpi-top">
                            <div class="dash-kpi-icon"><i data-lucide="gift"></i></div>
                            <div class="dash-kpi-trend dash-kpi-trend--green"><i data-lucide="check-circle" style="width:13px;height:13px;"></i>Offerts</div>
                        </div>
                        <div class="dash-kpi-value" id="pk-offerts">—</div>
                        <div class="dash-kpi-label">Poulets offerts (total)</div>
                        <div class="dash-kpi-bar"><div class="dash-kpi-bar-fill" style="width:40%"></div></div>
                    </div>
                    <div class="dash-kpi-card dash-kpi-card--teal animate-on-scroll">
                        <div class="dash-kpi-top">
                            <div class="dash-kpi-icon"><i data-lucide="check-circle"></i></div>
                            <div class="dash-kpi-trend"><i data-lucide="award" style="width:13px;height:13px;"></i>Prêtes</div>
                        </div>
                        <div class="dash-kpi-value" id="pk-pleines">—</div>
                        <div class="dash-kpi-label">Cartes pleines (10/10)</div>
                        <div class="dash-kpi-bar"><div class="dash-kpi-bar-fill" style="width:30%"></div></div>
                    </div>
                </div>

                <div class="dash-table-card animate-on-scroll">
                    <div class="dash-table-header">
                        <div class="dash-table-title-group">
                            <h2 class="dash-table-title">Clients carte poulet</h2>
                            <div class="dash-live-badge"><span class="dash-live-dot"></span>Live</div>
                        </div>
                        <div class="dash-table-actions">
                            <span class="dash-table-count" id="pk-count">— clients</span>
                        </div>
                    </div>
                    <div class="dash-table-wrapper">
                        <table class="dash-table">
                            <thead>
                                <tr>
                                    <th data-psort="prenom"><div class="th-inner"><i data-lucide="user" style="width:13px;height:13px;"></i>Client</div></th>
                                    <th><div class="th-inner"><i data-lucide="mail" style="width:13px;height:13px;"></i>Contact</div></th>
                                    <th data-psort="poulets"><div class="th-inner"><i data-lucide="drumstick" style="width:13px;height:13px;"></i>Carte poulet</div></th>
                                    <th data-psort="poulets_offerts"><div class="th-inner"><i data-lucide="gift" style="width:13px;height:13px;"></i>Offerts</div></th>
                                </tr>
                            </thead>
                            <tbody id="pp-tbody">
                                <tr><td colspan="4" class="dash-table-loading"><div class="dash-table-loading-inner"><div class="dash-spinner"></div><span>Chargement…</span></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>`;
            content.appendChild(v);
        }
    }

    // ── Helpers ──
    function initiales(c) {
        const p = (c.prenom || '').trim();
        const n = (c.nom || '').trim();
        const i = (p[0] || '') + (n[0] || '');
        return (i || (c.email || '?')[0] || '?').toUpperCase();
    }
    function echapper(s) {
        return (s || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ── Rendu d'une ligne (mêmes codes visuels que la base clients) ──
    function ligneHTML(c) {
        const p = Math.max(0, Math.min(SEUIL, c.poulets || 0));
        const offerts = c.poulets_offerts || 0;
        let dots = '';
        for (let i = 0; i < SEUIL; i++) dots += `<div class="pp-dot ${i < p ? 'on' : ''}"></div>`;
        const nomComplet = `${echapper(c.prenom || '')} ${echapper(c.nom || '')}`.trim() || '—';
        return `
        <tr data-email="${echapper(c.email || '')}">
            <td>
                <div style="display:flex;align-items:center;gap:12px;">
                    <div class="pp-avatar" style="width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;">${initiales(c)}</div>
                    <div style="font-weight:700;color:#0F172A;">${nomComplet}</div>
                </div>
            </td>
            <td style="color:#64748B;font-size:13px;">${echapper(c.email || '')}</td>
            <td>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <span class="pp-count">${p}/${SEUIL} 🍗</span>
                    <div class="pp-progress">${dots}</div>
                </div>
            </td>
            <td>${offerts > 0 ? `<span class="pp-offerts">🎁 ${offerts}</span>` : '<span style="color:#CBD5E1;">—</span>'}</td>
        </tr>`;
    }

    // ── Filtrage + tri puis rendu du corps de table ──
    function rendreTable() {
        const tbody = document.getElementById('pp-tbody');
        if (!tbody) return;

        let rows = pouletData.slice();

        // Recherche (mêmes champs que la base clients : nom, prénom, email)
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

        const countEl = document.getElementById('pk-count');
        if (countEl) countEl.textContent = `${rows.length} client${rows.length > 1 ? 's' : ''}`;

        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding:40px;text-align:center;color:#94A3B8;font-size:14px;">
                <div style="font-size:32px;margin-bottom:8px;">🍗</div>
                <div style="font-weight:700;">${pouletQuery ? 'Aucun client ne correspond à cette recherche' : 'Aucun client sur la carte poulet pour l\\'instant'}</div>
                <div style="font-size:12px;margin-top:8px;">Les clients apparaissent dès leur inscription à la carte poulet.</div>
            </td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map(ligneHTML).join('');

        // Clic sur une ligne → fiche client native du dashboard, si dispo
        tbody.querySelectorAll('tr[data-email]').forEach(tr => {
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', () => {
                const email = tr.getAttribute('data-email');
                if (typeof window.ouvrirFicheClient === 'function') {
                    window.ouvrirFicheClient(email);
                }
            });
        });

        if (window.lucide) lucide.createIcons();
    }

    // ── Chargement des données poulet (KPIs + liste) ──
    async function chargerPoulet() {
        const ok = await attendrePret();
        if (!ok) return;

        // KPIs (vue de stats)
        try {
            const { data: stats } = await window._supabaseClient
                .from('vue_poulet_le_cercle_stats').select('*').maybeSingle();
            if (stats) {
                const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? 0; };
                set('pk-clients', stats.clients_actifs);
                set('pk-encours', stats.poulets_en_cours);
                set('pk-offerts', stats.poulets_offerts_total);
                set('pk-pleines', stats.cartes_pleines);
            }
        } catch (e) { /* stats non bloquantes */ }

        // Liste détaillée (vue principale)
        const tbody = document.getElementById('pp-tbody');
        const { data, error } = await window._supabaseClient
            .from('vue_poulet_le_cercle').select('*');

        if (error) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="padding:40px;text-align:center;color:#EF4444;">Erreur : ${echapper(error.message)}</td></tr>`;
            return;
        }
        pouletData = data || [];
        rendreTable();
    }

    // ── Tri au clic sur les en-têtes (comme la base clients) ──
    function brancherTri() {
        const vue = document.getElementById('view-poulet');
        if (!vue) return;
        vue.querySelectorAll('th[data-psort]').forEach(th => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                const col = th.getAttribute('data-psort');
                if (pouletTri.col === col) {
                    pouletTri.sens = pouletTri.sens === 'asc' ? 'desc' : 'asc';
                } else {
                    pouletTri.col = col;
                    pouletTri.sens = col === 'prenom' ? 'asc' : 'desc';
                }
                rendreTable();
            });
        });
    }

    // ── Brancher la navigation vers la vue poulet ──
    function brancherNav() {
        const navPoulet = document.getElementById('nav-poulet');
        if (!navPoulet) return;

        navPoulet.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
            document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
            navPoulet.classList.add('active');
            const vue = document.getElementById('view-poulet');
            if (vue) vue.style.display = 'block';
            chargerPoulet();
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar')?.classList.remove('mobile-open');
                document.getElementById('dashBackdrop')?.classList.remove('active');
            }
            if (window.lucide) lucide.createIcons();
        });

        // Quand on clique une AUTRE entrée, masquer la vue poulet
        document.querySelectorAll('.sidebar-nav-item:not(#nav-poulet)').forEach(item => {
            item.addEventListener('click', () => {
                const vue = document.getElementById('view-poulet');
                if (vue) vue.style.display = 'none';
            });
        });
    }

    // ── Brancher la barre de recherche du dashboard (partagée) ──
    function brancherRecherche() {
        const search = document.getElementById('searchClient');
        if (!search) return;
        search.addEventListener('input', () => {
            // On ne filtre que si la vue poulet est visible
            const vue = document.getElementById('view-poulet');
            if (vue && vue.style.display !== 'none') {
                pouletQuery = search.value.trim();
                rendreTable();
            }
        });
    }

    // ── Initialisation : seulement pour Le Cercle ──
    async function init() {
        const ok = await attendrePret();
        if (!ok) return;

        // 🔒 Garde-fou : module réservé à Olivier (Le Cercle)
        if (window.currentRestoConfig.id !== 'le_cercle') return;

        injecterStyles();
        injecterUI();
        brancherNav();
        brancherTri();
        brancherRecherche();
        if (window.lucide) lucide.createIcons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
