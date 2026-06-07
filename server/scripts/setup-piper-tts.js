/**
 * Download Piper binary + MIT voice model (rhasspy/piper-voices).
 * Usage: node server/scripts/setup-piper-tts.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const VENDOR_ROOT = path.join(__dirname, '../vendor/piper');
const VOICES_DIR = path.join(VENDOR_ROOT, 'voices');

const PIPER_RELEASE =
  'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip';

const VOICE_ID = process.env.PIPER_VOICE || 'en_US-lessac-medium';
const VOICE_BASE = `https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/${VOICE_ID}`;

function log(msg) {
  console.log(`[tts:setup] ${msg}`);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (target) => {
      https
        .get(target, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            return request(res.headers.location);
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed ${res.statusCode}: ${target}`));
            return;
          }
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        })
        .on('error', reject);
    };
    request(url);
  });
}

async function ensureVoice() {
  fs.mkdirSync(VOICES_DIR, { recursive: true });
  const modelPath = path.join(VOICES_DIR, `${VOICE_ID}.onnx`);
  const configPath = path.join(VOICES_DIR, `${VOICE_ID}.onnx.json`);

  if (!fs.existsSync(modelPath)) {
    log(`Downloading ${VOICE_ID}.onnx …`);
    await download(`${VOICE_BASE}.onnx?download=true`, modelPath);
  }
  if (!fs.existsSync(configPath)) {
    log(`Downloading ${VOICE_ID}.onnx.json …`);
    await download(`${VOICE_BASE}.onnx.json?download=true.json`, configPath);
  }
}

async function ensurePiperBinary() {
  const binPath = path.join(VENDOR_ROOT, 'piper', 'piper.exe');
  if (fs.existsSync(binPath)) {
    log('Piper binary already present');
    return;
  }

  if (process.platform !== 'win32') {
    log('Auto-download is configured for Windows. On Linux/macOS install piper manually into server/vendor/piper/piper');
    return;
  }

  fs.mkdirSync(VENDOR_ROOT, { recursive: true });
  const zipPath = path.join(VENDOR_ROOT, 'piper_windows_amd64.zip');
  log('Downloading Piper for Windows …');
  await download(PIPER_RELEASE, zipPath);

  log('Extracting Piper …');
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Force '${zipPath}' '${VENDOR_ROOT}'"`,
    { stdio: 'inherit' }
  );
  fs.unlinkSync(zipPath);
}

async function main() {
  log('Setting up open-source Piper TTS …');
  await ensurePiperBinary();
  await ensureVoice();
  log('Done. Restart the API server and use voice chat — browser Piper loads automatically.');
  log(`Server voice: ${VOICE_ID} (override with PIPER_VOICE env)`);
}

main().catch((err) => {
  console.error('[tts:setup] failed:', err.message);
  process.exit(1);
});
