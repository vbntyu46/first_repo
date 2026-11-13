# Counts down from 10 to 0, one number per line, then prints a closing message.
# x86-64 Linux, GNU assembler, no libc: talks to the kernel directly.
#
#   as countdown.s -o countdown.o && ld countdown.o -o countdown && ./countdown

    .intel_syntax noprefix

    .equ SYS_WRITE, 1
    .equ SYS_EXIT, 60
    .equ STDOUT, 1
    .equ START, 10

    .section .rodata
message:
    .ascii "Liftoff!\n"
    .equ MESSAGE_LEN, . - message

    .section .bss
buffer:
    .skip 4                         # up to two digits and a newline

    .section .text
    .global _start

_start:
    mov     r12, START              # r12 survives syscalls

next:
    # Split the counter into tens (al) and ones (dl).
    mov     rax, r12
    xor     edx, edx
    mov     ecx, 10
    div     rcx

    lea     rsi, [rip + buffer]
    mov     rdi, rsi                # rdi walks the buffer as characters are added
    test    al, al
    jz      ones                    # no leading zero for single digits
    add     al, '0'
    mov     [rdi], al
    inc     rdi
ones:
    add     dl, '0'
    mov     [rdi], dl
    mov     byte ptr [rdi + 1], '\n'

    lea     rdx, [rdi + 2]
    sub     rdx, rsi                # length = end - start
    mov     eax, SYS_WRITE
    mov     edi, STDOUT
    syscall

    dec     r12
    jns     next                    # keep going until the counter drops below 0

    mov     eax, SYS_WRITE
    mov     edi, STDOUT
    lea     rsi, [rip + message]
    mov     edx, MESSAGE_LEN
    syscall

    mov     eax, SYS_EXIT
    xor     edi, edi
    syscall
