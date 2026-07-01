const uploadInput = document.getElementById("pdfInput");
const dropZone = document.getElementById("dropZone");
const uploadStatus = document.getElementById("uploadStatus");
const documentList = document.getElementById("documentList");
const refreshDocs = document.getElementById("refreshDocs");
const chatForm = document.getElementById("chatForm");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendButton");
const messages = document.getElementById("messages");
const agentLog = document.getElementById("agentLog");
const logEntries = document.getElementById("logEntries");
const logCount = document.getElementById("logCount");

let hasDocuments = false;

/* ── Helpers ─────────────────────────────── */
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatAnswer(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

function setUploadStatus(text, type = "") {
    uploadStatus.textContent = text;
    uploadStatus.className = "upload-status " + type;
}

/* ── Messages ────────────────────────────── */
function addMessage(role, html) {
    const emptyState = messages.querySelector(".empty-state");
    if (emptyState) emptyState.remove();

    const msg = document.createElement("div");
    msg.className = "message";

    const avatar = role === "user" ? "U" : "D";
    msg.innerHTML = `
        <div class="msg-avatar ${role}">${avatar}</div>
        <div class="msg-content">${html}</div>
    `;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
}

function showLoader() {
    const msg = document.createElement("div");
    msg.className = "message";
    msg.id = "loadingMsg";
    msg.innerHTML = `
        <div class="msg-avatar assistant">D</div>
        <div class="msg-content">
            <div class="loader"><span></span><span></span><span></span></div>
        </div>
    `;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

function removeLoader() {
    const loader = document.getElementById("loadingMsg");
    if (loader) loader.remove();
}

/* ── Citations ────────────────────────────── */
function renderCitations(citations) {
    if (!citations || !citations.length) return "";

    const items = citations.map((c, i) => `
        <div class="citation">
            <span class="citation-num">${i + 1}</span>
            <div>
                <strong>${escapeHtml(c.filename)}</strong>
                ${c.page ? ` · p.${c.page}` : ""}
                ${c.score ? `<span class="score">(${(c.score * 100).toFixed(0)}% match)</span>` : ""}
                <br>${escapeHtml(c.excerpt)}
            </div>
        </div>
    `).join("");

    return `<div class="citations">${items}</div>`;
}

/* ── Agent Log ────────────────────────────── */
function renderSteps(steps) {
    if (!steps || !steps.length) return;

    agentLog.style.display = "block";
    logEntries.innerHTML = "";

    steps.forEach((step) => {
        const entry = document.createElement("div");
        entry.className = "log-entry";
        entry.innerHTML = `
            <span class="log-entry-icon">\u2713</span>
            <span class="log-entry-agent">${escapeHtml(step.agent)}</span>
            <span class="log-entry-detail">${escapeHtml(step.detail)}</span>
        `;
        logEntries.appendChild(entry);
    });

    logCount.textContent = steps.length;
}

/* ── Documents ────────────────────────────── */
async function loadDocuments() {
    try {
        const res = await fetch("/api/documents");
        const docs = await res.json();

        documentList.innerHTML = "";

        if (!docs.length) {
            documentList.innerHTML = '<li class="empty-docs">No documents uploaded yet.</li>';
            hasDocuments = false;
            questionInput.disabled = true;
            sendButton.disabled = true;
            questionInput.placeholder = "Upload a PDF to start asking questions...";
            return;
        }

        hasDocuments = true;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.placeholder = "Ask about your uploaded documents...";

        docs.forEach((doc) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="doc-icon">PDF</div>
                <div class="doc-info">
                    <strong>${escapeHtml(doc.filename)}</strong>
                    <span>${doc.pages} pages · ${doc.chunks} chunks</span>
                </div>
            `;
            documentList.appendChild(li);
        });
    } catch {
        documentList.innerHTML = '<li class="empty-docs">Could not load documents.</li>';
    }
}

/* ── Upload ────────────────────────────── */
async function uploadPdf(file) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
        setUploadStatus("Only PDF files are supported.", "error");
        return;
    }

    setUploadStatus("Uploading and indexing...");
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.detail || "Upload failed.");

        setUploadStatus(`Indexed ${data.document.chunks} chunks from ${data.document.pages} pages.`, "success");
        await loadDocuments();
    } catch (err) {
        setUploadStatus(err.message, "error");
    }
}

uploadInput.addEventListener("change", () => {
    const file = uploadInput.files[0];
    if (file) uploadPdf(file);
});

/* ── Drag & Drop ────────────────────────────── */
["dragenter", "dragover"].forEach((e) => {
    dropZone.addEventListener(e, (ev) => {
        ev.preventDefault();
        dropZone.classList.add("dragging");
    });
});

["dragleave", "drop"].forEach((e) => {
    dropZone.addEventListener(e, (ev) => {
        ev.preventDefault();
        dropZone.classList.remove("dragging");
    });
});

dropZone.addEventListener("drop", (ev) => {
    const file = ev.dataTransfer.files[0];
    if (file) uploadPdf(file);
});

/* ── Chat ────────────────────────────── */
chatForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const question = questionInput.value.trim();
    if (!question || !hasDocuments) return;

    addMessage("user", `<p>${escapeHtml(question)}</p>`);
    questionInput.value = "";
    sendButton.disabled = true;
    questionInput.disabled = true;
    showLoader();

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, top_k: 5 }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.detail || "Chat failed.");

        removeLoader();

        if (data.debug && data.debug.steps) {
            renderSteps(data.debug.steps);
        }

        const html = `
            <p>${formatAnswer(data.answer)}</p>
            ${renderCitations(data.citations)}
        `;
        addMessage("assistant", html);
    } catch (err) {
        removeLoader();
        addMessage("assistant", `<p class="error-text">${escapeHtml(err.message)}</p>`);
    } finally {
        sendButton.disabled = false;
        questionInput.disabled = false;
        questionInput.focus();
    }
});

/* ── Init ────────────────────────────── */
refreshDocs.addEventListener("click", loadDocuments);
loadDocuments();
questionInput.focus();
