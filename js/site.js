const CMS = "https://cms.asymetric.studio";
const STUDIO = "https://asymetric.studio";

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const stickers = document.getElementById("stickers");
const reel = document.getElementById("reel");
const track = document.getElementById("projects");
const stage = document.querySelector(".hero-stage");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const spots = [
  { x: "0%", y: "-4%", rest: "-8deg" },
  { x: "76%", y: "-12%", rest: "8deg" },
  { x: "78%", y: "34%", rest: "-5deg" },
  { x: "8%", y: "38%", rest: "6deg" },
];

function decode(value) {
  const el = document.createElement("textarea");
  el.innerHTML = String(value || "");
  return el.value;
}

function isFeatured(value) {
  return value === true || value === 1 || value === "1";
}

function stamp(project) {
  const raw = project.acf && project.acf.deadline;
  let iso = project.date || "";
  if (typeof raw === "string" && /^\d{8}$/.test(raw)) {
    iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  } else if (typeof raw === "string" && raw) {
    iso = raw;
  }
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

function yearOf(project) {
  const time = stamp(project);
  return time ? String(new Date(time).getFullYear()) : "";
}

function studioUrl(slug) {
  if (!/^[a-z0-9-]+$/.test(slug || "")) return `${STUDIO}/work/`;
  return `${STUDIO}/work/${slug}/`;
}

function safeImage(url) {
  return typeof url === "string" && url.startsWith(`${CMS}/`) ? url : "";
}

function thumbFromMedia(media) {
  const sizes = (media.media_details && media.media_details.sizes) || {};
  return (
    safeImage(sizes.medium_large && sizes.medium_large.source_url) ||
    safeImage(sizes.large && sizes.large.source_url) ||
    safeImage(sizes.medium && sizes.medium.source_url) ||
    safeImage(media.source_url)
  );
}

function picture(url, alt) {
  if (!url) {
    const fallback = document.createElement("div");
    fallback.className = "sticker-fallback";
    fallback.setAttribute("role", "img");
    fallback.setAttribute("aria-label", alt || "");
    return fallback;
  }
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt || "";
  img.draggable = false;
  return img;
}

function placeSticker(node, index) {
  const spot = spots[index % spots.length];
  node.style.setProperty("--x", spot.x);
  node.style.setProperty("--y", spot.y);
  node.style.setProperty("--rest", spot.rest);
  node.style.setProperty("--i", String(index));
}

function renderStickers(projects, images) {
  stickers.replaceChildren();
  const face = document.createElement("a");
  face.className = "sticker";
  face.draggable = false;
  face.href = "#contact";
  face.setAttribute("aria-label", "Dalibor Itze");
  face.appendChild(picture("/images/dalibor-itze.webp", "Dalibor Itze"));
  placeSticker(face, 0);
  stickers.appendChild(face);

  projects.slice(0, 3).forEach((project, index) => {
    const acf = project.acf || {};
    const title = decode(project.title && project.title.rendered);
    const link = document.createElement("a");
    link.className = "sticker";
    link.draggable = false;
    link.href = studioUrl(project.slug);
    link.setAttribute("aria-label", title);
    link.appendChild(picture(images.get(Number(acf.thumbnail)) || "", ""));
    placeSticker(link, index + 1);
    stickers.appendChild(link);
  });
}

const workRow = mountRow(reel, track, { loop: true, autoplay: true });

function makeCard(project, images) {
  const acf = project.acf || {};
  const title = decode(project.title && project.title.rendered);
  const type = decode(acf.type || acf.type_of_work || "Project");
  const client = decode(acf.client_name_or_personal || "");
  const meta = [client && client !== "Personal" ? client : "", yearOf(project)].filter(Boolean).join(" · ");

  const link = document.createElement("a");
  link.className = "reel-card";
  link.draggable = false;
  link.href = studioUrl(project.slug);

  const frame = document.createElement("div");
  frame.className = "reel-frame";
  frame.appendChild(picture(images.get(Number(acf.thumbnail)) || "", ""));

  const typeEl = document.createElement("p");
  typeEl.className = "reel-type";
  typeEl.textContent = type;
  const titleEl = document.createElement("h3");
  titleEl.className = "reel-title";
  titleEl.textContent = title;

  link.append(frame, typeEl, titleEl);
  if (meta) {
    const metaEl = document.createElement("p");
    metaEl.className = "reel-meta";
    metaEl.textContent = meta;
    link.appendChild(metaEl);
  }
  return link;
}

function hideClone(node) {
  node.setAttribute("aria-hidden", "true");
  node.tabIndex = -1;
  return node;
}

function renderReel(projects, images) {
  track.replaceChildren();
  workRow.loopWidth = 0;
  workRow.x = 0;
  if (!projects.length) {
    const note = document.createElement("p");
    note.className = "status";
    note.textContent = "No featured projects yet.";
    track.appendChild(note);
    return;
  }

  const originals = projects.map((project) => makeCard(project, images));
  const appendSet = (hidden) => {
    originals.forEach((card) => {
      const node = card.cloneNode(true);
      track.appendChild(hidden ? hideClone(node) : node);
    });
  };

  appendSet(false);
  let sets = 1;
  while (track.scrollWidth < reel.clientWidth + 80 && sets < 8) {
    appendSet(true);
    sets += 1;
  }

  const unitCount = track.children.length;
  for (let i = 0; i < unitCount; i += 1) {
    track.appendChild(hideClone(track.children[i].cloneNode(true)));
  }

  workRow.loopWidth = track.children[unitCount].offsetLeft - track.children[0].offsetLeft;
  workRow.apply();
  workRow.curve();
}

function mountRow(root, rowTrack, options) {
  const row = {
    root,
    track: rowTrack,
    loop: !!options.loop,
    autoplay: !!options.autoplay,
    loopWidth: 0,
    x: 0,
    dragging: false,
    hovering: false,
    flick: 0,
  };

  const limit = () => Math.max(0, row.track.scrollWidth - row.root.clientWidth);

  const wrap = (value) => {
    if (!row.loop) return Math.min(0, Math.max(-limit(), value));
    if (!row.loopWidth) return 0;
    let next = value % row.loopWidth;
    if (next > 0) next -= row.loopWidth;
    return next;
  };

  row.apply = () => {
    row.track.style.transform = `translate3d(${row.x}px,0,0)`;
  };

  row.curve = () => {
    const mid = row.root.getBoundingClientRect().left + row.root.clientWidth / 2;
    row.track.querySelectorAll(".reel-frame").forEach((frame) => {
      const box = frame.getBoundingClientRect();
      const delta = Math.max(-0.72, Math.min(0.72, (box.left + box.width / 2 - mid) / row.root.clientWidth));
      frame.style.setProperty("--lift", `${Math.abs(delta) * 36}px`);
      frame.style.setProperty("--tilt", `${delta * 5}deg`);
    });
  };

  const commit = (previous) => {
    const jumped = row.loop && row.loopWidth && Math.abs(row.x - previous) > row.loopWidth * 0.5;
    if (jumped) row.root.classList.add("is-loop");
    row.apply();
    row.curve();
    if (!jumped) return;
    void row.track.offsetWidth;
    row.root.classList.remove("is-loop");
  };

  let pointerId = null;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let origin = 0;
  let last = 0;
  let cruise = 0.045;
  const samples = [];

  const finish = (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    if (row.dragging && samples.length > 1) {
      const first = samples[0];
      const latest = samples[samples.length - 1];
      const dt = latest.t - first.t;
      if (dt > 0) row.flick = Math.max(-2.2, Math.min(2.2, (latest.x - first.x) / dt));
    }
    pointerId = null;
    row.dragging = false;
    row.root.classList.remove("is-drag");
    samples.length = 0;
  };

  row.root.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    pointerId = event.pointerId;
    moved = false;
    row.dragging = false;
    row.flick = 0;
    samples.length = 0;
    startX = event.clientX;
    startY = event.clientY;
    origin = row.x;
  });

  row.root.addEventListener("dragstart", (event) => event.preventDefault());

  document.addEventListener("pointermove", (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!row.dragging) {
      if (Math.hypot(dx, dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        pointerId = null;
        return;
      }
      row.dragging = true;
      row.root.classList.add("is-drag");
    }
    moved = true;
    event.preventDefault();
    const previous = row.x;
    row.x = wrap(origin + dx);
    const now = performance.now();
    samples.push({ t: now, x: row.x });
    while (samples.length && now - samples[0].t > 90) samples.shift();
    commit(previous);
  });

  document.addEventListener("pointerup", finish);
  document.addEventListener("pointercancel", finish);
  row.root.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") row.hovering = true;
  });
  row.root.addEventListener("pointerleave", () => {
    row.hovering = false;
  });
  row.root.addEventListener("click", (event) => {
    if (!moved) return;
    event.preventDefault();
    event.stopPropagation();
    moved = false;
  }, true);

  window.addEventListener("resize", () => {
    if (row.loop) {
      const cards = row.track.querySelectorAll(".reel-card");
      if (cards.length > 1) {
        const half = cards.length / 2;
        row.loopWidth = cards[half].offsetLeft - cards[0].offsetLeft;
      }
    }
    row.x = wrap(row.x);
    commit(row.x);
  });

  const tick = (now) => {
    if (!last) last = now;
    const delta = Math.min(48, now - last);
    last = now;
    if (!reduceMotion && !row.dragging && document.visibilityState) {
      const previous = row.x;
      if (row.autoplay && row.loop && row.loopWidth) {
        const desired = row.hovering ? 0.014 : 0.045;
        cruise += (desired - cruise) * (1 - Math.pow(0.82, delta / 16));
        row.flick *= Math.pow(0.9, delta / 16);
        if (Math.abs(row.flick) < 0.004) row.flick = 0;
        row.x = wrap(row.x + (row.flick - cruise) * delta);
      } else if (row.flick) {
        const next = wrap(row.x + row.flick * delta);
        if (!row.loop && (next === 0 || next === -limit())) row.flick = 0;
        else row.flick *= Math.pow(0.9, delta / 16);
        if (Math.abs(row.flick) < 0.004) row.flick = 0;
        row.x = next;
      }
      commit(previous);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return row;
}

function bindStickerDrag() {
  let held = null;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let moved = false;

  stickers.addEventListener("pointerdown", (event) => {
    const sticker = event.target.closest(".sticker");
    if (!sticker || (event.button !== undefined && event.button !== 0)) return;
    held = sticker;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    originX = parseFloat(sticker.style.getPropertyValue("--dx")) || 0;
    originY = parseFloat(sticker.style.getPropertyValue("--dy")) || 0;
  });

  document.addEventListener("pointermove", (event) => {
    if (!held) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!held.classList.contains("is-held")) {
      if (Math.hypot(dx, dy) < 6) return;
      held.classList.add("is-held");
    }
    moved = true;
    held.style.setProperty("--dx", `${originX + dx}px`);
    held.style.setProperty("--dy", `${originY + dy}px`);
    held.style.setProperty("--peel", `${Math.max(-12, Math.min(12, dx * 0.06))}deg`);
  });

  const release = () => {
    if (!held) return;
    if (moved) held.dataset.dragged = "1";
    held.classList.remove("is-held");
    held.style.setProperty("--peel", "0deg");
    held = null;
  };

  document.addEventListener("pointerup", release);
  document.addEventListener("pointercancel", release);
  stickers.addEventListener("click", (event) => {
    const sticker = event.target.closest(".sticker");
    if (!sticker || sticker.dataset.dragged !== "1") return;
    event.preventDefault();
    event.stopPropagation();
    delete sticker.dataset.dragged;
  }, true);
  stickers.addEventListener("dragstart", (event) => event.preventDefault());
}

function bindStickers() {
  if (reduceMotion || !stage) return;
  stage.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const box = stage.getBoundingClientRect();
    const nx = (event.clientX - box.left) / box.width - 0.5;
    const ny = (event.clientY - box.top) / box.height - 0.5;
    stickers.querySelectorAll(".sticker").forEach((el, index) => {
      if (el.classList.contains("is-held")) return;
      const depth = 10 + index * 8;
      el.style.setProperty("--mx", `${nx * depth}px`);
      el.style.setProperty("--my", `${ny * depth}px`);
      el.style.setProperty("--spin", `${nx * 4}deg`);
    });
  });
  stage.addEventListener("pointerleave", () => {
    stickers.querySelectorAll(".sticker").forEach((el) => {
      el.style.setProperty("--mx", "0px");
      el.style.setProperty("--my", "0px");
      el.style.setProperty("--spin", "0deg");
    });
  });
}

async function load() {
  renderStickers([], new Map());
  try {
    const response = await fetch(
      `${CMS}/wp-json/wp/v2/project?per_page=100&_fields=id,slug,date,title,acf`
    );
    if (!response.ok) throw new Error(String(response.status));
    const posts = await response.json();
    const featured = (Array.isArray(posts) ? posts : [])
      .filter((post) => post && post.acf && isFeatured(post.acf.featured))
      .sort((a, b) => stamp(b) - stamp(a));

    const ids = [...new Set(
      featured
        .map((post) => Number(post.acf.thumbnail))
        .filter((id) => Number.isInteger(id) && id > 0)
    )];

    const images = new Map();
    if (ids.length) {
      const mediaResponse = await fetch(
        `${CMS}/wp-json/wp/v2/media?include=${ids.join(",")}&per_page=${ids.length}&_fields=id,source_url,media_details`
      );
      if (mediaResponse.ok) {
        const media = await mediaResponse.json();
        (Array.isArray(media) ? media : []).forEach((item) => {
          const url = thumbFromMedia(item);
          if (url) images.set(Number(item.id), url);
        });
      }
    }

    renderStickers(featured, images);
    renderReel(featured, images);
  } catch (error) {
    track.replaceChildren();
    const note = document.createElement("p");
    note.className = "status";
    note.textContent = "Projects could not be loaded. They are on the studio site.";
    track.appendChild(note);
  }
}

function mountLenis() {
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  if (reduceMotion || mobile || typeof Lenis !== "function") {
    if (window.lenis) {
      window.lenis.destroy();
      window.lenis = null;
    }
    return;
  }
  if (window.lenis) return;
  window.lenis = new Lenis({
    autoRaf: true,
    duration: 1.2,
    easing: (t) => 1 - Math.pow(3, -10 * t),
    wheelMultiplier: 1,
    touchMultiplier: 2,
    syncTouch: false,
    anchors: { offset: -96 },
  });
}

bindStickers();
bindStickerDrag();
mountLenis();
window.addEventListener("resize", mountLenis);
load();
