/* ==========================================================================
   🚀 FYDELIO ENGINE v5.0 — APPLE-STYLE SCROLL + STICKY SCROLL AGENCE
   Gère :
     - Apparitions classiques (fade in up)
     - Hero "plonge" à l'écran
     - Sticky Phone (index.html — .method-step / .phone-img)
     - Sticky Scroll Agence (services.html — .scroll-node / .visual-layer)
     - Parallaxe & boutons magnétiques
     - Compteurs dynamiques
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Apparitions classiques (fade in up) — toutes pages
    initScrollAnimations();

    // 2. GSAP — lancé si disponible
    if (typeof gsap !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        gsap.config({ force3D: true });

        initAppleAnimations();
        initStickyScrollAgence();   // ← NOUVEAU : Sticky Scroll pour services.html
        initPremiumParallax();
        initLuxuryMagneticButtons();
        initDynamicCounters();
    }
});

/* ---------------------------------------------------
   🛠 APPARITION DU TEXTE (Smooth Fade — toutes pages)
   --------------------------------------------------- */
function initScrollAnimations() {
    const elementsToAnimate = document.querySelectorAll('.animate-on-scroll');
    if (elementsToAnimate.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px"
    });

    elementsToAnimate.forEach(el => observer.observe(el));
}

/* ---------------------------------------------------
   📱 ANIMATIONS GSAP : HERO + STICKY PHONE (index.html)
   --------------------------------------------------- */
function initAppleAnimations() {

    // Hero qui "plonge" dans l'écran — présent sur toutes les pages
    const hero = document.querySelector('.hero');
    if (hero) {
        gsap.to('.hero', {
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1,
                pin: true,
                pinSpacing: false
            },
            scale: 0.88,
            opacity: 0,
            y: -80,
            filter: 'blur(12px)',
            ease: 'power2.inOut'
        });
    }

    // --- MATCHMEDIA : réserve le Sticky Phone à l'ordinateur ---
    const mm = gsap.matchMedia();

    // 💻 ORDINATEUR — Sticky Phone (index.html uniquement)
    mm.add('(min-width: 993px)', () => {
        const steps  = document.querySelectorAll('.method-step');
        const images = document.querySelectorAll('.phone-img');

        if (steps.length > 0 && images.length > 0) {

            // Animation d'entrée du téléphone
            gsap.from('.phone-mockup', {
                scrollTrigger: {
                    trigger: '#fonctionnement',
                    start: 'top 70%'
                },
                y: 100,
                opacity: 0,
                duration: 1.2,
                ease: 'expo.out'
            });

            // Synchronisation Texte <-> Écran iPhone
            function activateStep(index) {
                steps.forEach(s => s.classList.remove('active'));
                images.forEach(i => i.classList.remove('active'));
                if (steps[index])  steps[index].classList.add('active');
                if (images[index]) images[index].classList.add('active');
            }

            steps.forEach((step, index) => {
                ScrollTrigger.create({
                    trigger: step,
                    start: 'top center',
                    end: 'bottom center',
                    onEnter:     () => activateStep(index),
                    onEnterBack: () => activateStep(index)
                });
            });

            activateStep(0);
        }
    });

    // 📱 MOBILE — Apparition organique des steps (index.html)
    mm.add('(max-width: 992px)', () => {
        const steps = gsap.utils.toArray('.method-step');
        steps.forEach(step => {
            gsap.from(step, {
                scrollTrigger: {
                    trigger: step,
                    start: 'top 85%'
                },
                y: 60,
                opacity: 0,
                duration: 1,
                ease: 'power3.out',
                clearProps: 'all'
            });
        });
    });

    // Tarifs
    gsap.from('.pricing-card:not(.highlight)', {
        scrollTrigger: { trigger: '#tarifs', start: 'top 75%' },
        y: 50, opacity: 0, duration: 1, ease: 'power4.out', clearProps: 'all'
    });
    gsap.from('.pricing-card.highlight', {
        scrollTrigger: { trigger: '#tarifs', start: 'top 75%' },
        y: 80, scale: 0.95, opacity: 0, duration: 1.2,
        ease: 'back.out(1.2, 0.5)', delay: 0.15, clearProps: 'all'
    });
}

/* ---------------------------------------------------
   ✨ STICKY SCROLL AGENCE (services.html)
   Pilote .scroll-node (texte gauche) et .visual-layer (image droite)
   selon la position verticale du scroll.
   --------------------------------------------------- */
function initStickyScrollAgence() {
    const scrollNodes   = document.querySelectorAll('.scroll-node');
    const visualLayers  = document.querySelectorAll('.visual-layer');

    // Si on n'est pas sur la page services, on sort immédiatement
    if (scrollNodes.length === 0 || visualLayers.length === 0) return;

    // Seulement sur desktop (sur mobile le CSS gère l'affichage en colonne)
    const mm = gsap.matchMedia();

    mm.add('(min-width: 993px)', () => {

        /* Fonction centrale d'activation */
        function activateNode(index) {
            scrollNodes.forEach(n => n.classList.remove('active'));
            visualLayers.forEach(l => l.classList.remove('active'));

            if (scrollNodes[index])  scrollNodes[index].classList.add('active');
            if (visualLayers[index]) visualLayers[index].classList.add('active');
        }

        /* Pour chaque nœud de texte, on crée un ScrollTrigger */
        scrollNodes.forEach((node, index) => {
            ScrollTrigger.create({
                trigger: node,
                start: 'top 55%',     // Se déclenche quand le haut du nœud atteint 55% de la fenêtre
                end: 'bottom 45%',    // Reste actif tant que le bas du nœud n'a pas dépassé 45%
                onEnter:     () => activateNode(index),
                onEnterBack: () => activateNode(index),
                // onLeave/onLeaveBack : on ne reset pas pour éviter les flash entre 2 nœuds
            });
        });

        /* Activation du premier nœud par défaut */
        activateNode(0);

        /* Animation d'entrée du panneau visuel (une seule fois) */
        gsap.from('.visual-sticky-frame', {
            scrollTrigger: {
                trigger: '#sticky-expertise',
                start: 'top 65%'
            },
            y: 80,
            opacity: 0,
            duration: 1.4,
            ease: 'expo.out'
        });

        /* Animation d'entrée staggerée des nœuds de texte */
        scrollNodes.forEach((node, i) => {
            gsap.from(node.querySelector('.scroll-node-inner'), {
                scrollTrigger: {
                    trigger: node,
                    start: 'top 80%'
                },
                y: 40,
                opacity: 0,
                duration: 1,
                delay: i * 0.05,
                ease: 'power3.out',
                clearProps: 'all'
            });
        });
    });

    // 📱 MOBILE — Les nœuds apparaissent un par un en scrollant
    mm.add('(max-width: 992px)', () => {
        scrollNodes.forEach(node => {
            gsap.from(node, {
                scrollTrigger: {
                    trigger: node,
                    start: 'top 88%'
                },
                y: 50,
                opacity: 0,
                duration: 0.9,
                ease: 'power3.out',
                clearProps: 'all'
            });
        });
    });
}

/* ---------------------------------------------------
   🪄 PARALLAXE HAUTE PERFORMANCE (60 FPS)
   --------------------------------------------------- */
function initPremiumParallax() {
    const bg1 = document.querySelector('.bg-shape-1');
    const bg2 = document.querySelector('.bg-shape-2');

    if (bg1 && bg2 && !window.matchMedia('(max-width: 768px)').matches) {
        const xTo1 = gsap.quickTo(bg1, 'x', { duration: 1.5, ease: 'power3.out' });
        const yTo1 = gsap.quickTo(bg1, 'y', { duration: 1.5, ease: 'power3.out' });
        const xTo2 = gsap.quickTo(bg2, 'x', { duration: 2,   ease: 'power3.out' });
        const yTo2 = gsap.quickTo(bg2, 'y', { duration: 2,   ease: 'power3.out' });

        window.addEventListener('mousemove', (e) => {
            const mouseX = (e.clientX / window.innerWidth)  - 0.5;
            const mouseY = (e.clientY / window.innerHeight) - 0.5;
            xTo1(mouseX * -120); yTo1(mouseY * -120);
            xTo2(mouseX * 150);  yTo2(mouseY * 150);
        });
    }
}

/* ---------------------------------------------------
   🧲 BOUTONS MAGNÉTIQUES FLUIDES
   --------------------------------------------------- */
function initLuxuryMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-large');
    if (window.matchMedia('(max-width: 768px)').matches) return;

    buttons.forEach(btn => {
        const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power2.out' });
        const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power2.out' });

        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width  / 2;
            const y = e.clientY - rect.top  - rect.height / 2;
            xTo(x * 0.25);
            yTo(y * 0.25);
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1.2, 0.4)' });
        });
    });
}

/* ---------------------------------------------------
   🔢 COMPTEURS DYNAMIQUES (Dashboard)
   --------------------------------------------------- */
function initDynamicCounters() {
    const kpiValues = document.querySelectorAll('.kpi-value');
    if (kpiValues.length === 0) return;

    kpiValues.forEach(kpi => {
        const observer = new MutationObserver((mutationsList, obs) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const text = kpi.innerText;/* ==========================================================================
   🚀 FYDELIO ENGINE v5.1 — ANIMATIONS PREMIUM
   - Fade in classique (toutes pages)
   - Hero blur/scale au scroll
   - Sticky Phone (index.html)
   - Sticky Scroll Agence (services.html)
   - Parallaxe souris (desktop only)
   - Boutons magnétiques (desktop only)
   - Compteurs KPI dashboard
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Apparitions au scroll — toutes pages
    initScrollAnimations();

    // 2. GSAP — uniquement si chargé
    if (typeof gsap !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        gsap.config({ force3D: true });

        initHeroAnim();
        initStickyPhone();
        initStickyScrollAgence();
        initPremiumParallax();
        initMagneticButtons();
        initKpiCounters();
    }
});

/* ─────────────────────────────────────────────
   🟢 FADE IN AU SCROLL (IntersectionObserver)
   Fonctionne sans GSAP, très léger
   ───────────────────────────────────────────── */
function initScrollAnimations() {
    const els = document.querySelectorAll('.animate-on-scroll');
    if (!els.length) return;

    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => obs.observe(el));
}

/* ─────────────────────────────────────────────
   🌀 HERO — effet Apple "plonge dans l'écran"
   Compatible hero classique ET hero-modern
   ───────────────────────────────────────────── */
function initHeroAnim() {
    // Hero classique (index hero centré)
    const heroClassic = document.querySelector('.hero:not(.hero-modern)');
    if (heroClassic) {
        gsap.to(heroClassic, {
            scrollTrigger: {
                trigger: heroClassic,
                start: 'top top',
                end: 'bottom top',
                scrub: 1,
                pin: true,
                pinSpacing: false
            },
            scale: 0.9,
            opacity: 0,
            y: -60,
            filter: 'blur(10px)',
            ease: 'power2.inOut'
        });
    }

    // Hero moderne 2 colonnes — effet parallaxe doux sur la photo principale
    const heroModern = document.querySelector('.hero-modern');
    if (heroModern) {
        const photoMain = heroModern.querySelector('.hero-photo-main img');
        const photoSec  = heroModern.querySelector('.hero-photo-secondary');

        if (photoMain) {
            gsap.to(photoMain, {
                scrollTrigger: { trigger: heroModern, start: 'top top', end: 'bottom top', scrub: 1.5 },
                y: 40,
                ease: 'none'
            });
        }
        if (photoSec) {
            gsap.to(photoSec, {
                scrollTrigger: { trigger: heroModern, start: 'top top', end: 'bottom top', scrub: 1 },
                y: 25,
                ease: 'none'
            });
        }
        // Texte hero qui monte légèrement
        const heroText = heroModern.querySelector('.hero-text-col');
        if (heroText) {
            gsap.to(heroText, {
                scrollTrigger: { trigger: heroModern, start: 'top top', end: 'bottom top', scrub: 0.8 },
                y: -20,
                opacity: 0.4,
                ease: 'none'
            });
        }
    }

    // Tarifs — animation d'apparition des cartes
    const pricingSection = document.querySelector('#tarifs');
    if (pricingSection) {
        gsap.from('.pricing-card:not(.highlight)', {
            scrollTrigger: { trigger: '#tarifs', start: 'top 78%' },
            y: 50, opacity: 0, duration: 1, ease: 'power4.out', clearProps: 'all'
        });
        gsap.from('.pricing-card.highlight', {
            scrollTrigger: { trigger: '#tarifs', start: 'top 78%' },
            y: 70, scale: 0.96, opacity: 0, duration: 1.2,
            ease: 'back.out(1.3)', delay: 0.12, clearProps: 'all'
        });
    }
}

/* ─────────────────────────────────────────────
   📱 STICKY PHONE — index.html
   .method-step ↔ .phone-img synchronisés
   ───────────────────────────────────────────── */
function initStickyPhone() {
    const steps  = document.querySelectorAll('.method-step');
    const images = document.querySelectorAll('.phone-img');
    if (!steps.length || !images.length) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 993px)', () => {

        gsap.from('.phone-mockup', {
            scrollTrigger: { trigger: '#fonctionnement', start: 'top 72%' },
            y: 80, opacity: 0, duration: 1.2, ease: 'expo.out'
        });

        function activateStep(index) {
            steps.forEach(s => s.classList.remove('active'));
            images.forEach(i => i.classList.remove('active'));
            if (steps[index])  steps[index].classList.add('active');
            if (images[index]) images[index].classList.add('active');
        }

        steps.forEach((step, i) => {
            ScrollTrigger.create({
                trigger: step,
                start: 'top center',
                end: 'bottom center',
                onEnter:     () => activateStep(i),
                onEnterBack: () => activateStep(i)
            });
        });

        activateStep(0);
    });

    mm.add('(max-width: 992px)', () => {
        steps.forEach(step => {
            gsap.from(step, {
                scrollTrigger: { trigger: step, start: 'top 88%' },
                y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', clearProps: 'all'
            });
        });
    });
}

/* ─────────────────────────────────────────────
   ✨ STICKY SCROLL AGENCE — services.html
   .scroll-node ↔ .visual-layer synchronisés
   ───────────────────────────────────────────── */
function initStickyScrollAgence() {
    const nodes  = document.querySelectorAll('.scroll-node');
    const layers = document.querySelectorAll('.visual-layer');
    if (!nodes.length || !layers.length) return;

    const mm = gsap.matchMedia();

    // Desktop : mécanique sticky complète
    mm.add('(min-width: 993px)', () => {

        function activateNode(index) {
            nodes.forEach(n => n.classList.remove('active'));
            layers.forEach(l => l.classList.remove('active'));
            if (nodes[index])  nodes[index].classList.add('active');
            if (layers[index]) layers[index].classList.add('active');
        }

        nodes.forEach((node, i) => {
            ScrollTrigger.create({
                trigger: node,
                start: 'top 58%',
                end: 'bottom 42%',
                onEnter:     () => activateNode(i),
                onEnterBack: () => activateNode(i)
            });
        });

        activateNode(0);

        // Entrée du panneau visuel
        gsap.from('.visual-sticky-frame', {
            scrollTrigger: { trigger: '#sticky-expertise', start: 'top 68%' },
            y: 60, opacity: 0, duration: 1.3, ease: 'expo.out'
        });

        // Stagger d'entrée des nœuds de texte
        nodes.forEach((node, i) => {
            const inner = node.querySelector('.scroll-node-inner');
            if (!inner) return;
            gsap.from(inner, {
                scrollTrigger: { trigger: node, start: 'top 82%' },
                y: 36, opacity: 0, duration: 0.9, delay: i * 0.04,
                ease: 'power3.out', clearProps: 'all'
            });
        });

        // Stagger d'entrée des cards services (si présentes)
        const cards = document.querySelectorAll('#services-grid .card');
        cards.forEach((card, i) => {
            gsap.from(card, {
                scrollTrigger: { trigger: card, start: 'top 88%' },
                y: 40, opacity: 0, duration: 0.8,
                delay: (i % 3) * 0.1,
                ease: 'power3.out', clearProps: 'all'
            });
        });

        // Roadmap cards
        const roadmapCards = document.querySelectorAll('.roadmap-card');
        roadmapCards.forEach((card, i) => {
            gsap.from(card, {
                scrollTrigger: { trigger: card, start: 'top 85%' },
                y: 30, opacity: 0, duration: 0.8, delay: i * 0.15,
                ease: 'power3.out', clearProps: 'all'
            });
        });
    });

    // Mobile : apparition simple des nœuds
    mm.add('(max-width: 992px)', () => {
        nodes.forEach(node => {
            gsap.from(node, {
                scrollTrigger: { trigger: node, start: 'top 90%' },
                y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', clearProps: 'all'
            });
        });
    });
}

/* ─────────────────────────────────────────────
   🎨 PARALLAXE SOURIS — desktop uniquement
   ───────────────────────────────────────────── */
function initPremiumParallax() {
    const bg1 = document.querySelector('.bg-shape-1');
    const bg2 = document.querySelector('.bg-shape-2');
    if (!bg1 || !bg2) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;

    const xTo1 = gsap.quickTo(bg1, 'x', { duration: 1.6, ease: 'power3.out' });
    const yTo1 = gsap.quickTo(bg1, 'y', { duration: 1.6, ease: 'power3.out' });
    const xTo2 = gsap.quickTo(bg2, 'x', { duration: 2.2, ease: 'power3.out' });
    const yTo2 = gsap.quickTo(bg2, 'y', { duration: 2.2, ease: 'power3.out' });

    window.addEventListener('mousemove', (e) => {
        const mx = (e.clientX / window.innerWidth)  - 0.5;
        const my = (e.clientY / window.innerHeight) - 0.5;
        xTo1(mx * -110); yTo1(my * -110);
        xTo2(mx *  140); yTo2(my *  140);
    }, { passive: true });
}

/* ─────────────────────────────────────────────
   🧲 BOUTONS MAGNÉTIQUES — desktop uniquement
   ───────────────────────────────────────────── */
function initMagneticButtons() {
    if (window.matchMedia('(max-width: 768px)').matches) return;

    document.querySelectorAll('.btn-large').forEach(btn => {
        const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power2.out' });
        const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power2.out' });

        btn.addEventListener('mousemove', (e) => {
            const r = btn.getBoundingClientRect();
            xTo((e.clientX - r.left - r.width  / 2) * 0.25);
            yTo((e.clientY - r.top  - r.height / 2) * 0.25);
        });
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1.2, 0.4)' });
        });
    });
}

/* ─────────────────────────────────────────────
   🔢 COMPTEURS KPI — dashboard
   ───────────────────────────────────────────── */
function initKpiCounters() {
    const kpis = document.querySelectorAll('.kpi-value');
    if (!kpis.length) return;

    kpis.forEach(kpi => {
        const obs = new MutationObserver((list, observer) => {
            for (const m of list) {
                const text = kpi.innerText;
                if (text === '—' || text === 'Auto') return;
                const val = parseInt(text.replace(/\D/g, ''), 10);
                if (!isNaN(val) && val > 0 && !kpi.dataset.animated) {
                    kpi.dataset.animated = '1';
                    observer.disconnect();
                    let obj = { n: 0 };
                    gsap.to(obj, {
                        n: val, duration: 2.2, ease: 'expo.out',
                        onUpdate: () => { kpi.innerText = Math.floor(obj.n); }
                    });
                }
            }
        });
        obs.observe(kpi, { childList: true, characterData: true, subtree: true });
    });
}
                    if (text === '-' || text === 'Optimisé') return;

                    const finalValue = parseInt(text.replace(/\s/g, ''), 10);
                    if (!isNaN(finalValue) && finalValue > 0 && !kpi.dataset.animating) {
                        kpi.dataset.animating = 'true';
                        obs.disconnect();

                        let start = { val: 0 };
                        gsap.to(start, {
                            val: finalValue,
                            duration: 2.5,
                            ease: 'expo.out',
                            onUpdate: () => {
                                kpi.innerText = Math.floor(start.val);
                            }
                        });
                    }
                }
            }
        });
        observer.observe(kpi, { childList: true, characterData: true, subtree: true });
    });
}
