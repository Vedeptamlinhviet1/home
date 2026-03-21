const STORAGE_KEYS = {
  users: "viettam_users",
  posts: "viettam_posts",
  comments: "viettam_comments",
  session: "viettam_session"
};

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

let leafletMap;

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

function getPosts() {
  return parseJSON(localStorage.getItem(STORAGE_KEYS.posts), []);
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(posts));
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

  let posts = getPosts();
  if (!posts.length) {
    try {
      const res = await fetch("./data/demo-posts.json");
      const demo = await res.json();
      posts = demo.map((post) => ({
        ...post,
        id: post.id || uid("post")
      }));
      savePosts(posts);
    } catch {
      posts = [];
      savePosts(posts);
    }
  }
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
    <section class="hero-banner">
      <div class="hero-overlay">
        <h2>Thư viện tôn giáo</h2>
        <p>Khám phá ba truyền thống tôn giáo chính tại Việt Nam qua những bài viết chuyên sâu.</p>
      </div>
    </section>

    <section class="panel">
      <h3 class="section-title">Chọn danh mục</h3>
      <p class="lead">Tìm hiểu về các truyền thống tôn giáo và các địa điểm tâm linh tại Việt Nam.</p>
      <div class="grid cols-3">
        <article class="card"><div class="card-body"><h3>Dấu ấn Phật giáo</h3><p>Chùa cổ, thiền quán, tư tưởng vô ngã và hành trình nội tâm.</p><a class="button-link button-primary" href="#category/phat-giao">Truy cập</a></div></article>
        <article class="card"><div class="card-body"><h3>Thiên Chúa giáo</h3><p>Kiến trúc nhà thờ, phục vụ cộng đồng và giá trị nhân ái.</p><a class="button-link button-primary" href="#category/thien-chua-giao">Truy cập</a></div></article>
        <article class="card"><div class="card-body"><h3>Tín ngưỡng và tôn giáo khác</h3><p>Thờ Mẫu, đình làng, đạo giáo và những góc nhìn liên văn hóa.</p><a class="button-link button-primary" href="#category/khac">Truy cập</a></div></article>
      </div>
    </section>
  `;
}

function renderIntroduction() {
  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">Giới thiệu</h2>
      <article class="content-article">
        <h3>Tâm linh Việt - Được Viết Từ Tim</h3>
        <p>Vẻ đẹp tâm linh Việt là một khoảng không gian để khám phá và chia sẻ những điều sâu sắc về tâm linh, tôn giáo và văn hóa Việt Nam.</p>
        <p><em>Nội dung đang được cập nhật...</em></p>
        <div class="actions">
          <a class="button-link button-primary" href="#library">Khám phá thư viện tôn giáo</a>
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
  const approvedWithLocation = posts.filter((p) => p.location && Number.isFinite(p.location.lat));
  const north = approvedWithLocation.filter((p) => p.location.lat >= 18).slice(0, 3);
  const central = approvedWithLocation.filter((p) => p.location.lat >= 14 && p.location.lat < 18).slice(0, 3);
  const south = approvedWithLocation.filter((p) => p.location.lat < 14).slice(0, 3);

  const renderRegionCard = (title, list, fallbackText) => `
    <article class="region-card">
      <h4>${title}</h4>
      <div class="region-list">
        ${
          list.length
            ? list
                .map(
                  (item) =>
                    `<a href="#post/${item.id}">${escapeHtml(item.location?.name || item.title)}</a>`
                )
                .join("")
            : `<p>${fallbackText}</p>`
        }
      </div>
    </article>
  `;

  return [
    renderRegionCard("Miền Bắc - Nơi hội tụ ngàn năm", north, "Đang cập nhật địa điểm."),
    renderRegionCard("Miền Trung - Miền di sản linh thiêng", central, "Đang cập nhật địa điểm."),
    renderRegionCard("Miền Nam - Sự giao thoa đa dạng", south, "Đang cập nhật địa điểm.")
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
          <h4>Thư viện kết nối</h4>
          <ol>
            <li>Phật giáo Việt Nam</li>
            <li>Tôn giáo phương Tây tại Việt Nam</li>
            <li>Các tín ngưỡng bản địa</li>
          </ol>
          <h4>Tính năng nổi bật</h4>
          <ul>
            <li>Tìm kiếm địa điểm gắn với bài viết.</li>
            <li>Điều hướng theo nhóm tôn giáo.</li>
            <li>Kết nối bài viết mới và bình luận.</li>
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

  appEl.innerHTML = `
    <article class="panel">
      <p class="meta">${escapeHtml(formatCategoryLabel(post.category))} · ${formatDate(post.createdAt)} · ${escapeHtml(getAuthorName(post))}</p>
      <h2 class="post-title">${escapeHtml(post.title)}</h2>
      <p class="lead">${escapeHtml(post.excerpt || "")}</p>
      ${post.image ? `<img class="post-hero-image" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" />` : ""}
      <p>${escapeHtml(post.content)}</p>
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
      <p class="lead">Tài khoản demo admin: <strong>admin@viettam.local / 123456</strong></p>
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
    category: "Tin nguong va ton giao khac",
    status: "pending",
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
