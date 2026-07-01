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
const agentLog = document.getElementById("agentLog");
const logEntries = document.getElementById("logEntries");
const logCount = document.getElementById("logCount");
const composerHint = document.getElementById("composerHint");

let hasDocuments = false;

/* ── Icon SVGs ──────────────────────────── */
const ICONS = {
    file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    sparkle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/><path d="M5 15l.5 2L7 17.5l-1.5.5L5 20l-.5-2-2-.5 2-.5z" opacity="0.5"/><path d="M18 4l.3 1.2L19.5 5.5l-1.2.3L18 7l-.3-1.2-1.2-.3 1.2-.3z" opacity="0.3"/></svg>',
    globe: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
    doc: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    check: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>',
    spinner: '<svg class="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
};

/* ── Helpers ────────────────────────────── */
function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

function formatAnswer(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

/* ── Messages ────────────────────────────── */
function clearEmptyState() {
    const es = messagesEl.querySelector(".empty-state");
    if (es) es.remove();
}

function addUserMessage(text) {
    clearEmptyState();
    const wrap = document.createElement("div");
    wrap.className = "msg-user-wrap";
    wrap.innerHTML = `<div class="msg-user">${escapeHtml(text)}</div>`;
    messagesEl.appendChild(wrap);
    scrollDown();
}

function addAssistantMessage(answer, citations) {
    clearEmptyState();
    const wrap = document.createElement("div");
    wrap.className = "msg-assistant-wrap";
    wrap.innerHTML = `
        <div class="msg-assistant">
            <div class="msg-avatar">${ICONS.sparkle}</div>
            <div class="msg-body">
                <div class="answer-text">${formatAnswer(answer)}</div>
                ${renderCitations(citations)}
            </div>
        </div>
    `;
    messagesEl.appendChild(wrap);
    scrollDown();
}

function showLoader() {
    clearEmptyState();
    const wrap = document.createElement("div");
    wrap.className = "msg-assistant-wrap";
    wrap.id = "loaderMsg";
    wrap.innerHTML = `
        <div class="msg-assistant">
            <div class="msg-avatar">${ICONS.sparkle}</div>
            <div class="msg-body"><div class="loader"><span></span><span></span><span></span></div></div>
        </div>
    `;
    messagesEl.appendChild(wrap);
    scrollDown();
}

function removeLoader() {
    const el = document.getElementById("loaderMsg");
    if (el) el.remove();
}

function addErrorMessage(text) {
    clearEmptyState();
    const wrap = document.createElement("div");
    wrap.className = "msg-assistant-wrap";
    wrap.innerHTML = `
        <div class="msg-assistant">
            <div class="msg-avatar msg-avatar-err"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg></div>
            <div class="msg-body"><div class="answer-text" style="color:var(--red)">${escapeHtml(text)}</div></div>
        </div>
    `;
    messagesEl.appendChild(wrap);
    scrollDown();
}

function scrollDown() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* ── Citations ────────────────────────────── */
function renderCitations(citations) {
    if (!citations || !citations.length) return "";
    const chips = citations.map((c) => {
        const isWeb = c.filename && c.filename.startsWith("web:");
        const label = isWeb
            ? c.filename.replace("web: ", "")
            : `${c.filename}${c.page ? " · p." + c.page : ""}`;
        const icon = isWeb ? ICONS.globe : ICONS.doc;
        return `<span class="source-chip ${isWeb ? "chip-web" : "chip-pdf"}">${icon}${escapeHtml(label)}</span>`;
    }).join("");
    return `<div class="sources">${chips}</div>`;
}

/* ── Agent Log ────────────────────────────── */
function showAgentLog() {
    agentLog.style.display = "block";
    logEntries.innerHTML = "";
    logCount.textContent = "0";
}

function addLogEntry(step) {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.id = `log-${step.agent}`;
    entry.innerHTML = `
        <span class="log-entry-icon">${ICONS.spinner}</span>
        <span class="log-entry-agent">${escapeHtml(step.agent)}</span>
        <span class="log-entry-detail">${escapeHtml(step.detail)}</span>
    `;
    logEntries.appendChild(entry);
    logCount.textContent = parseInt(logCount.textContent) + 1;
}

function markLogEntryDone(agent) {
    const entry = document.getElementById(`log-${agent}`);
    if (entry) {
        const icon = entry.querySelector(".log-entry-icon");
        if (icon) icon.innerHTML = ICONS.check;
    }
}

/* ── Sidebar toggle ────────────────────────── */
menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));

/* ── Documents ────────────────────────────── */
async function loadDocuments() {
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
                <div class="doc-icon">${ICONS.file}</div>
                <div class="doc-info">
                    <strong>${escapeHtml(doc.filename)}</strong>
                    <span>${doc.pages} pages · ${doc.chunks} chunks</span>
                </div>
            `;
            documentList.appendChild(li);
        });
    } catch {
        documentList.innerHTML = '<li class="empty-docs">Could not load</li>';
    }
}

/* ── Upload ────────────────────────────── */
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
        await loadDocuments();
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

/* ── Chat with real-time streaming ────────── */
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = questionInput.value.trim();
    if (!question || !hasDocuments) return;

    addUserMessage(question);
    questionInput.value = "";
    questionInput.style.height = "auto";
    sendButton.disabled = true;
    questionInput.disabled = true;
    showLoader();
    showAgentLog();

    try {
        const res = await fetch("/api/chat/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, top_k: 5 }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Chat failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";
        let citations = [];
        const seenAgents = new Set();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const jsonStr = line.slice(6);
                try {
                    const event = JSON.parse(jsonStr);
                    if (event.type === "step") {
                        if (!seenAgents.has(event.agent)) {
                            seenAgents.add(event.agent);
                            addLogEntry(event);
                        }
                    } else if (event.type === "done") {
                        answer = event.answer || answer;
                        citations = event.citations || citations;
                    }
                } catch {}
            }
        }

        removeLoader();
        seenAgents.forEach((a) => markLogEntryDone(a));
        addAssistantMessage(answer, citations);
    } catch (err) {
        removeLoader();
        addErrorMessage(err.message);
    } finally {
        sendButton.disabled = false;
        questionInput.disabled = false;
        questionInput.focus();
    }
});

/* ── Auto-resize textarea ────────────── */
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

/* ── Init ────────────────────────────── */
refreshDocs.addEventListener("click", loadDocuments);
loadDocuments();
questionInput.focus();
