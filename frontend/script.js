const API = "https://photo-sharing-gzc9gra4eefjaxhv.francecentral-01.azurewebsites.net/api"
const TOKEN_KEY = "cloudGalleryToken"
const USER_KEY = "cloudGalleryUser"
const THEME_KEY = "cloudGalleryTheme"
const PAGE_SIZE = 6

let currentPage = 1
let currentQuery = ""

function getToken() {
    return localStorage.getItem(TOKEN_KEY)
}

function getUser() {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) {
        return null
    }

    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

function isAdmin(user = getUser()) {
    return Boolean(user && user.role === "creator")
}

function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
}

function parseJwt(token) {
    const payload = token.split(".")[1]
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const json = atob(normalized)
    return JSON.parse(json)
}

function authHeaders(extra = {}) {
    const token = getToken()
    return {
        ...extra,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: authHeaders(options.headers || {})
    })

    if (response.status === 401) {
        clearSession()
    }

    return response
}

function setStatus(element, message, type = "") {
    if (!element) {
        return
    }

    element.textContent = message
    element.className = type ? `status-text ${type}` : "status-text"
}

function applyTheme() {
    const theme = localStorage.getItem(THEME_KEY) || "light"
    document.body.classList.toggle("dark-mode", theme === "dark")
    const toggle = document.getElementById("themeToggle")
    if (toggle) {
        toggle.textContent = theme === "dark" ? "Light mode" : "Dark mode"
    }
}

function bindThemeToggle() {
    const toggle = document.getElementById("themeToggle")
    if (!toggle) {
        return
    }

    toggle.addEventListener("click", () => {
        const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark"
        localStorage.setItem(THEME_KEY, nextTheme)
        applyTheme()
    })
}

function updateNavbar() {
    const user = getUser()
    const logoutButton = document.getElementById("logoutButton")
    const dashboardLinks = document.querySelectorAll('[data-nav="dashboard"]')
    const currentPath = window.location.pathname

    dashboardLinks.forEach((link) => {
        link.classList.toggle("hidden", !isAdmin(user))
        link.classList.toggle("active", currentPath.endsWith("dashboard.html"))
    })

    document.querySelectorAll('[data-nav="gallery"]').forEach((link) => {
        link.classList.toggle("active", currentPath.endsWith("gallery.html"))
    })

    if (logoutButton) {
        logoutButton.classList.toggle("hidden", !user)
        logoutButton.addEventListener("click", () => {
            clearSession()
            window.location.href = "/login.html"
        }, { once: true })
    }
}

function guardPages() {
    const page = document.body.dataset.page
    const token = getToken()
    const user = getUser()

    if ((page === "gallery" || page === "dashboard") && !token) {
        window.location.href = "/login.html"
        return false
    }

    if (page === "dashboard" && !isAdmin(user)) {
        window.location.href = "/gallery.html"
        return false
    }

    if ((page === "login" || page === "register") && token) {
        window.location.href = isAdmin(user) ? "/dashboard.html" : "/gallery.html"
        return false
    }

    return true
}

function initHomePage() {
    // No additional JS needed.
}

async function handleLogin(event) {
    event.preventDefault()
    const form = event.currentTarget
    const status = document.getElementById("loginStatus")
    setStatus(status, "Signing in...")

    const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: form.email.value.trim(),
            password: form.password.value
        })
    })

    const data = await response.json()

    if (!response.ok) {
        setStatus(status, data.error || "Login failed", "error")
        return
    }

    const user = data.user || {
        email: form.email.value.trim(),
        ...parseJwt(data.token)
    }
    setSession(data.token, user)
    setStatus(status, "Login successful. Redirecting...", "success")
    window.setTimeout(() => {
        window.location.href = "/gallery.html"
    }, 500)
}

async function handleRegister(event) {
    event.preventDefault()
    const form = event.currentTarget
    const status = document.getElementById("registerStatus")
    setStatus(status, "Creating account...")

    const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: form.email.value.trim(),
            password: form.password.value
        })
    })

    const data = await response.json()

    if (!response.ok) {
        setStatus(status, data.error || "Registration failed", "error")
        return
    }

    setStatus(status, "Registration successful. Please log in.", "success")
    form.reset()
    window.setTimeout(() => {
        window.location.href = "/login.html"
    }, 700)
}

function renderPagination(pagination) {
    const container = document.getElementById("pagination")
    if (!container || !pagination) {
        return
    }

    container.innerHTML = ""

    const summary = document.createElement("span")
    summary.className = "pagination-summary"
    summary.textContent = `Page ${pagination.page} of ${pagination.totalPages || 1}`
    container.appendChild(summary)

    const prev = document.createElement("button")
    prev.type = "button"
    prev.className = "btn btn-secondary"
    prev.textContent = "Previous"
    prev.disabled = pagination.page <= 1
    prev.addEventListener("click", () => loadImages(pagination.page - 1, currentQuery))

    const next = document.createElement("button")
    next.type = "button"
    next.className = "btn btn-primary"
    next.textContent = "Next"
    next.disabled = pagination.page >= pagination.totalPages
    next.addEventListener("click", () => loadImages(pagination.page + 1, currentQuery))

    container.appendChild(prev)
    container.appendChild(next)
}

function renderCommentList(comments = []) {
    if (!comments.length) {
        return '<div class="empty-state">No comments yet.</div>'
    }

    return comments.map((comment) => {
        const author = comment.user_email ? `${comment.user_email} (${comment.user_role})` : `User ${comment.user_id}`
        return `<div class="list-item"><strong>${author}:</strong> ${comment.comment}</div>`
    }).join("")
}

function renderRatingList(ratings = []) {
    if (!ratings.length) {
        return '<div class="empty-state">No ratings yet.</div>'
    }

    return ratings.map((rating) => {
        const author = rating.user_email ? `${rating.user_email} (${rating.user_role})` : `User ${rating.user_id}`
        return `<div class="list-item"><strong>${author}:</strong> ${rating.rating}/5</div>`
    }).join("")
}

async function hydrateRatings(card, imageId) {
    const target = card.querySelector("[data-ratings-list]")
    if (!target) {
        return
    }

    target.innerHTML = '<div class="empty-state">Loading ratings...</div>'

    try {
        const response = await apiFetch(`${API}/ratings/${imageId}`)
        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || "Failed to load ratings")
        }

        target.innerHTML = renderRatingList(data.ratings || [])
    } catch (error) {
        target.innerHTML = `<div class="empty-state">${error.message}</div>`
    }
}

async function hydrateLikes(card, imageId, fallbackCount = 0) {
    const countNodes = card.querySelectorAll("[data-like-count], [data-like-count-inline]")
    if (!countNodes.length) {
        return
    }

    countNodes.forEach((node) => {
        node.textContent = String(fallbackCount || 0)
    })

    try {
        const response = await apiFetch(`${API}/likes/${imageId}`)
        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || "Failed to load likes")
        }

        countNodes.forEach((node) => {
            node.textContent = String(data.totalLikes || 0)
        })
    } catch {
        // keep fallback count
    }
}

function createCard(image, { adminMode = false } = {}) {
    const card = document.createElement("article")
    card.className = "photo-card"

    const averageRating = image.average_rating === null || image.average_rating === undefined
        ? "No ratings yet"
        : Number(image.average_rating).toFixed(1)

    card.innerHTML = `
        <img class="photo-card__image" src="${image.image_url}" alt="${image.title || "Image"}">
        <div class="photo-card__body">
            <div class="card-title-row">
                <div>
                    <h3 class="photo-card__title">${image.title || "Untitled"}</h3>
                    <p class="photo-card__caption">${image.caption || "No caption provided."}</p>
                </div>
                ${adminMode ? '<button type="button" class="delete-button" data-delete-button>Delete</button>' : ""}
            </div>

            <div class="meta-grid">
                <div class="meta-item"><strong>Location</strong>${image.location || "Unknown"}</div>
                <div class="meta-item"><strong>People</strong>${image.people_present || "None"}</div>
                <div class="meta-item"><strong>Uploader</strong>${image.uploader || "Unknown"}</div>
                <div class="meta-item"><strong>Likes</strong><span data-like-count>${Number(image.like_count || 0)}</span></div>
            </div>

            <div class="stats-row">
                <span class="chip">Average rating: ${averageRating}</span>
                <span class="chip">Likes total: <span data-like-count-inline>${Number(image.like_count || 0)}</span></span>
            </div>

            <div class="action-row">
                <form class="inline-form" data-rating-form>
                    <input type="number" name="rating" min="1" max="5" placeholder="1-5" required>
                    <button type="submit">Rate</button>
                </form>

                <form class="inline-form" data-comment-form>
                    <input type="text" name="comment" placeholder="Add a comment" required>
                    <button type="submit">Comment</button>
                </form>

                <button type="button" class="like-button" data-like-button>Like ❤️</button>
            </div>

            <div class="list-block">
                <h4>Ratings</h4>
                <div class="list-items" data-ratings-list></div>
            </div>

            <div class="list-block">
                <h4>Comments</h4>
                <div class="list-items">${renderCommentList(image.comments || [])}</div>
            </div>
        </div>
    `

    const ratingForm = card.querySelector("[data-rating-form]")
    ratingForm?.addEventListener("submit", (event) => submitRating(event, image.id))

    const commentForm = card.querySelector("[data-comment-form]")
    commentForm?.addEventListener("submit", (event) => submitComment(event, image.id))

    const likeButton = card.querySelector("[data-like-button]")
    likeButton?.addEventListener("click", () => submitLike(image.id))

    const deleteButton = card.querySelector("[data-delete-button]")
    deleteButton?.addEventListener("click", () => deleteImage(image.id, card))

    hydrateRatings(card, image.id)
    hydrateLikes(card, image.id, image.like_count || 0)

    return card
}

async function loadImages(page = 1, query = "") {
    const grid = document.getElementById("galleryGrid")
    const status = document.getElementById("galleryStatus") || document.getElementById("dashboardStatus")
    const pagination = document.getElementById("pagination")

    if (!grid) {
        return
    }

    currentPage = page
    currentQuery = query
    grid.innerHTML = '<div class="empty-state">Loading gallery...</div>'
    setStatus(status, "")

    try {
        const endpoint = query
            ? `${API}/images/search?q=${encodeURIComponent(query)}&page=${page}&limit=${PAGE_SIZE}`
            : `${API}/images?page=${page}&limit=${PAGE_SIZE}`

        const response = await apiFetch(endpoint)
        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || "Failed to load images")
        }

        const images = data.images || []
        grid.innerHTML = ""

        if (!images.length) {
            grid.innerHTML = '<div class="empty-state">No images found.</div>'
            renderPagination(data.pagination)
            return
        }

        const adminMode = document.body.dataset.page === "dashboard"
        images.forEach((image) => {
            grid.appendChild(createCard(image, { adminMode }))
        })

        renderPagination(data.pagination)
    } catch (error) {
        grid.innerHTML = `<div class="empty-state">${error.message}</div>`
        if (pagination) {
            pagination.innerHTML = ""
        }
        setStatus(status, error.message, "error")
    }
}

async function submitRating(event, imageId) {
    event.preventDefault()
    const form = event.currentTarget
    const value = Number(form.rating.value)

    const response = await apiFetch(`${API}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId, rating: value })
    })

    const data = await response.json()
    if (!response.ok) {
        alert(data.error || "Failed to save rating")
        return
    }

    form.reset()
    loadImages(currentPage, currentQuery)
}

async function submitComment(event, imageId) {
    event.preventDefault()
    const form = event.currentTarget
    const comment = form.comment.value.trim()

    const response = await apiFetch(`${API}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId, comment })
    })

    const data = await response.json()
    if (!response.ok) {
        alert(data.error || "Failed to save comment")
        return
    }

    form.reset()
    loadImages(currentPage, currentQuery)
}

async function submitLike(imageId) {
    const response = await apiFetch(`${API}/likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId })
    })

    const data = await response.json()
    if (!response.ok) {
        alert(data.error || "Failed to save like")
        return
    }

    loadImages(currentPage, currentQuery)
}

async function deleteImage(imageId, card) {
    if (!window.confirm("Delete this image?")) {
        return
    }

    const response = await apiFetch(`${API}/images/${imageId}`, {
        method: "DELETE"
    })

    const data = await response.json()
    if (!response.ok) {
        alert(data.error || "Delete failed")
        return
    }

    card.remove()
}

function bindSearch() {
    const searchForm = document.getElementById("searchForm")
    if (!searchForm) {
        return
    }

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault()
        const query = searchForm.elements.q.value.trim()
        loadImages(1, query)
    })

    document.getElementById("clearSearch")?.addEventListener("click", () => {
        searchForm.reset()
        loadImages(1, "")
    })
}

function bindUploadForm() {
    const uploadForm = document.getElementById("uploadForm")
    if (!uploadForm) {
        return
    }

    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault()
        const status = document.getElementById("uploadStatus")
        const file = uploadForm.image.files && uploadForm.image.files[0]

        if (!file) {
            setStatus(status, "Choose a JPEG or PNG image first.", "error")
            return
        }

        const allowedTypes = ["image/jpeg", "image/png"]
        if (!allowedTypes.includes(file.type)) {
            setStatus(status, "Only JPEG and PNG files are allowed.", "error")
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setStatus(status, "Image exceeds the 5 MB upload limit.", "error")
            return
        }

        setStatus(status, "Uploading...")

        const formData = new FormData()
        formData.append("title", uploadForm.title.value.trim())
        formData.append("caption", uploadForm.caption.value.trim())
        formData.append("location", uploadForm.location.value.trim())
        formData.append("people", uploadForm.people.value.trim())
        formData.append("image", file)

        const response = await apiFetch(`${API}/images/upload`, {
            method: "POST",
            body: formData
        })

        const data = await response.json()
        if (!response.ok) {
            setStatus(status, data.error || "Upload failed", "error")
            return
        }

        uploadForm.reset()
        setStatus(status, "Image uploaded successfully.", "success")
        loadImages(1, currentQuery)
    })
}

function initAuthForms() {
    document.getElementById("loginForm")?.addEventListener("submit", handleLogin)
    document.getElementById("registerForm")?.addEventListener("submit", handleRegister)
}

function init() {
    applyTheme()
    bindThemeToggle()
    updateNavbar()

    if (!guardPages()) {
        return
    }

    const page = document.body.dataset.page

    if (page === "login" || page === "register") {
        initAuthForms()
        return
    }

    if (page === "gallery" || page === "dashboard") {
        bindSearch()
        bindUploadForm()
        loadImages(1, "")
        return
    }

    initHomePage()
}

document.addEventListener("DOMContentLoaded", init)