class TypeError extends Error {
  constructor(char, col, row) {
    super(`Couldn't recognize character "${char}" at (${col}:${row})`);
    this.name = "TypeError";
  }
}

module.exports = TypeError;
