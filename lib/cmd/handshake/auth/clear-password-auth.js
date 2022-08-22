const PluginAuth = require('./plugin-auth');

/**
 * Send password in clear.
 * (used only when SSL is active)
 */
class ClearPasswordAuth extends PluginAuth {
  constructor(packSeq, compressPackSeq, pluginData, resolve, reject, multiAuthResolver) {
    super(resolve, reject, multiAuthResolver);
    this.sequenceNo = packSeq;
    this.counter = 0;
  }

  start(out, opts, info) {
    out.startPacket(this);

    let pwd;
    if (opts.password) {
      if (Array.isArray(opts.password)) {
        pwd = opts.password[this.counter++];
      } else {
        pwd = opts.password;
      }
      out.writeString(pwd);
    }

    out.writeInt8(0);
    out.flushBuffer(true);
    this.emit('send_end');
    this.onPacketReceive = this.successSend;
  }
}

module.exports = ClearPasswordAuth;
