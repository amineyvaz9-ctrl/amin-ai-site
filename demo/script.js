const MODEL_URL = './model/';
let model, running = false;

const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('btnStart');
const stopBtn = document.getElementById('btnStop');
const fileInput = document.getElementById('fileInput');
const labelContainer = document.getElementById('labelContainer');

const inputCanvas = document.createElement('canvas');
inputCanvas.width = 224; inputCanvas.height = 224;
const ictx = inputCanvas.getContext('2d');

function makeRow(name) {
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
  if (model) return;
  await chooseBackend();
  const tmImage = window.tmImage;
  model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
  labelContainer.innerHTML = '';
  (model.metadata.labels || []).forEach(n => {
    labelContainer.appendChild(makeRow(n));
  });
  const hint = document.querySelector('.hint'); if (hint) hint.style.display = 'none';
}

async function startCamera() {
  await loadModel();
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false
  });
  webcam.srcObject = stream;
  await new Promise(r => webcam.onloadedmetadata = r);
  canvas.width = Math.min(webcam.videoWidth, 480);
  canvas.height = Math.round(canvas.width * (webcam.videoHeight / webcam.videoWidth));
  startBtn.disabled = true; stopBtn.disabled = false;
  running = true; loop();
}

function stopCamera() {
  running = false;
  const tracks = webcam.srcObject ? webcam.srcObject.getTracks() : [];
  tracks.forEach(t => t.stop());
  webcam.srcObject = null;
  startBtn.disabled = false; stopBtn.disabled = true;
}

async function loop() {
  while (running && webcam.srcObject) {
    ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    ictx.drawImage(webcam, 0, 0, 224, 224);
    await predict(inputCanvas);
    await new Promise(r => setTimeout(r, 60));
    await tf.nextFrame();
  }
}

async function predict(imgEl) {
  const pred = await model.predict(imgEl, false);
  pred.sort((a,b)=>b.probability - a.probability);
  const rows = Array.from(labelContainer.children);
  pred.forEach(p => {
    const row = rows.find(li => li.querySelector('.name').textContent === p.className);
    if (!row) return;
    row.querySelector('.right').textContent = (p.probability*100).toFixed(1) + '%';
    row.querySelector('.meter > span').style.width = (p.probability*100).toFixed(1) + '%';
  });
}

fileInput.addEventListener('change', async (e) => {
  await loadModel();
  const file = e.target.files[0]; if (!file) return;
  const img = new Image();
  img.onload = async () => {
    ictx.drawImage(img, 0, 0, 224, 224);
    await predict(inputCanvas);
    const ratio = img.height / img.width;
    canvas.width = 480; canvas.height = Math.round(480 * ratio);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = URL.createObjectURL(file);
});

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
