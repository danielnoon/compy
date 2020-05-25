import { Kernel } from "./Kernel";

export type registers = Uint32Array;
export type flags = [boolean, boolean, boolean];

/*
Instruction set
interrupt: 0x0
  -> interrupt the system and hand control to operating system
movVTR: 0x1,register,value
  -> set register to value
movRTR: 0x2,register1,register2
  -> set register1 to value of register2
movMTR: 0x3,register,addr
  -> set register to value at memory address
movVTM: 0x4,addr,value
  -> set memory at addr to value
movRTM: 0x5,addr,register
  -> set memory at addr to value at register
add: 0x6,register,value
  -> add value to register
addR: 0x7,register1,register2
  -> add value of register2 to register1 and save to register1
sub: 0x8,register,value
  -> subtract value from register
subR: 0x9,register1,register2
  -> same as sub, but uses value of register2
mul: 0xa,value
  -> multiplies eax (0x0) by value
     stores most significant bits in edx (0x3), and
     stores least significant bits in eax (0x0)
mulR: 0xb,register
  -> same as mul, but uses the value at register
div: 0xc
  -> divides edx:eax (0x0) by value
     stores most significant bits in edx (0x3), and
     stores least significant bits in eax (0x0)
divR: 0xd,register
  -> same as mul, but uses the value at register
movVTMr: 0xe,register,value
  -> moves value to memory at address in register
movRTMr: 0xf,register1,register2
  -> moves value of register2 to memory at address in register1
movMTM: 0x10,addr1,addr2
  -> moves value in memory at addr2 to addr1
movMTMr: 0x11,reg,addr
  -> moves value in addr to memory at address in reg
movMrTR: 0x12,reg1,reg2
  -> moves value in memory at addr stored in reg2 to reg1
movMrTM: 0x13,addr,reg
  -> moves value in memory at addr stored in reg to memory at addr
movMrTMr: 0x14,reg1,reg2
  -> moves value in memory at addr stored in reg2 to memory at addr stored in reg1
incR: 0x15,reg
  -> increment value in register by one
incM: 0x16,addr
  -> increment value in memory addr by one
incMr: 0x17,reg
  -> increment value in memory at address in reg
decR: 0x18,reg
  -> decrement value in register by one
decM: 0x19,addr
  -> decrement value in memory at addr
decMr: 0x1a,reg
  -> decrement memory at addr in reg
cmpV: 0x1b,register1,value
  -> if register value = value, flag $zero, unflag $carry
  -> if register value < value, flag $carry, unflag $zero
  -> if register value > value, unflag $carry, unflag $zero
cmpR: 0x1c,register1,register2
  -> same as compare, but use value of register2 as value
jmp: 0x1d,byte
  -> set byte index to byte
jeq: 0x1e,byte
  -> set byte index to byte if equality flag set
and: 0xa,register,value
  -> AND operation on register and value, store in register1
andR: 0xb,register1,register2
  -> same as add, but value of register2

Flags
0x0: $zero
0x1: $carry
0x2: $sign

*/

export class Process {
  public flags: flags = [
    false, false, false
  ];
  public registers = new Uint32Array(new ArrayBuffer(4*6));
  private heap: Uint32Array;
  private index = 0;

  constructor(private executable: Uint32Array, heapSize: number, public user: number) {
    this.heap = new Uint32Array(new ArrayBuffer(heapSize * 32));
  }

  /**
   * run
   * aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
   * @param os The "Kernel"
   */
  run(os: Kernel) {
    if (this.index >= this.executable.length) return false;
    const instruction = this.executable[this.index];
    let reg = 0, reg1 = 0, val = 0, val1 = 0, addr = 0, addr1 = 0, tmp = 0;
    switch (instruction) {
      case 0x0: //syscall
        os.syscall(this.registers, this.flags, this.heap);
        this.index++;
        break;
      case 0x1: //mov
        reg = this.executable[this.index + 1];
        val = this.executable[this.index + 2];
        this.registers[reg] = val;
        this.index += 3;
        break;
      case 0x2: //movR
        reg = this.executable[this.index + 1];
        reg1 = this.executable[this.index + 2];
        val = this.registers[reg1];
        this.registers[reg] = val;
        this.index += 3;
        break;
      case 0x3: //movFM
        reg = this.executable[this.index + 1];
        addr = this.executable[this.index + 2];
        val = this.heap[addr];
        this.registers[reg] = val;
        this.index += 3;
        break;
      case 0x4: //movTM
        addr = this.executable[this.index + 1];
        val = this.executable[this.index + 2];
        this.heap[addr] = val;
        this.index += 3;
        break;
      case  0x5: //movTMR
        addr = this.executable[this.index + 1];
        reg = this.executable[this.index + 2];
        val = this.registers[reg];
        this.heap[addr] = val;
        this.index += 3;
        break;
      case 0x6: //add
        reg = this.executable[this.index + 1];
        val1 = this.executable[this.index + 2];
        val = this.registers[reg];
        this.registers[reg] = val + val1;
        this.flags[0x1] = val1 + val > 0xFFFFFFFF;
        this.index += 3;
        break;
      case 0x7: //addR
        reg = this.executable[this.index + 1];
        reg1 = this.executable[this.index + 2];
        val = this.registers[reg];
        val1 = this.registers[reg1];
        this.registers[reg] = val + val1;
        this.index += 3;
        break;
      case 0x8: //sub
        reg = this.executable[this.index + 1];
        val1 = this.executable[this.index + 2];
        val = this.registers[reg];
        this.registers[reg] = val - val1;
        this.index += 3;
        break;
      case 0x9: //subR
        reg = this.executable[this.index + 1];
        reg1 = this.executable[this.index + 2];
        val = this.registers[reg];
        val1 = this.registers[reg1];
        this.registers[reg] = val - val1;
        this.index += 3;
        break;
      case 0xa: //mul
        val = this.executable[this.index + 1];
        val1 = this.registers[0x0];
        tmp = val * val1;
        this.registers[0x0] = tmp;
        this.registers[0x3] = (tmp / 17179869184>>>0);
        this.index += 2;
        break;
      case 0xb: //mulR
        reg = this.executable[this.index + 1];
        val = this.registers[reg];
        val1 = this.registers[0x0];
        tmp = val * val1;
        this.registers[0x0] = tmp;
        this.registers[0x3] = (tmp / 17179869184>>>0);
        this.index += 2;
        break;
      case 0xc: //div
        val = this.executable[this.index + 1];
        val1 = (this.registers[0x3] * 17179869184) + this.registers[0x0];
        tmp = (val1 / val >>> 0);
        this.registers[0x0] = tmp;
        this.registers[0x3] = (tmp / 17179869184>>>0);
        this.index += 2;
        break;
      case 0xd: //divR
        reg = this.executable[this.index + 1];
        val = this.registers[reg];
        val1 = (this.registers[0x3] * 17179869184) + this.registers[0x0];
        tmp = (val1 / val >>> 0);
        this.registers[0x0] = tmp;
        this.registers[0x3] = (tmp / 17179869184>>>0);
        this.index += 2;
        break;
      case 0xe: //movVTMr
        reg = this.executable[this.index + 1];
        val = this.executable[this.index + 2];
        addr = this.registers[reg];
        this.heap[addr] = val;
        this.index += 3;
        break;
      case 0xf: //movRTMr
        reg = this.executable[this.index + 1];
        reg1 = this.executable[this.index + 2];
        val = this.registers[reg1];
        addr = this.registers[reg];
        this.heap[addr] = val;
        this.index += 3;
        break;
      case 0x10: //movMTM
        addr = this.executable[this.index + 1];
        addr1 = this.executable[this.index + 2];
        val = this.heap[addr1];
        this.heap[addr] = val;
        this.index += 3;
        break;
      case 0x11: //movMTMr
        reg = this.executable[this.index + 1];
        addr1 = this.executable[this.index + 2];
        addr = this.registers[reg];
        val = this.heap[addr1];
        this.heap[addr] = val;
        this.index += 3;
        break;
      case 0x12: //movMrTR
        reg = this.executable[this.index + 1];
        reg1 = this.executable[this.index + 2];
        addr = this.registers[reg1];
        val = this.heap[addr];
        this.registers[reg] = val;
        this.index += 3;
        break;
      case 0x13: //movMrTM
        addr = this.executable[this.index + 1];
        reg = this.executable[this.index + 2];
        addr1 = this.registers[reg];
        val = this.heap[addr1];
        this.heap[addr] = val;
        this.index += 3;
        break;
      case 0x14: //movMrTMr
        reg = this.executable[this.index + 1];
        reg1 = this.executable[this.index + 2];
        addr = this.registers[reg];
        addr1 = this.registers[reg1];
        val = this.heap[addr1];
        this.heap[addr] = val;
        this.index += 3;
        break;
      case 0x15: //incR
        reg = this.executable[this.index + 1];
        this.registers[reg]++;
        this.index += 2;
        break;
      case 0x16: //incM
        addr = this.executable[this.index + 1];
        this.heap[addr]++;
        this.index += 2;
        break;
      case 0x17: //incMr
        reg = this.executable[this.index + 1];
        addr = this.registers[reg];
        this.heap[addr]++;
        this.index += 2;
        break;
      case 0x18: //decR
        reg = this.executable[this.index + 1];
        this.registers[reg]--;
        this.index += 2;
        break;
      case 0x19: //decM
        addr = this.executable[this.index + 1];
        this.heap[addr]--;
        this.index += 2;
      case 0x1a: //decMr
        reg = this.executable[this.index + 1];
        addr = this.registers[reg];
        this.heap[addr]++;
        this.index += 2;
        break;
      case 0x1b: //cmpV
        reg = this.executable[this.index + 1];
        val = this.executable[this.index + 2];
        val1 = this.registers[reg];
        if (val1 === val) {
          this.flags[0] = true;
          this.flags[1] = false;
        }
        else if (val1 < val) {
          this.flags[0] = false;
          this.flags[1] = true;
        }
        else {
          this.flags[0] = false;
          this.flags[1] = false;
        }
        this.index += 3;
        break;
      case 0x1c: //cmpR
        reg = this.executable[this.index + 1];
        reg1 = this.executable[this.index + 2];
        val = this.registers[reg1];
        val1 = this.registers[reg];
        if (val1 === val) {
          this.flags[0] = true;
          this.flags[1] = false;
        }
        else if (val1 < val) {
          this.flags[0] = false;
          this.flags[1] = true;
        }
        else {
          this.flags[0] = false;
          this.flags[1] = false;
        }
        this.index += 3;
        break;
      case 0x1d: //jmp
        val = this.executable[this.index + 1];
        this.index = val;
        break;
      case 0x1e: //jeq
        if (this.flags[0]) {
          val = this.executable[this.index + 1];
          this.index = val;
        } else this.index += 2;
        break;
      default:
        throw new Error("That's not a valid instruction! " + instruction);
    }
    return 1;
  }
}
