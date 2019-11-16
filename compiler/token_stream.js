const InputStream = require('./input_stream');

const mnemonics = ['mov', 'psh', 'add', 'pop', 'jne'];
const registers = ['ip', 'acc', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r6', 'r8', 'sp', 'fp'];

const isHex = value => /[0-9a-fA-F]+/i.test(value);
const isWhitespace = value => '\n\t\r '.indexOf(value) >= 0;
const isIdentifier = value => /[0-9a-z]/i.test(value);
const isMnemonic = value => mnemonics.indexOf(value) >= 0;
const isNewline = value => value === '\n';

class Token {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
}

class TokenStream {
  constructor(input) {
    this.current = null;
    this.input = input;
  }

  readWhile(callback) {
    let str = '';
    while (!this.input.eof() && callback(this.input.peek(), str)) {
      str += this.input.next();
    }
    return str;
  }

  readIdentifier() {
    const id = this.readWhile((char, str) => {
      if (registers.indexOf(str) >= 0) return false;
      if (mnemonics.indexOf(str) >= 0) return false;
      return isIdentifier(char);
    });
    if (isMnemonic(id)) return new Token('instruction', id);
    else return new Token('reg', id);
  }

  readHex() {
    this.input.next();
    const hex = this.readWhile(isHex);
    return new Token('hex', hex);
  }

  readMemoryAddress() {
    this.input.next();
    const hex = this.readWhile(isHex);
    return new Token('mem_addr', hex);
  }

  skipComment() {
    const nextSemiColon = this.input.next();
    if (nextSemiColon !== ';') this.throw();
    else this.readWhile((char) => !isNewline(char));
    return this.readNext();
  }

  readNext() {
    this.readWhile(isWhitespace);
    if (this.input.eof()) return null;
    const char = this.input.peek();
    if (char === ';') return this.skipComment();
    if (char === '$') return this.readHex();
    if (char === '#') return this.readMemoryAddress();
    if (isIdentifier(char)) return this.readIdentifier();
    this.throw();
  }

  eof() {
    return this.peek() === null;
  }

  peek() {
    return this.current || (this.current = this.readNext());
  }

  next() {
    const token = this.current;
    this.current = null;
    return token || this.readNext();
  }

  throw() {
    return this.input.throw();
  }
}

module.exports = TokenStream;
