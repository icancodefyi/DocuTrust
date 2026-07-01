const uploadForm = document.querySelector("#uploadForm");
const pdfInput = document.querySelector("#pdfInput");
const uploadButton = document.querySelector("#uploadButton");
const uploadStatus = document.querySelector("#uploadStatus");
const dropZone = document.querySelector("#dropZone");
const chatForm = document.querySelector("#chatForm");
const questionInput = document.querySelector("#questionInput");
const sendButton = document.querySelector("#sendButton");
const messages = document.querySelector("#messages");
const loadingTemplate = document.querySelector("#loadingTemplate");
const documentList = document.querySelector("#documentList");
const refreshDocs = document.querySelector("#refreshDocs");
const logEntries = document.querySelector("#logEntries");
const logCount = document.querySelector("#logCount");

function setStatus(text, isError = false) {
    uploadStatus.textContent = text;
    uploadStatus.classList.toggle("error", isError);
}

function addMessage(role, html) {
    const message = document.createElement("article");
    message.className = `message ${role}`;
    message.innerHTML = html;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    }[char]));
}

function renderCitations(citations) {
    if (!citations.length) {
        return "";
    }

    const items = citations.map((citation) => `
        <div class="citation">
            <strong>${escapeHtml(citation.filename)} - page ${citation.page}</strong>
            <p>${escapeHtml(citation.excerpt)}</p>
        </div>
    `).join("");

    return `<div class="citations">${items}</div>`;
}

function renderSteps(steps) {
    if (!steps || !steps.length) {
        return;
    }

    logEntries.innerHTML = "";
    steps.forEach((step) => {
        const entry = document.createElement("div");
        entry.className = "log-entry";
        entry.innerHTML = `
            <span class="log-icon">\u2713</span>
            <span class="log-agent">${escapeHtml(step.agent)}</span>
            <span class="log-detail">${escapeHtml(step.detail)}</span>
        `;
        logEntries.appendChild(entry);
    });
    logCount.textContent = steps.length;
}

async function loadDocuments() {
    const response = await fetch("/api/documents");
    const documents = await response.json();
    documentList.innerHTML = "";

    if (!documents.length) {
        documentList.innerHTML = "<li>No indexed PDFs yet.</li>";
        return;
    }

    for (const doc of documents) {
        const item = window.document.createElement("li");
        item.innerHTML = `
            <strong>${escapeHtml(doc.filename)}</strong>
            <span>${doc.pages} pages - ${doc.chunks} chunks</span>
        `;
        documentList.appendChild(item);
    }
}

uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = pdfInput.files[0];
    if (!file) {
        setStatus("Choose a PDF before indexing.", true);
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    uploadButton.disabled = true;
    setStatus("Uploading and indexing PDF...");

    try {
        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Upload failed.");
        }

        setStatus(`${data.document.filename} indexed with ${data.document.chunks} chunks.`);
        await loadDocuments();
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        uploadButton.disabled = false;
    }
});

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = questionInput.value.trim();
    if (!question) {
        return;
    }

    addMessage("user", `<p>${escapeHtml(question)}</p>`);
    questionInput.value = "";
    sendButton.disabled = true;
    const loader = loadingTemplate.content.firstElementChild.cloneNode(true);
    messages.appendChild(loader);
    messages.scrollTop = messages.scrollHeight;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({question, top_k: 5}),
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Chat failed.");
        }

        loader.remove();
        if (data.debug && data.debug.steps) {
            renderSteps(data.debug.steps);
        }
        addMessage("assistant", `<p>${escapeHtml(data.answer)}</p>${renderCitations(data.citations)}`);
    } catch (error) {
        loader.remove();
        addMessage("assistant", `<p class="error">${escapeHtml(error.message)}</p>`);
    } finally {
        sendButton.disabled = false;
        questionInput.focus();
    }
});

["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add("dragging");
    });
});

["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove("dragging");
    });
});

dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (file) {
        pdfInput.files = event.dataTransfer.files;
        setStatus(`${file.name} selected.`);
    }
});

pdfInput.addEventListener("change", () => {
    const file = pdfInput.files[0];
    if (file) {
        setStatus(`${file.name} selected.`);
    }
});

refreshDocs.addEventListener("click", loadDocuments);
loadDocuments().catch(() => {
    documentList.innerHTML = "<li>Document list unavailable.</li>";
});
