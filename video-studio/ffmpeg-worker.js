/* MalawiHub Video Studio: single-thread FFmpeg worker.
   Core assets are fetched only when MP4 conversion is first needed. */
let core = null;

const send = (id, result, transfer = []) => self.postMessage({ id, ok: true, result }, transfer);
const fail = (id, error) => self.postMessage({ id, ok: false, error: String(error && error.message || error) });

self.onmessage = async (event) => {
  const { id, action, payload = {} } = event.data || {};
  try {
    let result = true;
    if (action === 'load') {
      if (!core) {
        const imported = await import(payload.coreURL);
        const factory = imported.default || self.createFFmpegCore;
        if (typeof factory !== 'function') throw new Error('The MP4 converter core could not be loaded.');
        const config = { wasmURL: payload.wasmURL, workerURL: '' };
        core = await factory({
          mainScriptUrlOrBlob: payload.coreURL + '#' + btoa(JSON.stringify(config))
        });
        core.setLogger((data) => self.postMessage({ event: 'log', data }));
        core.setProgress((data) => self.postMessage({ event: 'progress', data }));
      }
      result = true;
    } else {
      if (!core) throw new Error('MP4 converter is not loaded.');
      if (action === 'writeFile') {
        core.FS.writeFile(payload.path, payload.data);
      } else if (action === 'exec') {
        core.setTimeout(payload.timeout || -1);
        core.exec(...payload.args);
        result = core.ret;
        core.reset();
      } else if (action === 'readFile') {
        result = core.FS.readFile(payload.path);
        send(id, result, result && result.buffer instanceof ArrayBuffer ? [result.buffer] : []);
        return;
      } else if (action === 'deleteFile') {
        try { core.FS.unlink(payload.path); } catch (_) {}
      } else {
        throw new Error('Unknown MP4 conversion command.');
      }
    }
    send(id, result);
  } catch (error) {
    fail(id, error);
  }
};
