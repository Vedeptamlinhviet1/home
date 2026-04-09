const STORAGE_KEYS = {
  users: "viettam_users",
  localPosts: "viettam_local_posts",
  comments: "viettam_comments",
  session: "viettam_session",
  postsVersion: "viettam_posts_version"
};

const POSTS_DATA_VERSION = "2026-04-04-buddhist-images-1";

const CATEGORY_MAP = {
  "phat-giao": "Dau an Phat giao",
  "thien-chua-giao": "Thien chua giao",
  khac: "Tin nguong va ton giao khac"
};

const CATEGORY_LABELS = {
  "Dau an Phat giao": "Dấu ấn Phật giáo",
  "Thien chua giao": "Thiên Chúa giáo",
  "Tin nguong va ton giao khac": "Tín ngưỡng và tôn giáo khác"
};

const appEl = document.getElementById("app");
const authZoneEl = document.getElementById("auth-zone");
const navEl = document.getElementById("main-nav");
const EVENT_CALENDAR_PATH = "./content/event_calendar/events.json";
const LIBRARY_CATEGORY_INTRO_PATHS = {
  buddhist: "./content/posts/giới thiệu phật giáo.md",
  catholic: "./content/posts/giới thiệu thiên chúa giáo.md",
  folk: "./content/posts/giới thiệu khác.md"
};

const PODCAST_AUDIO_PATHS = [
  "./content/podcast/chùa/chùa AM Tiên.mp3",
  "./content/podcast/chùa/Núi Bà Đen.mp3",
  "./content/podcast/chùa/chùa đại tuệ.mp3",
  "./content/podcast/chùa/Chùa Linh QUang.mp3",
  "./content/podcast/chùa/Chùa Linh Ứng.mp3",
  "./content/podcast/chùa/Chùa Một Cột.mp3",
  "./content/podcast/chùa/Chùa Ông.mp3",
  "./content/podcast/chùa/chùa tam chúc.mp3",
  "./content/podcast/chùa/chùa thiên mụ.mp3",
  "./content/podcast/chùa/chùa thượng.mp3",
  "./content/podcast/chùa/chùa tiên.mp3",
  "./content/podcast/chùa/chùa trúc lâm.mp3",
  "./content/podcast/chùa/chùa vĩnh nghiêm.mp3",
  "./content/podcast/chùa/chùa hắc y.mp3",
  "./content/podcast/thiên chúa giáo/nhà thờ cao xá.mp3",
  "./content/podcast/thiên chúa giáo/nhà thờ chính tòa.mp3",
  "./content/podcast/thiên chúa giáo/chính tòa xã đoài.mp3",
  "./content/podcast/thiên chúa giáo/Nhà thờ con gà.mp3",
  "./content/podcast/thiên chúa giáo/nhà thờ đá.mp3",
  "./content/podcast/thiên chúa giáo/nhà thờ đức bà.mp3",
  "./content/podcast/thiên chúa giáo/nhà thờ lớn Hà nội.mp3",
  "./content/podcast/thiên chúa giáo/nhà thờ đá phát diệm.mp3",
  "./content/podcast/thiên chúa giáo/nhà thờ phủ cam.mp3",
  "./content/podcast/thiên chúa giáo/nhà thờ sở kiện.mp3",
  "./content/podcast/tín ngưỡng khác/đạo cao đài.mp3",
  "./content/podcast/tín ngưỡng khác/đạo hòa hảo.mp3",
  "./content/podcast/tín ngưỡng khác/hồi giáo islam].mp3",
  "./content/podcast/tín ngưỡng khác/thờ cá ông.mp3",
  "./content/podcast/tín ngưỡng khác/thờ cúng hùng vương.mp3",
  "./content/podcast/tín ngưỡng khác/thờ cúng tổ tiên.mp3",
  "./content/podcast/tín ngưỡng khác/thờ thành hoàng làng.mp3",
  "./content/podcast/tín ngưỡng khác/thần tài thổ địa.mp3",
  "./content/podcast/tín ngưỡng khác/tín ngưỡng tây nguyên.mp3",
  "./content/podcast/tín ngưỡng khác/tín ngưỡng thờ mẫu.mp3"
];

let leafletMap;
let eventCalendarCache = null;
let eventCalendarResizeHandler = null;
let curatedPosts = [];
let libraryCategoryIntroCache = null;
let podcastIndexCache = null;

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseJSON(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getUsers() {
  return parseJSON(localStorage.getItem(STORAGE_KEYS.users), []);
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function getLocalPosts() {
  return parseJSON(localStorage.getItem(STORAGE_KEYS.localPosts), []);
}

function savePosts(posts) {
  const localOnly = (posts || []).filter((p) => p?.sourceType !== "curated");
  localStorage.setItem(STORAGE_KEYS.localPosts, JSON.stringify(localOnly));
}

function getPosts() {
  return [...curatedPosts, ...getLocalPosts()];
}

function getComments() {
  return parseJSON(localStorage.getItem(STORAGE_KEYS.comments), []);
}

function saveComments(comments) {
  localStorage.setItem(STORAGE_KEYS.comments, JSON.stringify(comments));
}

function getSession() {
  return parseJSON(localStorage.getItem(STORAGE_KEYS.session), { currentUserId: null });
}

function saveSession(session) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

function getCurrentUser() {
  const session = getSession();
  const users = getUsers();
  return users.find((u) => u.id === session.currentUserId) || null;
}

function isAdmin() {
  const user = getCurrentUser();
  return user?.role === "admin";
}

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getAuthorName(post) {
  if (post.authorName) return post.authorName;
  const users = getUsers();
  return users.find((u) => u.id === post.authorId)?.name || "Tác giả";
}

function formatCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

function estimateReadTime(content) {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} phút đọc`;
}

function normalizeMarkdownSource(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\\([#*`_>\-\[\]()\.])/g, "$1")
    .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")
    // Ensure headings become standalone blocks so block-based parser can render them as headings.
    .replace(/^(#{1,6}\s+[^\n]+)\n(?!\n)/gm, "$1\n\n")
    .trim();
}

function markdownToPlainText(raw) {
  return normalizeMarkdownSource(raw)
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\*\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function toComparableText(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function comparableTokens(input) {
  return toComparableText(input).split(/\s+/).filter(Boolean);
}

function getPodcastGroupName(post) {
  if (post?.category === "Dau an Phat giao") return "chùa";
  if (post?.category === "Thien chua giao") return "thiên chúa giáo";
  if (post?.category === "Tin nguong va ton giao khac") return "tín ngưỡng khác";
  return "";
}

function buildPodcastIndex() {
  if (podcastIndexCache) return podcastIndexCache;

  podcastIndexCache = PODCAST_AUDIO_PATHS.map((rawPath) => {
    const path = String(rawPath || "").trim();
    const cleanedPath = path.replace(/\\/g, "/");
    const parts = cleanedPath.split("/");
    const groupName = toComparableText(parts[3] || "");
    const filename = parts[parts.length - 1] || "";
    const stem = filename.replace(/\.[^.]+$/, "");
    const tokens = comparableTokens(stem);
    return {
      path: cleanedPath,
      groupName,
      stem,
      tokens
    };
  });

  return podcastIndexCache;
}

function getPodcastPathForPost(post) {
  if (!post) return null;
  if (post.podcastPath) return String(post.podcastPath);

  const groupName = toComparableText(getPodcastGroupName(post));
  const candidates = buildPodcastIndex().filter((item) => item.groupName === groupName);
  if (!candidates.length) return null;

  const queryParts = [post.title || ""];
  if (post.markdownPath) {
    const mdStem = String(post.markdownPath).split("/").pop()?.replace(/\.[^.]+$/, "") || "";
    queryParts.push(mdStem);
  }
  if (post.image) {
    const imageDir = String(post.image).split("/").slice(-2, -1)[0] || "";
    queryParts.push(imageDir);
  }

  const queryTokens = new Set(comparableTokens(queryParts.join(" ")));
  let best = null;
  let bestScore = -1;

  candidates.forEach((candidate) => {
    const overlap = candidate.tokens.reduce((sum, token) => sum + (queryTokens.has(token) ? 1 : 0), 0);
    const phraseBoost = toComparableText(post.title || "").includes(toComparableText(candidate.stem)) ? 2 : 0;
    const score = overlap + phraseBoost;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });

  return bestScore > 0 ? best.path : null;
}

function formatPostContent(raw, options = {}) {
  const normalized = normalizeMarkdownSource(raw);
  if (!normalized) return "<p>Đang cập nhật nội dung.</p>";

  const renderInline = (text) =>
    escapeHtml(text)
      .replace(/\*\*\s*(.+?)\s*\*\*/g, "<strong>$1</strong>")
      .replace(/\*(?!\*)([^*\n]+?)\*(?!\*)/g, "<strong>$1</strong>");
  const safeImageSrc = (src) => encodeURI(String(src || "").trim());
  const postTitleKey = toComparableText(options.postTitle);

  const blocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const htmlBlocks = blocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return "";

    if (lines.length === 1 && /^#{1,3}\s*/.test(lines[0])) {
      const level = Math.min(4, lines[0].match(/^#+/)[0].length + 1);
      const text = lines[0].replace(/^#{1,3}\s*/, "");
      if (postTitleKey && toComparableText(text) === postTitleKey) return "";
      return `<h${level}>${escapeHtml(text)}</h${level}>`;
    }

    // Support title-like lines written as **Heading** after markdown cleanup.
    if (lines.length === 1 && /^\*\*\s*.+\s*\*\*$/.test(lines[0])) {
      const headingText = lines[0].replace(/^\*\*\s*/, "").replace(/\s*\*\*$/, "");
      if (postTitleKey && toComparableText(headingText) === postTitleKey) return "";
      return `<h3>${escapeHtml(headingText)}</h3>`;
    }

    // Support markdown images inserted into article body.
    if (lines.length === 1 && /^!\[[^\]]*\]\([^\)]+\)$/.test(lines[0])) {
      const imageMatch = lines[0].match(/^!\[([^\]]*)\]\(([^\)]+)\)$/);
      if (imageMatch) {
        const alt = imageMatch[1].trim() || "Hinh minh hoa";
        const src = safeImageSrc(imageMatch[2]);
        return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" /><figcaption>${escapeHtml(alt)}</figcaption></figure>`;
      }
    }

    // Treat single-line numbered section titles (e.g. "1. Dấu mốc...") as headings.
    if (lines.length === 1 && /^\d+\.\s+/.test(lines[0])) {
      const headingText = lines[0].replace(/^\d+\.\s+/, "");
      return `<h3>${escapeHtml(headingText)}</h3>`;
    }

    if (lines.length === 1 && postTitleKey && toComparableText(lines[0]) === postTitleKey) {
      return "";
    }

    if (lines.every((line) => /^[\*-]\s+/.test(line))) {
      const items = lines.map((line) => `<li>${renderInline(line.replace(/^[\*-]\s+/, ""))}</li>`).join("");
      return `<ul>${items}</ul>`;
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      const items = lines.map((line) => `<li>${renderInline(line.replace(/^\d+\.\s+/, ""))}</li>`).join("");
      return `<ol>${items}</ol>`;
    }

    if (lines.every((line) => /^>\s?/.test(line))) {
      const text = lines.map((line) => renderInline(line.replace(/^>\s?/, ""))).join("<br />");
      return `<blockquote>${text}</blockquote>`;
    }

    const paragraph = lines.map((line) => renderInline(line)).join("<br />");
    return `<p>${paragraph}</p>`;
  });

  return htmlBlocks.filter(Boolean).join("\n");
}

function removeFirstContentFigure(html) {
  return String(html || "").replace(/<figure>[\s\S]*?<\/figure>/, "");
}

async function loadCuratedPostsFromFiles() {
  try {
    const res = await fetch("./data/demo-posts.json");
    if (!res.ok) throw new Error("Không tải được metadata bài viết.");

    const metaPosts = await res.json();
    const normalizedMeta = Array.isArray(metaPosts) ? metaPosts : [];

    const loaded = await Promise.all(
      normalizedMeta.map(async (postMeta, index) => {
        let markdownRaw = "";
        if (postMeta.markdownPath) {
          try {
            const markdownRes = await fetch(encodeURI(postMeta.markdownPath));
            if (markdownRes.ok) markdownRaw = await markdownRes.text();
          } catch {
            markdownRaw = "";
          }
        }

        const plainText = markdownToPlainText(markdownRaw || postMeta.content || postMeta.excerpt || "");
        const excerpt = String(postMeta.excerpt || plainText.slice(0, 220) || "").trim();

        return {
          ...postMeta,
          id: postMeta.id || uid("seed"),
          content: plainText,
          excerpt,
          formattedContent: formatPostContent(markdownRaw || postMeta.content || postMeta.excerpt || "", {
            postTitle: postMeta.title
          }),
          sourceType: "curated",
          status: postMeta.status || "approved",
          createdAt: postMeta.createdAt || new Date(Date.now() + index * 1000).toISOString()
        };
      })
    );

    curatedPosts = loaded;
  } catch {
    curatedPosts = [];
  }
}

function normalizeEvent(raw, index) {
  return {
    id: raw.id || `event-${index + 1}`,
    name: String(raw.name || "Lễ hội chưa đặt tên"),
    date: String(raw.date || ""),
    image: String(raw.image || ""),
    description: String(raw.description || "")
  };
}

function getEventDateValue(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : Number.POSITIVE_INFINITY;
}

async function getEventCalendar() {
  if (eventCalendarCache) return eventCalendarCache;

  const fallbackEvents = [
    {
      id: "event-fallback-1",
      name: "Lễ hội đang cập nhật",
      date: new Date().toISOString().slice(0, 10),
      image: "https://images.unsplash.com/photo-1497561813398-8fcc7a37b567?auto=format&fit=crop&w=900&q=80",
      description: "Dữ liệu lễ hội đang được cập nhật. Vui lòng thử lại sau."
    }
  ];

  try {
    const response = await fetch(EVENT_CALENDAR_PATH);
    if (!response.ok) throw new Error("Không thể tải dữ liệu lễ hội.");

    const payload = await response.json();
    const list = Array.isArray(payload) ? payload : [];
    const normalized = list
      .map(normalizeEvent)
      .sort((a, b) => getEventDateValue(a.date) - getEventDateValue(b.date));

    eventCalendarCache = normalized.length ? normalized : fallbackEvents;
    return eventCalendarCache;
  } catch {
    eventCalendarCache = fallbackEvents;
    return eventCalendarCache;
  }
}

function getRecommendedEventIndex(events) {
  if (!events.length) return 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayValue = now.getTime();

  const futureIdx = events.findIndex((event) => getEventDateValue(event.date) >= todayValue);
  if (futureIdx >= 0) return futureIdx;

  return 0;
}

function getEventsPerPage() {
  if (window.innerWidth <= 700) return 3;
  if (window.innerWidth <= 1100) return 3;
  return 4;
}

function renderEventDetails(event) {
  const detailsEl = document.getElementById("event-details");
  if (!detailsEl || !event) return;

  const formattedDate = formatDate(event.date || new Date().toISOString());
  detailsEl.innerHTML = `
    <article class="event-detail-card">
      <img src="${escapeHtml(event.image)}" alt="${escapeHtml(event.name)}" class="event-detail-image" />
      <div class="event-detail-content">
        <p class="meta">Ngày lễ hội: ${escapeHtml(formattedDate)}</p>
        <h3>${escapeHtml(event.name)}</h3>
        <p>${escapeHtml(event.description)}</p>
      </div>
    </article>
  `;
}

function setupEventCalendar(events, initialIndex) {
  const track = document.getElementById("event-circle-track");
  const prevBtn = document.getElementById("event-prev");
  const nextBtn = document.getElementById("event-next");
  if (!track || !events.length) return;

  let eventsPerPage = getEventsPerPage();
  let selectedIndex = Math.min(Math.max(initialIndex, 0), events.length - 1);
  let page = Math.floor(selectedIndex / eventsPerPage);
  let circles = [];

  function chunkEvents() {
    const chunks = [];
    for (let i = 0; i < events.length; i += eventsPerPage) {
      chunks.push(events.slice(i, i + eventsPerPage));
    }
    return chunks;
  }

  function renderPages() {
    const chunks = chunkEvents();
    track.innerHTML = chunks
      .map(
        (chunk, chunkIndex) => `
          <div class="event-circle-page" data-page="${chunkIndex}">
            ${chunk
              .map((event) => {
                const globalIndex = events.findIndex((item) => item.id === event.id);
                return `
                  <button class="event-circle" data-index="${globalIndex}" title="${escapeHtml(event.name)} - ${escapeHtml(formatDate(event.date))}">
                    <span class="event-circle-image" style="background-image:url('${escapeHtml(event.image)}')"></span>
                    <span class="event-circle-name">${escapeHtml(event.name)}</span>
                    <span class="event-circle-date">${escapeHtml(formatDate(event.date))}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        `
      )
      .join("");

    circles = Array.from(track.querySelectorAll(".event-circle"));
    circles.forEach((circle) => {
      circle.addEventListener("click", () => {
        const idx = Number(circle.dataset.index);
        setSelected(idx);
        ensureSelectedVisible();
      });
    });
  }

  function maxPage() {
    return Math.max(0, Math.ceil(events.length / eventsPerPage) - 1);
  }

  function updateTrack() {
    track.style.transform = `translateX(-${page * 100}%)`;
    prevBtn.disabled = page <= 0;
    nextBtn.disabled = page >= maxPage();
  }

  function setSelected(idx) {
    selectedIndex = idx;
    circles.forEach((el, index) => {
      const circleIndex = Number(el.dataset.index);
      el.classList.toggle("active", circleIndex === selectedIndex);
    });
    renderEventDetails(events[selectedIndex]);
  }

  function ensureSelectedVisible() {
    page = Math.floor(selectedIndex / eventsPerPage);
    updateTrack();
  }

  prevBtn?.addEventListener("click", () => {
    page = Math.max(0, page - 1);
    updateTrack();
  });

  nextBtn?.addEventListener("click", () => {
    page = Math.min(maxPage(), page + 1);
    updateTrack();
  });

  if (eventCalendarResizeHandler) {
    window.removeEventListener("resize", eventCalendarResizeHandler);
  }

  eventCalendarResizeHandler = () => {
    const nextEventsPerPage = getEventsPerPage();
    if (nextEventsPerPage === eventsPerPage) return;

    eventsPerPage = nextEventsPerPage;
    renderPages();
    ensureSelectedVisible();
    setSelected(selectedIndex);
  };

  window.addEventListener("resize", eventCalendarResizeHandler);

  renderPages();
  setSelected(selectedIndex);
  ensureSelectedVisible();
}

async function renderEventCalendar() {
  appEl.innerHTML = `
    <section class="panel event-calendar-panel">
      <h2 class="section-title">Lịch lễ hội</h2>
      <p class="lead">Khám phá các lễ hội theo trình tự ngày tháng. Nhấn vào từng biểu tượng để xem nội dung chi tiết.</p>
      <div class="event-carousel-shell">
        <button class="event-nav" id="event-prev" aria-label="Lễ hội trước">←</button>
        <div class="event-circle-viewport">
          <div class="event-circle-track" id="event-circle-track"></div>
        </div>
        <button class="event-nav" id="event-next" aria-label="Lễ hội sau">→</button>
      </div>
      <div id="event-details" class="event-details"></div>
    </section>
  `;

  const events = await getEventCalendar();
  const recommendedIndex = getRecommendedEventIndex(events);
  setupEventCalendar(events, recommendedIndex);
}

async function seedData() {
  let users = getUsers();
  if (!users.length) {
    users = [
      {
        id: "admin-001",
        name: "Quản trị viên",
        email: "admin@viettam.local",
        password: "123456",
        role: "admin"
      }
    ];
    saveUsers(users);
  }

  if (!localStorage.getItem(STORAGE_KEYS.comments)) {
    saveComments([]);
  }

  if (!localStorage.getItem(STORAGE_KEYS.session)) {
    saveSession({ currentUserId: null });
  }

  const storedPostsVersion = localStorage.getItem(STORAGE_KEYS.postsVersion);
  if (storedPostsVersion !== POSTS_DATA_VERSION) {
    // Reset old cached full posts to avoid localStorage overflow.
    localStorage.removeItem("viettam_posts");
    localStorage.setItem(STORAGE_KEYS.postsVersion, POSTS_DATA_VERSION);
  }

  if (!localStorage.getItem(STORAGE_KEYS.localPosts)) {
    localStorage.setItem(STORAGE_KEYS.localPosts, JSON.stringify([]));
  }

  await loadCuratedPostsFromFiles();
}

function updateAuthUI() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    authZoneEl.innerHTML = `
      <a href="#login">Đăng nhập</a>
      <a href="#register">Đăng ký</a>
    `;
  } else {
    authZoneEl.innerHTML = `
      <span class="badge">Xin chào, ${escapeHtml(currentUser.name)}</span>
      <button data-action="logout">Đăng xuất</button>
    `;
  }
}

function setActiveNav(route) {
  navEl.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
  const target = navEl.querySelector(`[data-route="${route}"]`);
  if (target) target.classList.add("active");
}

function renderLibrary() {
  appEl.innerHTML = `
    <section class="panel library-categories-panel">
      <div class="library-category-grid">
        <a class="library-category-card library-buddhist" href="#category/phat-giao">
          <p class="library-category-kicker">Dấu ấn Phật giáo</p>
          <h3>Chùa cổ và trí tuệ nhập thế</h3>
          <p class="library-category-summary">Thiền quán, từ bi và hành trình an trú giữa đời sống hiện đại.</p>
          <div class="library-category-detail" data-library-key="buddhist">Đang tải nội dung...</div>
          <span class="library-category-cta">Xem danh sách bài viết →</span>
        </a>

        <a class="library-category-card library-catholic" href="#category/thien-chua-giao">
          <p class="library-category-kicker">Thiên Chúa giáo</p>
          <h3>Nhà thờ, phụng vụ và phục vụ cộng đồng</h3>
          <p class="library-category-summary">Kiến trúc thánh đường và đời sống đức tin trong dòng chảy Việt Nam.</p>
          <div class="library-category-detail" data-library-key="catholic">Đang tải nội dung...</div>
          <span class="library-category-cta">Xem danh sách bài viết →</span>
        </a>

        <a class="library-category-card library-folk" href="#category/khac">
          <p class="library-category-kicker">Tín ngưỡng và tôn giáo khác</p>
          <h3>Bản địa, giao thoa và ký ức cộng đồng</h3>
          <p class="library-category-summary">Thờ Mẫu, đình làng và những thực hành tâm linh dân gian sống động.</p>
          <div class="library-category-detail" data-library-key="folk">Đang tải nội dung...</div>
          <span class="library-category-cta">Xem danh sách bài viết →</span>
        </a>
      </div>
    </section>
  `;

  setupLibraryCategoryCards();
  hydrateLibraryCategoryDetails();
}

async function getLibraryCategoryIntros() {
  if (libraryCategoryIntroCache) return libraryCategoryIntroCache;

  const entries = await Promise.all(
    Object.entries(LIBRARY_CATEGORY_INTRO_PATHS).map(async ([key, filePath]) => {
      try {
        const response = await fetch(encodeURI(filePath));
        if (!response.ok) throw new Error("Không tải được nội dung.");
        const markdown = await response.text();
        return [key, formatPostContent(markdown)];
      } catch {
        return [key, "<p>Đang cập nhật nội dung.</p>"];
      }
    })
  );

  libraryCategoryIntroCache = Object.fromEntries(entries);
  return libraryCategoryIntroCache;
}

async function hydrateLibraryCategoryDetails() {
  const details = Array.from(document.querySelectorAll(".library-category-detail[data-library-key]"));
  if (!details.length) return;

  const intros = await getLibraryCategoryIntros();
  details.forEach((detailEl) => {
    const key = detailEl.dataset.libraryKey;
    detailEl.innerHTML = intros[key] || "<p>Đang cập nhật nội dung.</p>";
  });
}

function setupLibraryCategoryCards() {
  const grid = document.querySelector(".library-category-grid");
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll(".library-category-card"));
  if (!cards.length) return;

  const clearExpandedState = () => {
    grid.classList.remove("has-expanded-card");
    cards.forEach((card) => {
      card.classList.remove("is-expanded", "is-hidden");
    });
  };

  const setExpandedCard = (activeCard) => {
    grid.classList.add("has-expanded-card");
    cards.forEach((card) => {
      card.classList.toggle("is-expanded", card === activeCard);
      card.classList.toggle("is-hidden", card !== activeCard);
    });
  };

  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => setExpandedCard(card));
    card.addEventListener("focus", () => setExpandedCard(card));
  });

  grid.addEventListener("mouseleave", clearExpandedState);
  grid.addEventListener("focusout", (event) => {
    if (!grid.contains(event.relatedTarget)) {
      clearExpandedState();
    }
  });
}

function renderIntroduction() {
  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">KHÁM PHÁ CHIỀU SÂU TÂM LINH: NƠI GIAO THOA CỦA DI SẢN VÀ TÂM HỒN</h2>
      <article class="content-article">
        <p class="lead"><strong>Chào mừng bạn đến với hành trình đi tìm những giá trị tĩnh lặng giữa nhịp sống hối hả.</strong></p>
        
        <p>Việt Nam không chỉ là một dải đất hình chữ S với những danh lam thắng cảnh hùng vĩ, mà còn là nơi lưu giữ một kho tàng tâm linh đồ sộ, nơi tiếng chuông chùa thanh tịnh hòa quyện cùng tiếng chuông nhà thờ trầm mặc, nơi những triết lý cao siêu của nhân loại gặp gỡ lòng hiếu nghĩa mộc mạc của đạo thờ cúng tổ tiên.</p>

        <h3>Sứ mệnh của chúng tôi</h3>
        <p>"Bản đồ tâm linh Việt" ra đời với tâm thế của một người kể chuyện di sản trong kỷ nguyên số. Chúng tôi mang sứ mệnh hợp nhất những mảnh ghép tinh hoa của Phật giáo, Công giáo cùng các đức tin bản địa thuần khiết thành một bức tranh toàn cảnh sống động. Không chỉ dừng lại ở việc phục dựng dòng chảy lịch sử, chúng tôi khát khao đánh thức vẻ đẹp của lòng bao dung và tinh thần hòa hợp tôn giáo, sợi chỉ đỏ vô hình nhưng bền bỉ đã kết nối tâm hồn người Việt suốt hàng ngàn năm qua.</p>

        <h3>Bạn sẽ tìm thấy gì tại đây?</h3>
        <ul>
          <li><strong>Dòng chảy Lịch sử:</strong> Những cột mốc vàng son và những thăng trầm của các tôn giáo tại Việt Nam.</li>
          <li><strong>Di sản Kiến trúc:</strong> Chiêm ngưỡng vẻ đẹp của những ngôi chùa cổ, nhà thờ đá hay tòa thánh nguy nga qua lăng kính văn hóa.</li>
          <li><strong>Triết lý & Cuộc sống:</strong> Những bài học về sự bình an, lòng trắc ẩn và cách áp dụng trí tuệ tâm linh vào đời sống hiện đại.</li>
          <li><strong>Câu chuyện Di sản:</strong> Hành trình số hóa và bảo tồn những giá trị văn hóa lịch sử đang dần bị mai một.</li>
          <li><strong>Lịch Lễ hội & Hành hương:</strong> Điểm hẹn của những sắc màu văn hóa. Cập nhật thông tin về các ngày lễ trọng đại, các lễ hội dân gian truyền thống và những hành trình hành hương tìm về đất thánh trên khắp ba miền.</li>
        </ul>

        <blockquote>
          <p><em>"Tâm linh không phải là điều gì đó xa rời thực tế, mà chính là bến đỗ bình yên để mỗi người tìm lại chính mình."</em></p>
        </blockquote>

        <p>Hãy cùng chúng tôi lật mở từng trang sử, bước qua từng ngưỡng cửa của những ngôi đền đài, để thấy rằng: Trong chiều sâu của đức tin, chính là vẻ đẹp bất tận của con người Việt Nam.</p>

        <div class="actions">
          <a class="button-link button-primary" href="#library">Khám phá thư viện tôn giáo</a>
          <a class="button-link button-primary" href="#events">Xem lịch lễ hội</a>
        </div>
      </article>
    </section>
  `;
}

function renderPostCard(post) {
  return `
    <article class="card">
      <img src="${escapeHtml(post.image || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80")}" alt="${escapeHtml(post.title)}" />
      <div class="card-body">
        <p class="meta">${escapeHtml(formatCategoryLabel(post.category))} · ${formatDate(post.createdAt)} · ${escapeHtml(getAuthorName(post))} · ${estimateReadTime(post.content)}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt || "")}</p>
        <div class="actions">
          <a class="button-link" href="#post/${post.id}">Đọc bài viết</a>
        </div>
      </div>
    </article>
  `;
}

function buildRegionHighlights(posts) {
  const THANH_HOA_LAT = 20;
  const PHAN_THIET_LAT = 13;

  const approvedWithLocation = posts
    .filter((p) => p.location && Number.isFinite(p.location.lat))
    .sort((a, b) => b.location.lat - a.location.lat);

  const north = approvedWithLocation.filter((p) => p.location.lat > THANH_HOA_LAT);
  const central = approvedWithLocation.filter(
    (p) => p.location.lat <= THANH_HOA_LAT && p.location.lat >= PHAN_THIET_LAT
  );
  const south = approvedWithLocation.filter((p) => p.location.lat < PHAN_THIET_LAT);

  const renderRegionCard = (title, list, fallbackText, isOpen = false) => `
    <details class="region-card" ${isOpen ? "open" : ""}>
      <summary class="region-summary">
        <span>${title}</span>
        <span class="region-count">${list.length}</span>
      </summary>
      <div class="region-list">
        ${
          list.length
            ? list
                .map(
                  (item, index) =>
                    `<a href="#post/${item.id}">${index + 1}. ${escapeHtml(item.location?.name || item.title)}</a>`
                )
                .join("")
            : `<p>${fallbackText}</p>`
        }
      </div>
    </details>
  `;

  return [
    renderRegionCard("Miền Bắc", north, "Đang cập nhật địa điểm.", true),
    renderRegionCard("Miền Trung ", central, "Đang cập nhật địa điểm."),
    renderRegionCard("Miền Nam", south, "Đang cập nhật địa điểm.")
  ].join("");
}

function renderHome() {
  const posts = getPosts().filter((p) => p.status === "approved");
  const newest = [...posts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);
  const regionHighlights = buildRegionHighlights(posts);

  appEl.innerHTML = `
    <section class="carousel-container">
      <div class="carousel">
        <div class="carousel-slide">
          <img class="carousel-media" src="./content/images/homepage/home1.jpg" alt="Hình nền trang chủ 1" loading="lazy" />
          <div class="slide-content">
            <p class="slide-kicker">Hành trình về sự an lạc</p>
            <h2>Bản đồ Tâm linh Việt</h2>
            <p>Hành trình tìm về sự an lạc và thấu hiểu chiều sâu văn hóa Việt qua bản đồ tương tác.</p>
            <div class="actions">
              <button class="button-link button-primary" id="open-fullscreen-map">Khám phá bản đồ</button>
            </div>
          </div>
        </div>
        <div class="carousel-slide">
          <video class="carousel-media" autoplay muted loop playsinline preload="metadata" aria-label="Video nền trang chủ 2">
            <source src="./content/images/homepage/home2.mp4" type="video/mp4" />
          </video>
          <div class="slide-content">
            <p class="slide-kicker">Dấu ấn Phật giáo</p>
            <h2>Chùa cổ và thiền quán</h2>
            <p>Chùa cổ, thiền quán, tư tưởng vô ngã và hành trình nội tâm qua các địa điểm thiêng liêng.</p>
            <div class="actions">
              <a class="button-link button-primary" href="#category/phat-giao">Truy cập</a>
            </div>
          </div>
        </div>
        <div class="carousel-slide">
          <video class="carousel-media" autoplay muted loop playsinline preload="metadata" aria-label="Video nền trang chủ 3">
            <source src="./content/images/homepage/home3.mp4" type="video/mp4" />
          </video>
          <div class="slide-content">
            <p class="slide-kicker">Thiên Chúa giáo</p>
            <h2>Nhà thờ và tâm linh</h2>
            <p>Kiến trúc nhà thờ, phục vụ cộng đồng và giá trị nhân ái trong tín ngưỡng phương Tây.</p>
            <div class="actions">
              <a class="button-link button-primary" href="#category/thien-chua-giao">Truy cập</a>
            </div>
          </div>
        </div>
        <div class="carousel-slide">
          <video class="carousel-media" autoplay muted loop playsinline preload="metadata" aria-label="Video nền trang chủ 4">
            <source src="./content/images/homepage/home4.mp4" type="video/mp4" />
          </video>
          <div class="slide-content">
            <p class="slide-kicker">Tín ngưỡng khác</p>
            <h2>Đa dạng tôn giáo</h2>
            <p>Thờ Mẫu, đình làng, đạo giáo và những góc nhìn liên văn hóa từ các tín ngưỡng bản địa.</p>
            <div class="actions">
              <a class="button-link button-primary" href="#category/khac">Truy cập</a>
            </div>
          </div>
        </div>
      </div>

      <div class="carousel-controls">
        <button class="carousel-nav carousel-prev" data-direction="prev">←</button>
        <div class="carousel-indicators">
          <button class="indicator active" data-slide="0"></button>
          <button class="indicator" data-slide="1"></button>
          <button class="indicator" data-slide="2"></button>
          <button class="indicator" data-slide="3"></button>
        </div>
        <button class="carousel-nav carousel-next" data-direction="next">→</button>
      </div>
    </section>

    <section class="panel map-showcase">
      <p class="mini-title">Interactive map</p>
      <h3 class="section-title">Bản đồ tương tác</h3>
      <div class="map-grid-layout">
        <aside class="map-sidebar">
          ${regionHighlights}
        </aside>
        <div class="map-core">
          <div class="filter-chips">
            <span>Tất cả</span>
            <span>Phật giáo</span>
            <span>Thiên Chúa giáo</span>
            <span>Tín ngưỡng khác</span>
          </div>
          <div id="map"></div>
        </div>
        <aside class="map-insight">
          
          <ol>
            <li>Phật giáo Việt Nam</li>
            <li>Giáo Phận Việt Nam</li>
            <li>Các tín ngưỡng bản địa</li>
          </ol>
          
          <ul>
            <li><a href="https://eticket.hueworldheritage.org.vn/vedientu">Trung tâm bảo tồn Cố Đô Huế</a></li>
            <li><a href="https://tonggiaophanhue.org/">Giáo phận Huế.</li>
            <li><a href="https://nlv.gov.vn/ ">Thư viện Quốc gia (Mục tư liệu Hán Nôm)</li>
          </ul>
        </aside>
      </div>
    </section>

    <div class="fullscreen-map-modal" id="fullscreen-map-modal">
      <div class="fullscreen-map-content">
        <button class="fullscreen-map-close" id="close-fullscreen-map">✕</button>
        <div id="fullscreen-map"></div>
      </div>
    </div>

    <section class="panel">
      <h3 class="section-title">Chuỗi bài viết theo danh mục</h3>
      <div class="grid">
        <article class="card"><div class="card-body"><h3>Thư viện tôn giáo</h3><p>Khám phá ba truyền thống tôn giáo chính: Phật giáo, Thiên Chúa giáo, và các tín ngưỡng bản địa.</p><a class="button-link button-primary" href="#library">Truy cập</a></div></article>
      </div>
    </section>

    <section class="panel">
      <h3 class="section-title">Bài viết mới nhất</h3>
      <div class="grid cols-3">
        ${newest.length ? newest.map(renderPostCard).join("") : '<p>Chưa có bài viết nào đã được duyệt.</p>'}
      </div>
    </section>
  `;

  setupCarousel(posts);
  initMap(posts);
}

function setupCarousel(posts) {
  let currentSlide = 0;
  const slides = document.querySelectorAll(".carousel-slide");
  const indicators = document.querySelectorAll(".carousel-indicators .indicator");
  const carousel = document.querySelector(".carousel");

  function showSlide(n) {
    currentSlide = (n + slides.length) % slides.length;
    carousel.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    indicators.forEach((ind, idx) => {
      ind.classList.toggle("active", idx === currentSlide);
    });
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  function prevSlide() {
    showSlide(currentSlide - 1);
  }

  // Event listeners for navigation
  document.querySelector(".carousel-next")?.addEventListener("click", nextSlide);
  document.querySelector(".carousel-prev")?.addEventListener("click", prevSlide);

  // Event listeners for indicators
  indicators.forEach((indicator) => {
    indicator.addEventListener("click", (e) => {
      const slideNum = parseInt(e.target.dataset.slide);
      showSlide(slideNum);
    });
  });

  // Fullscreen map button
  document.getElementById("open-fullscreen-map")?.addEventListener("click", () => {
    const modal = document.getElementById("fullscreen-map-modal");
    if (modal) {
      modal.classList.add("active");
      setTimeout(() => initFullscreenMap(posts), 100);
    }
  });

  document.getElementById("close-fullscreen-map")?.addEventListener("click", () => {
    const modal = document.getElementById("fullscreen-map-modal");
    if (modal) {
      modal.classList.remove("active");
      if (window.fullscreenLeafletMap) {
        window.fullscreenLeafletMap.remove();
        window.fullscreenLeafletMap = null;
      }
    }
  });

  // Close modal when clicking outside
  document.getElementById("fullscreen-map-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "fullscreen-map-modal") {
      e.target.classList.remove("active");
      if (window.fullscreenLeafletMap) {
        window.fullscreenLeafletMap.remove();
        window.fullscreenLeafletMap = null;
      }
    }
  });

  // Auto-play carousel every 30 seconds
  let autoplayInterval = setInterval(nextSlide, 30000);

  // Pause autoplay on user interaction
  const resetAutoplay = () => {
    clearInterval(autoplayInterval);
    autoplayInterval = setInterval(nextSlide, 30000);
  };

  document.querySelector(".carousel-next")?.addEventListener("click", resetAutoplay);
  document.querySelector(".carousel-prev")?.addEventListener("click", resetAutoplay);
  indicators.forEach((indicator) => {
    indicator.addEventListener("click", resetAutoplay);
  });
}

function initFullscreenMap(posts) {
  const mapEl = document.getElementById("fullscreen-map");
  if (!mapEl || typeof window.L === "undefined") return;

  if (window.fullscreenLeafletMap) {
    window.fullscreenLeafletMap.remove();
    window.fullscreenLeafletMap = null;
  }

  window.fullscreenLeafletMap = window.L.map("fullscreen-map").setView([16.1, 106.2], 5);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(window.fullscreenLeafletMap);

  posts
    .filter((p) => p.location && Number.isFinite(p.location.lat) && Number.isFinite(p.location.lng))
    .forEach((post) => {
      const marker = window.L.marker([post.location.lat, post.location.lng]).addTo(window.fullscreenLeafletMap);
      marker.bindPopup(`
        <strong>${escapeHtml(post.location.name || "Địa điểm")}</strong><br />
        <a href="#post/${post.id}">${escapeHtml(post.title)}</a>
      `);
    });
}

function initMap(posts) {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof window.L === "undefined") return;

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  leafletMap = window.L.map("map").setView([16.1, 106.2], 5);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(leafletMap);

  posts
    .filter((p) => p.location && Number.isFinite(p.location.lat) && Number.isFinite(p.location.lng))
    .forEach((post) => {
      const marker = window.L.marker([post.location.lat, post.location.lng]).addTo(leafletMap);
      marker.bindPopup(`
        <strong>${escapeHtml(post.location.name || "Địa điểm")}</strong><br />
        <a href="#post/${post.id}">${escapeHtml(post.title)}</a>
      `);
    });
}

function renderCategory(slug) {
  const categoryName = CATEGORY_MAP[slug];
  if (!categoryName) {
    appEl.innerHTML = `<section class="panel"><h3>Không tìm thấy nhóm bài viết.</h3></section>`;
    return;
  }

  const posts = getPosts().filter((p) => p.status === "approved" && p.category === categoryName);

  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">${escapeHtml(formatCategoryLabel(categoryName))}</h2>
      <p class="lead">Tổng số ${posts.length} bài viết đã được duyệt trong nhóm này.</p>
      <div class="grid cols-3">
        ${posts.length ? posts.map(renderPostCard).join("") : '<p>Chưa có bài viết trong nhóm này.</p>'}
      </div>
    </section>
  `;
}

function renderPost(postId) {
  const post = getPosts().find((p) => p.id === postId);
  if (!post || post.status !== "approved") {
    appEl.innerHTML = `<section class="panel"><h3>Bài viết không tồn tại hoặc chưa được duyệt.</h3></section>`;
    return;
  }

  const comments = getComments()
    .filter((c) => c.postId === post.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const users = getUsers();
  const currentUser = getCurrentUser();
  const approvedPosts = getPosts().filter((p) => p.status === "approved" && p.id !== post.id);
  const recommendations = [...approvedPosts].sort(() => Math.random() - 0.5).slice(0, 3);
  const renderedPostContent = removeFirstContentFigure(
    post.formattedContent || formatPostContent(post.content, { postTitle: post.title })
  );
  const podcastPath = getPodcastPathForPost(post);
  const encodedPodcastPath = podcastPath ? encodeURI(podcastPath) : "";
  const podcastPlayerMarkup = podcastPath
    ? `
      <section class="podcast-player" aria-label="Podcast cho bài viết">
        <p class="podcast-title">Podcast: nghe bài viết trong khi đọc</p>
        <audio controls preload="none" src="${escapeHtml(encodedPodcastPath)}">
          Trình duyệt của bạn chưa hỗ trợ phát audio.
        </audio>
      </section>
    `
    : "";

  appEl.innerHTML = `
    <article class="panel">
      <p class="meta">${escapeHtml(formatCategoryLabel(post.category))} · ${formatDate(post.createdAt)} · ${escapeHtml(getAuthorName(post))}</p>
      <h2 class="post-title">${escapeHtml(post.title)}</h2>
      ${podcastPlayerMarkup}
      ${post.image ? `<img class="post-hero-image" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" />` : ""}
      <div class="post-content">${renderedPostContent}</div>
      ${
        post.location
          ? `<div class="info-box">Địa điểm liên kết: <strong>${escapeHtml(post.location.name || "Đang cập nhật")}</strong></div>`
          : ""
      }
    </article>

    <section class="panel">
      <h3 class="section-title">Bình luận</h3>
      ${
        currentUser
          ? `
            <form id="comment-form" data-post-id="${post.id}">
              <label>Nội dung bình luận
                <textarea name="content" placeholder="Viết cảm nhận của bạn..." required></textarea>
              </label>
              <div class="actions"><button class="button-primary" type="submit">Gửi bình luận</button></div>
            </form>
          `
          : `<p class="info-box">Bạn cần <a href="#login">đăng nhập</a> để bình luận.</p>`
      }
      <div class="grid">
        ${
          comments.length
            ? comments
                .map((comment) => {
                  const author = users.find((u) => u.id === comment.userId);
                  return `<article class="comment"><p class="meta">${escapeHtml(author?.name || "Thành viên")} · ${formatDate(comment.createdAt)}</p><p>${escapeHtml(comment.content)}</p></article>`;
                })
                .join("")
            : `<p>Chưa có bình luận nào.</p>`
        }
      </div>
    </section>

    <section class="panel">
      <h3 class="section-title">Gợi ý bài viết tiếp theo</h3>
      <div class="grid cols-3">
        ${recommendations.length ? recommendations.map(renderPostCard).join("") : "<p>Chưa đủ bài viết để gợi ý.</p>"}
      </div>
    </section>
  `;
}

function renderLogin() {
  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">Đăng nhập thành viên</h2>
      <form id="login-form">
        <label>Email
          <input type="email" name="email" required />
        </label>
        <label>Mật khẩu
          <input type="password" name="password" required />
        </label>
        <div class="actions">
          <button class="button-primary" type="submit">Đăng nhập</button>
          <a class="button-link" href="#register">Tạo tài khoản mới</a>
        </div>
      </form>
    </section>
  `;
}

function renderRegister() {
  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">Đăng ký thành viên</h2>
      <form id="register-form">
        <label>Họ tên
          <input type="text" name="name" minlength="2" required />
        </label>
        <label>Email
          <input type="email" name="email" required />
        </label>
        <label>Mật khẩu
          <input type="password" name="password" minlength="6" required />
        </label>
        <div class="actions">
          <button class="button-primary" type="submit">Đăng ký</button>
          <a class="button-link" href="#login">Đã có tài khoản</a>
        </div>
      </form>
    </section>
  `;
}

function renderWrite() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    appEl.innerHTML = `
      <section class="panel">
        <h2 class="section-title">Viết bài</h2>
        <p class="info-box">Bạn cần <a href="#login">đăng nhập</a> để viết bài.</p>
      </section>
    `;
    return;
  }

  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">Gửi bài viết mới</h2>
      <p class="lead">Bài viết sẽ ở trạng thái chờ duyệt. Admin sẽ duyệt và gán vào nhóm bài viết phù hợp.</p>
      <form id="write-form">
        <label>Tiêu đề
          <input type="text" name="title" required minlength="8" />
        </label>
        <label>Tóm tắt ngắn
          <input type="text" name="excerpt" required minlength="12" />
        </label>
        <label>Nội dung
          <textarea name="content" required minlength="30"></textarea>
        </label>
        <label>Hình đại diện (URL)
          <input type="url" name="image" placeholder="https://..." />
        </label>
        <div class="grid cols-2">
          <label>Tên địa điểm (tùy chọn)
            <input type="text" name="locationName" placeholder="Tên đền/chùa/nhà thờ..." />
          </label>
          <label>Tọa độ (lat,lng) tùy chọn
            <input type="text" name="latlng" placeholder="10.7798,106.6990" />
          </label>
        </div>
        <div class="actions">
          <button class="button-primary" type="submit">Gửi bài để duyệt</button>
        </div>
      </form>
    </section>
  `;
}

function renderAdmin() {
  if (!isAdmin()) {
    appEl.innerHTML = `
      <section class="panel">
        <h2 class="section-title">Bảng điều khiển quản trị</h2>
        <p class="info-box">Chỉ admin mới có quyền truy cập trang này.</p>
      </section>
    `;
    return;
  }

  const users = getUsers();
  const posts = getPosts();
  const comments = getComments();
  const pending = posts.filter((p) => p.status === "pending");
  const approved = posts.filter((p) => p.status === "approved");

  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">Dashboard Quản trị</h2>
      <div class="grid cols-3">
        <article class="card"><div class="card-body"><h3>${users.length}</h3><p>Thành viên</p></div></article>
        <article class="card"><div class="card-body"><h3>${approved.length}</h3><p>Bài đã duyệt</p></div></article>
        <article class="card"><div class="card-body"><h3>${pending.length}</h3><p>Bài chờ duyệt</p></div></article>
      </div>
    </section>

    <section class="panel">
      <h3 class="section-title">Bảng duyệt bài viết</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Tác giả</th>
              <th>Ngày gửi</th>
              <th>Gán nhóm</th>
              <th>Xử lý</th>
            </tr>
          </thead>
          <tbody>
            ${
              pending.length
                ? pending
                    .map(
                      (post) => `
                        <tr>
                          <td>${escapeHtml(post.title)}</td>
                          <td>${escapeHtml(getAuthorName(post))}</td>
                          <td>${formatDate(post.createdAt)}</td>
                          <td>
                            <select data-action="pick-category" data-post-id="${post.id}">
                              <option value="">-- Chọn nhóm --</option>
                              <option value="Dau an Phat giao">Dấu ấn Phật giáo</option>
                              <option value="Thien chua giao">Thiên Chúa giáo</option>
                              <option value="Tin nguong va ton giao khac">Tín ngưỡng và tôn giáo khác</option>
                            </select>
                          </td>
                          <td>
                            <div class="actions">
                              <button class="button-primary" data-action="approve-post" data-post-id="${post.id}">Duyệt</button>
                              <button class="button-danger" data-action="reject-post" data-post-id="${post.id}">Từ chối</button>
                            </div>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `<tr><td colspan="5">Không có bài nào đang chờ duyệt.</td></tr>`
            }
          </tbody>
        </table>
      </div>
      <p class="meta">Tổng số bình luận hiện tại: ${comments.length}</p>
    </section>

    <section class="panel">
      <h3 class="section-title">Quản lý bài viết đã duyệt</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Nhóm</th>
              <th>Tác giả</th>
              <th>Ngày duyệt</th>
              <th>Xử lý</th>
            </tr>
          </thead>
          <tbody>
            ${
              approved.length
                ? approved
                    .map(
                      (post) => `
                        <tr>
                          <td>${escapeHtml(post.title)}</td>
                          <td>${escapeHtml(formatCategoryLabel(post.category))}</td>
                          <td>${escapeHtml(getAuthorName(post))}</td>
                          <td>${formatDate(post.createdAt)}</td>
                          <td>
                            <button class="button-danger" data-action="delete-post" data-post-id="${post.id}">Xóa bài viết</button>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `<tr><td colspan="5">Chưa có bài viết nào đã được duyệt.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "home";
  const [route, param] = hash.split("/");
  return { route, param, raw: hash };
}

function render() {
  updateAuthUI();
  const { route, param, raw } = parseRoute();

  if (route === "home") {
    setActiveNav("home");
    renderHome();
    return;
  }
  if (route === "library") {
    setActiveNav("library");
    renderLibrary();
    return;
  }
  if (route === "events") {
    setActiveNav("events");
    renderEventCalendar();
    return;
  }
  if (route === "introduction") {
    setActiveNav("introduction");
    renderIntroduction();
    return;
  }
  if (route === "category") {
    setActiveNav(`category/${param || ""}`);
    renderCategory(param);
    return;
  }
  if (route === "post") {
    setActiveNav("");
    renderPost(param);
    return;
  }
  if (route === "login") {
    setActiveNav("");
    renderLogin();
    return;
  }
  if (route === "register") {
    setActiveNav("");
    renderRegister();
    return;
  }
  if (route === "write") {
    setActiveNav("write");
    renderWrite();
    return;
  }
  if (route === "admin") {
    setActiveNav("admin");
    renderAdmin();
    return;
  }

  appEl.innerHTML = `<section class="panel"><h3>Không tìm thấy trang: ${escapeHtml(raw)}</h3><a class="button-link" href="#home">Về trang chủ</a></section>`;
}

function handleAuthSubmit(event) {
  const form = event.target;
  if (form.id === "login-form") {
    event.preventDefault();
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    const user = getUsers().find((u) => u.email.toLowerCase() === email && u.password === password);
    if (!user) {
      alert("Thông tin đăng nhập không đúng.");
      return;
    }

    saveSession({ currentUserId: user.id });
    window.location.hash = "#home";
    render();
    return;
  }

  if (form.id === "register-form") {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!name || !email || password.length < 6) {
      alert("Vui lòng nhập đủ thông tin hợp lệ.");
      return;
    }

    const users = getUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      alert("Email đã tồn tại.");
      return;
    }

    const user = {
      id: uid("user"),
      name,
      email,
      password,
      role: "member"
    };

    users.push(user);
    saveUsers(users);
    saveSession({ currentUserId: user.id });
    window.location.hash = "#home";
    render();
  }
}

function parseLatLng(raw) {
  if (!raw) return null;
  const [latRaw, lngRaw] = raw.split(",");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function handleWriteSubmit(event) {
  const form = event.target;
  if (form.id !== "write-form") return;
  event.preventDefault();

  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Bạn cần đăng nhập để viết bài.");
    window.location.hash = "#login";
    render();
    return;
  }

  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();
  const excerpt = String(formData.get("excerpt") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const image = String(formData.get("image") || "").trim();
  const locationName = String(formData.get("locationName") || "").trim();
  const latlng = parseLatLng(String(formData.get("latlng") || "").trim());

  if (!title || !excerpt || content.length < 30) {
    alert("Thông tin bài viết chưa hợp lệ.");
    return;
  }

  const post = {
    id: uid("post"),
    title,
    excerpt,
    content,
    formattedContent: formatPostContent(content),
    category: "Tin nguong va ton giao khac",
    status: "pending",
    sourceType: "local",
    createdAt: new Date().toISOString(),
    authorId: currentUser.id,
    image: image || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    location: locationName && latlng ? { name: locationName, ...latlng } : null
  };

  const posts = getPosts();
  posts.push(post);
  savePosts(posts);

  alert("Gửi bài thành công. Bài viết đang chờ admin duyệt.");
  window.location.hash = "#home";
  render();
}

function handleCommentSubmit(event) {
  const form = event.target;
  if (form.id !== "comment-form") return;
  event.preventDefault();

  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Bạn cần đăng nhập để bình luận.");
    window.location.hash = "#login";
    render();
    return;
  }

  const postId = form.dataset.postId;
  const content = String(new FormData(form).get("content") || "").trim();
  if (!content) return;

  const comments = getComments();
  comments.push({
    id: uid("comment"),
    postId,
    userId: currentUser.id,
    content,
    createdAt: new Date().toISOString()
  });
  saveComments(comments);
  renderPost(postId);
}

function handleAdminAction(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const postId = btn.dataset.postId;
  if (!postId || !isAdmin()) return;

  const posts = getPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) return;

  if (post.sourceType === "curated" && action !== "logout") {
    alert("Bài viết hệ thống không chỉnh sửa trong localStorage. Hãy sửa trực tiếp file nguồn nội dung.");
    return;
  }

  if (action === "approve-post") {
    const selector = document.querySelector(`select[data-post-id="${postId}"]`);
    const category = selector?.value;
    if (!category) {
      alert("Vui lòng chọn nhóm bài viết trước khi duyệt.");
      return;
    }

    post.status = "approved";
    post.category = category;
    savePosts(posts);
    renderAdmin();
    return;
  }

  if (action === "reject-post") {
    const filtered = posts.filter((p) => p.id !== postId);
    savePosts(filtered);
    renderAdmin();
    return;
  }

  if (action === "delete-post") {
    const accepted = window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?");
    if (!accepted) return;

    const filteredPosts = posts.filter((p) => p.id !== postId);
    savePosts(filteredPosts);

    const filteredComments = getComments().filter((c) => c.postId !== postId);
    saveComments(filteredComments);

    renderAdmin();
    return;
  }

  if (action === "logout") {
    saveSession({ currentUserId: null });
    window.location.hash = "#home";
    render();
  }
}

function setupEvents() {
  window.addEventListener("hashchange", render);

  document.body.addEventListener("submit", (event) => {
    handleAuthSubmit(event);
    handleWriteSubmit(event);
    handleCommentSubmit(event);
  });

  document.body.addEventListener("click", (event) => {
    const logoutBtn = event.target.closest('button[data-action="logout"]');
    if (logoutBtn) {
      saveSession({ currentUserId: null });
      render();
      return;
    }

    handleAdminAction(event);
  });
}

(async function boot() {
  await seedData();
  setupEvents();
  render();
})();
