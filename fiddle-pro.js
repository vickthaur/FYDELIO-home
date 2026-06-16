/**
 * ====================================================================
 * 🚀 FYDELIO ENGINE v6.2 — DASHBOARD PRO (AVEC LE CERCLE)
 * ====================================================================
 */

// ====================================================================
// ⚙️ CONFIGURATION — Avec Le Cercle Restaurant intégré
// ====================================================================
// ✅ AJOUTER CECI — Réappliquer lucide.createIcons() régulièrement
setInterval(() => {
    lucide.createIcons();
}, 1000);
const FYDELIO_CONFIG = {
    supabase: {
        url: "https://qawfwbppnbnskxlkwstu.supabase.co",
        key: "sb_publishable_EbKZkPjtT8rwkEdw3oVRCg_mBJJ_gNJ"
    },
    proxy: {
        url: "https://script.google.com/macros/s/AKfycbwBp4-Q5ihfllaTdoPGhTb4vZ2-f-TIuPe9k21I12YQhR10ad9qZq03tSHF7FlfHrMZ/exec"
    },
    restos: {
        "villa_saint_antoine": {
            id:        "villa_saint_antoine",
            nom:       "Villa Saint Antoine",
            colPoints: "points",
            vueSql:    "vue_clients_villa"
        },
        "bistrot": {
            id:        "bistrot",
            nom:       "Le Bistrot Paris",
            colPoints: "points",
            vueSql:    "vue_clients_bistrot"
        },
        "le_cercle": {
            id:        "le_cercle",
            nom:       "Le Cercle Restaurant",
            colPoints: "points",
            vueSql:    "vue_clients_le_cercle"
        }
    },
    pagination: { parPage: 20 }
};

// Init Supabase
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
           setTimeout(() => window.location.href = `dashboard-pro.html`, 800);
        } catch (err) {
            errEl.style.display = 'block';
            errEl.innerText = 'Identifiants incorrects. Veuillez réessayer.';
            btn.innerHTML = '<span class="btn-text">Se connecter au Dashboard</span>';
            btn.disabled = false;
            btn.style.background = '';
        }
    };
}

// ====================================================================
// 📊 DASHBOARD — INITIALISATION SÉCURISÉE
// ✅ restoID déclaré AVANT le try pour être accessible partout
// ====================================================================
async function initialiserDashboard() {
    const loader = document.getElementById('loader');

    let restoID = null;

    const loaderTimeout = setTimeout(() => {
        if (loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none',300); }
        showToast("Connexion lente — certaines données peuvent manquer.", 'warning');
    }, 10000);

    afficherSkeleton();

    if (!supabaseApp) {
        clearTimeout(loaderTimeout);
        if (loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none',300); }
        const tbody = document.getElementById('tableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#EF4444;font-weight:700;">Erreur : Supabase non chargé. Rechargez la page.</td></tr>`;
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
            console.warn("Aucun resto associé à cet email.");
            await supabaseApp.auth.signOut();
            window.location.href = "index.html";
            return;
        }

        restoID = proData.resto_id;

        // ✅ ÉTAPE 3 — Vérifier que le restoID existe dans la config
        currentRestoConfig = FYDELIO_CONFIG.restos[restoID];
        if (!currentRestoConfig) {
            console.warn("Restaurant inconnu dans la config :", restoID);
            await supabaseApp.auth.signOut();
            window.location.href = "index.html";
            return;
        }

        window.currentRestoConfig = currentRestoConfig;

        // ✅ ÉTAPE 4 — Charger les données depuis la vue
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

    if (restoID && currentRestoConfig) {
        initialiserQRCode(restoID, currentRestoConfig);
        initialiserRecherche();
        initialiserTriColonnes();
        initialiserBurger();
        initialiserRaccourcisClavier();
        initialiserExport();
        initialiserDeconnexion();
        initialiserRealtime(currentRestoConfig);
    }
}

// ====================================================================
// 📋 AFFICHAGE TABLEAU
// ====================================================================
function afficherTableau(data, colPoints, updateStats = true) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    if (updateStats) {
        animerCompteur('statTotalClients', data.length);
        animerCompteur('statTotalPoints', data.reduce((acc,c) => acc + (parseInt(c[colPoints])||0), 0));
        animerCompteur('statRecompenses', data.reduce((acc,c) => acc + (parseInt(c.recompenses_obtenues)||0), 0));
    }

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

    const parPage   = FYDELIO_CONFIG.pagination.parPage;
    const debut     = (pageActuelle - 1) * parPage;
    const paginated = data.slice(debut, debut + parPage);

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
function initialiserQRCode(restoID, restoConfig) {
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
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'clients' }, async () => {
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
        const colPoints = currentRestoConfig.colPoints;
        const headers = ["Prénom","Nom","Email","Téléphone","Anniversaire","Points","Abonné","Récompenses","Inscription"];
        const rows    = dataClientsGlobal.map(c => [
            `"${c.prenom||''}"`, `"${c.nom||''}"`, `"${c.email||''}"`,
            `"${c.telephone||''}"`, `"${c.date_anniversaire||''}"`,
            c[colPoints]||0,
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
    const mots      = nom.trim().split(' ').filter(Boolean);
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

// ====================================================================
// 📄 FICHE CLIENT (MODAL)
// ====================================================================
function ouvrirFicheClient(client) {
    const palettes = [
        {bg:'rgba(15,118,110,0.12)',color:'#0F766E'},{bg:'rgba(59,130,246,0.12)',color:'#1D4ED8'},
        {bg:'rgba(124,58,237,0.12)',color:'#6D28D9'},{bg:'rgba(217,119,6,0.12)',color:'#B45309'},
    ];
    const nom  = `${client.prenom||''} ${client.nom||''}`.trim();
    const mots = nom.split(' ').filter(Boolean);
    const init = mots.length>=2 ? (mots[0][0]+mots[1][0]).toUpperCase() : (mots[0]||'C')[0].toUpperCase();
    const hash = [...nom].reduce((a,c) => a+c.charCodeAt(0), 0);
    const p    = palettes[hash % palettes.length];
    const avatar = document.getElementById('modalAvatar');
    avatar.textContent = init; avatar.style.background = p.bg; avatar.style.color = p.color;
    document.getElementById('modalNom').textContent = nom;
    document.getElementById('modalEmailDisplay').textContent = client.email || '';
    
    const colPoints = currentRestoConfig.colPoints;
    document.getElementById('modalInfoGrid').innerHTML = `
        <div class="client-info-item"><div class="client-info-label">Points</div><div class="client-info-value">${client[colPoints]||0} pts</div></div>
        <div class="client-info-item"><div class="client-info-label">Récompenses</div><div class="client-info-value">${client.recompenses_obtenues||0}</div></div>
        <div class="client-info-item"><div class="client-info-label">Statut email</div><div class="client-info-value">${client.optin_email!==false?'✅ Abonné':'🔕 Désabonné'}</div></div>
        <div class="client-info-item"><div class="client-info-label">Anniversaire</div><div class="client-info-value">${client.date_anniversaire||'—'}</div></div>
        <div class="client-info-item"><div class="client-info-label">Téléphone</div><div class="client-info-value">${client.telephone||'—'}</div></div>
        <div class="client-info-item"><div class="client-info-label">Inscrit le</div><div class="client-info-value">${new Date(client.created_at).toLocaleDateString('fr-FR')}</div></div>
    `;
    chargerHistoriqueClient(client.email);
    document.getElementById('clientModal').classList.add('active');
    lucide.createIcons();
}

async function chargerHistoriqueClient(email) {
    const container = document.getElementById('modalHistorique');
    if (!window._supabaseClient) return;
    const { data } = await window._supabaseClient
        .from('historique_scans').select('*').eq('client_email', email)
        .order('created_at', { ascending: false }).limit(10);
    if (!data || data.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:20px;color:#94A3B8;font-size:13px;">Aucun passage enregistré.</div>`;
        return;
    }
    container.innerHTML = data.map(s => `
        <div class="scan-item">
            <div class="scan-dot ${s.est_cadeau?'scan-dot--cadeau':'scan-dot--normal'}"></div>
            <div style="flex:1;">
                <span style="font-weight:600;color:#0F172A;">${s.est_cadeau?'🎁 Récompense obtenue':'Passage validé'}</span>
                <span style="font-size:12px;color:#94A3B8;margin-left:8px;">${s.points_avant} → ${s.points_apres} pts</span>
            </div>
            <div style="font-size:12px;color:#94A3B8;">${new Date(s.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
        </div>`).join('');
}

function fermerFicheClient() { document.getElementById('clientModal').classList.remove('active'); }
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('clientModal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('clientModal')) fermerFicheClient();
    });
});

// ====================================================================
// 🤖 FYDEL'INTELLIGENCE
// ====================================================================
async function lancerAnalyseIA() {
    const btn = document.getElementById('btnLancerIA');
    btn.disabled = true;
    btn.innerHTML = '<div class="dash-spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#0F766E;"></div> Analyse…';

    document.getElementById('ia-placeholder').style.display = 'none';
    document.getElementById('ia-result').style.display      = 'none';
    document.getElementById('ia-error').style.display       = 'none';
    document.getElementById('ia-loading').style.display     = 'block';

    const ok = await attendreFiddle();
    if (!ok) { afficherErreurIA('Dashboard non initialisé. Réessayez dans quelques secondes.'); resetBtnIA(); return; }

    const clients   = window.dataClientsGlobal || [];
    const config    = window.currentRestoConfig;
    const colPoints = config.colPoints;

    const totalClients     = clients.length;
    const totalPoints      = clients.reduce((acc,c) => acc + (parseInt(c[colPoints])||0), 0);
    const totalRecompenses = clients.reduce((acc,c) => acc + (parseInt(c.recompenses_obtenues)||0), 0);
    const abonnes          = clients.filter(c => c.optin_email !== false).length;
    const desabonnes       = totalClients - abonnes;
    const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0,0,0,0);
    const nouveauxCeMois = clients.filter(c => new Date(c.created_at) >= debutMois).length;

    try {
        const { data: { session } } = await window._supabaseClient.auth.getSession();
        const res = await fetch('https://qawfwbppnbnskxlkwstu.supabase.co/functions/v1/IA', {
            method:'POST',
            headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token || ''}` },
            body: JSON.stringify({
                restaurant: config.nom, totalClients, totalPoints, totalRecompenses,
                abonnes, desabonnes, nouveauxCeMois,
                seuilPoints: config.id === 'bistrot' ? 5 : 10
            })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Erreur inconnue');
        afficherResultatIA(result.analyse);
    } catch (err) {
        afficherErreurIA(err.message);
    }
    resetBtnIA();
}

async function attendreFiddle() {
    let n = 0;
    while ((!window._supabaseClient || !window.currentRestoConfig) && n < 30) {
        await new Promise(r => setTimeout(r, 200)); n++;
    }
    return !!(window._supabaseClient && window.currentRestoConfig);
}

function afficherResultatIA(a) {
    document.getElementById('ia-loading').style.display = 'none';
    const noteClass = a.note_globale?.startsWith('A') ? 'fydel-note--a'
                    : a.note_globale?.startsWith('B') ? 'fydel-note--b' : 'fydel-note--c';

    const result = document.getElementById('ia-result');
    result.style.display = 'block';
    result.innerHTML = `
        <div class="fydel-result">
            <span class="fydel-note ${noteClass}">
                <i data-lucide="award" style="width:15px;height:15px;"></i>
                Note globale : ${a.note_globale || '—'}
            </span>
            <p class="fydel-resume">${a.resume || ''}</p>

            <div class="fydel-cols">
                <div class="fydel-block">
                    <div class="fydel-block-title forts"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Points forts</div>
                    ${(a.points_forts||[]).map(p => `<div class="fydel-li"><div class="pt pt--green"></div>${p}</div>`).join('') || '<div class="fydel-li" style="color:#94A3B8;">—</div>'}
                </div>
                <div class="fydel-block">
                    <div class="fydel-block-title faibles"><i data-lucide="wrench" style="width:14px;height:14px;"></i> À améliorer</div>
                    ${(a.points_ameliorer||[]).map(p => `<div class="fydel-li"><div class="pt pt--orange"></div>${p}</div>`).join('') || '<div class="fydel-li" style="color:#94A3B8;">—</div>'}
                </div>
            </div>

            <div class="fydel-conseil">
                <div class="fydel-conseil-label"><i data-lucide="lightbulb" style="width:14px;height:14px;"></i> Conseil prioritaire cette semaine</div>
                <div class="fydel-conseil-txt">${a.conseil_prioritaire || ''}</div>
            </div>

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
    lucide.createIcons();
}

function afficherErreurIA(msg) {
    document.getElementById('ia-loading').style.display = 'none';
    document.getElementById('ia-error').style.display   = 'block';
    document.getElementById('ia-error-msg').innerHTML   = `<strong>Erreur :</strong> ${msg}<br><small>Vérifiez que l'Edge Function "IA" est déployée et que ANTHROPIC_API_KEY est configuré dans Supabase → Secrets.</small>`;
}

function resetBtnIA() {
    const btn = document.getElementById('btnLancerIA');
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="sparkles" style="width:17px;height:17px;"></i> Analyser mes performances';
    lucide.createIcons();
}

// ====================================================================
// 📊 ANALYTICS
// ====================================================================
let chartInscrits = null, chartCumule = null, donneesGraph = [];

async function chargerGraphiques() {
    const ok = await attendreFiddle();
    if (!ok) return;
    const suffixe = { villa_saint_antoine:'villa', bistrot:'bistrot', le_cercle:'le_cercle' }[window.currentRestoConfig.id] || 'bistrot';
    const vue = 'vue_inscrits_par_jour_' + suffixe;
    const { data, error } = await window._supabaseClient.from(vue).select('*');
    if (error) {
        console.error('Erreur graphique:', error);
        document.getElementById('chart1-wrap').innerHTML = '<div class="chart-empty">Erreur : ' + error.message + '</div>';
        return;
    }
    donneesGraph = data || [];
    if (donneesGraph.length === 0) {
        document.getElementById('chart1-wrap').innerHTML = '<div class="chart-empty">Aucune donnée disponible</div>';
        document.getElementById('chart2-wrap').innerHTML = '<div class="chart-empty">Aucune donnée disponible</div>';
        return;
    }
    renderGraphiques(donneesGraph);
}

function renderGraphiques(data) {
    const labels  = data.map(d => new Date(d.jour + 'T00:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' }));
    const newData = data.map(d => parseInt(d.nouveaux_inscrits) || 0);
    const cumData = data.map(d => parseInt(d.total_cumule) || 0);
    const opts = {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{
            x:{ grid:{ display:false }, ticks:{ font:{ family:'Plus Jakarta Sans', size:11 }, color:'#94A3B8' } },
            y:{ beginAtZero:true, grid:{ color:'#F1F5F9' }, ticks:{ font:{ family:'Plus Jakarta Sans', size:11 }, color:'#94A3B8', stepSize:1, precision:0 } }
        }
    };
    const wrap1 = document.getElementById('chart1-wrap');
    wrap1.innerHTML = '<canvas id="chartInscrits"></canvas>';
    const ctx1 = document.getElementById('chartInscrits').getContext('2d');
    if (chartInscrits) chartInscrits.destroy();
    chartInscrits = new Chart(ctx1, {
        type:'bar',
        data:{ labels, datasets:[{ data:newData, backgroundColor:'rgba(15,118,110,0.15)', borderColor:'#0F766E', borderWidth:2, borderRadius:6 }] },
        options:opts
    });
    const wrap2 = document.getElementById('chart2-wrap');
    wrap2.innerHTML = '<canvas id="chartCumule"></canvas>';
    const ctx2 = document.getElementById('chartCumule').getContext('2d');
    if (chartCumule) chartCumule.destroy();
    chartCumule = new Chart(ctx2, {
        type:'line',
        data:{ labels, datasets:[{ data:cumData, borderColor:'#0F766E', backgroundColor:'rgba(15,118,110,0.06)', fill:true, tension:0.4, pointBackgroundColor:'#0F766E', pointRadius:3 }] },
        options:opts
    });
}

function changerPeriode(jours, btn) {
    document.querySelectorAll('.chart-period button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGraphiques(donneesGraph.slice(-jours));
}

// ====================================================================
// 🎁 RÉCOMPENSES
// ====================================================================
async function chargerRecompenses() {
    const ok = await attendreFiddle();
    if (!ok) return;
    const container = document.getElementById('recompenses-list');
    const suffixe = { villa_saint_antoine:'villa', bistrot:'bistrot', le_cercle:'le_cercle' }[window.currentRestoConfig.id] || 'bistrot';
    const vue = 'vue_recompenses_' + suffixe;
    const { data, error } = await window._supabaseClient.from(vue).select('*');
    if (error) { container.innerHTML = `<div style="padding:40px;text-align:center;color:#EF4444;">Erreur : ${error.message}</div>`; return; }
    if (!data || data.length === 0) {
        container.innerHTML = `<div style="padding:40px;text-align:center;color:#94A3B8;font-size:14px;">
            <div style="font-size:32px;margin-bottom:8px;">🎁</div>
            <div style="font-weight:700;">Aucune récompense débloquée pour l'instant</div>
            <div style="font-size:12px;margin-top:8px;">Les récompenses apparaissent après le premier scan validé avec cadeau.</div>
        </div>`;
        return;
    }
    container.innerHTML = data.map(c => `
        <div class="recompense-row">
            <div class="recompense-badge">🎁</div>
            <div>
                <div style="font-size:14px;font-weight:700;color:#0F172A;">${c.prenom||''} ${c.nom||''}</div>
                <div style="font-size:12px;color:#64748B;">${c.email}</div>
            </div>
            <div style="margin-left:auto;text-align:right;">
                <div class="recompense-count">${c.recompenses_obtenues} récompense${c.recompenses_obtenues>1?'s':''}</div>
                <div style="font-size:11px;color:#94A3B8;margin-top:4px;">${c.points_actuels} pts actuels</div>
            </div>
        </div>`).join('');
}

// ====================================================================
// Routes des vues
// ====================================================================
function activerVue(navId) {
    document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
    const navEl = document.getElementById(navId);
    if (navEl) navEl.classList.add('active');
    
    const VUES = {
        'nav-clients':'view-clients','nav-analytics':'view-analytics',
        'nav-recompenses':'view-recompenses','nav-ia':'view-ia','nav-qrcodes':'view-qrcodes',
    };
    
    Object.values(VUES).forEach(v => { const el = document.getElementById(v); if (el) el.style.display = 'none'; });
    const target = document.getElementById(VUES[navId]);
    if (target) target.style.display = 'block';
    if (navId === 'nav-analytics')   chargerGraphiques();
    if (navId === 'nav-recompenses') chargerRecompenses();
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.getElementById('dashBackdrop')?.classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-nav-item:not(.sidebar-nav-item--soon)').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.id) activerVue(item.id);
        });
    });
});
