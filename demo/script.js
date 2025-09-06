const MODEL_URL = './model/';
let model, maxPredictions;

const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('btnStart');
const stopBtn = document.getElementById('btnStop');
const fileInput = document.getElementById('fileInput');
const labelContainer = document.getElementById('labelContainer');

async function loadModel() {
  if (!model) {
    const tmImage = window.tmImage;
    model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
    maxPredictions = model.getTotalClasses();
    labelContainer.innerHTML = '';
    for (let i = 0; i < maxPredictions; i++) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="label"></span><span class="prob"></span>';
      labelContainer.appendChild(li);
    }
  }
}

async function startCamera() {
  await loadModel();
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  webcam.srcObject = stream;
  await new Promise(r => webcam.onloadedmetadata = r);
  canvas.width = webcam.videoWidth;
  canvas.height = webcam.videoHeight;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  predictLoop();
}

function stopCamera() {
  const tracks = webcam.srcObject ? webcam.srcObject.getTracks() : [];
  tracks.forEach(t => t.stop());
  webcam.srcObject = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

async function predictLoop() {
  while (webcam.srcObject) {
    ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    await predict(canvas);
    await tf.nextFrame();
  }
}

async function predict(imgEl) {
  const prediction = await model.predict(imgEl, false);
  prediction.sort((a, b) => b.probability - a.probability);
  [...labelContainer.children].forEach((li, i) => {
    const p = prediction[i];
    if (!p) return;
    li.querySelector('.label').textContent = p.className;
    li.querySelector('.prob').textContent = (p.probability * 100).toFixed(1) + '%';
  });
}

fileInput.addEventListener('change', async (e) => {
  await loadModel();
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = async () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    await predict(canvas);
  };
  img.src = URL.createObjectURL(file);
});

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
const MODEL_URL = './model/';
let model, maxPredictions, running = false;

const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('btnStart');
const stopBtn = document.getElementById('btnStop');
const fileInput = document.getElementById('fileInput');
const labelContainer = document.getElementById('labelContainer');

// Отдельный маленький канвас для модели (минимум памяти)
const inputCanvas = document.createElement('canvas');
inputCanvas.width = 224;
inputCanvas.height = 224;
const ictx = inputCanvas.getContext('2d');

// Рендер одной строки со шкалой
function renderRow(name) {
  const li = document.createElement('li');
  li.innerHTML = `
    <span class="name">${name}</span>
    <div class="meter" style="flex:1;margin:0 10px;"><span></span></div>
    <span class="right">0.0%</span>
  `;
  return li;
}

async function chooseBackend() {
  try { await tf.setBackend('webgl'); await tf.ready(); }
  catch { await tf.setBackend('wasm'); await tf.ready(); }
}

async function loadModel() {
  if (!model) {
    await chooseBackend();
    const tmImage = window.tmImage;
    model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
    maxPredictions = model.getTotalClasses();

    // Показать метки сразу (до первого кадра), чтобы ты видел шкалы
    labelContainer.innerHTML = '';
    const labels = model.getClassLabels ? model.getClassLabels() : (model.metadata?.labels || []);
    (labels && labels.length ? labels : Array.from({length:maxPredictions},(_,i)=>`Class ${i+1}`))
      .forEach(name => labelContainer.appendChild(renderRow(name)));
  }
}

async function startCamera() {
  try {
    await loadModel();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    webcam.srcObject = stream;
    await new Promise(r => webcam.onloadedmetadata = r);

    canvas.width = Math.min(webcam.videoWidth, 480);
    canvas.height = Math.round(canvas.width * (webcam.videoHeight / webcam.videoWidth));

    startBtn.disabled = true;
    stopBtn.disabled = false;
    running = true;
    predictLoop();
  } catch (e) {
    alert('Не удалось открыть камеру: ' + e.message);
    console.error(e);
  }
}

function stopCamera() {
  running = false;
  const tracks = webcam.srcObject ? webcam.srcObject.getTracks() : [];
  tracks.forEach(t => t.stop());
  webcam.srcObject = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

async function predictLoop() {
  while (running && webcam.srcObject) {
    try {
      ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
      // готовим вход 224x224
      ictx.drawImage(webcam, 0, 0, 224, 224);
      await predict(inputCanvas);
    } catch (e) {
      console.error('predict error', e);
      try {
        const cur = tf.getBackend();
        await tf.setBackend(cur === 'webgl' ? 'wasm' : 'webgl');
        await tf.ready();
      } catch {}
    }
    await new Promise(r => setTimeout(r, 40));
    await tf.nextFrame();
  }
}

async function predict(imgEl) {
  const prediction = await model.predict(imgEl, false);
  prediction.sort((a, b) => b.probability - a.probability);

  // Обновляем строки по имени класса
  const rows = Array.from(labelContainer.children);
  prediction.forEach(p => {
    const row = rows.find(li => li.querySelector('.name').textContent === p.className);
    if (!row) return;
    row.querySelector('.right').textContent = (p.probability * 100).toFixed(1) + '%';
    row.querySelector('.meter > span').style.width = (p.probability * 100).toFixed(1) + '%';
  });
}

fileInput.addEventListener('change', async (e) => {
  await loadModel();
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = async () => {
    inputCanvas.width = 224; inputCanvas.height = 224;
    ictx.drawImage(img, 0, 0, 224, 224);
    await predict(inputCanvas);
    const ratio = img.height / img.width;
    canvas.width = 480;
    canvas.height = Math.round(480 * ratio);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = URL.createObjectURL(file);
});

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
