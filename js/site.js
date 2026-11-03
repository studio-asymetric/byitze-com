const CMS = "https://cms.asymetric.studio";
const STUDIO = "https://asymetric.studio";

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const list = document.getElementById("projects");

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

function setStatus(message) {
  list.replaceChildren();
  const p = document.createElement("p");
  p.className = "status";
  p.textContent = message;
  list.appendChild(p);
}

function render(projects, images) {
  list.replaceChildren();
  if (!projects.length) {
    setStatus("No featured projects yet.");
    return;
  }

  projects.forEach((project) => {
    const acf = project.acf || {};
    const title = decode(project.title && project.title.rendered);
    const type = decode(acf.type || acf.type_of_work || "Project");
    const client = decode(acf.client_name_or_personal || "");
    const yearLabel = yearOf(project);
    const meta = [client && client !== "Personal" ? client : "", yearLabel]
      .filter(Boolean)
      .join(" · ");
    const image = images.get(Number(acf.thumbnail)) || "";

    const link = document.createElement("a");
    link.className = "card";
    link.href = studioUrl(project.slug);

    const media = document.createElement("div");
    media.className = "card-media";
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = "";
      img.loading = "lazy";
      media.appendChild(img);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "card-fallback";
      media.appendChild(fallback);
    }

    const body = document.createElement("div");
    const typeEl = document.createElement("p");
    typeEl.className = "card-type";
    typeEl.textContent = type;
    const titleEl = document.createElement("h3");
    titleEl.className = "card-title";
    titleEl.textContent = title;
    body.append(typeEl, titleEl);
    if (meta) {
      const metaEl = document.createElement("p");
      metaEl.className = "card-meta";
      metaEl.textContent = meta;
      body.appendChild(metaEl);
    }

    const go = document.createElement("span");
    go.className = "card-go";
    go.textContent = "Open";

    link.append(media, body, go);
    list.appendChild(link);
  });
}

async function load() {
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

    render(featured, images);
  } catch (error) {
    setStatus("Projects could not be loaded. They are on the studio site.");
  }
}

load();
