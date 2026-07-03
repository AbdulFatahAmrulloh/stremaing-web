const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_ROOT = path.join(__dirname, '..');
const statusFilePath = path.join(APP_ROOT, 'stream_status.json');
const recordsDir = path.join(APP_ROOT, 'records');

let ffmpegProcess = null;

function getStatus() {
  try {
    if (!fs.existsSync(statusFilePath)) {
      const def = { is_streaming: false, start_time: 0, current_file: '', pid: 0 };
      fs.writeFileSync(statusFilePath, JSON.stringify(def, null, 2));
      return def;
    }
    const data = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
    if (data.is_streaming) {
      data.elapsed = Math.floor(Date.now() / 1000) - data.start_time;
    }
    return data;
  } catch (e) {
    return { is_streaming: false, start_time: 0, current_file: '', pid: 0 };
  }
}

function updateStatusFile(status) {
  fs.writeFileSync(statusFilePath, JSON.stringify(status, null, 2));
}

function toggleStream() {
  const status = getStatus();

  if (!status.is_streaming) {
    // === START RECORDING ===
    if (!fs.existsSync(recordsDir)) fs.mkdirSync(recordsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '_').slice(0, 15);
    const fileName = `live_stream_${timestamp}.mp4`;
    const outputPath = path.join(recordsDir, fileName);

    // Coba ffmpeg lokal dulu, fallback ke PATH
    const localFfmpeg = path.join(APP_ROOT, 'bin', 'ffmpeg.exe');
    const command = fs.existsSync(localFfmpeg) ? localFfmpeg : 'ffmpeg';

    const args = [
      '-y',
      '-i', 'rtmp://127.0.0.1:1935/mystream/mystream',
      '-r', '30',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-async', '1',
      '-movflags', 'faststart',
      '-loglevel', 'quiet',
      outputPath
    ];

    try {
      ffmpegProcess = spawn(command, args, {
        detached: false,
        stdio: ['ignore', 'ignore', 'pipe']
      });

      ffmpegProcess.stderr.on('data', (data) => {
        console.error('[FFmpeg]', data.toString());
      });

      ffmpegProcess.on('close', (code) => {
        console.log(`[FFmpeg] Proses selesai dengan kode: ${code}`);
        ffmpegProcess = null;
      });

      ffmpegProcess.on('error', (err) => {
        console.error('[FFmpeg] Gagal spawn:', err.message);
        ffmpegProcess = null;
      });

      const newStatus = {
        is_streaming: true,
        start_time: Math.floor(Date.now() / 1000),
        current_file: fileName,
        pid: ffmpegProcess.pid
      };
      updateStatusFile(newStatus);
      return newStatus;

    } catch (err) {
      return { success: false, is_streaming: false, message: err.message };
    }

  } else {
    // === STOP RECORDING ===
    return new Promise((resolve) => {
      const doStop = () => {
        const stopped = { is_streaming: false, start_time: 0, current_file: '', pid: 0 };
        updateStatusFile(stopped);
        ffmpegProcess = null;
        resolve(stopped);
      };

      if (ffmpegProcess) {
        ffmpegProcess.once('exit', doStop);
        // Windows: kirim 'q' via stdin agar FFmpeg finalize MP4 dengan benar
        if (process.platform === 'win32') {
          exec(`taskkill /PID ${ffmpegProcess.pid} /T`, () => {});
        } else {
          ffmpegProcess.kill('SIGTERM');
        }
        // Fallback paksa setelah 5 detik jika belum mati
        setTimeout(() => {
          if (ffmpegProcess) {
            ffmpegProcess.kill('SIGKILL');
          }
        }, 5000);
      } else {
        // ffmpegProcess null (app direstart), stop by PID dari status file
        if (status.pid > 0) {
          exec(`taskkill /PID ${status.pid} /T /F`, () => doStop());
        } else {
          doStop();
        }
      }
    });
  }
}

function stopRecordingForcefully() {
  if (ffmpegProcess) {
    try { ffmpegProcess.kill('SIGKILL'); } catch (e) {}
    ffmpegProcess = null;
  }
}

module.exports = { toggleStream, getStatus, stopRecordingForcefully };
