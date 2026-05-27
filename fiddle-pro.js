/**
 * ====================================================================
 * 🚀 FYDELIO ENGINE v6.0 — DASHBOARD PRO
 * Une seule version, propre, sans duplication.
 * ====================================================================
 */

// ====================================================================
// ⚙️ CONFIGURATION
// ====================================================================
const FYDELIO_CONFIG = {
    supabase: {
        url: "https://qawfwbppnbnskxlkwstu.supabase.co",
        key: "sb_publishable_EbKZkPjtT8rwkEdw3oVRCg_mBJJ_gNJ" // Gardée pour l'auth uniquement
    },
    proxy: {
        url: "https://script.google.com/macros/s/AKfycbyQQK6NYmt1kbEqHCvbiRgKMcAp67587m-P56gJnc_waPThOuNBgE4vknt088MCg1kYoA/exec" // ← ton lien ici
    },
    restos: { ... },
    pagination: { parPage: 20 }
};

// Init Supabase — exposition globale pour le dashboard HTML
const supabaseApp = (typeof window.supabase !== 'undefined')
    ? window.supabase.createClient(FYDELIO_CONFIG.supabase.url, FYDELIO_CONFIG.supabase.key)
    : null;

window._supabaseClient = supabaseApp;

// État global
let dataClientsGlobal  = [];
let dataClientsFiltres = [];
let sortConfig         = { col: null, dir: 'asc' };
let pageActuelle       = 1;
let searchTimer        = null;
let currentRestoConfig = null;

// ====================================================================
// 🧭 ROUTEUR
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm'))  initialiserPageAccueil();
    if (document.getElementById('tableBody'))  initialiserDashboard();
});

// ====================================================================
// 🍞 TOASTS
// ====================================================================
function showToast(message, type = 'success', duree = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }
    const colors = {
        success: { bg:'#ECFDF5', border:'#10B981', text:'#065F46', icon:'✓' },
        error:   { bg:'#FEF2F2', border:'#EF4444', text:'#991B1B', icon:'✕' },
        info:    { bg:'#EFF6FF', border:'#3B82F6', text:'#1E40AF', icon:'ℹ' },
        warning: { bg:'#FFFBEB', border:'#F59E0B', text:'#92400E', icon:'⚠' }
    };
    const c = colors[type] || colors.success;
    const toast = document.createElement('div');
    toast.style.cssText = `display:flex;align-items:center;gap:12px;background:${c.bg};border:1px solid ${c.border};border-left:4px solid ${c.border};color:${c.text};padding:14px 18px;border-radius:14px;font-size:14px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.1);pointer-events:all;min-width:260px;max-width:380px;opacity:0;transform:translateX(40px);transition:all 0.35s cubic-bezier(0.16,1,0.3,1);`;
    toast.innerHTML = `<span style="font-size:16px;flex-shrink:0;">${c.icon}</span><span style="flex:1;">${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity='1'; toast.style.transform='translateX(0)'; });
    setTimeout(() => {
        toast.style.opacity='0'; toast.style.transform='translateX(40px)';
        setTimeout(() => toast.remove(), 350);
    }, duree);
}

// ====================================================================
// 💀 SKELETON
// ====================================================================
function afficherSkeleton() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    const sk = (w) => `<div style="height:12px;width:${w}px;max-width:100%;background:linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9);border-radius:100px;animation:shimmer 1.5s infinite;"></div>`;
    tbody.innerHTML = Array.from({length:5}, () => `
        <tr>
            <td>${sk(140)}</td><td>${sk(200)}</td>
            <td>${sk(60)}</td><td>${sk(80)}</td><td>${sk(90)}</td>
        </tr>`).join('');
    if (!document.getElementById('shimmer-style')) {
        const s = document.createElement('style');
        s.id = 'shimmer-style';
        s.textContent = '@keyframes shimmer{0%{opacity:1}50%{opacity:0.4}100%{opacity:1}}';
        document.head.appendChild(s);
    }
}

// ====================================================================
// 🔐 PAGE ACCUEIL — Connexion
// ====================================================================
function initialiserPageAccueil() {
    const modal    = document.getElementById('loginModal');
    const btnOpen  = document.getElementById('btnOpenModal');
    const btnClose = document.getElementById('btnCloseModal');
    const form     = document.getElementById('loginForm');

    if (btnOpen)  btnOpen.onclick  = () => { modal.style.display='flex'; setTimeout(()=>modal.classList.add('active'),10); };
    if (btnClose) btnClose.onclick = () => { modal.classList.remove('active'); setTimeout(()=>modal.style.display='none',300); };
    window.onclick = (e) => { if (e.target===modal) { modal.classList.remove('active'); setTimeout(()=>modal.style.display='none',300); } };

    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn   = document.getElementById('btnSubmitLogin');
        const email = document.getElementById('restoEmail').value.trim().toLowerCase();
        const pwd   = document.getElementById('restoPwd').value;
        const errEl = document.getElementById('loginError');

        errEl.style.display = 'none';
        btn.innerHTML = '<span class="btn-text">Vérification…</span>';
        btn.disabled  = true;

        if (!supabaseApp) {
            errEl.style.display = 'block';
            errEl.innerText = 'Erreur de connexion. Rechargez la page.';
            btn.innerHTML = '<span class="btn-text">Se connecter</span>';
            btn.disabled = false;
            return;
        }

        try {
            const { error: authError } = await supabaseApp.auth.signInWithPassword({ email, password: pwd });
            if (authError) throw authError;
            const { data: proData } = await supabaseApp.from('acces_pro').select('resto_id').eq('email', email).single();
            const restoID = proData?.resto_id || "villa_saint_antoine";
            btn.innerHTML = '✓ Connexion réussie';
            btn.style.background = '#10b981';
            setTimeout(() => window.location.href = `dashboard-pro.html?resto=${restoID}`, 800);
        } catch (err) {
            errEl.style.display = 'block';
            errEl.innerText = 'Identifiants incorrects.';
            btn.innerHTML = '<span class="btn-text">Se connecter au Dashboard</span>';
            btn.disabled = false;
            btn.style.background = '';
        }
    };
}

/**
 * ====================================================================
 * 🔐 FIX SÉCURITÉ — RESTO_ID depuis Supabase, jamais depuis l'URL
 * Remplace la fonction initialiserDashboard() dans ton fichier JS
 * ====================================================================
 */

async function initialiserDashboard() {
    const loader = document.getElementById('loader');

    // Timeout secours loader
    const loaderTimeout = setTimeout(() => {
        if (loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none',300); }
        showToast("Connexion lente — certaines données peuvent manquer.", 'warning');
    }, 10000);

    afficherSkeleton();

    if (!supabaseApp) {
        clearTimeout(loaderTimeout);
        if (loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none',300); }
        const tbody = document.getElementById('tableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#EF4444;font-weight:700;">Erreur : Supabase non chargé.</td></tr>`;
        return;
    }

    try {
        // ✅ ÉTAPE 1 — Vérifier la session
        const { data: { session } } = await supabaseApp.auth.getSession();
        if (!session) {
            clearTimeout(loaderTimeout);
            window.location.href = "index.html";
            return;
        }

        const emailConnecte = session.user.email;
        const emailEl = document.getElementById('displayEmail');
        if (emailEl) emailEl.innerText = emailConnecte;

        // ✅ ÉTAPE 2 — Récupérer le resto_id depuis Supabase (jamais depuis l'URL)
        const { data: proData, error: proError } = await supabaseApp
            .from('acces_pro')
            .select('resto_id')
            .eq('email', emailConnecte)
            .single();

        if (proError || !proData?.resto_id) {
            // L'utilisateur connecté n'a aucun restaurant associé — on déconnecte
            console.warn("Aucun resto associé à cet email.");
            await supabaseApp.auth.signOut();
            window.location.href = "index.html";
            return;
        }

        const restoID = proData.resto_id;

        // ✅ ÉTAPE 3 — Vérifier que le restoID existe dans la config
        currentRestoConfig = FYDELIO_CONFIG.restos[restoID];
        if (!currentRestoConfig) {
            console.warn("Restaurant inconnu dans la config :", restoID);
            await supabaseApp.auth.signOut();
            window.location.href = "index.html";
            return;
        }

        window.currentRestoConfig = currentRestoConfig;

        // ✅ ÉTAPE 4 — Charger les données
        const { data, error } = await supabaseApp
            .from(currentRestoConfig.vueSql)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        dataClientsGlobal        = data || [];
        window.dataClientsGlobal = dataClientsGlobal;
        dataClientsFiltres       = [...dataClientsGlobal];

        afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, true);
        showToast(`${dataClientsGlobal.length} clients chargés`, 'success', 2500);

    } catch (err) {
        console.error("Erreur Dashboard:", err);
        const tbody = document.getElementById('tableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#94A3B8;">
            <div style="font-size:24px;margin-bottom:8px;">⚠</div>
            Erreur de chargement.
            <button onclick="location.reload()" style="display:block;margin:12px auto 0;padding:8px 16px;background:#0F766E;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">Réessayer</button>
        </td></tr>`;
        showToast("Erreur de chargement", 'error');
    } finally {
        clearTimeout(loaderTimeout);
        if (loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none',300); }
    }

    // Modules
    initialiserQRCode(currentRestoConfig);
    initialiserRecherche();
    initialiserTriColonnes();
    initialiserBurger();
    initialiserRaccourcisClavier();
    initialiserExport();
    initialiserDeconnexion();
    initialiserRealtime(currentRestoConfig);
}
// ====================================================================
// 📋 AFFICHAGE TABLEAU
// ====================================================================
function afficherTableau(data, colPoints, updateStats = true) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    // KPIs
    if (updateStats) {
        animerCompteur('statTotalClients', data.length);
        animerCompteur('statTotalPoints', data.reduce((acc,c) => acc + (parseInt(c[colPoints])||0), 0));
        animerCompteur('statRecompenses', data.reduce((acc,c) => acc + (parseInt(c.recompenses_obtenues)||0), 0));
    }

    // Compteur
    const countEl = document.getElementById('tableCount');
    if (countEl) countEl.textContent = `${data.length} client${data.length>1?'s':''}`;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:60px;color:#94A3B8;">
            <div style="font-size:28px;margin-bottom:8px;">🔍</div>
            <div style="font-weight:700;">Aucun client trouvé</div>
        </td></tr>`;
        afficherPagination(0);
        return;
    }

    // Pagination
    const parPage   = FYDELIO_CONFIG.pagination.parPage;
    const debut     = (pageActuelle - 1) * parPage;
    const paginated = data.slice(debut, debut + parPage);

    // Stockage pour le clic fiche client
    window._clientsPage = paginated;

    tbody.innerHTML = paginated.map((c, idx) => {
        const nom    = `${c.prenom||''} ${c.nom||''}`.trim() || 'Client';
        const pts    = c[colPoints] || 0;
        const date   = c.created_at ? dateRelative(c.created_at) : '—';
        const avatar = genererAvatar(nom);
        const optin  = c.optin_email !== false;
        const badge  = optin
            ? `<span class="badge-optin badge-optin--on">✅ Abonné</span>`
            : `<span class="badge-optin badge-optin--off">🔕 Désabonné</span>`;

        return `<tr onclick="ouvrirFicheClient(window._clientsPage[${idx}])" style="cursor:pointer;">
            <td>
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="${avatar.style}">${avatar.initiales}</div>
                    <span style="font-weight:700;color:#0F172A;">${nom}</span>
                </div>
            </td>
            <td><span style="color:#475569;font-size:13px;">${c.email||'N/A'}</span></td>
            <td><span class="badge-points">${pts} pts</span></td>
            <td>${badge}</td>
            <td><span title="${c.created_at?new Date(c.created_at).toLocaleDateString('fr-FR'):''}" style="color:#94A3B8;font-size:13px;">${date}</span></td>
        </tr>`;
    }).join('');

    afficherPagination(data.length);
}

// ====================================================================
// 📄 PAGINATION
// ====================================================================
function afficherPagination(total) {
    const parPage    = FYDELIO_CONFIG.pagination.parPage;
    const totalPages = Math.ceil(total / parPage);
    let paginationEl = document.getElementById('dash-pagination');

    if (!paginationEl) {
        const tableCard = document.querySelector('.dash-table-card');
        if (!tableCard) return;
        paginationEl = document.createElement('div');
        paginationEl.id = 'dash-pagination';
        paginationEl.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-top:1px solid #F1F5F9;font-size:13px;color:#64748B;font-weight:600;';
        tableCard.appendChild(paginationEl);
    }

    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    const debut = (pageActuelle-1)*parPage+1;
    const fin   = Math.min(pageActuelle*parPage, total);
    const btn   = 'padding:7px 14px;border:1px solid #E2E8F0;border-radius:8px;background:white;cursor:pointer;font-size:13px;font-weight:700;color:#334155;font-family:inherit;';

    paginationEl.innerHTML = `
        <span>${debut}–${fin} sur ${total}</span>
        <div style="display:flex;gap:8px;">
            <button onclick="changerPage(-1)" ${pageActuelle<=1?'disabled':''} style="${btn}${pageActuelle<=1?'opacity:0.4;cursor:not-allowed;':''}">← Préc.</button>
            <span style="padding:7px 14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;font-weight:800;">${pageActuelle}/${totalPages}</span>
            <button onclick="changerPage(1)" ${pageActuelle>=totalPages?'disabled':''} style="${btn}${pageActuelle>=totalPages?'opacity:0.4;cursor:not-allowed;':''}">Suiv. →</button>
        </div>`;
}

function changerPage(delta) {
    const totalPages = Math.ceil(dataClientsFiltres.length / FYDELIO_CONFIG.pagination.parPage);
    pageActuelle = Math.max(1, Math.min(pageActuelle + delta, totalPages));
    afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, false);
    document.querySelector('.dash-table-card')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ====================================================================
// 🔍 RECHERCHE
// ====================================================================
function initialiserRecherche() {
    const input = document.getElementById('searchClient');
    if (!input) return;
    input.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const terme = e.target.value.toLowerCase().trim();
            dataClientsFiltres = !terme
                ? [...dataClientsGlobal]
                : dataClientsGlobal.filter(c =>
                    (c.prenom&&c.prenom.toLowerCase().includes(terme)) ||
                    (c.nom&&c.nom.toLowerCase().includes(terme))       ||
                    (c.email&&c.email.toLowerCase().includes(terme))
                );
            pageActuelle = 1;
            afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, false);
        }, 280);
    });
}

// ====================================================================
// ↕️ TRI COLONNES
// ====================================================================
function initialiserTriColonnes() {
    document.querySelectorAll('.dash-table th[data-sort]').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            sortConfig.dir = (sortConfig.col===col && sortConfig.dir==='asc') ? 'desc' : 'asc';
            sortConfig.col = col;

            document.querySelectorAll('.sort-indicator').forEach(s => s.remove());
            const ind = document.createElement('span');
            ind.className = 'sort-indicator';
            ind.style.cssText = 'margin-left:5px;font-size:11px;opacity:0.7;';
            ind.textContent = sortConfig.dir==='asc' ? '↑' : '↓';
            th.appendChild(ind);

            dataClientsFiltres = [...dataClientsFiltres].sort((a, b) => {
                let va = a[col]||'', vb = b[col]||'';
                if (col==='created_at') { va=new Date(va); vb=new Date(vb); }
                else if (col==='points') { va=parseInt(va)||0; vb=parseInt(vb)||0; }
                else { va=va.toString().toLowerCase(); vb=vb.toString().toLowerCase(); }
                if (va<vb) return sortConfig.dir==='asc'?-1:1;
                if (va>vb) return sortConfig.dir==='asc'?1:-1;
                return 0;
            });
            pageActuelle = 1;
            afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, false);
        });
    });
}

// ====================================================================
// 📱 QR CODE
// ====================================================================
function initialiserQRCode(restoID) {
    const qrContainer = document.getElementById('qr-code-container');
    const btnDownload = document.getElementById('btnDownloadQR');
    if (!qrContainer) return;

    const lien  = `https://app.fydelio.fr/?resto=${restoID}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lien)}`;
    qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="width:150px;height:150px;border-radius:8px;">`;

    if (btnDownload) {
        btnDownload.addEventListener('click', async () => {
            const orig = btnDownload.innerHTML;
            btnDownload.innerHTML = 'Téléchargement…';
            btnDownload.disabled = true;
            try {
                const blob = await (await fetch(qrUrl)).blob();
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href = url; a.download = `QR_FYDELIO_${restoID}.png`; a.click();
                URL.revokeObjectURL(url);
                showToast('QR Code téléchargé !', 'success');
            } catch { showToast("Erreur téléchargement", 'error'); }
            finally { btnDownload.innerHTML=orig; btnDownload.disabled=false; }
        });
    }
}

// ====================================================================
// ⌨️ RACCOURCIS CLAVIER
// ====================================================================
function initialiserRaccourcisClavier() {
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey||e.ctrlKey) && e.key==='k') {
            e.preventDefault();
            document.getElementById('searchClient')?.focus();
        }
        if (e.key==='Escape') fermerSidebarMobile();
    });
}

// ====================================================================
// ⚡ REALTIME
// ====================================================================
function initialiserRealtime(restoConfig) {
    if (!supabaseApp) return;
    supabaseApp.channel('fydelio-realtime')
        .on('postgres_changes', { event:'INSERT', schema:'public' }, async () => {
            const { data } = await supabaseApp
                .from(restoConfig.vueSql).select('*')
                .order('created_at', { ascending: false });
            if (data) {
                dataClientsGlobal         = data;
                window.dataClientsGlobal  = data;
                dataClientsFiltres        = [...data];
                pageActuelle = 1;
                afficherTableau(dataClientsFiltres, restoConfig.colPoints, true);
                showToast('Nouveau client inscrit !', 'success');
            }
        })
        .subscribe();
}

// ====================================================================
// 🍔 BURGER MOBILE
// ====================================================================
function initialiserBurger() {
    const burger   = document.getElementById('mobileMenuBtn');
    const sidebar  = document.querySelector('.sidebar');
    const backdrop = document.getElementById('dashBackdrop');
    if (!burger || !sidebar) return;

    burger.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('mobile-open');
        if (backdrop) backdrop.classList.toggle('active', isOpen);
    });
    if (backdrop) backdrop.addEventListener('click', () => fermerSidebarMobile());
}

function fermerSidebarMobile() {
    if (window.innerWidth > 768) return;
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
    document.getElementById('dashBackdrop')?.classList.remove('active');
}

// ====================================================================
// 📥 EXPORT CSV
// ====================================================================
function initialiserExport() {
    const btn = document.getElementById('btnExport');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (!dataClientsGlobal.length) { showToast("Aucune donnée à exporter", 'warning'); return; }
        const headers = ["Prénom","Nom","Email","Téléphone","Anniversaire","Points","Abonné","Récompenses","Inscription"];
        const rows    = dataClientsGlobal.map(c => [
            `"${c.prenom||''}"`, `"${c.nom||''}"`, `"${c.email||''}"`,
            `"${c.telephone||''}"`, `"${c.date_anniversaire||''}"`,
            c[currentRestoConfig.colPoints]||0,
            c.optin_email!==false ? 'Oui' : 'Non',
            c.recompenses_obtenues||0,
            `"${c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : ''}"`
        ]);
        const csv  = "\ufeff" + headers.join(",") + "\n" + rows.map(r=>r.join(",")).join("\n");
        const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url;
        a.download = `Export_FYDELIO_${currentRestoConfig.nom.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`${dataClientsGlobal.length} clients exportés`, 'success');
    });
}

// ====================================================================
// 🚪 DÉCONNEXION
// ====================================================================
function initialiserDeconnexion() {
    const btn = document.getElementById('btnLogout');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        await supabaseApp?.auth.signOut();
        window.location.href = "index.html";
    });
}

// ====================================================================
// 🎨 UTILITAIRES VISUELS
// ====================================================================
function genererAvatar(nom) {
    const mots     = nom.trim().split(' ').filter(Boolean);
    const initiales = mots.length>=2
        ? (mots[0][0]+mots[1][0]).toUpperCase()
        : (mots[0]||'?')[0].toUpperCase();
    const palettes = [
        {bg:'rgba(15,118,110,0.12)',color:'#0F766E'},
        {bg:'rgba(59,130,246,0.12)',color:'#1D4ED8'},
        {bg:'rgba(124,58,237,0.12)',color:'#6D28D9'},
        {bg:'rgba(217,119,6,0.12)',color:'#B45309'},
        {bg:'rgba(236,72,153,0.12)',color:'#BE185D'},
        {bg:'rgba(239,68,68,0.12)',color:'#B91C1C'},
    ];
    const palette = palettes[[...nom].reduce((acc,c)=>acc+c.charCodeAt(0),0) % palettes.length];
    return {
        initiales,
        style: `width:34px;height:34px;border-radius:10px;flex-shrink:0;background:${palette.bg};color:${palette.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;`
    };
}

function dateRelative(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / (1000*60*60*24));
    if (diff===0) return "Aujourd'hui";
    if (diff===1) return "Hier";
    if (diff<7)   return `Il y a ${diff} j`;
    if (diff<30)  return `Il y a ${Math.floor(diff/7)} sem.`;
    if (diff<365) return `Il y a ${Math.floor(diff/30)} mois`;
    return `Il y a ${Math.floor(diff/365)} an${Math.floor(diff/365)>1?'s':''}`;
}

function animerCompteur(id, valeurFinale) {
    const el = document.getElementById(id);
    if (!el) return;
    const debut   = parseInt(el.innerText.replace(/\D/g,'')) || 0;
    const debut_t = performance.now();
    const duree   = 900;
    function step(t) {
        const p = Math.min((t-debut_t)/duree, 1);
        el.innerText = Math.round(debut + (valeurFinale-debut) * (1-Math.pow(1-p,3)));
        if (p<1) requestAnimationFrame(step);
        else el.innerText = valeurFinale;
    }
    requestAnimationFrame(step);
}
