'use strict';

function withTimeout(promise, milliseconds, message = 'Operation timed out.') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(Object.assign(Error(message), { code: 'OPERATION_TIMEOUT' })),
      milliseconds,
    );
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = { withTimeout };
