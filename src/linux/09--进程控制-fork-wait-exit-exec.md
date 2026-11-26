# 9. 进程控制：fork、wait、exit、exec

这一章是整门课的重心。五个原语组合起来，就是 Shell、守护进程、播放器、任务管理器的全部底层。

## （一）fork：一次调用，两次返回

```c
#include <sys/types.h>
#include <unistd.h>
pid_t fork(void);
```

| 返回值 | 所在进程 | 含义 |
|---|---|---|
| `> 0` | 父进程 | 返回**子进程的 PID** |
| `== 0` | 子进程 | 表示「我是子进程」 |
| `< 0` | 父进程 | 创建失败，`errno` 说明原因 |

```c
pid_t pid = fork();
if (pid < 0) {
    perror("fork");        /* EAGAIN：进程数超限；ENOMEM：内存不足 */
} else if (pid == 0) {
    /* 子进程分支 */
} else {
    /* 父进程分支，pid 是子进程号 */
}
```

三个必须记住的特点：

1. **执行顺序不确定**：父子谁先跑由调度器决定，不能靠 `sleep` 假设顺序，要用 `wait` 同步。
2. **fork 之后的代码执行两遍**：子进程从 `fork` 返回处继续，`fork` 之前的代码不重复执行（但地址空间是复制来的，变量值也复制）。
3. **资源独立**：父子各有自己的堆栈与数据段，一方 `i++` 不影响另一方。

> 扩展 · 写时复制（COW）：`fork` 并不真的复制整个地址空间，而是把父子页表都指向同一批物理页并标记只读。任一方写入时触发缺页异常，内核才复制那一页。这让 `fork` 的开销从「O(内存大小)」降到「O(页表项)」，是 `fork` 至今仍是主流创建方式的关键。

## （二）经典题型：三次 fork 打印几次

```c
fork();
fork();
fork();
printf("hello world\n");
```

**结论：8 个进程，8 次输出，7 个子进程。**

推导：每次 `fork` 让当前进程数翻倍。1 → 2 → 4 → 8。每个进程都执行到 `printf`，所以 8 次。

进程树（父 → 子）：

```
P
├── C1                 (第 1 次 fork)
│   ├── C1-1           (第 2 次)
│   │   ├── C1-1-1     (第 3 次)
│   │   └── C1-1-2
│   └── C1-2
│       ├── C1-2-1
│       └── C1-2-2
├── C2
│   ├── C2-1
│   │   ├── C2-1-1
│   │   └── C2-1-2
│   └── C2-2
│       ├── C2-2-1
│       └── C2-2-2
```

教材的作业代码用 `pid1 … pid7` 的嵌套条件实现了同样的结构，验证时把 `getpid()` / `getppid()` 打出来即可对上。

## （三）比「打印几次」更隐蔽的坑：缓冲区复制

把 `printf` 挪到 `fork` **之前**，且输出重定向到文件，结果会变化：

```c
printf("hello world\n");    /* 重定向到文件 → 全缓冲，内容留在用户态缓冲区 */
fork();
```

此时 2 个进程**各自持有一份被复制的缓冲区**，退出时各刷一次，文件里出现 2 行。三次 fork 就是 8 行——恰好和上一节结果相同，容易让人误以为「没问题」。真正的差别在**不加 `\n`** 的情形：

```c
printf("hello");    /* 无换行，缓冲区未刷 */
fork();
```

到终端时行缓冲因无换行不刷，两个进程各刷一次 → 2 个 `hello`；看似正常，但若父进程在 `fork` 前已经 `fflush`，就只有 2 次；若没刷，缓冲区被复制，仍然 2 次。这类差异说明一条铁律：

> 铁律：`fork` 之前先 `fflush(NULL)`，或确保缓冲区为空。否则输出次数取决于缓冲类型和是否重定向，同一份代码在终端和文件里的行为可能不同。

## （四）wait 与 waitpid：回收与同步

```c
#include <sys/types.h>
#include <sys/wait.h>
pid_t wait(int *wstatus);
pid_t waitpid(pid_t pid, int *wstatus, int options);
```

| 参数 | 取值 | 含义 |
|---|---|---|
| `pid` | `-1` | 等待任意子进程 |
| | `> 0` | 等待指定 PID |
| | `0` | 等待同进程组的任意子进程 |
| | `< -1` | 等待进程组 ID 为 `-pid` 的任意子进程 |
| `options` | `0` | 阻塞式等待 |
| | `WNOHANG` | 非阻塞，没等到立即返回 0 |

`wait(NULL)` 完全等价于 `waitpid(-1, NULL, 0)`。

`wstatus` 不是退出码本身，而是**编码后的状态字**，必须用宏解析：

```c
int st;
waitpid(pid, &st, 0);
if (WIFEXITED(st))        printf("正常退出，码=%d\n", WEXITSTATUS(st));
else if (WIFSIGNALED(st)) printf("被信号杀死，信号=%d\n", WTERMSIG(st));
else if (WIFSTOPPED(st))  printf("被暂停，信号=%d\n", WSTOPSIG(st));
```

> 易错点：直接 `printf("%d", st)` 会得到 `256` 这样的值——真实退出码在低 8 位，高位是信号信息。`exit(1)` 对应的 `st` 是 `256`，`exit(0)` 是 `0`。

## （五）exit 与 _exit：缓冲区是否清理

| 函数 | 头文件 | 刷 stdio 缓冲 | 执行 atexit 回调 | 关闭 fd |
|---|---|---|---|---|
| `exit(status)` | `<stdlib.h>` | **是** | 是 | 是 |
| `_exit(status)` | `<unistd.h>` | **否** | 否 | 是 |
| `return` from `main` | — | 是（等价 `exit`） | 是 | 是 |

`_exit` 用于 `fork` 出的子进程：子进程继承了父进程的缓冲区副本，若用 `exit` 会把这份副本也刷出去，造成重复输出。**子进程退出一律用 `_exit`**（或 `exit` 前先 `fflush(NULL)`）。

## （六）atexit：退出前的收尾

```c
#include <stdlib.h>
int atexit(void (*function)(void));
```

注册的函数在进程**正常退出**时按**逆序**（后注册先执行）调用。`SIGKILL` 杀掉、`_exit` 退出都不会触发。

```c
void cleanup(void) { printf("清理资源\n"); }
int main(void) { atexit(cleanup); return 0; }
```

> 扩展 · 典型用途：恢复终端属性（`mpg123` 会关掉回显和光标，播放器必须在退出时 `system("stty echo")` 并显示光标）、删除临时文件、`munmap`、关闭日志。这也是教材说「进程退出清理函数放两行代码」的由来。

## （七）vfork：共享地址空间的危险版本

```c
pid_t vfork(void);
```

| 对比项 | `fork` | `vfork` |
|---|---|---|
| 地址空间 | 复制（COW） | **共享父进程的** |
| 执行顺序 | 不确定 | 子进程先运行，父进程阻塞 |
| 开销 | 有页表复制 | 几乎为零 |
| 安全性 | 安全 | **危险**：子进程改任何变量都会影响父进程 |

`vfork` 的子进程若用 `return` 返回 `main`，会破坏父进程的栈帧，表现为「段错误（核心已转储）」。两种正确收尾：

1. 子进程中调用 `exit(0)` / `_exit(0)` 结束；
2. 子进程中调用 `exec` 族函数替换自身。

> 扩展 · 现代 Linux 上 `vfork` 的 COW 优化已经让 `fork` 足够快，`vfork` 的唯一优势场景是「立即 exec」，此时用 `posix_spawn` 更规范。

## （八）exec 函数族：换掉自己的躯壳

`exec` 不创建新进程，而是用新程序**覆盖**当前进程的代码段、数据段、堆栈，PID 不变。

| 函数 | 参数形式 | 是否搜 PATH | 是否传环境变量 |
|---|---|---|---|
| `execl` | 列表 `(path, arg0, arg1, ..., NULL)` | 否（要绝对路径） | 继承 |
| `execv` | 数组 `(path, argv[])` | 否 | 继承 |
| `execlp` | 列表 | **是** | 继承 |
| `execvp` | 数组 | **是** | 继承 |
| `execle` | 列表 | 否 | **显式传入 envp** |
| `execve` | 数组 | 否 | 显式传入 envp（唯一的系统调用） |

命名规律：`l` = list（可变参数列表）、`v` = vector（数组）、`p` = PATH（搜索环境变量）、`e` = environment（自定义环境）。注意 `execve` **没有** `l` 版本。

```c
execl("/usr/bin/ls", "ls", "-li", NULL);   /* 绝对路径 */
execlp("ls", "ls", "-li", NULL);           /* 靠 PATH 查找 */
```

三个必须遵守的规则：

1. **最后一个参数必须是 `NULL`**，它是可变参数的结束标记，少了会读到栈上垃圾导致崩溃。
2. `arg0` 是「程序在 `argv[0]` 里看到的自己」，惯例写程序名，不必与路径一致。
3. `exec` 成功后**不返回**，之后的代码永远不会执行；失败才返回 `-1`。所以 `exec` 后面不需要 `return`，但失败分支要处理。

> 易错点：`execlp("ls", "-li", NULL)` 少了 `arg0`，`ls` 会把 `-li` 当成自己的名字，输出异常。参数个数永远是「程序名 + 参数 + NULL」。

## （九）system：一行调用 Shell

```c
#include <stdlib.h>
int system(const char *command);
```

内部实现就是 `fork` + `execl("/bin/sh", "sh", "-c", command, NULL)` + `waitpid`。返回值需要 `WIFEXITED` / `WEXITSTATUS` 解析；`command` 为 `NULL` 时返回非 0 表示 Shell 可用。

```c
int ret = system("mpg123 -q song.mp3 &");
```

> 扩展 · `system` 的代价：多起一个 Shell 进程、阻塞等待、命令串要防注入。生产代码优先 `fork` + `exec` 直接调用，或 `posix_spawn`。

## （十）glob：按通配符找文件

```c
#include <glob.h>
int glob(const char *pattern, int flags,
         int (*errfunc)(const char *epath, int eerrno), glob_t *pglob);
void globfree(glob_t *pglob);

typedef struct {
    size_t gl_pathc;    /* 匹配到的个数 */
    char **gl_pathv;    /* 结果数组，以 NULL 结尾 */
    size_t gl_offs;
} glob_t;
```

```c
glob_t g = {0};
if (glob("/home/user/music/*.mp3", 0, NULL, &g) == 0) {
    for (size_t i = 0; i < g.gl_pathc; i++)
        printf("%s\n", g.gl_pathv[i]);
}
globfree(&g);
```

常用 `flags`：`GLOB_NOSORT`（不排序，快）、`GLOB_NOCHECK`（无匹配时返回原模式）、`GLOB_ONLYDIR`（只匹配目录）。结果数组由 `glob` 内部 `malloc`，必须 `globfree` 释放。

> 易错点：`gl_pathc` 为 0 且返回 `GLOB_NOMATCH` 时，仍应调用 `globfree`（内部状态已分配）。忘记释放是长期运行的播放器/服务端的内存泄漏源。
