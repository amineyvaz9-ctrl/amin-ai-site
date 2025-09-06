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
