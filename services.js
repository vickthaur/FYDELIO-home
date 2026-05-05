/* ==========================================================================
   ✨ FYDELIO_OS // LUXURY ANIMATION ENGINE (GSAP 3)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // Initialisation des plugins GSAP
    gsap.registerPlugin(ScrollTrigger);

    // Configuration des Easings Apple (fluide et organique)
    const APPLE_EASE = "expo.out";
    const SOFT_EASE = "power3.out";
    const SPRING_EASE = "back.out(1.7)";

    /* --- 1. SÉQUENCE D'AMORÇAGE HERO (L'EFFET WAOUH) --- */
    const heroTl = gsap.timeline({ defaults: { ease: APPLE_EASE } });

    heroTl
        .from(".status-badge", {
            y: 20,
            opacity: 0,
            duration: 1,
            delay: 0.3
        })
        .from(".hero-title", {
            y: 80,
            opacity: 0,
            duration: 1.8,
            letterSpacing: "0.1em", // Effet de resserrement typique luxe
            stagger: 0.2
        }, "-=0.8")
        .from(".hero-description", {
            y: 30,
            opacity: 0,
            duration: 1.2
        }, "-=1.2")
        .from(".btn-tech", {
            scale: 0.9,
            opacity: 0,
            duration: 1,
            ease: SPRING_EASE
        }, "-=1")
        .from(".hero-metrics", {
            y: 40,
            opacity: 0,
            duration: 1.2
        }, "-=0.8");


    /* --- 2. MOTEUR STICKY SCROLL (TRANSITIONS DE CALQUES) --- */
    const scrollNodes = document.querySelectorAll('.scroll-node');
    const visualLayers = document.querySelectorAll('.visual-layer');

    if(scrollNodes.length > 0) {
        scrollNodes.forEach((node, index) => {
            ScrollTrigger.create({
                trigger: node,
                start: "top 55%",
                end: "bottom 55%",
                onToggle: (self) => {
                    if (self.isActive) {
                        updateStickyVisual(index);
                    }
                }
            });
        });
    }

    function updateStickyVisual(index) {
        // Animation du texte (Node)
        scrollNodes.forEach((n, i) => {
            if(i === index) n.classList.add('is-active');
            else n.classList.remove('is-active');
        });

        // Animation des calques d'images (Layer)
        visualLayers.forEach((layer, i) => {
            if(i === index) {
                // L'image entrante
                gsap.to(layer, {
                    opacity: 1,
                    scale: 1,
                    duration: 1.2,
                    ease: APPLE_EASE,
                    overwrite: true
                });
            } else {
                // L'image sortante
                gsap.to(layer, {
                    opacity: 0,
                    scale: 1.1, // Effet de zoom arrière en partant
                    duration: 0.8,
                    ease: SOFT_EASE,
                    overwrite: true
                });
            }
        });
    }


    /* --- 3. EFFET MAGNÉTIQUE SUR LES BOUTONS (INTERACTION PREZ) --- */
    const magneticBtns = document.querySelectorAll('.btn-tech');
    
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            // Le bouton suit légèrement la souris
            gsap.to(btn, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.5,
                ease: "power2.out"
            });
            
            // Le texte à l'intérieur bouge encore plus (parallax interne)
            const text = btn.querySelector('.btn-text');
            if(text) {
                gsap.to(text, {
                    x: x * 0.1,
                    y: y * 0.1,
                    duration: 0.5
                });
            }
        });

        btn.addEventListener('mouseleave', () => {
            // Remise à zéro fluide
            gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
            const text = btn.querySelector('.btn-text');
            if(text) gsap.to(text, { x: 0, y: 0, duration: 0.7 });
        });
    });


    /* --- 4. REVEAL DES CARTES ROADMAP & FAQ --- */
    const revealCards = document.querySelectorAll('.glass-panel, .faq-item');
    
    revealCards.forEach(card => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: "top 90%",
                toggleActions: "play none none none"
            },
            y: 50,
            opacity: 0,
            duration: 1,
            ease: SOFT_EASE
        });
    });


    /* --- 5. EFFET DE PARALLAXE SUR LES HALOS (GLOWS) --- */
    gsap.to(".primary-orb", {
        scrollTrigger: {
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: 2
        },
        y: 200,
        x: -100,
        ease: "none"
    });

    gsap.to(".secondary-orb", {
        scrollTrigger: {
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5
        },
        y: -150,
        x: 100,
        ease: "none"
    });

});
