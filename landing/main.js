(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  const progressBar = document.querySelector("[data-scroll-progress]");
  const cursorGlow = document.querySelector("[data-cursor-glow]");

  function revealAll() {
    document.querySelectorAll("[data-animate]").forEach((el) => {
      el.style.opacity = "1";
    });
  }

  if (!hasGsap) {
    revealAll();
  } else {
    gsap.registerPlugin(ScrollTrigger);

    const desktopMq = window.matchMedia("(min-width: 901px)");
    const isDesktop = desktopMq.matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let lenis = null;
    if (!prefersReduced && isDesktop && typeof Lenis !== "undefined") {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        syncTouch: false,
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    if (!prefersReduced && progressBar) {
      gsap.to(progressBar, {
        width: "100%",
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.35,
        },
      });
    }

    if (!prefersReduced && finePointer && cursorGlow) {
      document.body.classList.add("is-cursor-ready");
      const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const target = { x: pos.x, y: pos.y };
      window.addEventListener(
        "pointermove",
        (e) => {
          target.x = e.clientX;
          target.y = e.clientY;
        },
        { passive: true }
      );
      gsap.ticker.add(() => {
        pos.x += (target.x - pos.x) * 0.12;
        pos.y += (target.y - pos.y) * 0.12;
        cursorGlow.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      });
    }

    // Split brand letters for stagger entrance
    const brand = document.querySelector("[data-split-brand]");
    if (brand && !prefersReduced) {
      const text = brand.textContent.trim();
      brand.textContent = "";
      [...text].forEach((ch) => {
        const span = document.createElement("span");
        span.className = "brand-letter";
        span.textContent = ch;
        brand.appendChild(span);
      });
    }

    document.querySelectorAll('.section-title[data-animate="clip-up"]').forEach((title) => {
      if (title.querySelector(".clip-inner")) return;
      const inner = document.createElement("span");
      inner.className = "clip-inner";
      while (title.firstChild) inner.appendChild(title.firstChild);
      title.appendChild(inner);
      title.classList.add("is-clip");
    });

    const heroArts = Array.from(document.querySelectorAll("[data-hero-art]"));
    const heroStage = document.querySelector("[data-hero-rotate]");

    function heroSlotOffsets() {
      const w = heroStage?.clientWidth || window.innerWidth;
      const side = Math.min(340, Math.max(130, w * 0.32));
      return {
        left: { x: -side, y: 22, scale: 0.88, rotation: -9, zIndex: 1 },
        center: { x: 0, y: -10, scale: 1.18, rotation: 0, zIndex: 5 },
        right: { x: side, y: 22, scale: 0.88, rotation: 9, zIndex: 1 },
      };
    }

    function placeHeroArts(focusIndex, animate) {
      if (!heroArts.length) return;
      const slots = heroSlotOffsets();
      const n = heroArts.length;
      const assignment = {
        [(focusIndex - 1 + n) % n]: "left",
        [focusIndex]: "center",
        [(focusIndex + 1) % n]: "right",
      };

      heroArts.forEach((el, i) => {
        const slotName = assignment[i];
        if (!slotName) {
          gsap.set(el, { opacity: 0, scale: 0.7, zIndex: 0 });
          return;
        }
        const s = slots[slotName];
        const props = {
          x: s.x,
          y: s.y,
          xPercent: -50,
          yPercent: -50,
          scale: s.scale,
          rotation: s.rotation,
          zIndex: s.zIndex,
          opacity: 1,
          duration: 0.95,
          ease: "power2.inOut",
          overwrite: "auto",
        };
        el.classList.toggle("is-hero-focus", slotName === "center");
        if (animate && !prefersReduced) {
          gsap.to(el, props);
        } else {
          const { duration, ease, overwrite, ...setProps } = props;
          gsap.set(el, setProps);
        }
      });
    }

    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    placeHeroArts(0, false);
    if (!prefersReduced && heroArts.length) {
      heroTl.from(
        heroArts,
        { opacity: 0, y: "+=42", duration: 0.85, stagger: 0.09, ease: "power3.out" },
        0.05
      );
    }

    const brandLetters = brand?.querySelectorAll(".brand-letter");
    if (brandLetters?.length) {
      gsap.set(brand, { opacity: 1 });
      heroTl.from(
        brandLetters,
        { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.05, ease: "power3.out" },
        0.22
      );
    }

    heroTl.from(
      ".hero-copy .eyebrow, .hero-copy .hero-lead, .hero-copy .hero-cta",
      { y: 28, opacity: 0, duration: 0.65, stagger: 0.08 },
      0.32
    );

    if (!prefersReduced && isDesktop) {
      gsap.to(".hero-stage", {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }

    if (!prefersReduced) {
      let heroIndex = 0;
      if (heroArts.length) {
        placeHeroArts(heroIndex, false);
        setInterval(() => {
          heroIndex = (heroIndex + 1) % heroArts.length;
          placeHeroArts(heroIndex, true);
        }, 3200);
        window.addEventListener("resize", () => placeHeroArts(heroIndex, false));
      }

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

      if (isDesktop) {
        gsap.to(".orb-a", {
          yPercent: 30,
          ease: "none",
          scrollTrigger: { scrub: 0.6, start: "top top", end: "bottom bottom" },
        });
        gsap.to(".orb-b", {
          yPercent: -25,
          ease: "none",
          scrollTrigger: { scrub: 0.6, start: "top top", end: "bottom bottom" },
        });
      }

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

    // Steps rail fill + hot state
    const stepsFill = document.querySelector("[data-steps-fill]");
    const stepItems = document.querySelectorAll("[data-step]");
    if (stepsFill && stepItems.length && !prefersReduced) {
      ScrollTrigger.create({
        trigger: "[data-steps]",
        start: "top 75%",
        end: "bottom 55%",
        onUpdate: (self) => {
          gsap.set(stepsFill, { width: `${self.progress * 100}%` });
          const active = Math.min(
            stepItems.length - 1,
            Math.floor(self.progress * stepItems.length)
          );
          stepItems.forEach((el, i) => el.classList.toggle("is-step-hot", i === active));
        },
      });
    }

    gsap.utils.toArray("[data-animate]").forEach((el) => {
      if (el.closest(".hero-copy")) return;

      const delay = Number(el.dataset.delay || 0);
      const type = el.dataset.animate;

      if (type === "clip-up") {
        const inner = el.querySelector(".clip-inner") || el;
        gsap.fromTo(
          inner,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 0.9,
            delay,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              once: true,
            },
            onStart: () => {
              el.style.opacity = "1";
            },
          }
        );
        return;
      }

      if (type === "wipe-in") {
        gsap.fromTo(
          el,
          { opacity: 0, x: -28 },
          {
            opacity: 1,
            x: 0,
            duration: 0.75,
            delay,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              once: true,
              onEnter: () => el.classList.add("is-wiped"),
            },
          }
        );
        return;
      }

      const from =
        type === "scale-in"
          ? { opacity: 0, scale: 0.92, y: 36 }
          : { opacity: 0, y: 48 };

      gsap.fromTo(el, from, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.9,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true,
        },
      });
    });

    // 3D tilt on plan / role cards (desktop + fine pointer)
    if (!prefersReduced && finePointer && isDesktop) {
      document.querySelectorAll("[data-tilt]").forEach((card) => {
        const strength = 10;
        card.addEventListener("pointermove", (e) => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(card, {
            rotateY: px * strength,
            rotateX: -py * strength,
            transformPerspective: 700,
            duration: 0.35,
            ease: "power2.out",
            overwrite: "auto",
          });
        });
        card.addEventListener("pointerleave", () => {
          gsap.to(card, {
            rotateY: 0,
            rotateX: 0,
            duration: 0.55,
            ease: "power3.out",
            overwrite: "auto",
          });
        });
      });

      document.querySelectorAll(".btn-magnetic").forEach((btn) => {
        btn.addEventListener("pointermove", (e) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(btn, { x: x * 0.22, y: y * 0.22, duration: 0.3, ease: "power2.out" });
        });
        btn.addEventListener("pointerleave", () => {
          gsap.to(btn, { x: 0, y: 0, duration: 0.45, ease: "power3.out" });
        });
      });
    }

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
