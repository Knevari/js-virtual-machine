const readline = require('readline');
const createMemory = require('./create-memory');
const instructions = require('../config/instructions');

const defaultOptions = {
  debug: true,
  addressesToObserve: []
}

class CPU {
  constructor(memory, options = defaultOptions) {
    this.memory = memory;
    this.options = options;
    this.registerNames = [
      // Program counter and accumulator
      'ip', 'acc',
      // General Purpose
      'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r6', 'r8',
      // Stack and Frame pointers
      'sp', 'fp'
    ];
    this.registers = createMemory(this.registerNames.length * 2);
    this.registerMap = this.registerNames.reduce((map, name, idx) => {
      map[name] = idx * 2;
      return map;
    }, {});

    this.setRegister('sp', memory.byteLength - 1 - 1);
    this.setRegister('fp', memory.byteLength - 1 - 1);

    this.stackFrameSize = 0;
  }

  debug() {
    console.log();
    this.registerNames.forEach(name => {
      console.log(`${name}: 0x${this.getRegister(name).toString(16).padStart(4, '0')}`);
    });
    console.log();
    this.viewMemoryAt(this.getRegister('ip'));
    this.options.addressesToObserve.forEach(addr => {
      this.viewMemoryAt(addr);
    });
  }

  viewMemoryAt(address, n = 8) {
    const nextNBytes = Array.from({ length: n }, (_, i) =>
      this.memory.getUint8(address + i)
    ).map(v => `0x${v.toString(16).padStart(2, '0')}`);
    console.log(`0x${address.toString(16).padStart(4, '0')}: ${nextNBytes.join(' ')}`);
  }

  getRegister(name) {
    if (!this.registerMap.hasOwnProperty(name)) {
      throw new Error(`getRegister: no such register '${name}'`);
    }
    return this.registers.getUint16(this.registerMap[name]);
  }

  setRegister(name, value) {
    if (!this.registerMap.hasOwnProperty(name)) {
      throw new Error(`setRegister: no such register '${name}'`);
    }
    return this.registers.setUint16(this.registerMap[name], value);
  }

  fetch() {
    const nextInstructionAddress = this.getRegister('ip');
    const instruction = this.memory.getUint8(nextInstructionAddress);
    this.setRegister('ip', nextInstructionAddress + 1);
    return instruction;
  }

  fetch16() {
    const nextInstructionAddress = this.getRegister('ip');
    const instruction = this.memory.getUint16(nextInstructionAddress);
    this.setRegister('ip', nextInstructionAddress + 2);
    return instruction;
  }

  push(value) {
    const spAddress = this.getRegister('sp');
    this.memory.setUint16(spAddress, value);
    this.setRegister('sp', spAddress - 2);
    this.stackFrameSize += 2;
  }

  pop() {
    const nextSpAddress = this.getRegister('sp') + 2;
    this.setRegister('sp', nextSpAddress);
    this.stackFrameSize -= 2;
    return this.memory.getUint16(nextSpAddress);
  }

  pushState() {
    this.push(this.getRegister('r1'));
    this.push(this.getRegister('r2'));
    this.push(this.getRegister('r3'));
    this.push(this.getRegister('r4'));
    this.push(this.getRegister('r5'));
    this.push(this.getRegister('r6'));
    this.push(this.getRegister('r7'));
    this.push(this.getRegister('r8'));
    this.push(this.getRegister('ip'));
    this.push(this.stackFrameSize + 2);
    this.setRegister('fp', this.getRegister('sp'));
    this.stackFrameSize = 0;
  }

  popState() {
    const fpAddress = this.getRegister('fp');
    this.setRegister('sp', fpAddress);

    this.stackFrameSize = this.pop();
    const stackFrameSize = this.stackFrameSize;

    this.setRegister('ip', this.pop());
    this.setRegister('r8', this.pop());
    this.setRegister('r7', this.pop());
    this.setRegister('r6', this.pop());
    this.setRegister('r5', this.pop());
    this.setRegister('r4', this.pop());
    this.setRegister('r3', this.pop());
    this.setRegister('r2', this.pop());
    this.setRegister('r1', this.pop());

    const nArgs = this.pop();
    for (let i = 0; i < nArgs; i++) {
      this.pop();
    }

    this.setRegister('fp', fpAddress + stackFrameSize);
  }

  fetchRegisterIdx() {
    return (this.fetch() % this.registerNames.length) * 2;
  }

  execute(instruction) {
    switch (instruction) {
      case instructions.MOV_LIT_REG: {
        const literal = this.fetch16();
        const register = this.fetchRegisterIdx();
        this.registers.setUint16(register, literal);
        return 0;
      }
      case instructions.MOV_REG_REG: {
        const registerFrom = this.fetchRegisterIdx();
        const registerTo = this.fetchRegisterIdx();
        const value = this.registers.getUint16(registerFrom);
        this.registers.setUint16(registerTo, value);
        return 0;
      }
      case instructions.MOV_REG_MEM: {
        const registerFrom = this.fetchRegisterIdx();
        const address = this.fetch16();
        const value = this.registers.getUint16(registerFrom);
        this.memory.setUint16(address, value);
        return 0;
      }
      case instructions.MOV_MEM_REG: {
        const address = this.fetch16();
        const registerTo = this.fetchRegisterIdx();
        const value = this.memory.getUint16(address);
        this.registers.setUint16(registerTo, value);
        return 0;
      }
      case instructions.MOV_LIT_MEM: {
        const literal = this.fetch16();
        const address = this.fetch16();
        this.memory.setUint16(address, literal);
        return 0;
      }
      case instructions.ADD_REG_REG: {
        const r1 = this.fetchRegisterIdx();
        const r2 = this.fetchRegisterIdx();
        const registerValue1 = this.registers.getUint16(r1);
        const registerValue2 = this.registers.getUint16(r2);
        this.setRegister('acc', registerValue1 + registerValue2);
        return 0;
      }
      case instructions.JMP_NOT_EQ: {
        const value = this.fetch16();
        const address = this.fetch16();

        if (value !== this.getRegister('acc')) {
          this.setRegister('ip', address);
        }

        return 0;
      }
      case instructions.PSH_LIT: {
        const value = this.fetch16();
        this.push(value);
        return 0;
      }
      case instructions.PSH_REG: {
        const registerIdx = this.fetchRegisterIdx();
        this.push(this.registers.getUint16(registerIdx));
        return 0;
      }
      case instructions.POP: {
        const registerIdx = this.fetchRegisterIdx();
        const value = this.pop();
        this.registers.setUint16(registerIdx, value);
        return 0;
      }
      case instructions.CAL_LIT: {
        const address = this.fetch16();
        this.pushState();
        this.setRegister('ip', address);
        return 0;
      }
      case instructions.CAL_REG: {
        const registerIdx = this.fetchRegisterIdx();
        const address = this.register.getUint16(registerIdx);
        this.pushState();
        this.setRegister('ip', address);
        return 0;
      }
      case instructions.RET: {
        this.popState();
        return;
      }
    }
    return 1;
  }

  step() {
    const instruction = this.fetch();
    return this.execute(instruction);
  }

  runCompleteProgram(callback = () => {}) {
    while (this.step() !== 1) callback();
  }

  run() {
    if (this.options.debug) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '(step | hexdump | run | exit) > ',
      });

      rl.prompt();

      rl.on('line', (command) => {
        console.clear();

        if (command === 'step') {
          this.step();
          this.debug();
        };

        if (command === 'hexdump') this.debug();
        if (command === 'exit') process.exit(0);
        if (command === 'run') this.runCompleteProgram(this.debug.bind(this));

        rl.prompt();
      });
    } else {
      this.runCompleteProgram();
    }
  }
}

module.exports = CPU;
