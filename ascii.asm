loop1:
  mov 0 -> (edx)
  mov (ecx) -> [(ecx)]
  cmp (ecx) 128
  jeq .loop2
  inc (ecx)
  jmp .loop1

loop2:
  cmp (edx) 1000000
  jeq .print
  inc (edx)
  jmp .loop2

print:
  mov 1 -> (eax)
  mov (edx) -> (ebx)
  int

done:
  mov 66 -> [200]
  mov 121 -> [201]
  mov 101 -> [202]
  mov 33 -> [203]
  mov 0 -> (eax)
  mov 200 -> (ebx)
  mov 204 -> (ecx)
  int
