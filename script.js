// 선샤인셔플 랜딩페이지 — 내비게이션, GSAP 스크롤 애니메이션(있으면) / 폴백, 필름스트립 컨트롤, 카운트업

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

// ---------- Nav scroll state ----------
const nav = document.querySelector(".nav");
const setNavState = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
setNavState();
window.addEventListener("scroll", setNavState, { passive: true });

// ---------- Hero entrance ----------
const heroLines = document.querySelectorAll("[data-hero-title] .line");
const heroFadeEls = document.querySelectorAll("[data-hero-fade]");

if (hasGSAP && !prefersReducedMotion) {
  gsap.registerPlugin(ScrollTrigger);

  gsap.set(heroLines, { yPercent: 110 });
  gsap.set(heroFadeEls, { autoAlpha: 0, y: 16 });
  const tl = gsap.timeline({ delay: 0.2 });
  tl.to(heroLines, { yPercent: 0, duration: 1, stagger: 0.12, ease: "power4.out" })
    .to(heroFadeEls, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power2.out" }, "-=0.4");

  // gentle parallax on the hero background
  gsap.to(".hero-media img", {
    yPercent: 12,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // generic scroll reveal for anything marked .reveal
  document.querySelectorAll(".reveal").forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 28 },
      {
        autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      }
    );
  });

  // stat count-up
  const formatCount = (n, el) => (el.dataset.format === "plain" ? String(n) : n.toLocaleString("ko-KR"));
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const counter = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          val: target,
          duration: 1.6,
          ease: "power1.out",
          onUpdate: () => { el.textContent = formatCount(Math.round(counter.val), el) + suffix; },
        });
      },
    });
  });
} else {
  // no GSAP (e.g. offline preview) — plain fallback so content is never stuck invisible
  heroLines.forEach((el) => { el.style.transform = "none"; });
  heroFadeEls.forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
  document.querySelectorAll("[data-count]").forEach((el) => {
    const n = Number(el.dataset.count);
    el.textContent = (el.dataset.format === "plain" ? String(n) : n.toLocaleString("ko-KR")) + (el.dataset.suffix || "");
  });

  const revealTargets = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el) => observer.observe(el));
  }
}

// ---------- Filmstrip: arrows + drag-to-scroll + custom progress bar ----------
const filmstrip = document.querySelector(".filmstrip");
if (filmstrip) {
  const track = document.querySelector(".film-progress-track");
  const thumb = document.querySelector(".film-progress-thumb");
  const prevBtn = document.querySelector('.film-arrow[data-dir="-1"]');
  const nextBtn = document.querySelector('.film-arrow[data-dir="1"]');

  const cardStep = () => {
    const card = filmstrip.querySelector(".film-card");
    return card ? card.getBoundingClientRect().width + 18 : 300;
  };

  prevBtn?.addEventListener("click", () => {
    filmstrip.scrollBy({ left: -cardStep() * 2, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
  nextBtn?.addEventListener("click", () => {
    filmstrip.scrollBy({ left: cardStep() * 2, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  const updateProgress = () => {
    if (!track || !thumb) return;
    const maxScroll = filmstrip.scrollWidth - filmstrip.clientWidth;
    const trackWidth = track.clientWidth;
    const ratioVisible = Math.min(filmstrip.clientWidth / filmstrip.scrollWidth, 1);
    const thumbWidth = Math.max(trackWidth * ratioVisible, 32);
    const scrollRatio = maxScroll > 0 ? filmstrip.scrollLeft / maxScroll : 0;
    const left = scrollRatio * (trackWidth - thumbWidth);
    thumb.style.width = `${thumbWidth}px`;
    thumb.style.left = `${left}px`;
    if (prevBtn) prevBtn.disabled = filmstrip.scrollLeft <= 4;
    if (nextBtn) nextBtn.disabled = filmstrip.scrollLeft >= maxScroll - 4;
  };

  let ticking = false;
  filmstrip.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateProgress(); ticking = false; });
  }, { passive: true });

  window.addEventListener("resize", updateProgress);
  updateProgress();

  track?.addEventListener("click", (e) => {
    if (e.target === thumb) return;
    const rect = track.getBoundingClientRect();
    const clickRatio = (e.clientX - rect.left) / rect.width;
    const maxScroll = filmstrip.scrollWidth - filmstrip.clientWidth;
    filmstrip.scrollTo({ left: clickRatio * maxScroll, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  // pointer drag-to-scroll for mouse/trackpad users
  let isDown = false;
  let startX = 0;
  let startScroll = 0;
  let dragMoved = 0;
  filmstrip.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return; // native touch scroll is already fine
    isDown = true;
    dragMoved = 0;
    filmstrip.classList.add("is-dragging");
    startX = e.clientX;
    startScroll = filmstrip.scrollLeft;
    filmstrip.setPointerCapture(e.pointerId);
  });
  filmstrip.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    const delta = e.clientX - startX;
    dragMoved = Math.max(dragMoved, Math.abs(delta));
    filmstrip.scrollLeft = startScroll - delta;
  });
  const endDrag = () => { isDown = false; filmstrip.classList.remove("is-dragging"); };
  filmstrip.addEventListener("pointerup", endDrag);
  filmstrip.addEventListener("pointercancel", endDrag);

  // if the pointer actually dragged, swallow the resulting click so it doesn't jump to YouTube
  filmstrip.addEventListener("click", (e) => {
    if (dragMoved > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}
