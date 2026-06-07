/**
 * Open-source Piper TTS (rhasspy/piper) — local neural speech synthesis.
 * @see https://github.com/rhasspy/piper
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const VENDOR_ROOT = path.join(__dirname, '../vendor/piper');
const VOICES_DIR = path.join(VENDOR_ROOT, 'voices');

const DEFAULT_VOICE = process.env.PIPER_VOICE || 'en_US-lessac-medium';

function piperBinaryPath() {
  if (process.platform === 'win32') {
    return path.join(VENDOR_ROOT, 'piper', 'piper.exe');
  }
  return path.join(VENDOR_ROOT, 'piper', 'piper');
}

function modelPaths(voiceId = DEFAULT_VOICE) {
  const model = path.join(VOICES_DIR, `${voiceId}.onnx`);
  const config = path.join(VOICES_DIR, `${voiceId}.onnx.json`);
  return { model, config };
}

function isPiperReady() {
  const bin = piperBinaryPath();
  const { model, config } = modelPaths();
  return fs.existsSync(bin) && fs.existsSync(model) && fs.existsSync(config);
}

function getStatus() {
  const ready = isPiperReady();
  return {
    available: ready,
    engine: 'piper',
    voice: ready ? DEFAULT_VOICE : null,
    message: ready
      ? 'Piper open-source TTS ready'
      : 'Run npm run tts:setup to install Piper and voice models',
  };
}

/**
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
function synthesize(text) {
  return new Promise((resolve, reject) => {
    if (!isPiperReady()) {
      reject(new Error('Piper TTS is not installed'));
      return;
    }

    const trimmed = String(text || '').trim().slice(0, 4000);
    if (!trimmed) {
      reject(new Error('Empty text'));
      return;
    }

    const bin = piperBinaryPath();
    const { model } = modelPaths();
    const outFile = path.join(os.tmpdir(), `kidchat-piper-${Date.now()}.wav`);

    const args = ['--model', model, '--output_file', outFile];
    const proc = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.stdin.write(trimmed);
    proc.stdin.end();

    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Piper exited with code ${code}`));
        return;
      }
      try {
        const audio = fs.readFileSync(outFile);
        fs.unlinkSync(outFile);
        resolve(audio);
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = {
  DEFAULT_VOICE,
  VENDOR_ROOT,
  VOICES_DIR,
  getStatus,
  isPiperReady,
  synthesize,
};
