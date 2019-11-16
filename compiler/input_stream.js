const TypeError = require('./type_error');

class InputStream {
  constructor(input) {
    this.input = input;
    this.row = 1;
    this.col = 1;
    this.pos = 0;
  }

  peek() {
    return this.input.charAt(this.pos);
  }

  eof() {
    return this.peek() === '';
  }

  next() {
    const char = this.input.charAt(this.pos++);
    if (char === '\n') { this.col++; this.row = 0; }
    else this.row++;
    return char;
  }

  throw(msg) {
    throw new TypeError(this.peek(), this.col, this.row);
  }
}

module.exports = InputStream;
