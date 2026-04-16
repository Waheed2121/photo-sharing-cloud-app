const API = "/api"
const TOKEN_KEY = "cloudGalleryToken"
const USER_KEY = "cloudGalleryUser"
const THEME_KEY = "cloudGalleryTheme"

const galleryState = {
    activeImageId: null,
    images: []
}

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
        const page = document.body.dataset.page
        if (page !== "login" && page !== "register") {
            window.location.href = "/login.html"
        }
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
    document.documentElement.setAttribute("data-theme", theme)
    const toggle = document.getElementById("themeToggle")
    if (toggle) {
        const label = toggle.querySelector("#themeLabel")
        const text = theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"
        if (label) {
            label.textContent = text
        } else {
            toggle.textContent = text
        }
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
        window.location.href = isAdmin(user) ? "/dashboard.html" : "/gallery.html"
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

function getImageFallback(imageId = 1) {
    const fallbacks = [
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80",
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
        "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80"
    ]

    return fallbacks[Math.abs(Number(imageId) || 0) % fallbacks.length]
}

function normalizeImageUrl(url) {
    if (typeof url !== "string") {
        return ""
    }

    const trimmed = url.trim()
    if (!trimmed) {
        return ""
    }

    if (trimmed.startsWith("/uploads/")) {
        return `http://localhost:3000${trimmed}`
    }

    if (trimmed.startsWith("uploads/")) {
        return `http://localhost:3000/${trimmed}`
    }

    try {
        const parsed = new URL(trimmed)
        if (parsed.pathname.startsWith("/uploads/")) {
            return `http://localhost:3000${parsed.pathname}`
        }
    } catch {
        return trimmed
    }

    return trimmed
}

function resolveCardImageUrl(image) {
    const rawUrl = image && (
        image.image_url ||
        image.url ||
        image.imageUrl
    )
    const normalized = normalizeImageUrl(rawUrl)
    return normalized || getImageFallback(image && image.id)
}

function getModalLikeButton(modal) {
    return modal?.querySelector("[data-like-button]")
}

function getGalleryModal() {
    return document.getElementById("galleryModal")
}

function setModalVisible(modal, visible) {
    if (!modal) {
        return
    }

    modal.classList.toggle("hidden", !visible)
    modal.setAttribute("aria-hidden", visible ? "false" : "true")
}

function updateModalAverage(modal, ratings = []) {
    const averageNode = modal?.querySelector("[data-modal-average]")
    if (!averageNode) {
        return
    }

    if (!ratings.length) {
        averageNode.textContent = "No ratings yet"
        return
    }

    const total = ratings.reduce((sum, rating) => sum + Number(rating.rating || 0), 0)
    averageNode.textContent = (total / ratings.length).toFixed(1)
}

function renderModalComments(modal, comments = []) {
    const list = modal?.querySelector("[data-modal-comments]")
    if (!list) {
        return
    }

    list.innerHTML = renderCommentList(comments)
}

async function openGalleryModal(image, adminMode = false) {
    const modal = getGalleryModal()
    if (!modal || !image) {
        return
    }

    galleryState.activeImageId = image.id
    modal.dataset.imageId = String(image.id)
    modal.dataset.adminMode = adminMode ? "true" : "false"

    const imageNode = modal.querySelector("[data-modal-image]")
    const titleNode = modal.querySelector("[data-modal-title]")
    const captionNode = modal.querySelector("[data-modal-caption]")
    const locationNode = modal.querySelector("[data-modal-location]")
    const uploaderNode = modal.querySelector("[data-modal-uploader]")
    const deleteButton = modal.querySelector("[data-modal-delete]")

    if (imageNode) {
        imageNode.src = resolveCardImageUrl(image)
        imageNode.alt = image.title || "Image"
    }

    if (titleNode) {
        titleNode.textContent = image.title || "Untitled"
    }

    if (captionNode) {
        captionNode.textContent = image.caption || "No caption provided."
    }

    if (locationNode) {
        locationNode.textContent = image.location || "Unknown"
    }

    if (uploaderNode) {
        uploaderNode.textContent = image.uploader || "Unknown"
    }

    if (deleteButton) {
        deleteButton.classList.toggle("hidden", !adminMode)
    }

    const likeButton = getModalLikeButton(modal)
    if (likeButton) {
        likeButton.dataset.liked = "false"
        likeButton.textContent = `❤️ ${Number(image.like_count || 0)}`
    }

    renderModalComments(modal, image.comments || [])
    updateModalAverage(modal, Array.isArray(image.ratings) ? image.ratings : [])
    setModalVisible(modal, true)

    await hydrateLikes(modal, image.id, image.like_count || 0)
    const ratings = await hydrateRatings(modal, image.id)
    updateModalAverage(modal, ratings)
}

function closeGalleryModal() {
    const modal = getGalleryModal()
    if (!modal) {
        return
    }

    galleryState.activeImageId = null
    setModalVisible(modal, false)
}

function initGalleryModal() {
    const modal = getGalleryModal()
    if (!modal || modal.dataset.bound === "true") {
        return
    }

    modal.dataset.bound = "true"

    modal.querySelectorAll("[data-modal-close]").forEach((button) => {
        button.addEventListener("click", closeGalleryModal)
    })

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeGalleryModal()
        }
    })

    getModalLikeButton(modal)?.addEventListener("click", async () => {
        const imageId = Number(modal.dataset.imageId)
        if (!imageId) {
            return
        }

        await submitModalLike(imageId)
    })

    modal.querySelector("[data-modal-rating-form]")?.addEventListener("submit", submitModalRating)
    modal.querySelector("[data-modal-comment-form]")?.addEventListener("submit", submitModalComment)
    modal.querySelector("[data-modal-delete]")?.addEventListener("click", submitModalDelete)

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeGalleryModal()
        }
    })
}

function getGalleryQuery() {
    const searchForm = document.getElementById("searchForm")
    return searchForm?.elements?.q?.value?.trim() || ""
}

async function hydrateRatings(card, imageId) {
    const target = card.querySelector("[data-ratings-list]")
    if (!target) {
        return []
    }

    target.innerHTML = '<div class="empty-state">Loading ratings...</div>'

    try {
        const response = await apiFetch(`${API}/ratings/${imageId}`)
        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || "Failed to load ratings")
        }

        const ratings = data.ratings || []
        target.innerHTML = renderRatingList(ratings)
        return ratings
    } catch (error) {
        target.innerHTML = `<div class="empty-state">${error.message}</div>`
        return []
    }
}

async function hydrateLikes(card, imageId, fallbackCount = 0) {
    const countNodes = card.querySelectorAll("[data-like-count], [data-like-count-inline]")
    const likeButton = card.querySelector("[data-like-button]")
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

        if (likeButton) {
            const liked = Boolean(data.likedByUser)
            const total = Number(data.totalLikes || 0)
            likeButton.dataset.liked = liked ? "true" : "false"
            likeButton.textContent = `${liked ? "💙" : "❤️"} ${total}`
        }
    } catch {
        // keep fallback count
    }
}

function createCard(image, index, { adminMode = false } = {}) {
    const card = document.createElement("article")
    card.className = "photo-card card"
    card.dataset.imageId = String(image.id)

    const finalUrl = resolveCardImageUrl(image)
    const imageLabel = index ? `Image ${index}` : "Image"

    card.innerHTML = `
        <img class="card-img" src="${finalUrl}" alt="${image.title || "Image"}" onerror="this.onerror=null;this.src='${getImageFallback(image.id)}';">
        <div class="photo-card__body">
            <span class="photo-card__index">${imageLabel}</span>
            <h3 class="photo-card__title">${image.title || "Untitled"}</h3>
            <p class="photo-card__caption">${image.caption || "No caption provided."}</p>
            <div class="meta-grid">
                <div class="meta-item"><strong>Location</strong>${image.location || "Unknown"}</div>
                <div class="meta-item"><strong>People</strong>${image.people_present || "None"}</div>
                <div class="meta-item"><strong>Uploader</strong>${image.uploader || "Unknown"}</div>
                <div class="meta-item"><strong>Likes</strong><span data-like-count>${Number(image.like_count || 0)}</span></div>
            </div>
        </div>
    `

    card.addEventListener("click", (event) => {
        openGalleryModal(image, adminMode)
    })

    return card
}

async function renderGallery(query = getGalleryQuery()) {
    const grid = document.getElementById("galleryGrid")
    const status = document.getElementById("galleryStatus") || document.getElementById("dashboardStatus")

    if (!grid) {
        return
    }

    grid.innerHTML = ""
    setStatus(status, "")

    try {
        const endpoint = query
            ? `${API}/images/search?q=${encodeURIComponent(query)}`
            : `${API}/images`

        const response = await apiFetch(endpoint)
        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || "Failed to load images")
        }

        const apiImages = Array.isArray(data.images) ? data.images : []
        let imagesToShow = apiImages.map((image) => normalizeGalleryImage(image)).filter(Boolean)
        imagesToShow = imagesToShow.slice(0, 4) // Only display 4 images as requested

        galleryState.images = imagesToShow
        grid.innerHTML = ""

        const adminMode = document.body.dataset.page === "dashboard"
        if (!imagesToShow.length) {
            grid.innerHTML = '<div class="empty-state">No photos found.</div>'
            return
        }

        imagesToShow.forEach((image, index) => {
            grid.appendChild(createCard(image, index + 1, { adminMode }))
        })
    } catch (error) {
        const adminMode = document.body.dataset.page === "dashboard"
        const fallbackImages = galleryState.images.length ? galleryState.images : []

        grid.innerHTML = ""

        if (fallbackImages.length) {
            fallbackImages.forEach((image, index) => {
                grid.appendChild(createCard(image, index + 1, { adminMode }))
            })
        } else {
            grid.innerHTML = '<div class="empty-state">No photos available right now.</div>'
        }

        setStatus(status, error.message || "Failed to load images", "error")
    }
}

function normalizeGalleryImage(image) {
    if (!image || typeof image !== "object") {
        return null
    }

    const id = Number(image.id)
    const safeId = Number.isFinite(id) ? id : Date.now()

    return {
        ...image,
        id: safeId,
        title: image.title || "Untitled",
        caption: image.caption || "No caption provided.",
        location: image.location || "Unknown",
        people_present: image.people_present || "None",
        image_url: image.image_url || image.url || image.imageUrl || getImageFallback(safeId),
        url: image.url || image.image_url || image.imageUrl || getImageFallback(safeId)
    }
}

async function submitModalLike(imageId) {
    const modal = getGalleryModal()
    if (!modal) {
        return
    }

    const button = getModalLikeButton(modal)
    const liked = button?.dataset.liked === "true"
    const method = liked ? "DELETE" : "POST"
    const endpoint = liked ? `${API}/likes/${imageId}` : `${API}/likes`

    const response = await apiFetch(endpoint, method === "POST"
        ? {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_id: imageId })
        }
        : { method }
    )

    const data = await response.json()
    if (!response.ok) {
        await hydrateLikes(modal, imageId)
        alert(data.error || "Failed to update like")
        return
    }

    const countNodes = modal.querySelectorAll("[data-like-count], [data-like-count-inline]")
    const current = Number(modal.querySelector("[data-like-count]")?.textContent || 0)
    const next = liked ? Math.max(0, current - 1) : current + 1

    countNodes.forEach((node) => {
        node.textContent = String(next)
    })

    if (button) {
        const nextLiked = !liked
        button.dataset.liked = nextLiked ? "true" : "false"
        button.textContent = `${nextLiked ? "💙" : "❤️"} ${next}`
    }

    const activeImage = galleryState.images.find((item) => Number(item.id) === Number(imageId))
    if (activeImage) {
        activeImage.like_count = next
    }

    document.querySelectorAll(`[data-image-id="${imageId}"] [data-like-count]`).forEach((node) => {
        node.textContent = String(next)
    })
}

async function submitModalRating(event) {
    event.preventDefault()
    const form = event.currentTarget
    const modal = form.closest("#galleryModal")
    const imageId = Number(modal?.dataset.imageId)
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
    const ratings = await hydrateRatings(modal, imageId)
    updateModalAverage(modal, ratings)
}

async function submitModalComment(event) {
    event.preventDefault()
    const form = event.currentTarget
    const modal = form.closest("#galleryModal")
    const imageId = Number(modal?.dataset.imageId)
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

    const list = modal?.querySelector("[data-modal-comments]")
    if (list && data.comment) {
        const user = getUser()
        const author = user ? `${user.email} (${user.role})` : `User ${data.comment.user_id}`
        const item = document.createElement("div")
        item.className = "list-item"
        item.innerHTML = `<strong>${author}:</strong> ${data.comment.comment}`

        const empty = list.querySelector(".empty-state")
        if (empty) {
            empty.remove()
        }

        list.prepend(item)
    }
}

async function submitModalDelete() {
    const modal = getGalleryModal()
    const imageId = Number(modal?.dataset.imageId)

    if (!imageId || !window.confirm("Delete this image?")) {
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

    closeGalleryModal()
    renderGallery()
}

function bindSearch() {
    const searchForm = document.getElementById("searchForm")
    if (!searchForm) {
        return
    }

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault()
        const query = searchForm.elements.q.value.trim()
        renderGallery(query)
    })

    document.getElementById("clearSearch")?.addEventListener("click", () => {
        searchForm.reset()
        renderGallery("")
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
        renderGallery()
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
        initGalleryModal()
        renderGallery()
        return
    }

    initHomePage()
}

document.addEventListener("DOMContentLoaded", init)