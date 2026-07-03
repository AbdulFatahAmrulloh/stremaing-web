const os = require('os');

function getStats() {
  const interfaces = os.networkInterfaces();
  const result = { network1: null, network2: null, hostname: os.hostname() };
  let idx = 0;

  for (const [name, addrs] of Object.entries(interfaces)) {
    const external = addrs.filter(a => a.family === 'IPv4' && !a.internal);
    if (external.length === 0) continue;

    const addr = external[0];
    const entry = {
      name,
      connected: true,
      address1: {
        ip: addr.address,
        netmask: addr.netmask,
        mac: addr.mac || 'N/A',
        gateway: '10.20.11.1'
      }
    };

    if (idx === 0) result.network1 = entry;
    else if (idx === 1) result.network2 = entry;
    idx++;
  }

  if (!result.network1) {
    result.network1 = {
      name: 'Ethernet',
      connected: false,
      address1: { ip: '10.5.30.12', netmask: '255.255.255.240', mac: 'N/A', gateway: '10.20.11.1' }
    };
  }

  result.active_visitors = {
    current_client: '127.0.0.1 (Desktop App)',
    total_connections: 1
  };

  return result;
}

module.exports = { getStats };
