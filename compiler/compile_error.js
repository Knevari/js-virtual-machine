class CompileError extends Error {
  constructor(msg, location) {
    super(`${msg} at ${location} instruction`);
    this.name = "CompileError";
  }
}

module.exports = CompileError;
