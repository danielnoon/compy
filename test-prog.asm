main:
  mov (ebx) <- 70
  add 2 -> (ebx)
  mov [0x0] <- (ebx)
  mov [0x1] <- 101
  mov [0x2] <- 108
  mov [0x3] <- 108
  mov [0x4] <- 111
  mov (eax) <- 1504
  mul 125650639
  mov [0x6] <- (eax)
  mov (eax) <- (edx)
  mul 4
  mov [0x5] <- (eax)
  mov (eax) <- 20
  mul 4
  add (eax) <- 7
  mov [0x7] <- (eax)
  mov [0x8] <- 111
  mov [0x9] <- 114
  mov [0xa] <- 108
  mov [0xb] <- 100
  mov 0xc -> (ebx)
  mov 33 -> [(ebx)]
  mov 0 -> (ecx)

loopstart:
  inc (ebx)
  mov 33 -> [(ebx)]
  cmp (ecx) 200
  jeq .loopend
  inc (ecx)
  jmp .loopstart

loopend:
  mov (edx) <- (ebx) 
  mov (eax) <- 0
  mov (ebx) <- 0
  mov (ecx) <- (edx)
  int
