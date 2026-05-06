/**
 * ====================================================================
 * 🚀 FYDELIO ENGINE v5.0 — DASHBOARD PREMIUM
 * Realtime · Toasts · Skeleton · Tri · Pagination · Avatars
 * Dates relatives · Raccourcis clavier · Burger sync · Counters
 * ====================================================================
 */

// ====================================================================
// ⚙️ 1. CONFIGURATION
// ====================================================================
const FYDELIO_CONFIG = {
    supabase: {
        url: "https://qawfwbppnbnskxlkwstu.supabase.co",
        key: "sb_publishable_EbKZkPjtT8rwkEdw3oVRCg_mBJJ_gNJ"
    },
    restos: {
        "villa_saint_antoine": {
            nom: "Villa Saint Antoine",
            colPoints: "points",
            vueSql: "vue_clients_villa"
        },
        "bistrot": {
            nom: "Le Bistrot Paris",
            colPoints: "points",
            vueSql: "vue_clients_bistrot"
        }
    },
    pagination: {
        parPage: 20
    }
};

const supabaseApp = (typeof window.supabase !== 'undefined')
    ? window.supabase.createClient(FYDELIO_CONFIG.supabase.url, FYDELIO_CONFIG.supabase.key)
    : null;

// État global
let dataClientsGlobal  = [];
let dataClientsFiltres = [];
let sortConfig         = { col: null, dir: 'asc' };
let pageActuelle       = 1;
let searchDebounceTimer = null;
let currentRestoConfig = null;

// ====================================================================
// 🧭 2. ROUTEUR
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm'))  initialiserPageAccueil();
    if (document.getElementById('tableBody')) initialiserDashboard();
});

// ====================================================================
// 🍞 3. SYSTÈME DE TOASTS (remplace toutes les alert())
// ====================================================================
function showToast(message, type = 'success', duree = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; bottom: 24px; right: 24px;
            z-index: 99999; display: flex; flex-direction: column;
            gap: 10px; pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const colors = {
        success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: '✓' },
        error:   { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: '✕' },
        info:    { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', icon: 'ℹ' },
        warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', icon: '⚠' }
    };
    const c = colors[type] || colors.success;

    const toast = document.createElement('div');
    toast.style.cssText = `
        display: flex; align-items: center; gap: 12px;
        background: ${c.bg}; border: 1px solid ${c.border};
        border-left: 4px solid ${c.border};
        color: ${c.text}; padding: 14px 18px;
        border-radius: 14px; font-size: 14px; font-weight: 600;
        font-family: 'Plus Jakarta Sans', sans-serif;
        box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        pointer-events: all; min-width: 260px; max-width: 380px;
        opacity: 0; transform: translateX(40px);
        transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    toast.innerHTML = `
        <span style="font-size:16px;flex-shrink:0;">${c.icon}</span>
        <span style="flex:1;">${message}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 350);
    }, duree);
}

// ====================================================================
// 💀 4. SKELETON LOADER TABLE
// ====================================================================
function afficherSkeleton() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    const lignes = Array.from({ length: 6 }, () => `
        <tr style="animation: shimmer 1.5s infinite;">
            <td><div style="${skStyle(140)}"></div></td>
            <td><div style="${skStyle(200)}"></div></td>
            <td><div style="${skStyle(80)}"></div></td>
            <td><div style="${skStyle(60)}"></div></td>
            <td><div style="${skStyle(90)}"></div></td>
        </tr>
    `).join('');

    tbody.innerHTML = lignes;

    // Injecter l'animation shimmer si pas déjà là
    if (!document.getElementById('shimmer-style')) {
        const s = document.createElement('style');
        s.id = 'shimmer-style';
        s.textContent = `
            @keyframes shimmer {
                0%   { opacity: 1; }
                50%  { opacity: 0.4; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(s);
    }
}

function skStyle(w) {
    return `height:12px;width:${w}px;max-width:100%;background:linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9);border-radius:100px;`;
}

// ====================================================================
// 🔐 5. PAGE ACCUEIL (Connexion)
// ====================================================================
function initialiserPageAccueil() {
    const modal    = document.getElementById('loginModal');
    const btnOpen  = document.getElementById('btnOpenModal');
    const btnClose = document.getElementById('btnCloseModal');
    const form     = document.getElementById('loginForm');

    if (btnOpen)  btnOpen.onclick  = () => { modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); };
    if (btnClose) btnClose.onclick = () => fermerModal(modal);
    window.onclick = (e) => { if (e.target === modal) fermerModal(modal); };

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn      = document.getElementById('btnSubmitLogin');
            const email    = document.getElementById('restoEmail').value.trim().toLowerCase();
            const pwd      = document.getElementById('restoPwd').value;
            const errorMsg = document.getElementById('loginError');

            errorMsg.style.display = 'none';
            btn.innerHTML = `<span class="btn-text">Vérification…</span>`;
            btn.disabled  = true;

            if (!supabaseApp) {
                errorMsg.style.display = 'block';
                errorMsg.innerText     = "Erreur de connexion au serveur. Rechargez la page.";
                btn.innerHTML          = `<span class="btn-text">Se connecter au Dashboard</span>`;
                btn.disabled           = false;
                return;
            }

            try {
                const { error: authError } = await supabaseApp.auth.signInWithPassword({ email, password: pwd });
                if (authError) throw authError;

                const { data: proData } = await supabaseApp
                    .from('acces_pro').select('resto_id').eq('email', email).single();

                const restoID = proData?.resto_id || "villa_saint_antoine";

                btn.innerHTML = `✓ Connexion réussie`;
                btn.style.background = "#10b981";

                setTimeout(() => { window.location.href = `dashboard-pro.html?resto=${restoID}`; }, 800);

            } catch (err) {
                console.error("Erreur login:", err);
                errorMsg.style.display = 'block';
                errorMsg.innerText     = "Identifiants incorrects. Veuillez réessayer.";
                btn.innerHTML          = `<span class="btn-text">Se connecter au Dashboard</span>`;
                btn.disabled           = false;
                btn.style.background   = '';
            }
        };
    }
}

function fermerModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

// ====================================================================
// 📊 6. DASHBOARD PRO — INITIALISATION PRINCIPALE
// ====================================================================
async function initialiserDashboard() {
    const loader    = document.getElementById('loader');
    const urlParams = new URLSearchParams(window.location.search);
    const restoID   = urlParams.get('resto') || "villa_saint_antoine";
    currentRestoConfig = FYDELIO_CONFIG.restos[restoID] || FYDELIO_CONFIG.restos["villa_saint_antoine"];

    // 🔒 Timeout de secours — si le loader reste > 10s, on force la fermeture
    const loaderTimeout = setTimeout(() => {
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 300); }
        showToast("Connexion lente — certaines données peuvent manquer.", 'warning');
    }, 10000);

    // Skeleton immédiat
    afficherSkeleton();

    // Guard : Supabase non disponible
    if (!supabaseApp) {
        clearTimeout(loaderTimeout);
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 300); }
        const tbody = document.getElementById('tableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#EF4444;font-weight:700;">Erreur : Supabase non chargé. Rechargez la page.</td></tr>`;
        return;
    }

    try {
        // Vérification session
        const { data: { session } } = await supabaseApp.auth.getSession();
        if (!session) { clearTimeout(loaderTimeout); window.location.href = "index.html"; return; }

        // Affichage email
        const emailEl = document.getElementById('displayEmail');
        if (emailEl) emailEl.innerText = session.user.email;

        // Chargement données
        const { data, error } = await supabaseApp
            .from(currentRestoConfig.vueSql)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        dataClientsGlobal  = data || [];
        dataClientsFiltres = [...dataClientsGlobal];

        afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, true);
        showToast(`${dataClientsGlobal.length} clients chargés`, 'success', 2500);

    } catch (err) {
        console.error("Erreur Dashboard:", err);
        const tbody = document.getElementById('tableBody');
        if (tbody) tbody.innerHTML = `
            <tr><td colspan="5" style="text-align:center;padding:40px;color:#94A3B8;">
                <div style="font-size:24px;margin-bottom:8px;">⚠</div>
                Erreur de chargement.
                <button onclick="location.reload()" style="display:block;margin:12px auto 0;padding:8px 16px;background:#0F766E;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">
                    Réessayer
                </button>
            </td></tr>
        `;
        showToast("Erreur lors du chargement des données", 'error');
    } finally {
        clearTimeout(loaderTimeout);
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 300);
        }
    }

    // Branchement de tous les modules
    initialiserQRCode(restoID);
    initialiserNavigation();
    initialiserRecherche();
    initialiserTriColonnes();
    initialiserBurger();
    initialiserRaccourcisClavier();
    initialiserRealtime(currentRestoConfig);
    initialiserExport();
    initialiserDeconnexion();
}

// ====================================================================
// 📱 7. QR CODE
// ====================================================================
function initialiserQRCode(restoID) {
    const qrContainer  = document.getElementById('qr-code-container');
    const btnDownload  = document.getElementById('btnDownloadQR');
    const currentResto = currentRestoConfig;

    if (!qrContainer) return;

    const lienInscription = `https://app.fydelio.fr/?resto=${restoID}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lienInscription)}`;

    qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code ${currentResto.nom}" style="width:150px;height:150px;border-radius:8px;" loading="lazy">`;

    if (btnDownload) {
        btnDownload.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalHTML = btnDownload.innerHTML;
            btnDownload.innerHTML = "Téléchargement…";
            btnDownload.disabled  = true;

            try {
                const response = await fetch(qrUrl);
                const blob = await response.blob();
                const url  = window.URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `QR_Code_${currentResto.nom.replace(/\s+/g, '_')}.png`;
                a.click();
                window.URL.revokeObjectURL(url);
                showToast('QR Code téléchargé !', 'success');
            } catch (err) {
                showToast("Erreur. Clic droit > Enregistrer l'image sous.", 'error');
            } finally {
                btnDownload.innerHTML = originalHTML;
                btnDownload.disabled  = false;
            }
        });
    }
}

// ====================================================================
// 🧭 8. NAVIGATION VUES (Clients / QR Codes)
// ====================================================================
function initialiserNavigation() {
    const navClients  = document.getElementById('nav-clients');
    const navQrcodes  = document.getElementById('nav-qrcodes');
    const viewClients = document.getElementById('view-clients');
    const viewQrcodes = document.getElementById('view-qrcodes');

    if (!navClients || !navQrcodes) return;

    function activerVue(vue) {
        const isClients = vue === 'clients';
        navClients.classList.toggle('active', isClients);
        navQrcodes.classList.toggle('active', !isClients);
        viewClients.style.display = isClients ? 'block' : 'none';
        viewQrcodes.style.display = isClients ? 'none'  : 'block';
        fermerSidebarMobile();
    }

    navClients.addEventListener('click', (e) => { e.preventDefault(); activerVue('clients');  });
    navQrcodes.addEventListener('click', (e) => { e.preventDefault(); activerVue('qrcodes'); });
}

// ====================================================================
// 🔍 9. RECHERCHE DEBOUNCÉE + COMPTEUR
// ====================================================================
function initialiserRecherche() {
    const searchInput = document.getElementById('searchClient');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const terme = e.target.value.toLowerCase().trim();

            if (!terme) {
                dataClientsFiltres = [...dataClientsGlobal];
            } else {
                dataClientsFiltres = dataClientsGlobal.filter(c =>
                    (c.prenom && c.prenom.toLowerCase().includes(terme)) ||
                    (c.nom    && c.nom.toLowerCase().includes(terme))    ||
                    (c.email  && c.email.toLowerCase().includes(terme))
                );
            }

            pageActuelle = 1;
            sortConfig   = { col: null, dir: 'asc' };
            afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, false);

            // Feedback discret
            const count = dataClientsFiltres.length;
            const countEl = document.getElementById('tableCount');
            if (countEl) {
                countEl.textContent = terme
                    ? `${count} résultat${count > 1 ? 's' : ''}`
                    : `${count} client${count > 1 ? 's' : ''}`;
            }
        }, 280);
    });
}

// ====================================================================
// ↕️ 10. TRI PAR COLONNES
// ====================================================================
function initialiserTriColonnes() {
    document.querySelectorAll('.dash-table th[data-sort]').forEach(th => {
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (sortConfig.col === col) {
                sortConfig.dir = sortConfig.dir === 'asc' ? 'desc' : 'asc';
            } else {
                sortConfig.col = col;
                sortConfig.dir = 'asc';
            }

            // Indicateur visuel
            document.querySelectorAll('.dash-table th[data-sort]').forEach(t => {
                t.querySelector('.sort-indicator')?.remove();
            });
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.style.cssText = 'margin-left:6px;font-size:11px;opacity:0.7;';
            indicator.textContent = sortConfig.dir === 'asc' ? '↑' : '↓';
            th.appendChild(indicator);

            // Tri
            const sorted = [...dataClientsFiltres].sort((a, b) => {
                let va = a[col] || '';
                let vb = b[col] || '';
                if (col === 'created_at') {
                    va = new Date(va); vb = new Date(vb);
                } else if (col === 'points') {
                    va = parseInt(va) || 0; vb = parseInt(vb) || 0;
                } else {
                    va = va.toString().toLowerCase();
                    vb = vb.toString().toLowerCase();
                }
                if (va < vb) return sortConfig.dir === 'asc' ? -1 : 1;
                if (va > vb) return sortConfig.dir === 'asc' ?  1 : -1;
                return 0;
            });

            dataClientsFiltres = sorted;
            pageActuelle = 1;
            afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, false);
        });
    });
}

// ====================================================================
// 📋 11. AFFICHAGE TABLEAU — Avatars, dates relatives, copie email, pagination
// ====================================================================
function afficherTableau(data, colPoints, updateStats = true) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    // Mise à jour stats avec animation
    if (updateStats) {
        animerCompteur('statTotalClients', data.length);
        const total = data.reduce((acc, c) => acc + (parseInt(c[colPoints]) || 0), 0);
        animerCompteur('statTotalPoints', total);
    }

    // Mise à jour compteur tableau
    const countEl = document.getElementById('tableCount');
    if (countEl) {
        countEl.textContent = `${data.length} client${data.length > 1 ? 's' : ''}`;
    }

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div style="text-align:center;padding:40px 24px;">
                        <div style="font-size:32px;margin-bottom:12px;opacity:0.3;">🔍</div>
                        <div style="font-size:15px;font-weight:700;color:#334155;margin-bottom:6px;">Aucun client trouvé</div>
                        <div style="font-size:13px;color:#94A3B8;">Essayez un autre terme de recherche.</div>
                    </div>
                </td>
            </tr>`;
        afficherPagination(0);
        return;
    }

    // Pagination
    const total     = data.length;
    const parPage   = FYDELIO_CONFIG.pagination.parPage;
    const debut     = (pageActuelle - 1) * parPage;
    const fin       = debut + parPage;
    const paginated = data.slice(debut, fin);

    tbody.innerHTML = paginated.map(c => {
        const nom    = `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Client';
        const email  = c.email  || 'N/A';
        const anniv  = c.date_anniversaire || '—';
        const pts    = c[colPoints] || 0;
        const date   = c.created_at ? dateRelative(c.created_at) : '—';
        const avatar = genererAvatar(nom);

        return `
        <tr style="transition:background 0.15s ease;">
            <td>
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="${avatar.style}">${avatar.initiales}</div>
                    <span style="font-weight:700;color:#0F172A;">${nom}</span>
                </div>
            </td>
            <td>
                <span 
                    class="email-copiable" 
                    title="Cliquer pour copier"
                    style="color:#475569;cursor:pointer;transition:color 0.2s;display:inline-flex;align-items:center;gap:6px;"
                    onclick="copierEmail('${email}', this)"
                >${email}
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4;flex-shrink:0;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </span>
            </td>
            <td style="color:#64748B;">${anniv}</td>
            <td><span class="badge-points">${pts} pts</span></td>
            <td>
                <span title="${new Date(c.created_at).toLocaleDateString('fr-FR')}" style="color:#94A3B8;font-size:13px;">${date}</span>
            </td>
        </tr>`;
    }).join('');

    afficherPagination(total);
}

// ====================================================================
// 📄 12. PAGINATION
// ====================================================================
function afficherPagination(total) {
    const parPage    = FYDELIO_CONFIG.pagination.parPage;
    const totalPages = Math.ceil(total / parPage);

    // Cherche ou crée le container pagination
    let paginationEl = document.getElementById('dash-pagination');
    if (!paginationEl) {
        const tableCard = document.querySelector('.dash-table-card') || document.querySelector('.table-container');
        if (!tableCard) return;
        paginationEl = document.createElement('div');
        paginationEl.id = 'dash-pagination';
        paginationEl.style.cssText = `
            display:flex; align-items:center; justify-content:space-between;
            padding:16px 24px; border-top:1px solid #F1F5F9;
            font-size:13px; color:#64748B; font-weight:600;
        `;
        tableCard.appendChild(paginationEl);
    }

    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    const debut = (pageActuelle - 1) * parPage + 1;
    const fin   = Math.min(pageActuelle * parPage, total);

    paginationEl.innerHTML = `
        <span>${debut}–${fin} sur ${total}</span>
        <div style="display:flex;gap:8px;">
            <button 
                onclick="changerPage(-1)" 
                ${pageActuelle <= 1 ? 'disabled' : ''}
                style="padding:7px 14px;border:1px solid #E2E8F0;border-radius:8px;background:white;cursor:pointer;font-size:13px;font-weight:700;color:#334155;transition:all 0.2s;${pageActuelle <= 1 ? 'opacity:0.4;cursor:not-allowed;' : ''}"
            >← Précédent</button>
            <span style="padding:7px 14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;color:#0F172A;font-weight:800;">
                ${pageActuelle} / ${totalPages}
            </span>
            <button 
                onclick="changerPage(1)" 
                ${pageActuelle >= totalPages ? 'disabled' : ''}
                style="padding:7px 14px;border:1px solid #E2E8F0;border-radius:8px;background:white;cursor:pointer;font-size:13px;font-weight:700;color:#334155;transition:all 0.2s;${pageActuelle >= totalPages ? 'opacity:0.4;cursor:not-allowed;' : ''}"
            >Suivant →</button>
        </div>
    `;
}

function changerPage(delta) {
    const total      = dataClientsFiltres.length;
    const totalPages = Math.ceil(total / FYDELIO_CONFIG.pagination.parPage);
    pageActuelle     = Math.max(1, Math.min(pageActuelle + delta, totalPages));
    afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, false);
    // Scroll vers le haut du tableau
    document.querySelector('.dash-table-card, .table-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ====================================================================
// 🎨 13. UTILITAIRES VISUELS
// ====================================================================

/** Génère un avatar avec initiales et couleur dérivée du nom */
function genererAvatar(nom) {
    const mots     = nom.trim().split(' ').filter(Boolean);
    const initiales = mots.length >= 2
        ? (mots[0][0] + mots[1][0]).toUpperCase()
        : (mots[0] || '?')[0].toUpperCase();

    const palettes = [
        { bg: 'rgba(15,118,110,0.12)',  color: '#0F766E' },
        { bg: 'rgba(59,130,246,0.12)',  color: '#1D4ED8' },
        { bg: 'rgba(124,58,237,0.12)', color: '#6D28D9' },
        { bg: 'rgba(217,119,6,0.12)',  color: '#B45309' },
        { bg: 'rgba(236,72,153,0.12)', color: '#BE185D' },
        { bg: 'rgba(239,68,68,0.12)',  color: '#B91C1C' },
        { bg: 'rgba(20,184,166,0.12)', color: '#0F766E' },
    ];

    // Hash simple du nom pour choisir la palette
    const hash    = [...nom].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const palette = palettes[hash % palettes.length];

    return {
        initiales,
        style: `
            width:34px; height:34px; border-radius:10px; flex-shrink:0;
            background:${palette.bg}; color:${palette.color};
            display:flex; align-items:center; justify-content:center;
            font-size:12px; font-weight:800; letter-spacing:0.02em;
        `
    };
}

/** Date relative : "aujourd'hui", "hier", "il y a 3 jours", etc. */
function dateRelative(dateStr) {
    const now  = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Hier";
    if (diff  <  7) return `Il y a ${diff} jours`;
    if (diff  < 30) return `Il y a ${Math.floor(diff / 7)} sem.`;
    if (diff  < 365) return `Il y a ${Math.floor(diff / 30)} mois`;
    return `Il y a ${Math.floor(diff / 365)} an${Math.floor(diff / 365) > 1 ? 's' : ''}`;
}

/** Copier email dans le presse-papier */
function copierEmail(email, el) {
    if (email === 'N/A') return;
    navigator.clipboard.writeText(email).then(() => {
        showToast(`${email} copié !`, 'info', 2000);
        if (el) {
            const orig = el.style.color;
            el.style.color = '#0F766E';
            setTimeout(() => { el.style.color = orig; }, 1200);
        }
    }).catch(() => {
        showToast("Impossible de copier", 'error');
    });
}

/** Animateur de compteur KPI */
function animerCompteur(id, valeurFinale) {
    const el = document.getElementById(id);
    if (!el) return;

    const debut    = parseInt(el.innerText.replace(/\D/g, '')) || 0;
    const duree    = 900;
    const debut_t  = performance.now();

    function step(t) {
        const progress = Math.min((t - debut_t) / duree, 1);
        const ease     = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.innerText   = Math.round(debut + (valeurFinale - debut) * ease);
        if (progress < 1) requestAnimationFrame(step);
        else el.innerText = valeurFinale;
    }
    requestAnimationFrame(step);
}

// ====================================================================
// ⚡ 14. REALTIME SUPABASE — Mise à jour auto
// ====================================================================
function initialiserRealtime(restoConfig) {
    // Écoute les INSERT sur la table via le channel Supabase
    supabaseApp
        .channel('fydelio-realtime')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public' },
            async (payload) => {
                // Rechargement complet pour avoir les données de la vue SQL
                const { data } = await supabaseApp
                    .from(restoConfig.vueSql)
                    .select('*')
                    .order('created_at', { ascending: false });

                if (data) {
                    dataClientsGlobal  = data;
                    dataClientsFiltres = [...data];
                    pageActuelle       = 1;
                    afficherTableau(dataClientsFiltres, restoConfig.colPoints, true);

                    const nom = payload.new?.prenom || 'Un nouveau client';
                    showToast(`${nom} vient de s'inscrire !`, 'success');
                }
            }
        )
        .subscribe();
}

// ====================================================================
// ⌨️ 15. RACCOURCIS CLAVIER
// ====================================================================
function initialiserRaccourcisClavier() {
    document.addEventListener('keydown', (e) => {
        // ⌘K ou Ctrl+K → focus search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const search = document.getElementById('searchClient') || document.getElementById('dash-search-input');
            if (search) { search.focus(); search.select(); }
        }
        // Escape → fermer sidebar mobile
        if (e.key === 'Escape') {
            fermerSidebarMobile();
        }
    });
}

// ====================================================================
// 🍔 16. BURGER MOBILE (sync backdrop)
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

    // Fermer en cliquant sur le backdrop
    if (backdrop) {
        backdrop.addEventListener('click', () => fermerSidebarMobile());
    }
}

function fermerSidebarMobile() {
    if (window.innerWidth > 768) return;
    const sidebar  = document.querySelector('.sidebar');
    const backdrop = document.getElementById('dashBackdrop');
    if (sidebar)  sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
}

// ====================================================================
// 📥 17. EXPORT CSV AMÉLIORÉ
// ====================================================================
function initialiserExport() {
    const btnExport = document.getElementById('btnExport');
    if (!btnExport) return;
    btnExport.addEventListener('click', () => exporterCSV(currentRestoConfig));
}

function exporterCSV(restoConfig) {
    if (dataClientsGlobal.length === 0) {
        showToast("Aucune donnée à exporter", 'warning');
        return;
    }

    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Anniversaire", "Points", "Date Inscription"];
    const rows    = dataClientsGlobal.map(c => [
        `"${c.prenom || ''}"`,
        `"${c.nom    || ''}"`,
        `"${c.email  || ''}"`,
        `"${c.telephone || ''}"`,
        `"${c.date_anniversaire || ''}"`,
        c[restoConfig.colPoints] || 0,
        `"${c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : ''}"`
    ]);

    const csv  = "\ufeff" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `Export_FYDELIO_${restoConfig.nom.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);/**
 * ====================================================================
 * 🚀 FYDELIO ENGINE v6.0
 * Base clients · Analytiques · Récompenses · Email · Fiche client
 * ====================================================================
 */

// ====================================================================
// ⚙️ CONFIGURATION
// ====================================================================
const FYDELIO_CONFIG = {
    supabase: {
        url: "https://qawfwbppnbnskxlkwstu.supabase.co",
        key: "sb_publishable_EbKZkPjtT8rwkEdw3oVRCg_mBJJ_gNJ"
    },
    brevo: {
        // Clé API Brevo pour l'envoi d'emails depuis le dashboard
        // Remplace par ta vraie clé API Brevo (Settings → API Keys)
        apiKey: "TON_API_KEY_BREVO"
    },
    restos: {
        "villa_saint_antoine": { nom: "Villa Saint Antoine", colPoints: "points", vueSql: "vue_clients_villa" },
        "bistrot":             { nom: "Le Bistrot Paris",    colPoints: "points", vueSql: "vue_clients_bistrot" }
    },
    pagination: { parPage: 20 }
};

const supabaseApp = (typeof window.supabase !== 'undefined')
    ? window.supabase.createClient(FYDELIO_CONFIG.supabase.url, FYDELIO_CONFIG.supabase.key)
    : null;

// Exposition globale pour le dashboard HTML
window._supabaseClient = supabaseApp;

let dataClientsGlobal  = [];
let dataClientsFiltres = [];
let sortConfig         = { col: null, dir: 'asc' };
let pageActuelle       = 1;
let searchTimer        = null;
let currentRestoConfig = null;
let chartInscrits      = null;
let chartOptin         = null;

// ====================================================================
// 🧭 ROUTEUR
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm'))  initialiserPageAccueil();
    if (document.getElementById('tableBody')) initialiserDashboard();
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
    setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateX(40px)'; setTimeout(() => toast.remove(), 350); }, duree);
}

// ====================================================================
// 💀 SKELETON
// ====================================================================
function afficherSkeleton() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = Array.from({length:5}, () => `
        <tr>
            <td><div style="height:12px;width:120px;background:linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9);border-radius:100px;animation:shimmer 1.5s infinite;"></div></td>
            <td><div style="height:12px;width:180px;background:linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9);border-radius:100px;animation:shimmer 1.5s infinite;"></div></td>
            <td><div style="height:12px;width:60px;background:linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9);border-radius:100px;animation:shimmer 1.5s infinite;"></div></td>
            <td><div style="height:12px;width:70px;background:linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9);border-radius:100px;animation:shimmer 1.5s infinite;"></div></td>
            <td><div style="height:12px;width:90px;background:linear-gradient(90deg,#F1F5F9,#E2E8F0,#F1F5F9);border-radius:100px;animation:shimmer 1.5s infinite;"></div></td>
        </tr>`).join('');
    if (!document.getElementById('shimmer-style')) {
        const s = document.createElement('style');
        s.id = 'shimmer-style';
        s.textContent = '@keyframes shimmer{0%{opacity:1}50%{opacity:0.4}100%{opacity:1}}';
        document.head.appendChild(s);
    }
}

// ====================================================================
// 🔐 PAGE ACCUEIL
// ====================================================================
function initialiserPageAccueil() {
    const modal   = document.getElementById('loginModal');
    const btnOpen = document.getElementById('btnOpenModal');
    const btnClose= document.getElementById('btnCloseModal');
    const form    = document.getElementById('loginForm');

    if (btnOpen)  btnOpen.onclick  = () => { modal.style.display='flex'; setTimeout(()=>modal.classList.add('active'),10); };
    if (btnClose) btnClose.onclick = () => fermerModalLogin(modal);
    window.onclick = (e) => { if (e.target===modal) fermerModalLogin(modal); };

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn   = document.getElementById('btnSubmitLogin');
            const email = document.getElementById('restoEmail').value.trim().toLowerCase();
            const pwd   = document.getElementById('restoPwd').value;
            const err   = document.getElementById('loginError');

            err.style.display='none';
            btn.innerHTML='<span class="btn-text">Vérification…</span>';
            btn.disabled=true;

            if (!supabaseApp) {
                err.style.display='block';
                err.innerText='Erreur de connexion. Rechargez la page.';
                btn.innerHTML='<span class="btn-text">Se connecter</span>';
                btn.disabled=false;
                return;
            }

            try {
                const { error: authError } = await supabaseApp.auth.signInWithPassword({ email, password: pwd });
                if (authError) throw authError;
                const { data: proData } = await supabaseApp.from('acces_pro').select('resto_id').eq('email', email).single();
                const restoID = proData?.resto_id || "villa_saint_antoine";
                btn.innerHTML='✓ Connexion réussie';
                btn.style.background='#10b981';
                setTimeout(() => window.location.href=`dashboard-pro.html?resto=${restoID}`, 800);
            } catch (err2) {
                err.style.display='block';
                err.innerText='Identifiants incorrects.';
                btn.innerHTML='<span class="btn-text">Se connecter au Dashboard</span>';
                btn.disabled=false;
                btn.style.background='';
            }
        };
    }
}

function fermerModalLogin(modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display='none', 300);
}

// ====================================================================
// 📊 DASHBOARD — INITIALISATION
// ====================================================================
async function initialiserDashboard() {
    const loader = document.getElementById('loader');
    const urlParams = new URLSearchParams(window.location.search);
    const restoID   = urlParams.get('resto') || "villa_saint_antoine";
    currentRestoConfig = FYDELIO_CONFIG.restos[restoID] || FYDELIO_CONFIG.restos["villa_saint_antoine"];
    // Exposition globale pour le dashboard HTML
    window.currentRestoConfig = currentRestoConfig;

    // Timeout secours
    const loaderTimeout = setTimeout(() => {
        if (loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none', 300); }
        showToast("Connexion lente", 'warning');
    }, 10000);

    afficherSkeleton();

    if (!supabaseApp) {
        clearTimeout(loaderTimeout);
        if (loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none',300); }
        return;
    }

    try {
        const { data:{session} } = await supabaseApp.auth.getSession();
        if (!session) { clearTimeout(loaderTimeout); window.location.href="index.html"; return; }

        const emailEl = document.getElementById('displayEmail');
        if (emailEl) emailEl.innerText = session.user.email;

        const { data, error } = await supabaseApp
            .from(currentRestoConfig.vueSql)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        dataClientsGlobal  = data || [];
        dataClientsFiltres = [...dataClientsGlobal];

        afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, true);
        showToast(`${dataClientsGlobal.length} clients chargés`, 'success', 2500);

    } catch(err) {
        console.error("Erreur Dashboard:", err);
        showToast("Erreur de chargement", 'error');
    } finally {
        clearTimeout(loaderTimeout);
        if (loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none',300); }
    }

    initialiserNavigation();
    initialiserRecherche();
    initialiserTriColonnes();
    initialiserBurger();
    initialiserRaccourcisClavier();
    initialiserQRCode(restoID);
    initialiserExport();
    initialiserDeconnexion();
    initialiserRealtime(currentRestoConfig);
}

// ====================================================================
// 🧭 NAVIGATION — 5 vues
// ====================================================================
function initialiserNavigation() {
    const vues = {
        'nav-clients':     'view-clients',
        'nav-analytics':   'view-analytics',
        'nav-recompenses': 'view-recompenses',
        'nav-email':       'view-email',
        'nav-qrcodes':     'view-qrcodes',
    };

    Object.keys(vues).forEach(navId => {
        const navEl = document.getElementById(navId);
        if (!navEl) return;

        navEl.addEventListener('click', (e) => {
            e.preventDefault();

            // Nav active
            document.querySelectorAll('.sidebar-nav-item').forEach(n => n.classList.remove('active'));
            navEl.classList.add('active');

            // Afficher la bonne vue
            Object.values(vues).forEach(viewId => {
                const el = document.getElementById(viewId);
                if (el) el.style.display = 'none';
            });
            const targetView = document.getElementById(vues[navId]);
            if (targetView) targetView.style.display = 'block';

            // Charger les données de la vue
            if (navId === 'nav-analytics')   chargerAnalytiques();
            if (navId === 'nav-recompenses') chargerRecompenses();
            if (navId === 'nav-email')       chargerStatsEmail();

            fermerSidebarMobile();
        });
    });
}

// ====================================================================
// 📋 AFFICHAGE TABLEAU — avec statut optin + clic fiche client
// ====================================================================
function afficherTableau(data, colPoints, updateStats = true) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    if (updateStats) {
        animerCompteur('statTotalClients', data.length);
        const total = data.reduce((acc,c) => acc + (parseInt(c[colPoints])||0), 0);
        animerCompteur('statTotalPoints', total);
        // KPI récompenses
        const totalRecompenses = data.reduce((acc,c) => acc + (parseInt(c.recompenses_obtenues)||0), 0);
        animerCompteur('statRecompenses', totalRecompenses);
        const desabonnes = data.filter(c => c.optin_email === false).length;
        animerCompteur('statDesabonnes', desabonnes);
        const pct = data.length > 0 ? Math.round((desabonnes/data.length)*100) : 0;
        const bar = document.getElementById('barDesabonnes');
        if (bar) setTimeout(() => bar.style.width = pct+'%', 300);
    }

    const countEl = document.getElementById('tableCount');
    if (countEl) countEl.textContent = `${data.length} client${data.length>1?'s':''}`;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#94A3B8;">
            <div style="font-size:28px;margin-bottom:8px;">🔍</div>
            <div style="font-weight:700;">Aucun client trouvé</div>
        </td></tr>`;
        afficherPagination(0);
        return;
    }

    const parPage   = FYDELIO_CONFIG.pagination.parPage;
    const debut     = (pageActuelle - 1) * parPage;
    const paginated = data.slice(debut, debut + parPage);

    // Stocker les clients paginés pour le clic fiche
    window._clientsPage = paginated;

    tbody.innerHTML = paginated.map((c, idx) => {
        const nom    = `${c.prenom||''} ${c.nom||''}`.trim() || 'Client';
        const pts    = c[colPoints] || 0;
        const date   = c.created_at ? dateRelative(c.created_at) : '—';
        const avatar = genererAvatar(nom);
        const optin  = c.optin_email !== false;
        const statutBadge = optin
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
            <td>${statutBadge}</td>
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

    if (totalPages <= 1) { paginationEl.innerHTML=''; return; }

    const debut = (pageActuelle-1)*parPage+1;
    const fin   = Math.min(pageActuelle*parPage, total);
    const btnStyle = 'padding:7px 14px;border:1px solid #E2E8F0;border-radius:8px;background:white;cursor:pointer;font-size:13px;font-weight:700;color:#334155;';

    paginationEl.innerHTML = `
        <span>${debut}–${fin} sur ${total}</span>
        <div style="display:flex;gap:8px;">
            <button onclick="changerPage(-1)" ${pageActuelle<=1?'disabled':''} style="${btnStyle}${pageActuelle<=1?'opacity:0.4;cursor:not-allowed;':''}">← Préc.</button>
            <span style="padding:7px 14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;font-weight:800;">${pageActuelle}/${totalPages}</span>
            <button onclick="changerPage(1)" ${pageActuelle>=totalPages?'disabled':''} style="${btnStyle}${pageActuelle>=totalPages?'opacity:0.4;cursor:not-allowed;':''}">Suiv. →</button>
        </div>`;
}

function changerPage(delta) {
    const totalPages = Math.ceil(dataClientsFiltres.length / FYDELIO_CONFIG.pagination.parPage);
    pageActuelle = Math.max(1, Math.min(pageActuelle+delta, totalPages));
    afficherTableau(dataClientsFiltres, currentRestoConfig.colPoints, false);
    document.querySelector('.dash-table-card')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ====================================================================
// 📈 ANALYTIQUES — graphique Chart.js
// ====================================================================
async function chargerAnalytiques() {
    if (!supabaseApp) return;

    // Période par défaut : 7 jours
    const periode = parseInt(document.querySelector('.chart-btn.active')?.dataset?.period || '7');
    await mettreAJourGraphique(periode);

    // Graphique optin donut
    const abonnes   = dataClientsGlobal.filter(c => c.optin_email !== false).length;
    const desabonnes = dataClientsGlobal.length - abonnes;

    const ctxOptin = document.getElementById('chartOptin');
    if (ctxOptin) {
        if (chartOptin) chartOptin.destroy();
        chartOptin = new Chart(ctxOptin, {
            type: 'doughnut',
            data: {
                labels: ['Abonnés', 'Désabonnés'],
                datasets: [{
                    data: [abonnes, desabonnes],
                    backgroundColor: ['#0F766E', '#EF4444'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { font: { family:'Plus Jakarta Sans', weight:'700' }, padding: 20 } }
                },
                cutout: '65%'
            }
        });
    }

    // Boutons période
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await mettreAJourGraphique(parseInt(btn.dataset.period));
        });
    });
}

async function mettreAJourGraphique(jours) {
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - jours);

    const { data } = await supabaseApp
        .from('clients')
        .select('created_at')
        .gte('created_at', dateDebut.toISOString())
        .order('created_at', { ascending: true });

    if (!data) return;

    // Grouper par jour
    const parJour = {};
    for (let i = 0; i < jours; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (jours - 1 - i));
        parJour[d.toISOString().split('T')[0]] = 0;
    }
    data.forEach(c => {
        const jour = c.created_at.split('T')[0];
        if (parJour[jour] !== undefined) parJour[jour]++;
    });

    const labels = Object.keys(parJour).map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
    });
    const values = Object.values(parJour);

    const ctxInscrits = document.getElementById('chartInscrits');
    if (!ctxInscrits) return;

    if (chartInscrits) chartInscrits.destroy();
    chartInscrits = new Chart(ctxInscrits, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Nouveaux inscrits',
                data: values,
                backgroundColor: 'rgba(15,118,110,0.15)',
                borderColor: '#0F766E',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(15,118,110,0.3)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero:true, ticks:{ stepSize:1, font:{family:'Plus Jakarta Sans'} }, grid:{ color:'rgba(0,0,0,0.04)' } },
                x: { ticks:{ font:{family:'Plus Jakarta Sans', size:11} }, grid:{ display:false } }
            }
        }
    });
}

// ====================================================================
// 🎁 RÉCOMPENSES
// ====================================================================
async function chargerRecompenses() {
    if (!supabaseApp) return;
    const grid = document.getElementById('rewardGrid');
    const countEl = document.getElementById('recompenseCount');
    if (!grid) return;

    const { data } = await supabaseApp
        .from('clients')
        .select('prenom, nom, email, recompenses_obtenues, restaurant_origine')
        .gt('recompenses_obtenues', 0)
        .order('recompenses_obtenues', { ascending: false });

    if (!data || data.length === 0) {
        grid.innerHTML = `<div style="text-align:center;padding:40px;color:#94A3B8;grid-column:1/-1;">
            <div style="font-size:32px;margin-bottom:8px;">🎁</div>
            <div style="font-weight:700;">Aucun cadeau distribué encore</div>
        </div>`;
        if (countEl) countEl.textContent = '0';
        return;
    }

    const total = data.reduce((acc,c) => acc + (c.recompenses_obtenues||0), 0);
    if (countEl) countEl.textContent = total;

    grid.innerHTML = data.map(c => {
        const nom    = `${c.prenom||''} ${c.nom||''}`.trim() || 'Client';
        const avatar = genererAvatar(nom);
        return `<div class="reward-card">
            <div class="reward-avatar" style="${avatar.style}">${avatar.initiales}</div>
            <div class="reward-info">
                <div class="reward-name">${nom}</div>
                <div class="reward-email">${c.email}</div>
            </div>
            <div class="reward-count">${c.recompenses_obtenues}×</div>
        </div>`;
    }).join('');
}

// ====================================================================
// 📧 EMAIL DEPUIS LE DASHBOARD
// ====================================================================
function chargerStatsEmail() {
    const total     = dataClientsGlobal.length;
    const abonnes   = dataClientsGlobal.filter(c => c.optin_email !== false).length;
    const desabonnes = total - abonnes;

    const elTotal = document.getElementById('emailStatTotal');
    const elAbo   = document.getElementById('emailStatAbonnes');
    const elDesabo= document.getElementById('emailStatDesabonnes');

    if (elTotal)  elTotal.textContent  = abonnes;
    if (elAbo)    elAbo.textContent    = abonnes;
    if (elDesabo) elDesabo.textContent = desabonnes;

    const btnSend = document.getElementById('btnSendEmail');
    if (!btnSend) return;

    btnSend.addEventListener('click', async () => {
        const objet   = document.getElementById('emailObjet')?.value.trim();
        const message = document.getElementById('emailMessage')?.value.trim();
        const segment = document.getElementById('emailDestinataires')?.value;

        if (!objet || !message) {
            showToast('Remplis l\'objet et le message', 'warning');
            return;
        }

        // Filtrer les destinataires selon le segment
        let destinataires = dataClientsGlobal.filter(c => c.optin_email !== false);
        if (segment === 'active') destinataires = destinataires.filter(c => (c[currentRestoConfig.colPoints]||0) >= 1);

        if (destinataires.length === 0) {
            showToast('Aucun destinataire', 'warning');
            return;
        }

        btnSend.disabled = true;
        btnSend.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;"></span> Envoi…';

        try {
            // Appel API Brevo — envoi d'un email à chaque destinataire
            const emailsEnvoyes = await Promise.allSettled(
                destinataires.slice(0, 50).map(c => // Limite à 50 pour sécurité
                    fetch('https://api.brevo.com/v3/smtp/email', {
                        method: 'POST',
                        headers: {
                            'api-key': FYDELIO_CONFIG.brevo.apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            sender:  { name: currentRestoConfig.nom, email: 'contact@fydelio.fr' },
                            to:      [{ email: c.email, name: `${c.prenom||''} ${c.nom||''}`.trim() }],
                            subject: objet,
                            htmlContent: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                                <h2 style="color:#0F766E;">${currentRestoConfig.nom}</h2>
                                <p>${message.replace(/\n/g,'<br>')}</p>
                                <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                                <p style="font-size:12px;color:#94a3b8;">Vous recevez cet email car vous êtes inscrit au programme de fidélité ${currentRestoConfig.nom}. <a href="${window.location.origin}/desabonnement.html?email=${c.email}">Se désabonner</a></p>
                            </div>`
                        })
                    })
                )
            );

            const reussis = emailsEnvoyes.filter(r => r.status === 'fulfilled').length;
            showToast(`${reussis} email${reussis>1?'s':''} envoyé${reussis>1?'s':''}`, 'success');

        } catch(err) {
            console.error('Erreur envoi email:', err);
            showToast("Erreur d'envoi — vérifie ta clé API Brevo", 'error');
        } finally {
            btnSend.disabled = false;
            btnSend.innerHTML = '<i data-lucide="send" style="width:16px;height:16px;"></i> Envoyer via Brevo';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });
}

// ====================================================================
// 👤 FICHE CLIENT — modal au clic
// ====================================================================
async function ouvrirFicheClient(email) {
    if (!email || !supabaseApp) return;

    const modal = document.getElementById('clientModal');
    if (!modal) return;
    modal.classList.add('open');

    // Trouver le client dans les données locales
    const client = dataClientsGlobal.find(c => c.email === email);
    if (!client) return;

    const nom    = `${client.prenom||''} ${client.nom||''}`.trim() || 'Client';
    const avatar = genererAvatar(nom);
    const pts    = client[currentRestoConfig.colPoints] || 0;
    const optin  = client.optin_email !== false;

    // Remplir le header
    const avatarEl = document.getElementById('modalAvatar');
    if (avatarEl) { avatarEl.style.cssText = avatar.style; avatarEl.textContent = avatar.initiales; }
    const nameEl = document.getElementById('modalName');
    if (nameEl) nameEl.textContent = nom;
    const emailEl = document.getElementById('modalEmail');
    if (emailEl) emailEl.textContent = email;

    // Remplir les infos
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val||'—'; };
    set('modalPoints', `${pts} points`);
    set('modalTel', client.telephone || '—');
    set('modalAnniv', client.date_anniversaire || '—');
    set('modalRecompenses', client.recompenses_obtenues ? `${client.recompenses_obtenues} cadeau${client.recompenses_obtenues>1?'x':''}` : 'Aucun');
    set('modalDate', client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR') : '—');

    const statutEl = document.getElementById('modalStatut');
    if (statutEl) statutEl.innerHTML = optin
        ? `<span style="color:#10B981;font-weight:700;">✓ Abonné</span>`
        : `<span style="color:#EF4444;font-weight:700;">✕ Désabonné</span>`;

    // Charger l'historique des scans
    const historEl = document.getElementById('modalHistorique');
    if (historEl) historEl.innerHTML = '<div class="empty-history">Chargement…</div>';

    try {
        const { data: scans } = await supabaseApp
            .from('historique_scans')
            .select('*')
            .eq('client_email', email)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!scans || scans.length === 0) {
            if (historEl) historEl.innerHTML = '<div class="empty-history">Aucune visite enregistrée</div>';
            return;
        }

        if (historEl) {
            historEl.innerHTML = scans.map(scan => `
                <div class="scan-history-item">
                    <div class="scan-icon ${scan.est_recompense ? 'reward' : 'normal'}">
                        ${scan.est_recompense ? '🎁' : '⭐'}
                    </div>
                    <div class="scan-detail">
                        <div class="scan-label">${scan.est_recompense ? 'Cadeau débloqué !' : 'Visite validée'}</div>
                        <div class="scan-date">${dateRelative(scan.created_at)}</div>
                    </div>
                    <div class="scan-pts">${scan.points_avant} → ${scan.points_apres} pts</div>
                </div>`).join('');
        }
    } catch(err) {
        if (historEl) historEl.innerHTML = '<div class="empty-history">Erreur de chargement</div>';
    }
}

// ====================================================================
// 🔍 RECHERCHE
// ====================================================================
function initialiserRecherche() {
    const searchInput = document.getElementById('searchClient');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const terme = e.target.value.toLowerCase().trim();
            dataClientsFiltres = !terme ? [...dataClientsGlobal] : dataClientsGlobal.filter(c =>
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
// ↕️ TRI
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

            dataClientsFiltres = [...dataClientsFiltres].sort((a,b) => {
                let va = a[col]||'', vb = b[col]||'';
                if (col==='created_at') { va=new Date(va); vb=new Date(vb); }
                else if (col==='points') { va=parseInt(va)||0; vb=parseInt(vb)||0; }
                else { va=va.toString().toLowerCase(); vb=vb.toString().toLowerCase(); }
                if (va<vb) return sortConfig.dir==='asc'?-1:1;
                if (va>vb) return sortConfig.dir==='asc'?1:-1;
                return 0;
            });
            pageActuelle=1;
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

    const lienInscription = `https://app.fydelio.fr/?resto=${restoID}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lienInscription)}`;
    qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="width:150px;height:150px;border-radius:8px;">`;

    if (btnDownload) {
        btnDownload.addEventListener('click', async () => {
            const orig = btnDownload.innerHTML;
            btnDownload.innerHTML = 'Téléchargement…';
            btnDownload.disabled = true;
            try {
                const response = await fetch(qrUrl);
                const blob = await response.blob();
                const url  = window.URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href = url; a.download = `QR_FYDELIO_${restoID}.png`; a.click();
                window.URL.revokeObjectURL(url);
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
            const { data } = await supabaseApp.from(restoConfig.vueSql).select('*').order('created_at',{ascending:false});
            if (data) {
                dataClientsGlobal  = data;
                dataClientsFiltres = [...data];
                pageActuelle=1;
                afficherTableau(dataClientsFiltres, restoConfig.colPoints, true);
                showToast('Nouveau client inscrit !', 'success');
            }
        })
        .subscribe();
}

// ====================================================================
// 🍔 BURGER
// ====================================================================
function initialiserBurger() {
    const burger   = document.getElementById('mobileMenuBtn');
    const sidebar  = document.querySelector('.sidebar');
    const backdrop = document.getElementById('dashBackdrop');
    if (!burger||!sidebar) return;

    burger.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('mobile-open');
        if (backdrop) backdrop.classList.toggle('active', isOpen);
    });
    if (backdrop) backdrop.addEventListener('click', () => fermerSidebarMobile());
}

function fermerSidebarMobile() {
    if (window.innerWidth>768) return;
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
    document.getElementById('dashBackdrop')?.classList.remove('active');
}

// ====================================================================
// 📥 EXPORT CSV
// ====================================================================
function initialiserExport() {
    const btn = document.getElementById('btnExport');
    if (!btn) return;
    btn.addEventListener('click', () => exporterCSV(currentRestoConfig));
}

function exporterCSV(restoConfig) {
    if (!dataClientsGlobal.length) { showToast("Aucune donnée à exporter", 'warning'); return; }
    const headers = ["Prénom","Nom","Email","Téléphone","Anniversaire","Points","Abonné","Date Inscription"];
    const rows = dataClientsGlobal.map(c => [
        `"${c.prenom||''}"`,`"${c.nom||''}"`,`"${c.email||''}"`,
        `"${c.telephone||''}"`,`"${c.date_anniversaire||''}"`,
        c[restoConfig.colPoints]||0,
        c.optin_email!==false?'Oui':'Non',
        `"${c.created_at?new Date(c.created_at).toLocaleDateString('fr-FR'):''}"`
    ]);
    const csv  = "\ufeff" + headers.join(",") + "\n" + rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href=url; link.download=`Export_FYDELIO_${restoConfig.nom.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${dataClientsGlobal.length} clients exportés`, 'success');
}

// ====================================================================
// 🚪 DÉCONNEXION
// ====================================================================
function initialiserDeconnexion() {
    const btn = document.getElementById('btnLogout');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        btn.disabled=true;
        await supabaseApp?.auth.signOut();
        window.location.href="index.html";
    });
}

// ====================================================================
// 🎨 UTILITAIRES VISUELS
// ====================================================================
function genererAvatar(nom) {
    const mots = nom.trim().split(' ').filter(Boolean);
    const initiales = mots.length>=2 ? (mots[0][0]+mots[1][0]).toUpperCase() : (mots[0]||'?')[0].toUpperCase();
    const palettes = [
        {bg:'rgba(15,118,110,0.12)',color:'#0F766E'},{bg:'rgba(59,130,246,0.12)',color:'#1D4ED8'},
        {bg:'rgba(124,58,237,0.12)',color:'#6D28D9'},{bg:'rgba(217,119,6,0.12)',color:'#B45309'},
        {bg:'rgba(236,72,153,0.12)',color:'#BE185D'},{bg:'rgba(239,68,68,0.12)',color:'#B91C1C'},
    ];
    const palette = palettes[[...nom].reduce((acc,c)=>acc+c.charCodeAt(0),0) % palettes.length];
    return {
        initiales,
        style: `width:34px;height:34px;border-radius:10px;flex-shrink:0;background:${palette.bg};color:${palette.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;`
    };
}

function dateRelative(dateStr) {
    const diff = Math.floor((Date.now()-new Date(dateStr)) / (1000*60*60*24));
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
        const e = 1-Math.pow(1-p,3);
        el.innerText = Math.round(debut+(valeurFinale-debut)*e);
        if (p<1) requestAnimationFrame(step);
        else el.innerText = valeurFinale;
    }
    requestAnimationFrame(step);
}

    showToast(`${dataClientsGlobal.length} clients exportés`, 'success');
}

// ====================================================================
// 🚪 18. DÉCONNEXION
// ====================================================================
function initialiserDeconnexion() {
    const btnLogout = document.getElementById('btnLogout');
    if (!btnLogout) return;
    btnLogout.addEventListener('click', async () => {
        btnLogout.disabled = true;
        await supabaseApp.auth.signOut();
        window.location.href = "index.html";
    });
}
