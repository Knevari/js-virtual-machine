const fs = require('fs');
const registers = require('../config/registers');
const instructions = require('../config/instructions');
const InputStream = require('./input_stream');
const TokenStream = require('./token_stream');
const CompileError = require('./compile_error');

// TODO: Implement subroutines when I wake up

const createMemoryWriter = memory => {
  let i = 0;
  return (val) => memory[i++] = val;
}

function compileAssembly(memory, filepath) {
  const code = fs.readFileSync(filepath, 'utf8');
  const input = new InputStream(code);
  const tokens = new TokenStream(input);

  const memoryWrite = createMemoryWriter(memory);

  const write = val => memoryWrite(val);

  const writeHex = val => {
    if (val.length === 4) {
      write('0x' + val.slice(0, 2));
      write('0x' + val.slice(2, 4));
    } else write('0x' + val);
  }

  const writeRegister = val => {
    switch (val) {
      case 'ip' : return write(registers.IP);
      case 'acc': return write(registers.ACC);
      case 'r1' : return write(registers.R1);
      case 'r2' : return write(registers.R2);
      case 'r3' : return write(registers.R3);
      case 'r4' : return write(registers.R4);
      case 'r5' : return write(registers.R5);
      case 'r6' : return write(registers.R6);
      case 'r7' : return write(registers.R7);
      case 'r8' : return write(registers.R8);
      case 'sp' : return write(registers.SP);
      case 'fp' : return write(registers.FP);
    }
  }

  const mov = () => {
    const param1 = tokens.next();
    const param2 = tokens.next();
    const param1Type = param1.type;
    const param2Type = param2.type;

    if (param1Type === 'hex' && param2Type === 'reg') {
      write(instructions.MOV_LIT_REG);
      writeHex(param1.value);
      writeRegister(param2.value);
      return;
    }

    if (param1Type === 'hex' && param2Type === 'mem_addr') {
      write(instructions.MOV_LIT_MEM);
      writeHex(param1.value);
      writeHex(param2.value);
      return;
    }

    if (param1Type === 'reg' && param2Type === 'reg') {
      write(instructions.MOV_REG_REG);
      writeRegister(param1.value);
      writeRegister(param2.value);
      return;
    }

    if (param1Type === 'reg' && param2Type === 'mem_addr') {
      write(instructions.MOV_REG_MEM);
      writeRegister(param1.value);
      writeHex(param2.value);
      return;
    }

    if (param1Type === 'mem_addr' && param2Type === 'reg') {
      write(instructions.MOV_MEM_REG);
      writeHex(param1.value);
      writeRegister(param2.value);
      return;
    }

    throw new CompileError('Wrong type of parameters passed at', 'MOV');
  };

  const add = () => {
    const param1 = tokens.next();
    const param2 = tokens.next();
    const param1Type = param1.type;
    const param2Type = param2.type;

    if (param1Type === 'reg' && param2Type === 'reg') {
      write(instructions.ADD_REG_REG);
      writeRegister(param1.value);
      writeRegister(param2.value);
      return;
    }

    throw new CompileError('Wrong type of parameters passed to', 'ADD');
  };

  const jne = () => {
    const param1 = tokens.next();
    const param2 = tokens.next();
    const param1Type = param1.type;
    const param2Type = param2.type;

    write(instructions.JMP_NOT_EQ);

    if (param1Type === 'hex' && param2Type === 'mem_addr') {
      writeHex(param1.value);
      writeHex(param2.value);
      return;
    }

    throw new CompileError('Wrong type of parameters passed to', 'JNE');
  };

  const psh = () => {
    const param = tokens.next();
    const paramType = param.type;

    if (paramType === 'hex') {
      write(instructions.PSH_LIT);
      writeHex(param.value);
      return;
    }

    if (paramType === 'reg') {
      write(instructions.PSH_REG);
      writeRegister(param.value);
      return;
    }

    throw new CompileError('Wrong type of parameters passed to', 'PSH');
  };

  const pop = () => {
    const param = tokens.next();

    if (param.type === 'reg') {
      write(instructions.POP);
      writeRegister(param.value);
      return;
    }

    throw new CompileError('Wrong type of parameters passed to', 'POP');
  };

  while (!tokens.eof()) {
    const token = tokens.next();
    if (token.type === 'instruction') {
      const instruction = token.value;
      if (instruction === 'mov') mov();
      if (instruction === 'add') add();
      if (instruction === 'jne') jne();
      if (instruction === 'psh') psh();
      if (instruction === 'pop') pop();
    }
  }
}

module.exports = compileAssembly
