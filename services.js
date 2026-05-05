/* ==========================================================================
   ✨ FYDELIO_OS // CORE ANIMATION ENGINE (GSAP)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 0. INITIALISATION & VÉRIFICATION ---
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.error("CRITICAL ERROR: GSAP ou ScrollTrigger introuvable. Le système a besoin de ces librairies pour fonctionner.");
        return;
    }
    
    // Enregistrement du plugin de scroll
    gsap.registerPlugin(ScrollTrigger);

    console.log("FYDELIO_OS: Animation Engine Loaded. All systems nominal.");

    /* ==========================================================================
       1. HERO SECTION : SÉQUENCE D'AMORÇAGE (BOOT SEQUENCE)
       ========================================================================== */
    const bootSequence = gsap.timeline({ defaults: { ease: "power4.out" } });

    // Les éléments "Fade" (Badges, éléments de fond)
    const fadeElements = document.querySelectorAll(".reveal-fade");
    if(fadeElements.length > 0) {
        bootSequence.from(fadeElements, {
            opacity: 0,
            duration: 1.5,
            stagger: 0.2
        }, "+=0.2");
    }

    // Les éléments "Up" (Titres, Paragraphes, Boutons)
    const upElements = document.querySelectorAll(".hero-module .reveal-up");
    if(upElements.length > 0) {
        bootSequence.from(upElements, {
            y: 40,
            opacity: 0,
            duration: 1.2,
            stagger: 0.15 // Cascade effect
        }, "-=1.2"); // Commence légèrement avant la fin du fade
    }

    /* ==========================================================================
       2. LE MOTEUR STICKY SCROLL (LE CŒUR DE L'EXPÉRIENCE)
       ========================================================================== */
    const scrollNodes = document.querySelectorAll('.scroll-node');
    const visualLayers = document.querySelectorAll('.visual-layer');

    // Initialisation : On s'assure que le premier élément est actif au chargement
    if(scrollNodes.length > 0 && visualLayers.length > 0) {
        scrollNodes[0].classList.add('is-active');
        visualLayers[0].classList.add('is-visible');
    }

    // On parcourt chaque bloc de texte (les étapes à gauche)
    scrollNodes.forEach((node, index) => {
        ScrollTrigger.create({
            trigger: node,
            // Le point de déclenchement : quand le haut du bloc texte arrive à 50% de l'écran
            start: "top 55%", 
            end: "bottom 55%",
            // Quand le bloc entre dans la zone (en descendant ou en remontant)
            onToggle: (self) => {
                if (self.isActive) {
                    
                    // 1. Désactiver tous les autres blocs de texte
                    scrollNodes.forEach(n => n.classList.remove('is-active'));
                    // Activer le bloc actuel
                    node.classList.add('is-active');

                    // 2. Désactiver toutes les images à droite
                    visualLayers.forEach(v => v.classList.remove('is-visible'));
                    
                    // 3. Trouver et activer l'image correspondante via le data-target
                    const targetId = node.id; // ex: "node-1"
                    const targetVisual = document.querySelector(`.visual-layer[data-target="${targetId}"]`);
                    
                    if (targetVisual) {
                        targetVisual.classList.add('is-visible');
                    }
                }
            }
        });
    });

    /* ==========================================================================
       3. REVEAL AU SCROLL (ROADMAP, FAQ, CTA)
       ========================================================================== */
    // Tous les éléments hors Hero qui ont la classe 'reveal-up' s'animent au scroll
    const scrollRevealElements = document.querySelectorAll("section:not(.hero-module) .reveal-up");
    
    scrollRevealElements.forEach(element => {
        gsap.from(element, {
            scrollTrigger: {
                trigger: element,
                start: "top 85%", // Se déclenche quand l'élément est à 85% visible
                toggleActions: "play none none none" // Ne se joue qu'une fois
            },
            y: 50,
            opacity: 0,
            duration: 1,
            ease: "power3.out"
        });
    });

    // Ligne de la timeline (Roadmap) qui grandit en scrollant
    const timelineLines = document.querySelectorAll(".timeline-line");
    timelineLines.forEach(line => {
        gsap.from(line, {
            scrollTrigger: {
                trigger: line,
                start: "top 70%",
                end: "bottom 50%",
                scrub: 1 // L'animation est liée à la molette de la souris
            },
            scaleY: 0,
            transformOrigin: "top center",
            ease: "none"
        });
    });

    /* ==========================================================================
       4. EFFET DE PARALLAXE EN ARRIÈRE-PLAN (PROFONDEUR 3D)
       ========================================================================== */
    // Les lumières flottantes bougent légèrement quand on scroll pour donner un effet de profondeur
    gsap.to(".primary-orb", {
        yPercent: 30, // Se déplace de 30% vers le bas
        ease: "none",
        scrollTrigger: {
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: true
        }
    });

    gsap.to(".secondary-orb", {
        yPercent: -20, // Se déplace vers le haut
        ease: "none",
        scrollTrigger: {
            trigger: "body",
            start: "top top",
            end: "bottom bottom",
            scrub: true
        }
    });

    /* ==========================================================================
       5. GLOW TRACKER (EFFET DE LUMIÈRE SOUS LA SOURIS SUR LE VERRE)
       ========================================================================== */
    // Sélectionne tous les panneaux en verre
    const glassPanels = document.querySelectorAll('.glass-panel');
    
    glassPanels.forEach(panel => {
        panel.addEventListener('mousemove', (e) => {
            // Calcule la position X et Y de la souris par rapport au panneau
            const rect = panel.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Applique un dégradé radial centré sur le curseur
            panel.style.background = `
                radial-gradient(
                    circle 400px at ${x}px ${y}px, 
                    rgba(255,255,255,0.06), 
                    rgba(15, 23, 42, 0.4) 40%
                )
            `;
        });

        // Quand la souris sort du panneau, on remet le fond normal en douceur
        panel.addEventListener('mouseleave', () => {
            panel.style.background = 'rgba(15, 23, 42, 0.4)';
        });
    });

    /* ==========================================================================
       6. FAQ ACCORDÉON (Fluidité des détails HTML5)
       ========================================================================== */
    const faqItems = document.querySelectorAll('details.faq-item');
    
    // Assure qu'un seul élément FAQ est ouvert à la fois pour un design plus propre
    faqItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Si on clique sur un item fermé, on ferme les autres
            if (!item.hasAttribute('open')) {
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.hasAttribute('open')) {
                        otherItem.removeAttribute('open');
                    }
                });
            }
        });
    });

});
