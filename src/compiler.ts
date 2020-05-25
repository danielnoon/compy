#!/usr/bin/env node
import program from 'commander';
import * as fs from 'fs';
import path from 'path';
 
program
  .version('0.0.1')
  .usage('[options] <input>')
  .option('-a, --asm', 'assemble')
  .option('-o, --out <file>', 'specify the output file')
  .parse(process.argv);
 
if (program.asm) {
  console.log("Compiling ASM into binary!");
  console.log("Input: ", program.args[0]);
  compileAsm(program.args[0], 'base');
}

type label = {
  byte: number
}

type param = {
  value: number,
  type: 'literal' | 'memory' | 'register' | 'memreg' | 'label'
}

function compileAsm(file: string, prefix: string) {
  const start = Date.now();
  const asm = fs.readFileSync(file, 'utf-8');
  const lines = asm.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  const bytes: number[] = [];
  let done = false;
  let fail = false;
  let lineIdx = 0;
  let byte = 0;
  let labels = new Map<string, label>();
  let labelLocations = new Map<number, string>();

  while (!done && !fail) {
    let line = lines[lineIdx];
    if (line.indexOf(';') >= 0) {
      line = line.substring(0, line.indexOf(';'));
    }
    if (line.indexOf(':') >= 0) {
      const a = line.split(':');
      line = a[1];
      labels.set(a[0], { byte });
    }
    if (line.length > 0) {
      const words = line.split(' ');
      const op = words.shift();
      let arg1, arg2;
      let rightArrow = words.indexOf('->');
      let leftArrow = words.indexOf('<-');
      if (rightArrow >= 0) {
        arg1 = words[rightArrow + 1];
        arg2 = words[rightArrow - 1];
      }
      if (leftArrow >= 0) {
        arg1 = words[leftArrow - 1];
        arg2 = words[leftArrow + 1];
      }
      switch (op) {
        case 'mov': {
          if (!arg1 || !arg2) break;
          try {
            const p1 = getParam(arg1, byte + 1, labels, labelLocations);
            const p2 = getParam(arg2, byte + 2, labels, labelLocations);
            let type = getOp('mov', p1, p2);
            bytes.push(getOpCode('mov' + type), p1.value, p2.value);
            byte += 3;
          }
          catch (e) {
            console.log("Error at line " + lineIdx + ": " + e);
            fail = true;
          }
        }
        break;
        case 'add': {
          try {
            if (!arg1 || !arg2) break;
            const p1 = getParam(arg1, byte + 1, labels, labelLocations);
            const p2 = getParam(arg2, byte + 2, labels, labelLocations);
            if (p2.type === 'register') {
              bytes.push(getOpCode('addR'));
            }
            else if (p2.type === 'literal') {
              bytes.push(getOpCode('add'));
            }
            bytes.push(p1.value, p2.value);
            byte += 3;
          }
          catch (e) {
            console.log("Error at line " + lineIdx + ": " + e);
            fail = true;
          }
        }
        break;
        case 'mul': {
          try {
            const arg = words[0];
            const param = getParam(arg, byte + 1, labels, labelLocations);
            if (param.type === 'register') {
              bytes.push(getOpCode('mulR'));
            }
            else if (param.type === 'literal') {
              bytes.push(getOpCode('mul'));
            }
            else {
              throw new Error("Invalid parameter type.")
            }
            bytes.push(param.value);
            byte += 2;
          }
          catch (e) {
            console.log("Error at line " + lineIdx + ": " + e);
            fail = true;
          }
        }
        break;
        case 'int': {
          try {
            bytes.push(getOpCode('int'));
            byte++;
          }
          catch (e) {
            console.log("Error at line " + lineIdx + ": " + e);
            fail = true;
          }
        }
        break;
        case 'inc': {
          try {
            const arg = words[0];
            const param = getParam(arg, byte + 1, labels, labelLocations);
            if (param.type === 'register') {
              bytes.push(getOpCode('incR'));
            }
            else if (param.type === 'memory') {
              bytes.push(getOpCode('incM'));
            }
            else if (param.type === 'memreg') {
              bytes.push(getOpCode('incMr'))
            }
            else {
              throw new Error("Invalid parameter type.")
            }
            bytes.push(param.value);
            byte += 2;
          }
          catch (e) {
            console.log("Error at line " + lineIdx + ": " + e);
            fail = true;
          }
        }
        break;
        case 'jeq':
        case 'jmp': {
          try {
            const arg = words[0];
            const param = getParam(arg, byte + 1, labels, labelLocations);
            if (param.type === 'label') {
              bytes.push(getOpCode(op));
            }
            else {
              throw new Error("Invalid parameter type.")
            }
            bytes.push(param.value);
            byte += 2;
          }
          catch (e) {
            console.log("Error at line " + lineIdx + ": " + e);
            fail = true;
          }
        }
        break;
        case 'cmp': {
          try {
            const arg1 = words[0];
            const arg2 = words[1];
            const p1 = getParam(arg1, byte + 1, labels, labelLocations);
            const p2 = getParam(arg2, byte + 2, labels, labelLocations);
            if (p2.type === 'register') {
              bytes.push(getOpCode('cmpR'));
            }
            else if (p2.type === 'literal') {
              bytes.push(getOpCode('cmpV'));
            }
            bytes.push(p1.value, p2.value);
            byte += 3;
          }
          catch (e) {
            console.log("Error at line " + lineIdx + ": " + e);
            fail = true;
          }
        }
        break;
        default:
          console.log("Error: invalid opcode at line " + lineIdx);
          fail = true;
          break;
      }
    }
    lineIdx++;
    if (lineIdx >= lines.length) done = true;
  }
  if (done) {
    if (labelLocations.size > 0) {
      for (let location of labelLocations) {
        const value = labels.get(location[1]);
        if (value) {
          bytes[location[0]] = value.byte;
        }
        else {
          throw new Error("Unresolved label: " + location[1]);
        }
      }
    }

    const reader = Uint32Array.from(bytes);
    const buff = Buffer.from(reader.buffer);

    const out = path.parse(file).name;
    fs.writeFile(out, buff, function (err) {
      if (err) {
        console.log(err);
      }
      else {
        console.log("Success!");
        console.log("Time: ", Date.now() - start);
      }
    });
  }
}

function getOp(op: string, arg1: param, arg2: param) {
  /*
    mov possibilities:
    val -> reg            (VTR)   xx
    val -> mem            (VTM)   xx
    val -> mem(reg)       (VTMr)  xx
    reg -> reg            (RTR)   xx
    reg -> mem            (RTM)   xx
    reg -> mem(reg)       (RTMr)  xx
    mem -> reg            (MTR)   xx
    mem -> mem            (MTM)   xx
    mem -> mem(reg)       (MTMr)  xx
    mem(reg) -> reg       (MrTR)  xx
    mem(reg) -> mem       (MrTM)  x
    mem(reg) -> mem(reg)  (MrTMr) x
  */
  if (op === 'mov') {
    if (arg1.type === 'register' && arg2.type === 'literal') {
      return 'VTR';
    }
    else if (arg1.type === 'register' && arg2.type === 'memory') {
      return 'MTR';
    }
    else if (arg1.type === 'register' && arg2.type === 'register') {
      return 'RTR';
    }
    else if (arg1.type === 'memory' && arg2.type === 'register') {
      return 'RTM';
    }
    else if (arg1.type === 'memory' && arg2.type === 'literal') {
      return 'VTM';
    }
    else if (arg1.type === 'memory' && arg2.type === 'register') {
      return 'RTM';
    }
    else if (arg1.type === 'memory' && arg2.type === 'memory') {
      return 'MTM';
    }
    else if (arg1.type === 'memreg' && arg2.type === 'memory') {
      return 'RTM';
    }
    else if (arg1.type === 'register' && arg2.type === 'memreg') {
      return 'MrTR';
    }
    else if (arg1.type === 'memory' && arg2.type === 'memreg') {
      return 'MrTM';
    }
    else if (arg1.type === 'memreg' && arg2.type === 'memreg') {
      return 'MrTMr';
    }
    else if (arg1.type === 'memreg' && arg2.type === 'literal') {
      return 'VTMr';
    }
    else if (arg1.type === 'memreg' && arg2.type === 'register') {
      return 'RTMr';
    }
    else {
      throw new Error("Invalid parameters to mov op");
    }
  }
}

function getParam(param: string, byte: number, labels: Map<string, label>, locations: Map<number, string>): param {
  if (!isNaN(parseInt(param))) {
    return {
      value: parseInt(param),
      type: 'literal'
    }
  }
  else if (param[0] === '[') {
    if (param[param.length - 1] === ']') {
      if (param[1] === '(') {
        if (param[param.length - 2] === ')') {
          const value = getRegisterId(param.substring(2, param.length - 2))!;
          if (!isNaN(value)) {
            return {
              value,
              type: 'memreg'
            }
          }
          else {
            throw new Error("Invalid register address.");
          }
        }
        else {
          throw new Error("Unmatched parenthesis in register notation.")
        }
      }
      else {
        const value = parseInt(param.substring(1, param.length - 1));
        if (!isNaN(value)) {
          return {
            value,
            type: 'memory'
          }
        }
        else {
          throw new Error("Invalid memory address.");
        }
      }
    }
    else {
      throw new Error("Unmatched square brace in memory parameter.");
    }
  }
  else if (param[0] === '(') {
    if (param[param.length - 1] === ')') {
      const value = getRegisterId(param.substring(1, param.length - 1))!;
      if (!isNaN(value)) {
        return {
          value,
          type: 'register'
        }
      }
      else {
        throw new Error("Invalid register address.");
      }
    }
    else {
      throw new Error("Unmatched parenthesis in register notation.")
    }
  }
  else if (param[0] === '.') {
    const label = param.substring(1);
    if (labels.has(label)) {
      return {
        type: 'label',
        value: labels.get(label)!.byte
      }
    }
    else {
      locations.set(byte, label);
      return {
        type: 'label',
        value: 0
      }
    }
  }
  else throw new Error("Invalid parameter.");
}

function getRegisterId(name: string) {
  const registers = new Map<string, number>([
    ['eax', 0x0],
    ['ebx', 0x1],
    ['ecx', 0x2],
    ['edx', 0x3]
  ]);

  if (isNaN(parseInt(name))) {
    if (registers.has(name)) {
      return registers.get(name)!;
    }
    else {
      throw new Error("Invalid register name.");
    }
  }
  else {
    if (parseInt(name) <= 6) {
      return parseInt(name);
    }
    else {
      throw new Error("Register id must be lower than 6.");
    }
  }
}

function getOpCode(name: string) {
  const codes = new Map<string, number>([
    ['int', 0x0],
    ['movVTR', 0x1],
    ['movRTR', 0x2],
    ['movMTR', 0x3],
    ['movVTM', 0x4],
    ['movRTM', 0x5],
    ['add', 0x6],
    ['addR', 0x7],
    ['sub', 0x8],
    ['subR', 0x9],
    ['mul', 0xa],
    ['mulR', 0xb],
    ['div', 0xc],
    ['divR', 0xd],
    ['movVTMr', 0xe],
    ['movRTMr', 0xf],
    ['movMTM', 0x10],
    ['movMTMr', 0x11],
    ['movMrTR', 0x12],
    ['movMrTM', 0x13],
    ['movMrTMr', 0x14],
    ['incR', 0x15],
    ['incM', 0x16],
    ['incMr', 0x17],
    ['decR', 0x18],
    ['decM', 0x19],
    ['decMr', 0x1a],
    ['cmpV', 0x1b],
    ['cmpR', 0x1c],
    ['jmp', 0x1d],
    ['jeq', 0x1e]
  ]);

  if (codes.has(name)) {
    return codes.get(name)!;
  }
  else {
    throw new Error("Invalid opcode " + name);
  }
}
