import { Process, registers, flags } from "./Process";
import { createCanvas } from 'canvas';
import * as fs from 'fs';

export class Kernel {
  private processes: Process[] = [];
  private currentProcess = 0;
  public timeStart = Date.now();
  private canvas = createCanvas(200, 200);
  private ctx: CanvasRenderingContext2D;
  private counter = 0;
  private intTimes: number[] = [];
  private lastTime = Date.now();

  constructor() {
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * init
   * When the kernel is actually useable, this will launch userspace process 1.
   */
  init() {
    console.log("=========Running init=========\n")
    const b = fs.readFileSync('ascii');
    const testProgram = new Uint32Array(b.buffer, b.byteOffset, b.byteLength / Uint32Array.BYTES_PER_ELEMENT);
    this.processes.push(new Process(testProgram, 256, 0));
    this.timeStart = Date.now();
    this.doInstruction();
  }

  /**
   * System call
   * @param reg The register states of the calling application.
   * @param flags Flags
   * @param mem Heap
   */
  public syscall(reg: registers, flags: flags, mem: Uint32Array) {
    /*
      System Calls
      console.log: 0x0(mem1,mem2)
        -> print string starting from mem1 and ending at mem2
      printNum 0x1(number)
        -> print number as number
    */
    const call = reg[0];
    switch (call) {
      case 0x0:
        const bytes = mem.slice(reg[1], reg[2]);
        const string = String.fromCharCode(...bytes);
        console.log(string);
        return;
      case 0x1:
        const number = reg[1];
        console.log(number);
        return;
    }
  }

  /**
   * doInstruction
   * 
   * This is a nightmare.
   * Sequentially executes one instruction of each process.
   * No affinity algorithms at all.
   * I'll probably need to write one if I want performance to exist.
   * 
   * What is counter for, you ask?
   * That's me assuming that I'll need to interrupt the blocking loop
   * in order to accept hardware "interrupts" at some point.
   * 
   * Remember, while JavaScript is awesome, it's not really meant for this.
   */
  private doInstruction() {
    while (this.processes.length > 0) {
      const proc = this.processes[this.currentProcess];
      if (!(proc.run(this))) this.processes.splice(this.currentProcess, 1);
      if (this.processes.length > 0) {
        this.currentProcess++;
        if (this.currentProcess >= this.processes.length) {
          this.currentProcess = 0;
        }
      }
      this.counter++;
      if (this.counter % 100000 === 0) break;
    }
    if (this.processes.length > 0) {
      this.intTimes.push(Date.now() - this.lastTime);
      this.lastTime = Date.now();
      setTimeout(() => this.doInstruction(), 0);
    }
    else {
      let avg = 0;
      this.intTimes.forEach(v => avg += v);
      avg /= this.intTimes.length;
      console.log("\n=========Execution finished=========");
      console.log("=========       Stats      =========\n")
      console.log("-> First interrupt check time: ", this.intTimes[0]);
      console.log("-> Average time between interrupt checks: ", avg, "ms");
      console.log("-> Number of interrupt checks: ", this.intTimes.length);
      console.log("-> Total Time: ", Date.now() - this.timeStart, "ms");
    }
  }
}
