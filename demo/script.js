// demo/script.js — полный рабочий вариант
// Требования к HTML: подключены
// <script defer src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.7.4/dist/tf.min.js"></script>
// <script defer src="https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js"></script>

const MODEL_URL = './model/';

let model;
let running = false;

const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('btnStart');
const stopBtn = document.getElementById('btnStop');
const fileInput = document.getElementById('fileInput');
const labelContainer = document.getElementById('labelContainer');

// мини-канвас 224×224 для подачи в модель
const inputCanvas = document.createElement('canvas');
inputCanvas.width = 224;
inputCanvas.height = 224;
const ictx = inputCanvas.getContext('2d');

// одна строка результата (название + шкала + %)
function makeRow(name) {
  const li = document.createElement('li');
  li.innerHTML = `
    <span class="name">${name}</span>
    <div class="meter" style="flex:1;margin:0 10px;"><span></span></div>
    <span class="right">0.0%</span>
  `;
  return li;
}

// выбор backend: webgl → wasm (если webgl недоступен)
async function chooseBackend() {
  try { await tf.setBackend('webgl'); await tf.ready(); }
  catch { await tf.setBackend('wasm');  await tf.ready(); }
}

// загрузка модели + отрисовка строк с названиями классов
async function loadModel() {
  if (model) return;
  await chooseBackend();

  const tmImage = window.tmImage;
  model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');

  // ✅ надёжно получаем список меток
  let labels = [];
  if (model.getClassLabels) {
    // некоторые версии TM требуют await
    labels = await model.getClassLabels();
  } else if (model.metadata && model.metadata.labels) {
    labels = model.metadata.labels;
  }

  labelContainer.innerHTML = '';
  (labels.length ? labels : ['Class 1', 'Class 2']).forEach(n => {
    labelContainer.appendChild(makeRow(n));
  });

  const hint = document.querySelector('.hint');
  if (hint) hint.style.display = 'none';
}

// запуск камеры и цикла предсказаний
async function startCamera() {
  await loadModel();

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false
  });
  webcam.srcObject = stream;
  await new Promise(r => (webcam.onloadedmetadata = r));

  canvas.width  = Math.min(webcam.videoWidth, 480);
  canvas.height = Math.round(canvas.width * (webcam.videoHeight / webcam.videoWidth));

  startBtn.disabled = true;
  stopBtn.disabled  = false;
  running = true;
  loop();
}

// остановка камеры
function stopCamera() {
  running = false;
  if (webcam.srcObject) {
    webcam.srcObject.getTracks().forEach(t => t.stop());
    webcam.srcObject = null;
  }
  startBtn.disabled = false;
  stopBtn.disabled  = true;
}

// основной цикл
async function loop() {
  while (running && webcam.srcObject) {
    try {
      ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
      ictx.drawImage(webcam, 0, 0, 224, 224);
      await predict(inputCanvas);
    } catch (e) {
      console.error('predict error:', e);
      // авто-переключение backend при проблемах
      try {
        const cur = tf.getBackend();
        await tf.setBackend(cur === 'webgl' ? 'wasm' : 'webgl');
        await tf.ready();
      } catch {}
    }
    await new Promise(r => setTimeout(r, 60));
    await tf.nextFrame();
  }
}

// одно предсказание и обновление полосок
async function predict(imgEl) {
  const pred = await model.predict(imgEl, false);
  pred.sort((a, b) => b.probability - a.probability);

  const rows = Array.from(labelContainer.children);
  pred.forEach(p => {
    const row = rows.find(li => li.querySelector('.name').textContent === p.className);
    if (!row) return;
    const pct = (p.probability * 100).toFixed(1) + '%';
    row.querySelector('.right').textContent = pct;
    row.querySelector('.meter > span').style.width = pct;
  });
}

// загрузка фото из файла
fileInput.addEventListener('change', async e => {
  await loadModel();
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = async () => {
    ictx.drawImage(img, 0, 0, 224, 224);
    await predict(inputCanvas);

    const ratio = img.height / img.width;
    canvas.width  = 480;
    canvas.height = Math.round(480 * ratio);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = URL.createObjectURL(file);
});

// кнопки
startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click',  stopCamera);
