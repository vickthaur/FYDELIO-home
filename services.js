/* ==========================================================================
   ✨ FYDELIO AGENCE - ANIMATIONS HAUT DE GAMME (GSAP)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // Vérification que GSAP et ScrollTrigger sont bien là
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn("GSAP ou ScrollTrigger n'est pas chargé.");
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    /* --- 1. ANIMATION DU HERO (Ouverture de la page) --- */
    // Les éléments montent doucement en fondu avec un délai entre chaque
    const heroElements = document.querySelectorAll(".hero-agency > *");
    if (heroElements.length > 0) {
        gsap.from(heroElements, {
            y: 50,
            opacity: 0,
            duration: 1.2,
            stagger: 0.15, // C'est ce qui crée l'effet "cascade"
            ease: "power3.out",
            delay: 0.1
        });
    }

    /* --- 2. LE BANDEAU DÉFILANT (MARQUEE) MAGIQUE --- */
    const marqueeContent = document.querySelector(".marquee-content");
    
    if (marqueeContent) {
        // On clone le contenu pour que le défilement soit parfaitement infini
        const clone = marqueeContent.innerHTML;
        marqueeContent.innerHTML += clone + clone; 
        
        let speed = 1.2; // Vitesse de base douce
        let position = 0;
        let direction = -1; // -1 = défile vers la gauche
        
        // Fonction d'animation fluide
        function animateMarquee() {
            position += speed * direction;
            
            // Quand on a défilé d'un tiers (puisqu'on a triplé le contenu), on remet à zéro discrètement
            if (position <= -marqueeContent.scrollWidth / 3) {
                position = 0;
            } else if (position > 0) {
                position = -marqueeContent.scrollWidth / 3;
            }
            
            gsap.set(marqueeContent, { x: position });
            requestAnimationFrame(animateMarquee);
        }
        
        // On lance la boucle d'animation
        requestAnimationFrame(animateMarquee);

        // 🔥 L'EFFET WAHOU : On accélère le bandeau quand l'utilisateur scrolle !
        ScrollTrigger.create({
            trigger: document.body,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
                // self.getVelocity() calcule la vitesse du défilement
                // On ajoute cette vitesse à notre vitesse de base
                speed = 1.2 + Math.abs(self.getVelocity() / 150);
                
                // On crée une animation pour que la vitesse redescende doucement à la normale (inertie)
                gsap.to({val: speed}, {
                    val: 1.2,
                    duration: 0.8,
                    ease: "power2.out",
                    onUpdate: function() { 
                        speed = this.targets()[0].val; 
                    }
                });
            }
        });
    }

    /* --- 3. LE BENTO GRID (Apparition avec rebond Apple) --- */
    const bentoCards = document.querySelectorAll(".bento-card");
    
    if (bentoCards.length > 0) {
        gsap.from(bentoCards, {
            scrollTrigger: {
                trigger: ".bento-grid",
                start: "top 80%", // L'animation part quand le haut de la grille est à 80% de l'écran
                toggleActions: "play none none none" // Ne joue l'animation qu'une seule fois
            },
            y: 80,
            scale: 0.9,
            opacity: 0,
            duration: 1.2,
            stagger: 0.12, // L'effet d'apparition successive
            ease: "back.out(1.4)" // Effet de ressort (rebond) luxueux
        });
    }

    /* --- 4. ANIMATION DES MOCKUPS (Flottaison permanente) --- */
    const floatingLikes = document.querySelectorAll(".floating-like");
    
    floatingLikes.forEach((like, index) => {
        // Chaque élément flotte avec un timing légèrement différent pour un effet naturel
        gsap.to(like, {
            y: -20, // Monte de 20 pixels
            duration: 2.5 + (index * 0.8), // Désynchronise les durées
            yoyo: true, // Fait des allers-retours
            repeat: -1, // Répète à l'infini
            ease: "sine.inOut" // Accélération et décélération douces
        });
    });

    /* --- 5. ANIMATION DES BLOCS FINAUX (Synergie & CTA) --- */
    const finalBlocks = document.querySelectorAll(".synergy-block, .cta-agency-card");
    
    finalBlocks.forEach(block => {
        gsap.from(block, {
            scrollTrigger: {
                trigger: block,
                start: "top 85%",
            },
            y: 50,
            opacity: 0,
            duration: 1,
            ease: "power3.out"
        });
    });

});
