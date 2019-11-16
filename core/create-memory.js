const createMemory = sizeToBytes => {
  const ab = new ArrayBuffer(sizeToBytes);
  const dv = new DataView(ab);
  return dv;
}

module.exports = createMemory;
