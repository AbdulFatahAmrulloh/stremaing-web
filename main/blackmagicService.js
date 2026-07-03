const { exec } = require('child_process');

let monitoringInterval = null;

/**
 * Deteksi hardware Blackmagic via PowerShell WMI Query
 * Pada implementasi nyata, ganti ini dengan pemanggilan Node native addon (.node)
 * yang dibuild dari Blackmagic DeckLink SDK C++ headers.
 */
function detectDevices() {
  return new Promise((resolve) => {
    const cmd = `powershell -NoProfile -Command "Get-PnpDevice | Where-Object { $_.FriendlyName -like '*Blackmagic*' -or $_.FriendlyName -like '*DeckLink*' -or $_.FriendlyName -like '*UltraStudio*' } | Select-Object FriendlyName, Status | ConvertTo-Json -Compress"`;

    exec(cmd, { timeout: 5000 }, (error, stdout) => {
      if (error || !stdout || !stdout.trim()) {
        resolve({ detected: false, devices: [], error: error ? error.message : 'No output' });
        return;
      }
      try {
        let raw = JSON.parse(stdout.trim());
        if (!Array.isArray(raw)) raw = [raw];
        resolve({
          detected: raw.length > 0,
          devices: raw.map(d => ({
            name: d.FriendlyName || 'Unknown Device',
            status: d.Status || 'Unknown',
            connected: d.Status === 'OK'
          }))
        });
      } catch (parseErr) {
        resolve({ detected: false, devices: [], error: 'Parse error' });
      }
    });
  });
}

function startMonitoring(onStatusChange) {
  console.log('[Blackmagic] Memulai monitoring hardware...');

  // Cek pertama langsung
  pollHardware(onStatusChange);

  // Poll setiap 5 detik
  monitoringInterval = setInterval(() => {
    pollHardware(onStatusChange);
  }, 5000);
}

async function pollHardware(onStatusChange) {
  const detection = await detectDevices();

  if (detection.detected && detection.devices.length > 0) {
    const device = detection.devices[0];
    onStatusChange({
      deviceConnected: device.connected,
      deviceName: device.name,
      inputSignalLocked: device.connected,
      videoFormat: '1080p30',    // Ganti dengan query SDK nyata
      audioChannels: 8,
      source: 'real_hardware'
    });
  } else {
    // Mode demo / simulasi jika tidak ada hardware
    onStatusChange({
      deviceConnected: false,
      deviceName: 'No Blackmagic Device Found',
      inputSignalLocked: false,
      videoFormat: 'N/A',
      audioChannels: 0,
      source: 'simulation'
    });
  }
}

function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  console.log('[Blackmagic] Monitoring dihentikan.');
}

module.exports = { startMonitoring, stopMonitoring, detectDevices };
