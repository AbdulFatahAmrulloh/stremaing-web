const fs = require('fs');
const path = require('path');

const APP_ROOT = path.join(__dirname, '..');
const recordsDir = path.join(APP_ROOT, 'records');
const uploadsDir = path.join(APP_ROOT, 'uploads');

const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi'];

function getFilesFromDir(directory, minSizeKB = 100) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    return [];
  }

  return fs.readdirSync(directory)
    .filter(file => VIDEO_EXTS.includes(path.extname(file).toLowerCase()))
    .map(file => {
      const filePath = path.join(directory, file);
      try {
        const stat = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
          sizeBytes: stat.size,
          mtime: stat.mtimeMs,
          mtimeFormatted: stat.mtime.toLocaleString('id-ID')
        };
      } catch (e) {
        return null;
      }
    })
    .filter(f => f !== null && f.sizeBytes >= minSizeKB * 1024)
    .sort((a, b) => b.mtime - a.mtime);
}

function getRecords() { return getFilesFromDir(recordsDir, 100); }
function getUploads() { return getFilesFromDir(uploadsDir, 10); }

module.exports = { getRecords, getUploads };
