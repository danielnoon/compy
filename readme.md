# Compy

**You**: What the hell is this? This isn't an operating system!

**Me**: Yep.

### What is this?
Compy is my attempt at writing a functional ABI from scratch in JavaScript (TypeScript). You can check out the "processor" instructions in `src/Process.ts` and system calls in `src/OS.ts`.

Once completed, Compy *should* work as a full-fledged application host that can run arbitrary binary code compiled for the virtual machine. I am using x86 as a standard for what opcodes should be included.

I think what I'm going to end up doing with this is building out the kernel into something that applications can interface with to achieve productive things.

A few things that the kernel needs to support in order for this to happen:

1. filesystem (open, close, read, write)
2. process spawning (fork, execve, clone)
3. i/o
4. networking

### Assembly
Because I want to, I am writing an assembler for the project. The asm syntax should looks familiar if you've written asm before. The biggest difference from familiar grammars stemmed from my annoyance at Intel/AT&T differences in parameter order: I introduced an arrow to indicate source/destination instead of relative position. A full example is in `test-prog.asm`, but here's an overview:

#### Instructions
Like your favorite flavor of asm, each line is one instruction and its parameters
(Note: I am writing the line numbers in parentheses because it looks nice. It is not syntactically valid).

```
(1) mov 3 -> (eax)
(2) mov (ebx) <- (eax)
(3) mov 1 -> [0]
(4) mov 6 -> [(ebx)]
```

In this trivial example, you can see the effects of the arrow syntax. Source is at the tail of the arrow and the destination is at the head. Direction can be mixed throughout a program, which could be deemed a bad thing, but I think that the arrow is obvious enough for glaceability.

You will also notice the different ways of addressing memory and registers. Registers are denoted with parentheses. Fun tip: eax/ebx/ecx/edx are just mnemonics for numbers. You can use numbers in place of the names if you want (i.e. `(0)` for eax). Memory is addressed in square brackets, and the values in registers can be used as memory addresses through `[(reg)]` syntax.

#### Labels and branching
Jumps can be made like any other asm syntax. Labels are defined with `label:` and passed to jumps with `.label`.

```
(1) loop:
(2)   inc (ecx)
(3)   cmp (ecx) 5
(4)   jeq .loop
```

This example should loop five times before exiting.

#### System Calls
Because there's really just one software interrupt that's used, I didn't see a need to define which interrupt to call. Just use the `int` instruction without any parameters.

```
(1) mov 1 -> (eax)    ; syscall 1 is print number
(2) mov 5 -> (ebx)
(3) int
```

This should print "5" to the host console.

#### Assembling
I have written a command line tool to compile the asm to bytecode. To install, run `npm link` in this directory. To run, execute `compy -a <path to asm>`.

## Summary
This is dumb and just something fun for me to do. Unless something compels you to work on this for fun in your free time, you can just ignore this.
