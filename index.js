const createMemory = require('./core/create-memory');
const compile = require('./compiler/compiler');
const CPU = require('./core/cpu');

const memory = createMemory(65536);
const writableBytes = new Uint8Array(memory.buffer);

// VM's heart
const cpu = new CPU(memory, {
  debug: true,
  addressesToObserve: [0x0100, 0xfff8],
});

compile(writableBytes, 'programs/jne_1.asm');
cpu.run();
