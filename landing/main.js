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

    let lenis = null;
    if (!prefersReduced && typeof Lenis !== "undefined") {
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

    const isDesktop = window.matchMedia("(min-width: 901px)").matches;
    if (isDesktop) {
      gsap.set(".hero-art-center", { xPercent: -50 });
      gsap.set(".hero-art-left", { rotation: -8 });
      gsap.set(".hero-art-right", { rotation: 8 });
    }

    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl.from(".hero-art-center", { y: 80, scale: 0.92, opacity: 0, duration: 1.1 }, 0);
    if (isDesktop) {
      heroTl
        .from(".hero-art-left", { x: -60, rotation: -16, opacity: 0, duration: 1 }, 0.15)
        .from(".hero-art-right", { x: 60, rotation: 16, opacity: 0, duration: 1 }, 0.2);
    }
    heroTl.from(
      ".hero-copy [data-animate]",
      { y: 36, opacity: 0, duration: 0.75, stagger: 0.08 },
      0.35
    );

    if (!prefersReduced) {
      if (isDesktop) {
        gsap.to(".hero-art-left", {
          y: 80,
          ease: "none",
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(".hero-art-right", {
          y: 110,
          ease: "none",
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(".hero-art-center", {
          y: 50,
          ease: "none",
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
        });
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
