const API_BASE = window.location.origin
const API = `${API_BASE}/api`
const TOKEN_KEY = "token"
const USER_KEY = "cloudGalleryUser"

let currentPage = 1
let currentQuery = ""
const pageSize = 6

function getToken() {
    return localStorage.getItem(TOKEN_KEY)
}

function getUser() {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
}

function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token)
    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
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

function updateAuthUI() {
    const authSummary = document.getElementById("authSummary")
    const authActions = document.getElementById("authActions")
    const creatorNotice = document.getElementById("creatorNotice")
    const user = getUser()

    if (authSummary) {
        authSummary.textContent = user
            ? `Signed in as ${user.email} (${user.role})`
            : "Not signed in"
    }

    if (authActions) {
        authActions.innerHTML = user
            ? '<button id="logoutButton" class="btn-sm" type="button">Logout</button>'
            : '<a href="/welcome.html" class="btn-sm auth-link">Login / Register</a>'

        const logoutButton = document.getElementById("logoutButton")
        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                clearSession()
                window.location.href = "/welcome.html"
            })
        }
    }

    if (creatorNotice) {
        if (!user) {
            creatorNotice.textContent = "Creator login is required to upload images."
            creatorNotice.className = "status-msg error"
        } else if (user.role !== "creator") {
            creatorNotice.textContent = "Consumer accounts can browse, search, comment, and rate, but cannot upload."
            creatorNotice.className = "status-msg error"
        } else {
            creatorNotice.textContent = "Creator authentication verified. Upload enabled."
            creatorNotice.className = "status-msg success"
        }
    }
}

async function handleRegister(event) {
    event.preventDefault()
    const form = event.target
    const status = document.getElementById("registerStatus")
    const body = {
        email: form.email.value.trim(),
        password: form.password.value
    }

    const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })

    const data = await response.json()
    status.textContent = response.ok ? "Registration successful. You can now log in." : `Error: ${data.error}`
    status.className = `status-msg ${response.ok ? "success" : "error"}`

    if (response.ok) {
        form.reset()
    }
}

async function handleLogin(event) {
    event.preventDefault()
    const form = event.target
    const status = document.getElementById("loginStatus")
    const body = {
        email: form.email.value.trim(),
        password: form.password.value
    }

    const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })

    const data = await response.json()
    if (!response.ok) {
        status.textContent = `Error: ${data.error}`
        status.className = "status-msg error"
        return
    }

    const user = data.user || { email: body.email, role: parseJwt(data.token).role }
    setSession(data.token, user)
    status.textContent = "Login successful. Redirecting to gallery..."
    status.className = "status-msg success"
    window.setTimeout(() => {
        window.location.href = "/index.html"
    }, 600)
}

function parseJwt(token) {
    const payload = token.split(".")[1]
    return JSON.parse(atob(payload))
}

async function loadImages(page = 1, query = "") {
    const gallery = document.getElementById("gallery")
    const emptyState = document.getElementById("galleryStatus")
    const pagination = document.getElementById("pagination")

    if (!gallery) {
        return
    }

    if (!getToken()) {
        gallery.innerHTML = ""
        if (emptyState) {
            emptyState.textContent = "Log in first to access the gallery."
            emptyState.className = "status-msg error"
        }
        return
    }

    currentPage = page
    currentQuery = query
    gallery.innerHTML = "<p>Loading gallery...</p>"

    try {
        const endpoint = query
            ? `${API}/images/search?q=${encodeURIComponent(query)}&page=${page}&limit=${pageSize}`
            : `${API}/images?page=${page}&limit=${pageSize}`

        const res = await apiFetch(endpoint)
        const data = await res.json()

        if (!res.ok) {
            throw new Error(data.error || "Failed to load images")
        }

        gallery.innerHTML = ""
        if (emptyState) {
            emptyState.textContent = ""
            emptyState.className = "status-msg"
        }

        if (!data.images.length) {
            if (emptyState) {
                emptyState.textContent = query ? "No images matched your search." : "No photos uploaded yet."
            }
            renderPagination(data.pagination)
            return
        }

        for (const img of data.images) {
            const comments = Array.isArray(img.comments) ? img.comments : []
            const avgRating = img.average_rating === null || img.average_rating === undefined
                ? "No ratings"
                : Number(img.average_rating).toFixed(1)
            const uploader = img.uploader || "Unknown"

            const card = document.createElement("div")
            card.className = "card"
            card.innerHTML = `
                <img src="${img.image_url}" class="card-img" alt="${img.title}">
                <div class="card-content">
                    <h3 class="card-title">${img.title}</h3>
                    <p class="card-caption">${img.caption}</p>
                    <div class="card-meta">
                        <span>Uploader: ${uploader}</span>
                        <span>Location: ${img.location || "Unknown"}</span>
                        <span>People: ${img.people_present || "None"}</span>
                    </div>
                    <div class="card-meta rating-meta">
                        <span>Average rating: ${avgRating}</span>
                    </div>
                    <div class="interactions">
                        <form class="form-inline" data-rating-form="${img.id}">
                            <input type="number" name="rating" min="1" max="5" class="input-sm" placeholder="1-5" required>
                            <button type="submit" class="btn-sm">Rate</button>
                        </form>
                        <form class="form-inline" data-comment-form="${img.id}">
                            <input type="text" name="comment" class="input-sm" placeholder="Add a comment" required>
                            <button type="submit" class="btn-sm">Post</button>
                        </form>
                        <div class="comments-list">
                            ${comments.map((item) => `
                                <div class="comment-item">
                                    <strong>User ${item.user_id}:</strong> ${item.comment}
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
            `

            card.querySelector(`[data-rating-form="${img.id}"]`).addEventListener("submit", (event) => {
                submitRating(event, img.id)
            })
            card.querySelector(`[data-comment-form="${img.id}"]`).addEventListener("submit", (event) => {
                submitComment(event, img.id)
            })

            gallery.appendChild(card)
        }

        renderPagination(data.pagination)
    } catch (error) {
        gallery.innerHTML = ""
        if (pagination) {
            pagination.innerHTML = ""
        }
        if (emptyState) {
            emptyState.textContent = error.message
            emptyState.className = "status-msg error"
        }
    }
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
    prev.className = "btn-sm"
    prev.textContent = "Previous"
    prev.disabled = pagination.page <= 1
    prev.addEventListener("click", () => loadImages(pagination.page - 1, currentQuery))

    const next = document.createElement("button")
    next.className = "btn-sm"
    next.textContent = "Next"
    next.disabled = pagination.page >= pagination.totalPages
    next.addEventListener("click", () => loadImages(pagination.page + 1, currentQuery))

    container.appendChild(prev)
    container.appendChild(next)
}

async function submitRating(event, imageId) {
    event.preventDefault()
    const rating = Number(event.target.elements.rating.value)

    const res = await apiFetch(`${API}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId, rating })
    })

    const data = await res.json()
    if (!res.ok) {
        alert(data.error || "Failed to save rating")
        return
    }

    event.target.reset()
    loadImages(currentPage, currentQuery)
}

async function submitComment(event, imageId) {
    event.preventDefault()
    const comment = event.target.elements.comment.value.trim()

    const res = await apiFetch(`${API}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: imageId, comment })
    })

    const data = await res.json()
    if (!res.ok) {
        alert(data.error || "Failed to save comment")
        return
    }

    event.target.reset()
    loadImages(currentPage, currentQuery)
}

function bindSearchForm() {
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
        const statusDiv = document.getElementById("uploadStatus")
        statusDiv.textContent = "Uploading..."
        statusDiv.className = "status-msg"

        const fileInput = document.getElementById("image")
        const file = fileInput?.files?.[0]
        if (!file) {
            statusDiv.textContent = "Choose a JPEG or PNG image first."
            statusDiv.className = "status-msg error"
            return
        }

        const allowedTypes = ["image/jpeg", "image/png"]
        if (!allowedTypes.includes(file.type)) {
            statusDiv.textContent = "Only JPEG and PNG files are allowed."
            statusDiv.className = "status-msg error"
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            statusDiv.textContent = "Image exceeds the 5 MB upload limit."
            statusDiv.className = "status-msg error"
            return
        }

        const formData = new FormData()
        formData.append("title", uploadForm.title.value.trim())
        formData.append("caption", uploadForm.caption.value.trim())
        formData.append("location", uploadForm.location.value.trim())
        formData.append("people", uploadForm.people.value.trim())
        formData.append("image", file)

        const res = await apiFetch(`${API}/images/upload`, {
            method: "POST",
            body: formData
        })

        const data = await res.json()
        statusDiv.textContent = res.ok
            ? "Image uploaded successfully."
            : `Error: ${data.error || "Upload failed"}`
        statusDiv.className = `status-msg ${res.ok ? "success" : "error"}`

        if (res.ok) {
            uploadForm.reset()
        }
    })
}

function guardProtectedPage() {
    if (!document.getElementById("gallery") && !document.getElementById("uploadForm")) {
        return
    }

    if (!getToken()) {
        const status = document.getElementById("galleryStatus") || document.getElementById("uploadStatus")
        if (status) {
            status.textContent = "Authentication required. Use the welcome page to sign in."
            status.className = "status-msg error"
        }
    }
}

function initWelcomePage() {
    document.getElementById("registerForm")?.addEventListener("submit", handleRegister)
    document.getElementById("loginForm")?.addEventListener("submit", handleLogin)
    const sessionStatus = document.getElementById("sessionStatus")
    const user = getUser()

    if (sessionStatus && user) {
        sessionStatus.textContent = `Current session: ${user.email} (${user.role})`
        sessionStatus.className = "status-msg success"
    }
}

function init() {
    updateAuthUI()
    guardProtectedPage()
    initWelcomePage()
    bindSearchForm()
    bindUploadForm()

    if (document.getElementById("gallery")) {
        loadImages(1, "")
    }
}

document.addEventListener("DOMContentLoaded", init)
