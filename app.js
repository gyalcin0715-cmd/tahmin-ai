(() => {
  'use strict';

  const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/EBy4ibzk_/';
  const MAX_FILE_BYTES = 12 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

  const elements = {
    modelStatus: document.querySelector('#modelStatus'),
    modelStatusText: document.querySelector('#modelStatusText'),
    retryModelButton: document.querySelector('#retryModelButton'),
    imageInput: document.querySelector('#imageInput'),
    dropzone: document.querySelector('#dropzone'),
    previewPanel: document.querySelector('#previewPanel'),
    previewImage: document.querySelector('#previewImage'),
    fileName: document.querySelector('#fileName'),
    removeButton: document.querySelector('#removeButton'),
    uploadError: document.querySelector('#uploadError'),
    analyzeButton: document.querySelector('#analyzeButton'),
    buttonLabel: document.querySelector('.button-label'),
    resultPlaceholder: document.querySelector('#resultPlaceholder'),
    resultCard: document.querySelector('#resultCard'),
    predictionName: document.querySelector('#predictionName'),
    confidenceValue: document.querySelector('#confidenceValue'),
    confidenceBar: document.querySelector('#confidenceBar'),
    otherPredictions: document.querySelector('#otherPredictions'),
    scanningState: document.querySelector('#scanningState'),
    analysisError: document.querySelector('#analysisError'),
  };

  let model = null;
  let selectedFile = null;
  let previewUrl = null;
  let isAnalyzing = false;

  function setModelStatus(state, message, canRetry = false) {
    elements.modelStatus.dataset.state = state;
    elements.modelStatusText.textContent = message;
    elements.retryModelButton.classList.toggle('hidden', !canRetry);
  }

  function setUploadError(message = '') {
    elements.uploadError.textContent = message;
    elements.uploadError.classList.toggle('hidden', !message);
  }

  function setAnalysisError(message = '') {
    elements.analysisError.textContent = message;
    elements.analysisError.classList.toggle('hidden', !message);
  }

  function updateAnalyzeButton() {
    elements.analyzeButton.disabled = !selectedFile || !model || isAnalyzing;
    if (isAnalyzing) {
      elements.buttonLabel.textContent = 'Analiz ediliyor…';
    } else if (!selectedFile) {
      elements.buttonLabel.textContent = 'Önce görsel seç';
    } else if (!model) {
      elements.buttonLabel.textContent = elements.modelStatus.dataset.state === 'error' ? 'Model yüklenemedi' : 'Model hazırlanıyor…';
    } else {
      elements.buttonLabel.textContent = 'Görseli analiz et';
    }
  }

  async function loadModel() {
    model = null;
    setModelStatus('loading', 'Model hazırlanıyor');
    updateAnalyzeButton();
    elements.retryModelButton.disabled = true;
    try {
      if (!window.tmImage || !window.tf) {
        throw new Error('Model kütüphaneleri yüklenemedi. İnternet bağlantısını kontrol edip yeniden deneyin.');
      }
      await window.tf.ready();
      model = await window.tmImage.load(`${MODEL_URL}model.json`, `${MODEL_URL}metadata.json`);
      setModelStatus('ready', 'Model hazır · analiz için bekliyor');
      setAnalysisError('');
    } catch (error) {
      console.error('Teachable Machine model yüklenemedi:', error);
      setModelStatus('error', 'Model yüklenemedi', true);
      showAnalysisError(error.message || 'Model yüklenirken bir sorun oluştu. Bağlantınızı kontrol edip yeniden deneyin.');
    } finally {
      elements.retryModelButton.disabled = false;
      updateAnalyzeButton();
    }
  }

  function showAnalysisError(message) {
    elements.resultPlaceholder.classList.add('hidden');
    elements.resultCard.classList.add('hidden');
    elements.scanningState.classList.add('hidden');
    setAnalysisError(message);
  }

  function clearResult() {
    setAnalysisError('');
    elements.resultCard.classList.add('hidden');
    elements.scanningState.classList.add('hidden');
    elements.resultPlaceholder.classList.remove('hidden');
    elements.confidenceBar.style.width = '0%';
    elements.otherPredictions.replaceChildren();
    elements.otherPredictions.classList.add('hidden');
  }

  function clearSelectedFile() {
    selectedFile = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    elements.previewImage.removeAttribute('src');
    elements.imageInput.value = '';
    elements.previewPanel.classList.add('hidden');
    elements.dropzone.classList.remove('hidden');
    elements.fileName.textContent = '';
    setUploadError('');
    clearResult();
    updateAnalyzeButton();
  }

  function acceptFile(file) {
    setUploadError('');
    setAnalysisError('');
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      clearSelectedFile();
      setUploadError('Bu dosya türü desteklenmiyor. Lütfen JPG, PNG, WEBP veya GIF seç.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      clearSelectedFile();
      setUploadError('Dosya 12 MB sınırını aşıyor. Daha küçük bir görsel seç.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    elements.previewImage.src = previewUrl;
    elements.fileName.textContent = file.name;
    elements.dropzone.classList.add('hidden');
    elements.previewPanel.classList.remove('hidden');
    clearResult();
    updateAnalyzeButton();
  }

  function renderPredictions(predictions) {
    if (!Array.isArray(predictions) || predictions.length === 0) {
      throw new Error('Model bu görsel için bir tahmin döndürmedi. Başka bir görselle yeniden dene.');
    }
    const ranked = [...predictions]
      .filter((item) => item && Number.isFinite(item.probability))
      .sort((a, b) => b.probability - a.probability);
    if (ranked.length === 0) throw new Error('Modelin tahmin sonucu okunamadı. Yeniden dene.');

    const best = ranked[0];
    const confidence = Math.max(0, Math.min(100, best.probability * 100));
    elements.predictionName.textContent = best.className || 'Bilinmeyen sınıf';
    elements.confidenceValue.textContent = `${confidence.toFixed(1).replace('.', ',')}%`;
    elements.confidenceBar.style.width = `${confidence}%`;

    elements.otherPredictions.replaceChildren();
    for (const [index, prediction] of ranked.entries()) {
      const percent = Math.max(0, Math.min(100, prediction.probability * 100));
      const formattedPercent = `${percent.toFixed(1).replace('.', ',')}%`;
      const row = document.createElement('div');
      row.className = `score-row${index === 0 ? ' is-best' : ''}`;
      row.setAttribute('role', 'listitem');
      row.setAttribute('aria-label', `${prediction.className || `Sınıf ${index + 1}`}: ${formattedPercent}`);

      const heading = document.createElement('div');
      heading.className = 'score-row-heading';
      const name = document.createElement('span');
      name.className = 'score-row-name';
      name.textContent = prediction.className || `Sınıf ${index + 1}`;
      const value = document.createElement('strong');
      value.className = 'score-row-value';
      value.textContent = formattedPercent;
      heading.append(name, value);

      const track = document.createElement('div');
      track.className = 'score-row-track';
      track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span');
      fill.style.width = `${percent}%`;
      track.append(fill);
      row.append(heading, track);
      elements.otherPredictions.append(row);
    }
    elements.otherPredictions.classList.remove('hidden');
    elements.resultPlaceholder.classList.add('hidden');
    elements.scanningState.classList.add('hidden');
    setAnalysisError('');
    elements.resultCard.classList.remove('hidden');
  }

  async function analyzeImage() {
    if (!selectedFile || !model || isAnalyzing) return;
    isAnalyzing = true;
    updateAnalyzeButton();
    elements.resultPlaceholder.classList.add('hidden');
    elements.resultCard.classList.add('hidden');
    setAnalysisError('');
    elements.scanningState.classList.remove('hidden');

    try {
      if (!elements.previewImage.complete || !elements.previewImage.naturalWidth) {
        await new Promise((resolve, reject) => {
          elements.previewImage.onload = resolve;
          elements.previewImage.onerror = () => reject(new Error('Görsel açılamadı. Başka bir dosya deneyin.'));
        });
      }
      const predictions = await model.predict(elements.previewImage, false);
      renderPredictions(predictions);
    } catch (error) {
      console.error('Görsel analizi başarısız:', error);
      showAnalysisError(error.message || 'Analiz sırasında bir sorun oluştu. Lütfen yeniden dene.');
    } finally {
      isAnalyzing = false;
      updateAnalyzeButton();
    }
  }

  elements.imageInput.addEventListener('change', (event) => acceptFile(event.target.files?.[0]));
  elements.removeButton.addEventListener('click', clearSelectedFile);
  elements.analyzeButton.addEventListener('click', analyzeImage);
  elements.retryModelButton.addEventListener('click', loadModel);

  elements.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      elements.imageInput.click();
    }
  });
  for (const eventName of ['dragenter', 'dragover']) {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.add('is-dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.remove('is-dragging');
    });
  }
  elements.dropzone.addEventListener('drop', (event) => acceptFile(event.dataTransfer?.files?.[0]));
  window.addEventListener('beforeunload', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });

  loadModel();
})();
