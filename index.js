const createMemory = require('./core/create-memory');
const compile = require('./compiler/compiler');
const CPU = require('./core/cpu');

const memory = createMemory(65536);
const writableBytes = new Uint8Array(memory.buffer);

// VM's heart
const cpu = new CPU(memory, {
  debug: true,
  addressesToObserve: [0x0100, 0xffff - 1 - 6],
});

compile(writableBytes, 'programs/psh_n_pop_1.asm');
cpu.run();
