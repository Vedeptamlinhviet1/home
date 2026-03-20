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
  return users.find((u) => u.id === post.authorId)?.name || "Tac gia";
}

async function seedData() {
  let users = getUsers();
  if (!users.length) {
    users = [
      {
        id: "admin-001",
        name: "Quan tri vien",
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
      <a href="#login">Dang nhap</a>
      <a href="#register">Dang ky</a>
    `;
  } else {
    authZoneEl.innerHTML = `
      <span class="badge">Xin chao, ${escapeHtml(currentUser.name)}</span>
      <button data-action="logout">Dang xuat</button>
    `;
  }
}

function setActiveNav(route) {
  navEl.querySelectorAll("a").forEach((a) => a.classList.remove("active"));
  const target = navEl.querySelector(`[data-route="${route}"]`);
  if (target) target.classList.add("active");
}

function renderPostCard(post) {
  return `
    <article class="card">
      <img src="${escapeHtml(post.image || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80")}" alt="${escapeHtml(post.title)}" />
      <div class="card-body">
        <p class="meta">${escapeHtml(post.category)} · ${formatDate(post.createdAt)} · ${escapeHtml(getAuthorName(post))}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt || "")}</p>
        <div class="actions">
          <a class="button-link" href="#post/${post.id}">Doc bai viet</a>
        </div>
      </div>
    </article>
  `;
}

function renderHome() {
  const posts = getPosts().filter((p) => p.status === "approved");
  const newest = [...posts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  appEl.innerHTML = `
    <section class="panel hero">
      <p class="eyebrow">Nha Nghi Cuu Van Hoa Tam Linh</p>
      <h2>Blog ve tin nguong, tam linh va ton giao</h2>
      <p class="lead">
        Day la website do an mon thiet ke web, tap trung vao trai nghiem giao dien va tinh nang.
        Ban co the dang bai, binh luan, va kham pha cac dia diem tam linh duoc gan tren ban do.
      </p>
      <div class="actions">
        <a class="button-link button-primary" href="#write">Viet bai moi</a>
        <a class="button-link" href="#category/phat-giao">Xem cac nhom bai viet</a>
      </div>
    </section>

    <section class="panel">
      <h3 class="section-title">Nhom bai viet</h3>
      <div class="grid cols-3">
        <article class="card"><div class="card-body"><h3>Dau an Phat giao</h3><p>Chua co, thien quan, tu tuong vo nga va hanh trinh noi tam.</p><a class="button-link" href="#category/phat-giao">Truy cap</a></div></article>
        <article class="card"><div class="card-body"><h3>Thien chua giao</h3><p>Kien truc nha tho, phu vu cong dong va gia tri nhan ai.</p><a class="button-link" href="#category/thien-chua-giao">Truy cap</a></div></article>
        <article class="card"><div class="card-body"><h3>Tin nguong va ton giao khac</h3><p>Tho Mau, dinh lang, dao giao va nhung goc nhin lien van hoa.</p><a class="button-link" href="#category/khac">Truy cap</a></div></article>
      </div>
    </section>

    <section class="panel">
      <h3 class="section-title">Bai viet moi nhat</h3>
      <div class="grid cols-3">
        ${newest.length ? newest.map(renderPostCard).join("") : '<p>Chua co bai viet nao da duoc duyet.</p>'}
      </div>
    </section>

    <section class="panel">
      <h3 class="section-title">Ban do dia diem tam linh</h3>
      <p class="lead">Moi pin tuong ung voi mot bai viet da duoc duyet. Ban co the bo sung them pin sau trong du lieu bai viet.</p>
      <div id="map"></div>
    </section>
  `;

  initMap(posts);
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
        <strong>${escapeHtml(post.location.name || "Dia diem")}</strong><br />
        <a href="#post/${post.id}">${escapeHtml(post.title)}</a>
      `);
    });
}

function renderCategory(slug) {
  const categoryName = CATEGORY_MAP[slug];
  if (!categoryName) {
    appEl.innerHTML = `<section class="panel"><h3>Khong tim thay nhom bai viet.</h3></section>`;
    return;
  }

  const posts = getPosts().filter((p) => p.status === "approved" && p.category === categoryName);

  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">${escapeHtml(categoryName)}</h2>
      <p class="lead">Tong so ${posts.length} bai viet da duoc duyet trong nhom nay.</p>
      <div class="grid cols-3">
        ${posts.length ? posts.map(renderPostCard).join("") : '<p>Chua co bai viet trong nhom nay.</p>'}
      </div>
    </section>
  `;
}

function renderPost(postId) {
  const post = getPosts().find((p) => p.id === postId);
  if (!post || post.status !== "approved") {
    appEl.innerHTML = `<section class="panel"><h3>Bai viet khong ton tai hoac chua duoc duyet.</h3></section>`;
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
      <p class="meta">${escapeHtml(post.category)} · ${formatDate(post.createdAt)} · ${escapeHtml(getAuthorName(post))}</p>
      <h2 class="post-title">${escapeHtml(post.title)}</h2>
      <p class="lead">${escapeHtml(post.excerpt || "")}</p>
      ${post.image ? `<img style="width:100%;border-radius:16px;max-height:420px;object-fit:cover;" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" />` : ""}
      <p>${escapeHtml(post.content)}</p>
      ${
        post.location
          ? `<div class="info-box">Dia diem lien ket: <strong>${escapeHtml(post.location.name || "Dang cap nhat")}</strong></div>`
          : ""
      }
    </article>

    <section class="panel">
      <h3 class="section-title">Binh luan</h3>
      ${
        currentUser
          ? `
            <form id="comment-form" data-post-id="${post.id}">
              <label>Noi dung binh luan
                <textarea name="content" placeholder="Viet cam nhan cua ban..." required></textarea>
              </label>
              <div class="actions"><button class="button-primary" type="submit">Gui binh luan</button></div>
            </form>
          `
          : `<p class="info-box">Ban can <a href="#login">dang nhap</a> de binh luan.</p>`
      }
      <div class="grid">
        ${
          comments.length
            ? comments
                .map((comment) => {
                  const author = users.find((u) => u.id === comment.userId);
                  return `<article class="comment"><p class="meta">${escapeHtml(author?.name || "Thanh vien")} · ${formatDate(comment.createdAt)}</p><p>${escapeHtml(comment.content)}</p></article>`;
                })
                .join("")
            : `<p>Chua co binh luan nao.</p>`
        }
      </div>
    </section>

    <section class="panel">
      <h3 class="section-title">Goi y bai viet tiep theo</h3>
      <div class="grid cols-3">
        ${recommendations.length ? recommendations.map(renderPostCard).join("") : "<p>Chua du bai viet de goi y.</p>"}
      </div>
    </section>
  `;
}

function renderLogin() {
  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">Dang nhap thanh vien</h2>
      <p class="lead">Tai khoan demo admin: <strong>admin@viettam.local / 123456</strong></p>
      <form id="login-form">
        <label>Email
          <input type="email" name="email" required />
        </label>
        <label>Mat khau
          <input type="password" name="password" required />
        </label>
        <div class="actions">
          <button class="button-primary" type="submit">Dang nhap</button>
          <a class="button-link" href="#register">Tao tai khoan moi</a>
        </div>
      </form>
    </section>
  `;
}

function renderRegister() {
  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">Dang ky thanh vien</h2>
      <form id="register-form">
        <label>Ho ten
          <input type="text" name="name" minlength="2" required />
        </label>
        <label>Email
          <input type="email" name="email" required />
        </label>
        <label>Mat khau
          <input type="password" name="password" minlength="6" required />
        </label>
        <div class="actions">
          <button class="button-primary" type="submit">Dang ky</button>
          <a class="button-link" href="#login">Da co tai khoan</a>
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
        <h2 class="section-title">Viet bai</h2>
        <p class="info-box">Ban can <a href="#login">dang nhap</a> de viet bai.</p>
      </section>
    `;
    return;
  }

  appEl.innerHTML = `
    <section class="panel">
      <h2 class="section-title">Gui bai viet moi</h2>
      <p class="lead">Bai viet se o trang thai cho duyet. Admin se duyet va gan vao nhom bai viet phu hop.</p>
      <form id="write-form">
        <label>Tieu de
          <input type="text" name="title" required minlength="8" />
        </label>
        <label>Tom tat ngan
          <input type="text" name="excerpt" required minlength="12" />
        </label>
        <label>Noi dung
          <textarea name="content" required minlength="30"></textarea>
        </label>
        <label>Hinh dai dien (URL)
          <input type="url" name="image" placeholder="https://..." />
        </label>
        <div class="grid cols-2">
          <label>Ten dia diem (tuy chon)
            <input type="text" name="locationName" placeholder="Ten den/chua/nha tho..." />
          </label>
          <label>Toa do (lat,lng) tuy chon
            <input type="text" name="latlng" placeholder="10.7798,106.6990" />
          </label>
        </div>
        <div class="actions">
          <button class="button-primary" type="submit">Gui bai de duyet</button>
        </div>
      </form>
    </section>
  `;
}

function renderAdmin() {
  if (!isAdmin()) {
    appEl.innerHTML = `
      <section class="panel">
        <h2 class="section-title">Admin Dashboard</h2>
        <p class="info-box">Chi admin moi co quyen truy cap trang nay.</p>
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
      <h2 class="section-title">Dashboard Quan Tri</h2>
      <div class="grid cols-3">
        <article class="card"><div class="card-body"><h3>${users.length}</h3><p>Thanh vien</p></div></article>
        <article class="card"><div class="card-body"><h3>${approved.length}</h3><p>Bai da duyet</p></div></article>
        <article class="card"><div class="card-body"><h3>${pending.length}</h3><p>Bai cho duyet</p></div></article>
      </div>
    </section>

    <section class="panel">
      <h3 class="section-title">Bang duyet bai viet</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tieu de</th>
              <th>Tac gia</th>
              <th>Ngay gui</th>
              <th>Gan nhom</th>
              <th>Xu ly</th>
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
                              <option value="">-- Chon nhom --</option>
                              <option value="Dau an Phat giao">Dau an Phat giao</option>
                              <option value="Thien chua giao">Thien chua giao</option>
                              <option value="Tin nguong va ton giao khac">Tin nguong va ton giao khac</option>
                            </select>
                          </td>
                          <td>
                            <div class="actions">
                              <button class="button-primary" data-action="approve-post" data-post-id="${post.id}">Duyet</button>
                              <button class="button-danger" data-action="reject-post" data-post-id="${post.id}">Tu choi</button>
                            </div>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `<tr><td colspan="5">Khong co bai nao dang cho duyet.</td></tr>`
            }
          </tbody>
        </table>
      </div>
      <p class="meta">Tong so binh luan hien tai: ${comments.length}</p>
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

  appEl.innerHTML = `<section class="panel"><h3>Khong tim thay trang: ${escapeHtml(raw)}</h3><a class="button-link" href="#home">Ve trang chu</a></section>`;
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
      alert("Thong tin dang nhap khong dung.");
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
      alert("Vui long nhap du thong tin hop le.");
      return;
    }

    const users = getUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      alert("Email da ton tai.");
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
    alert("Ban can dang nhap de viet bai.");
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
    alert("Thong tin bai viet chua hop le.");
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

  alert("Gui bai thanh cong. Bai viet dang cho admin duyet.");
  window.location.hash = "#home";
  render();
}

function handleCommentSubmit(event) {
  const form = event.target;
  if (form.id !== "comment-form") return;
  event.preventDefault();

  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Ban can dang nhap de binh luan.");
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
      alert("Vui long chon nhom bai viet truoc khi duyet.");
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
