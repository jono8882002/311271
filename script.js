(function() {
  try {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTWEgL7Ebi-zJwcG_n9bBqKK0LWiF-YVvO5TrEJUT3_sDJMpfbx3M5tnJs58s3cSE/exec';
    const STATUS = document.getElementById('statusMessage');
const fileInput = document.getElementById('fileInput');
const loadButton = document.getElementById('loadButton');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const queryButton = document.getElementById('queryButton');
const articleText = document.getElementById('articleText');
const wordResult = document.getElementById('wordResult');
const recordTable = document.getElementById('recordTable');

const PDFJS_SRC_LIST = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.122/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.122/build/pdf.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.122/build/pdf.min.js'
];

let sentences = [];
let currentSentenceIndex = 0;
let isPlaying = false;
let utterance = null;

loadButton.addEventListener('click', () => {
  const file = fileInput.files[0];
  if (!file) {
    setStatus('請先選擇 .txt 或 .pdf 檔案。');
    return;
  }
  readFile(file);
});

playButton.addEventListener('click', togglePlayback);
stopButton.addEventListener('click', stopPlayback);
queryButton.addEventListener('click', queryRecords);
articleText.addEventListener('click', event => {
  const target = event.target;
  if (target.classList.contains('word')) {
    const rawWord = target.dataset.word;
    onWordClick(rawWord);
  }
});

function setStatus(message) {
  STATUS.textContent = message;
}

async function readFile(file) {
  setStatus('正在讀取檔案，請稍候...');
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === 'txt') {
    const reader = new FileReader();
    reader.onload = () => renderArticle(reader.result);
    reader.onerror = () => setStatus('讀取文字檔時發生錯誤。');
    reader.readAsText(file, 'UTF-8');
  } else if (extension === 'pdf') {
    let pdfSource;
    try {
      pdfSource = await loadPdfJs();
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.js', pdfSource).href;
      }
    } catch (error) {
      console.error(error);
      setStatus('無法載入 PDF.js，請確認網頁可存取 PDF.js CDN。');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const uint8 = new Uint8Array(reader.result);
        const pdf = await window.pdfjsLib.getDocument({ data: uint8 }).promise;
        let content = '';
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          content += pageText + '\n\n';
        }
        renderArticle(content);
      } catch (error) {
        console.error(error);
        setStatus('讀取 PDF 檔案時發生錯誤。');
      }
    };
    reader.onerror = () => setStatus('讀取 PDF 檔案時發生錯誤。');
    reader.readAsArrayBuffer(file);
  } else {
    setStatus('僅支援 .txt 與 .pdf 檔案格式。');
  }
}

async function loadPdfJs() {
  if (typeof window.pdfjsLib !== 'undefined') {
    return window.pdfjsLibScriptSrc || PDFJS_SRC_LIST[0];
  }
  for (const src of PDFJS_SRC_LIST) {
    try {
      await loadScript(src);
      if (typeof window.pdfjsLib !== 'undefined') {
        window.pdfjsLibScriptSrc = src;
        return src;
      }
    } catch (err) {
      console.warn('PDF.js 載入失敗，嘗試下一個來源：', src, err);
    }
  }
  throw new Error('PDF.js 來源全部載入失敗');
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find(script => script.src === src);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('PDF.js 下載錯誤：' + src)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => reject(new Error('PDF.js 下載失敗：' + src));
    document.head.appendChild(script);
  });
}

function renderArticle(text) {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) {
    setStatus('文章內容為空，請確認檔案是否正確。');
    return;
  }
  sentences = splitSentences(cleaned);
  articleText.innerHTML = sentences.map((sentence, index) => {
    return `<span class="sentence" data-index="${index}">${wrapWords(sentence)}</span> `;
  }).join('');
  setStatus('文章載入完成，可按播放鍵開始閱讀或點擊單字查詢。');
  currentSentenceIndex = 0;
  isPlaying = false;
  playButton.textContent = '播放 / 暫停';
  wordResult.innerHTML = '點擊文章內的單字即可查詢。';
  recordTable.innerHTML = '按下「查詢單字紀錄」即可載入 Google Sheets 中的紀錄。';
}

function splitSentences(text) {
  const rawSentences = text
    .replace(/\u2028|\u2029/g, '\n')
    .split(/(?<=[\.\?\!])\s+(?=[A-Z0-9"'\(])/g)
    .map(s => s.trim())
    .filter(Boolean);
  if (rawSentences.length === 0) {
    return [text.trim()];
  }
  return rawSentences;
}

function wrapWords(sentence) {
  return sentence.replace(/(\b[\w']+\b)/g, (match) => {
    return `<span class="word" data-word="${match}">${match}</span>`;
  });
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
    return;
  }
  if (sentences.length === 0) {
    setStatus('請先讀取文章，再使用播放功能。');
    return;
  }
  isPlaying = true;
  playButton.textContent = '暫停';
  playSentence(currentSentenceIndex);
}

function playSentence(index) {
  if (!isPlaying || index >= sentences.length) {
    stopPlayback();
    return;
  }
  currentSentenceIndex = index;
  highlightSentence(index);
  utterance = new SpeechSynthesisUtterance(sentences[index]);
  utterance.lang = 'en-US';
  utterance.rate = 1.0;
  utterance.onend = () => {
    if (!isPlaying) return;
    if (currentSentenceIndex + 1 < sentences.length) {
      playSentence(currentSentenceIndex + 1);
    } else {
      stopPlayback();
    }
  };
  utterance.onerror = () => {
    setStatus('語音播放發生錯誤。');
    stopPlayback();
  };
  window.speechSynthesis.speak(utterance);
  setStatus(`正在播報第 ${index + 1} 句，共 ${sentences.length} 句。`);
}

function stopPlayback() {
  isPlaying = false;
  playButton.textContent = '播放 / 暫停';
  window.speechSynthesis.cancel();
  clearHighlight();
  setStatus('已停止播放。');
}

function highlightSentence(index) {
  document.querySelectorAll('.sentence').forEach(el => el.classList.remove('active'));
  const element = document.querySelector(`.sentence[data-index='${index}']`);
  if (element) {
    element.classList.add('active');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function clearHighlight() {
  document.querySelectorAll('.sentence').forEach(el => el.classList.remove('active'));
}

async function onWordClick(word) {
  setStatus(`查詢單字：${word}`);
  const result = await lookupWord(word);
  renderWordResult(word, result);
  if (SCRIPT_URL.includes('YOUR_DEPLOY_ID')) {
    console.warn('請先將 script.js 裡面的 SCRIPT_URL 變數改成您的 Apps Script Web App URL。');
    return;
  }
  await recordWordClick(word, result.pronunciation, result.translation);
}

async function lookupWord(word) {
  const normalized = word.trim().toLowerCase();
  const dictionaryPromise = fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`)
    .then(r => r.ok ? r.json() : null)
    .catch(() => null);
  const translatePromise = fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(normalized)}`)
    .then(r => r.ok ? r.json() : null)
    .catch(() => null);

  const [dictionaryData, translateData] = await Promise.all([dictionaryPromise, translatePromise]);
  let pronunciation = '無法取得發音';
  let translation = '無法取得翻譯';

  if (dictionaryData && Array.isArray(dictionaryData) && dictionaryData[0].phonetics) {
    const phonetic = dictionaryData[0].phonetics.find(p => p.text) || dictionaryData[0].phonetics[0];
    if (phonetic && phonetic.text) {
      pronunciation = phonetic.text;
    }
  }
  if (translateData && Array.isArray(translateData) && translateData[0] && translateData[0][0]) {
    translation = translateData[0][0][0] || translation;
  }
  return { pronunciation, translation };
}

function renderWordResult(word, result) {
  wordResult.innerHTML = `
    <p><strong>單字：</strong>${word}</p>
    <p><strong>發音：</strong>${result.pronunciation}</p>
    <p><strong>中文翻譯：</strong>${result.translation}</p>
  `;
}

async function recordWordClick(word, pronunciation, translation) {
  try {
    const params = new URLSearchParams();
    params.append('action', 'record');
    params.append('word', word);
    params.append('pronunciation', pronunciation);
    params.append('translation', translation);
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: params
    });
    const data = await response.json();
    if (data.status !== 'ok') {
      console.warn('紀錄單字失敗', data);
    }
  } catch (error) {
    console.warn('無法將紀錄寫入 Google Sheets。', error);
  }
}

async function queryRecords() {
  if (SCRIPT_URL.includes('YOUR_DEPLOY_ID')) {
    setStatus('請先將 script.js 裡面的 SCRIPT_URL 變成您的 Apps Script Web App URL。');
    return;
  }
  setStatus('正在查詢 Google Sheets 中的單字紀錄...');
  try {
    const response = await fetch(`${SCRIPT_URL}?action=query`);
    const data = await response.json();
    if (data.status !== 'ok' || !Array.isArray(data.data)) {
      throw new Error('無效回應');
    }
    renderRecordTable(data.data);
    setStatus('已載入單字紀錄。');
  } catch (error) {
    console.error(error);
    setStatus('查詢紀錄時發生錯誤。');
  }
}

function renderRecordTable(rows) {
  if (rows.length === 0) {
    recordTable.innerHTML = '<p>目前尚無單字紀錄。</p>';
    return;
  }
  const header = `
    <table>
      <thead>
        <tr><th>時間</th><th>單字</th><th>發音</th><th>中文翻譯</th></tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td>${escapeHtml(row.timestamp)}</td>
            <td>${escapeHtml(row.word)}</td>
            <td>${escapeHtml(row.pronunciation)}</td>
            <td>${escapeHtml(row.translation)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  recordTable.innerHTML = header;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.__appScriptLoaded = true;
  } catch (e) {
    console.error('App init failed', e);
    window.__appScriptInitError = e && e.message ? e.message : String(e);
    throw e;
  }
})();
