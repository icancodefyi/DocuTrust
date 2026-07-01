const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const dropZone = document.getElementById("dropZone");
const pdfInput = document.getElementById("pdfInput");
const uploadStatus = document.getElementById("uploadStatus");
const documentList = document.getElementById("documentList");
const refreshDocs = document.getElementById("refreshDocs");
const chatForm = document.getElementById("chatForm");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendButton");
const messagesEl = document.getElementById("messages");
const chatInner = document.getElementById("chatInner");
const composerHint = document.getElementById("composerHint");

let hasDocuments = false;

/* ── SVG Icons ──────────────────────────── */
const I = {
    file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    globe: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
    doc: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    check: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>',
    spin: '<svg class="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    external: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>',
    bot: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="13" rx="4"/><circle cx="8" cy="15" r="1.5"/><circle cx="16" cy="15" r="1.5"/><path d="M12 8V3M8 4l4-1 4 1"/></svg>',
};

/* ── Helpers ────────────────────────────── */
function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

function fmt(text) {
    return esc(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

function scrollDown() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function clearEmpty() {
    const es = chatInner.querySelector(".empty-state");
    if (es) es.remove();
}

/* ── User message ───────────────────────── */
function addUserMsg(text) {
    clearEmpty();
    const el = document.createElement("div");
    el.className = "msg-user-wrap";
    el.innerHTML = `<div class="msg-user">${esc(text)}</div>`;
    chatInner.appendChild(el);
    scrollDown();
}

/* ── Assistant message ──────────────────── */
function addAssistantMsg(answer, citations) {
    clearEmpty();
    const el = document.createElement("div");
    el.className = "msg-assistant-wrap";
    el.innerHTML = `
        <div class="msg-assistant">
            <div class="msg-avatar">${I.bot}</div>
            <div class="msg-body">
                <div class="answer-text">${fmt(answer)}</div>
                ${renderSources(citations)}
            </div>
        </div>
    `;
    chatInner.appendChild(el);
    scrollDown();
}

/* ── Loader ─────────────────────────────── */
function showLoader() {
    clearEmpty();
    const el = document.createElement("div");
    el.className = "msg-assistant-wrap";
    el.id = "loaderMsg";
    el.innerHTML = `
        <div class="msg-assistant">
            <div class="msg-avatar">${I.bot}</div>
            <div class="msg-body"><div class="loader"><span></span><span></span><span></span></div></div>
        </div>
    `;
    chatInner.appendChild(el);
    scrollDown();
}

function hideLoader() {
    const el = document.getElementById("loaderMsg");
    if (el) el.remove();
}

/* ── Error ──────────────────────────────── */
function addErrorMsg(text) {
    clearEmpty();
    const el = document.createElement("div");
    el.className = "msg-assistant-wrap";
    el.innerHTML = `
        <div class="msg-assistant">
            <div class="msg-avatar msg-avatar-err"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg></div>
            <div class="msg-body"><div class="answer-text" style="color:var(--red)">${esc(text)}</div></div>
        </div>
    `;
    chatInner.appendChild(el);
    scrollDown();
}

/* ── Sources ────────────────────────────── */
function renderSources(citations) {
    if (!citations || !citations.length) return "";
    const chips = citations.map((c) => {
        const isWeb = c.filename && c.filename.startsWith("web:");
        const label = isWeb
            ? c.filename.replace("web: ", "")
            : `${c.filename}${c.page ? " · p." + c.page : ""}`;
        const icon = isWeb ? I.globe : I.doc;
        const cls = isWeb ? "chip-web" : "chip-pdf";

        if (isWeb && c.url) {
            return `<a href="${esc(c.url)}" target="_blank" rel="noopener" class="source-chip ${cls}">${icon}${esc(label)}${I.external}</a>`;
        }
        return `<span class="source-chip ${cls}">${icon}${esc(label)}</span>`;
    }).join("");

    return `
        <div class="sources-label">Sources</div>
        <div class="sources">${chips}</div>
    `;
}

/* ── Agent progress card ────────────────── */
let progressCard = null;
let progressBody = null;
let progressSteps = {};

function createProgressCard() {
    clearEmpty();
    hideLoader();
    if (progressCard) progressCard.remove();

    progressCard = document.createElement("div");
    progressCard.className = "agent-progress";
    progressCard.id = "agentProgress";
    progressCard.innerHTML = `
        <div class="agent-progress-head">
            <span class="pulse-dot"></span>
            <span>CRAG Pipeline Running</span>
        </div>
        <div class="agent-progress-body"></div>
    `;
    chatInner.appendChild(progressCard);
    progressBody = progressCard.querySelector(".agent-progress-body");
    progressSteps = {};
    scrollDown();
}

function addProgressStep(agent, detail) {
    if (!progressCard) createProgressCard();
    if (progressSteps[agent]) return;

    progressSteps[agent] = true;
    const step = document.createElement("div");
    step.className = "agent-step";
    step.id = `agent-step-${agent}`;
    step.innerHTML = `
        <span class="agent-step-icon">${I.spin}</span>
        <span class="agent-step-label">${esc(agent)}</span>
        <span class="agent-step-detail">${esc(detail)}</span>
    `;
    progressBody.appendChild(step);
    scrollDown();
}

function markProgressDone(agent) {
    const step = document.getElementById(`agent-step-${agent}`);
    if (step) {
        step.querySelector(".agent-step-icon").innerHTML = `<span class="done">${I.check}</span>`;
    }
}

function finalizeProgressCard() {
    if (!progressCard) return;
    const head = progressCard.querySelector(".agent-progress-head");
    const dot = head.querySelector(".pulse-dot");
    if (dot) {
        dot.className = "pulse-dot done-static";
    }
    const label = head.querySelector("span:last-child");
    if (label) label.textContent = "CRAG Pipeline Complete";
    progressCard.classList.add("done");
    progressCard = null;
    progressBody = null;
}

/* ── Sidebar ────────────────────────────── */
menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));

/* ── Documents ──────────────────────────── */
async function loadDocs() {
    try {
        const res = await fetch("/api/documents");
        const docs = await res.json();
        documentList.innerHTML = "";
        if (!docs.length) {
            documentList.innerHTML = '<li class="empty-docs">No documents yet</li>';
            hasDocuments = false;
            questionInput.disabled = true;
            sendButton.disabled = true;
            composerHint.textContent = "Upload a PDF to start asking questions";
            return;
        }
        hasDocuments = true;
        questionInput.disabled = false;
        sendButton.disabled = false;
        composerHint.textContent = "";
        docs.forEach((doc) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="doc-icon">${I.file}</div>
                <div class="doc-info">
                    <strong>${esc(doc.filename)}</strong>
                    <span>${doc.pages} pages · ${doc.chunks} chunks</span>
                </div>
            `;
            documentList.appendChild(li);
        });
    } catch {
        documentList.innerHTML = '<li class="empty-docs">Could not load</li>';
    }
}

/* ── Upload ─────────────────────────────── */
async function uploadPdf(file) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
        uploadStatus.textContent = "Only PDF files are supported.";
        uploadStatus.className = "upload-status error";
        return;
    }
    uploadStatus.textContent = "Indexing...";
    uploadStatus.className = "upload-status";
    const fd = new FormData();
    fd.append("file", file);
    try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Upload failed");
        uploadStatus.textContent = `Indexed ${data.document.chunks} chunks · ${data.document.pages} pages`;
        uploadStatus.className = "upload-status success";
        await loadDocs();
    } catch (e) {
        uploadStatus.textContent = e.message;
        uploadStatus.className = "upload-status error";
    }
}

pdfInput.addEventListener("change", () => {
    const f = pdfInput.files[0];
    if (f) uploadPdf(f);
});

["dragenter", "dragover"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add("dragging"); });
});
["dragleave", "drop"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove("dragging"); });
});
dropZone.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files[0];
    if (f) uploadPdf(f);
});

/* ── Chat ────────────────────────────────── */
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = questionInput.value.trim();
    if (!question || !hasDocuments) return;

    addUserMsg(question);
    questionInput.value = "";
    questionInput.style.height = "auto";
    sendButton.disabled = true;
    questionInput.disabled = true;
    showLoader();
    createProgressCard();

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, top_k: 5 }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Chat failed");
        }

        const data = await res.json();

        if (data.debug && data.debug.steps) {
            data.debug.steps.forEach((s) => {
                addProgressStep(s.agent, s.detail);
                markProgressDone(s.agent);
            });
        }

        hideLoader();
        finalizeProgressCard();
        addAssistantMsg(data.answer, data.citations);
    } catch (err) {
        hideLoader();
        finalizeProgressCard();
        addErrorMsg(err.message);
    } finally {
        sendButton.disabled = false;
        questionInput.disabled = false;
        questionInput.focus();
    }
});

/* ── Textarea auto-resize ────────────────── */
questionInput.addEventListener("input", () => {
    questionInput.style.height = "auto";
    questionInput.style.height = Math.min(questionInput.scrollHeight, 180) + "px";
});
questionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
    }
});

/* ── Init ────────────────────────────────── */
refreshDocs.addEventListener("click", loadDocs);
loadDocs();
questionInput.focus();
