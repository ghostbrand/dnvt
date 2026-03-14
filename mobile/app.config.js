// Auto-detect LAN IP so phone on same network can connect via QR code
const os = require('os');
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
const lanIp = getLanIp();
console.log(`[DNVT] Expo using LAN IP: ${lanIp}`);
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;

const config = require('./app.json');
module.exports = config;
