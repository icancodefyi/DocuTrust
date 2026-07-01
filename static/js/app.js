const uploadBtn = document.getElementById('uploadBtn')
const fileInput = document.getElementById('fileInput')
const uploadStatus = document.getElementById('uploadStatus')
const askBtn = document.getElementById('askBtn')
const questionEl = document.getElementById('question')
const answerEl = document.getElementById('answer')
const citationsEl = document.getElementById('citations')

uploadBtn.onclick = async () => {
  if (!fileInput.files.length) return alert('Select a PDF')
  const file = fileInput.files[0]
  const fd = new FormData();
  fd.append('file', file)
  uploadStatus.innerText = 'Uploading...'
  const res = await fetch('/api/upload', {method: 'POST', body: fd})
  const data = await res.json()
  uploadStatus.innerText = JSON.stringify(data)
}

askBtn.onclick = async () => {
  const q = questionEl.value.trim()
  if (!q) return
  answerEl.innerText = 'Thinking...'
  citationsEl.innerText = ''
  const res = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({question: q, top_k: 3})})
  const data = await res.json()
  answerEl.innerText = data.answer
  if (data.citations && data.citations.length){
    citationsEl.innerHTML = '<strong>Citations:</strong><br>' + data.citations.map(c=>`- ${c.source} (chunk ${c.chunk_id})`).join('<br>')
  }
}
