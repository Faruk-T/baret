const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Windows'ta FallbackWatcher node_modules altındaki ~40.000 dosyayı tek tek taradığı için
// "Starting Metro Bundler" aşamasında 45-60 sn takılmaya sebep olur.
// Windows ReadDirectoryChangesW destekli NativeWatcher ile açılış ~1 saniyeye düşer.
try {
  const NativeWatcher = require('@expo/metro-file-map/build/watchers/NativeWatcher').default;
  if (NativeWatcher && process.platform === 'win32') {
    NativeWatcher.isSupported = () => true;
    const origHandleEvent = NativeWatcher.prototype._handleEvent;
    if (typeof origHandleEvent === 'function') {
      NativeWatcher.prototype._handleEvent = async function (event, relativePath) {
        if (
          !relativePath ||
          /(?:^|[/\\])(?:node_modules|\.git|\.expo|dist)(?:[/\\]|$)/.test(relativePath)
        ) {
          return;
        }
        try {
          return await origHandleEvent.call(this, event, relativePath.replace(/\\/g, '/'));
        } catch (err) {
          if (err && (err.code === 'EPERM' || err.code === 'ENOENT' || err.code === 'EBUSY')) {
            return;
          }
          throw err;
        }
      };
    }
  }
} catch {}

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
