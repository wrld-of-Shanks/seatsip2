const JSDOMEnvironment = require('jest-environment-jsdom').default;

class CustomJSDOMEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();

    // Copy built-in Node.js fetch, stream, and blob APIs to VM/JSDOM context
    this.global.fetch = fetch;
    this.global.Response = Response;
    this.global.Request = Request;
    this.global.Headers = Headers;
    this.global.TextEncoder = TextEncoder;
    this.global.TextDecoder = TextDecoder;
    this.global.ReadableStream = ReadableStream;
    this.global.WritableStream = WritableStream;
    this.global.TransformStream = TransformStream;
    this.global.Blob = Blob;
    this.global.File = File;
    this.global.FormData = FormData;
    this.global.BroadcastChannel = BroadcastChannel;
  }
}

module.exports = CustomJSDOMEnvironment;
