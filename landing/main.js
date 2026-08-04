(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  if (!hasGsap) {
    document.querySelectorAll("[data-animate]").forEach((el) => {
      el.style.opacity = "1";
    });
  } else {
    gsap.registerPlugin(ScrollTrigger);

    const desktopMq = window.matchMedia("(min-width: 901px)");
    const isDesktop = desktopMq.matches;

    let lenis = null;
    // Native scroll feels better on phones; Lenis stays desktop-only.
    if (!prefersReduced && isDesktop && typeof Lenis !== "undefined") {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        syncTouch: false,
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    if (isDesktop) {
      gsap.set(".hero-art-center", { xPercent: -50 });
      gsap.set(".hero-art-left", { rotation: -8 });
      gsap.set(".hero-art-right", { rotation: 8 });
    }

    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (isDesktop) {
      heroTl
        .from(".hero-art-center", { y: 60, scale: 0.94, duration: 1 }, 0)
        .from(".hero-art-left", { x: -50, rotation: -14, duration: 0.9 }, 0.12)
        .from(".hero-art-right", { x: 50, rotation: 14, duration: 0.9 }, 0.16);
    } else {
      heroTl.from(".hero-art.is-hero-focus", { y: 24, duration: 0.65 }, 0);
    }
    heroTl.from(
      ".hero-copy [data-animate]",
      { y: 28, opacity: 0, duration: 0.65, stagger: 0.07 },
      0.2
    );

    if (!prefersReduced) {
      const heroArts = Array.from(document.querySelectorAll("[data-hero-art]"));
      let heroIndex = Math.max(
        0,
        heroArts.findIndex((el) => el.classList.contains("is-hero-focus"))
      );

      function setHeroFocus(next) {
        heroArts.forEach((el, i) => {
          el.classList.toggle("is-hero-focus", i === next);
        });
        if (!hasGsap) return;

        if (isDesktop) {
          heroArts.forEach((el, i) => {
            const active = i === next;
            const isCenter = el.classList.contains("hero-art-center");
            const baseRot = el.classList.contains("hero-art-left")
              ? -8
              : el.classList.contains("hero-art-right")
                ? 8
                : 0;
            gsap.to(el, {
              scale: active ? 1.1 : 0.92,
              y: active ? -18 : 6,
              rotation: active ? baseRot * 0.25 : baseRot,
              xPercent: isCenter ? -50 : 0,
              duration: 0.75,
              ease: "power2.inOut",
              overwrite: "auto",
            });
          });
        } else {
          heroArts.forEach((el, i) => {
            gsap.set(el, { clearProps: "transform,x,y,rotation,scale,xPercent" });
            gsap.fromTo(
              el,
              { opacity: i === next ? 0 : Number(getComputedStyle(el).opacity), y: i === next ? 18 : 0 },
              {
                opacity: i === next ? 1 : 0,
                y: 0,
                duration: 0.55,
                ease: "power2.out",
                overwrite: "auto",
              }
            );
          });
        }
      }

      setHeroFocus(heroIndex);

      setInterval(() => {
        heroIndex = (heroIndex + 1) % heroArts.length;
        setHeroFocus(heroIndex);
      }, 2800);

      gsap.to(".orb-a", {
        x: 40,
        y: 60,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".orb-b", {
        x: -50,
        y: -40,
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      const track = document.querySelector(".marquee-track");
      if (track) {
        const width = track.scrollWidth / 2;
        gsap.to(track, {
          x: -width,
          duration: 28,
          ease: "none",
          repeat: -1,
        });
      }
    }

    gsap.utils.toArray("[data-animate]").forEach((el) => {
      if (el.closest(".hero-copy")) return;

      const delay = Number(el.dataset.delay || 0);
      const type = el.dataset.animate;
      const from =
        type === "scale-in"
          ? { opacity: 0, scale: 0.94, y: 24 }
          : { opacity: 0, y: 40 };

      gsap.fromTo(el, from, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.85,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true,
        },
      });
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        const id = anchor.getAttribute("href");
        if (!id || id === "#") return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(target, { offset: -70 });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  // Conceptual feature carousel
  const root = document.querySelector("[data-carousel]");
  if (!root) return;

  const trackEl = root.querySelector("[data-carousel-track]");
  const slides = Array.from(root.querySelectorAll(".carousel-slide"));
  const prevBtn = root.querySelector("[data-carousel-prev]");
  const nextBtn = root.querySelector("[data-carousel-next]");
  const dotsWrap = root.querySelector("[data-carousel-dots]");
  let index = 0;
  let autoTimer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot" + (i === 0 ? " is-active" : "");
    dot.setAttribute("aria-label", `Slayt ${i + 1}`);
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  const dots = Array.from(dotsWrap.querySelectorAll(".carousel-dot"));

  function slideWidth() {
    return trackEl.parentElement?.clientWidth || 0;
  }

  function render(animate = true) {
    const x = -index * slideWidth();
    if (hasGsap && !prefersReduced && animate) {
      gsap.to(trackEl, { x, duration: 0.55, ease: "power3.out", overwrite: true });
    } else if (hasGsap) {
      gsap.set(trackEl, { x });
    } else {
      trackEl.style.transform = `translate3d(${x}px, 0, 0)`;
    }
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  }

  function goTo(next) {
    index = (next + slides.length) % slides.length;
    render();
    restartAuto();
  }

  function restartAuto() {
    if (autoTimer) clearInterval(autoTimer);
    if (prefersReduced) return;
    autoTimer = setInterval(() => goTo(index + 1), 5200);
  }

  prevBtn?.addEventListener("click", () => goTo(index - 1));
  nextBtn?.addEventListener("click", () => goTo(index + 1));

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") goTo(index - 1);
    if (e.key === "ArrowRight") goTo(index + 1);
  });

  let touchX = null;
  root.addEventListener(
    "touchstart",
    (e) => {
      touchX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );
  root.addEventListener(
    "touchend",
    (e) => {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
      touchX = null;
    },
    { passive: true }
  );

  render(false);
  restartAuto();

  window.addEventListener("resize", () => render(false));
})();
