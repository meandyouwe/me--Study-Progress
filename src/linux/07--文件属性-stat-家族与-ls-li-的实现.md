# 7. 文件属性：stat 家族与 ls -li 的实现

`ls -l` 输出的每一列都来自 `struct stat`。理解这个结构体的位布局，才能真正读懂权限字符串。

## （一）三个函数的分工

```c
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

int stat (const char *pathname, struct stat *buf);   /* 跟随符号链接 */
int lstat(const char *pathname, struct stat *buf);   /* 不跟随，取链接自身 */
int fstat(int fd,               struct stat *buf);   /* 已打开的文件 */
```

| 函数 | 输入 | 符号链接行为 | 典型场景 |
|---|---|---|---|
| `stat` | 路径 | 取**目标文件**的属性 | 查看链接指向的真实文件大小 |
| `lstat` | 路径 | 取**链接自身**的属性 | 遍历目录、`ls -l` 显示 `l` 类型 |
| `fstat` | 描述符 | 对已打开文件操作 | 避免 TOCTOU（检查与使用之间被替换） |

## （二）struct stat 关键字段

| 字段 | 类型 | 含义 |
|---|---|---|
| `st_dev` | `dev_t` | 所在设备号 |
| `st_ino` | `ino_t` | inode 号，同一文件系统内唯一 |
| `st_mode` | `mode_t` | **文件类型 + 权限**，核心字段 |
| `st_nlink` | `nlink_t` | 硬链接数 |
| `st_uid` / `st_gid` | `uid_t` / `gid_t` | 属主 / 属组 |
| `st_rdev` | `dev_t` | 设备文件的主次设备号 |
| `st_size` | `off_t` | 文件大小（字节）；目录的大小是目录项占用 |
| `st_blksize` | `blksize_t` | 最优 I/O 块大小，通常 4096 |
| `st_blocks` | `blkcnt_t` | 占用 512 字节块的数量 |
| `st_atime` | `time_t` | 最后访问时间 |
| `st_mtime` | `time_t` | 最后**内容修改**时间 |
| `st_ctime` | `time_t` | 最后**状态改变**时间 |

> 重要纠正：教材把 `st_ctime` 注释为「创建时间」，这是错的。Linux 的 `ctime` 是 **change time**——inode 状态（权限、属主、链接数、内容）任一改变都会更新它，改名、`chmod` 都会刷新。真正的创建时间需要 `statx()` 的 `STATX_BTIME` 字段，且依赖文件系统支持。用 `ctime` 当「创建时间」会导致「改了权限，创建时间就变了」的诡异现象。

## （三）st_mode 的位布局

`st_mode` 是 16 位，高 4 位是文件类型，低 12 位是权限（含三位特殊权限）：

```
 15 14 13 12 | 11 10 9 | 8 7 6 | 5 4 3 | 2 1 0
 [ 文件类型 ] [ 特殊位 ] [ 属主 ] [ 属组 ] [ 其他 ]
               S U S G S T   r w x   r w x   r w x
```

文件类型取值（八进制）：

| 宏 | 值 | 字符 | 类型 |
|---|---|---|---|
| `S_IFREG` | 0100000 | `-` | 普通文件 |
| `S_IFDIR` | 0040000 | `d` | 目录 |
| `S_IFCHR` | 0020000 | `c` | 字符设备 |
| `S_IFBLK` | 0060000 | `b` | 块设备 |
| `S_IFIFO` | 0010000 | `p` | 命名管道 |
| `S_IFLNK` | 0120000 | `l` | 符号链接 |
| `S_IFSOCK` | 0140000 | `s` | 套接字 |

判断类型优先用宏，可读性和可移植性都更好：

```c
if (S_ISREG(st.st_mode))  ch = '-';
else if (S_ISDIR(st.st_mode))  ch = 'd';
/* S_ISCHR / S_ISBLK / S_ISFIFO / S_ISLNK / S_ISSOCK */
```

权限位宏：`S_IRUSR`(0400)、`S_IWUSR`(0200)、`S_IXUSR`(0100)，`GRP` 与 `OTH` 依次右移 3 位、6 位。

## （四）实现 ls -li

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <dirent.h>
#include <time.h>
#include <sys/stat.h>
#include <sys/types.h>

static char type_char(mode_t m)
{
    if (S_ISREG(m))  return '-';
    if (S_ISDIR(m))  return 'd';
    if (S_ISLNK(m))  return 'l';
    if (S_ISCHR(m))  return 'c';
    if (S_ISBLK(m))  return 'b';
    if (S_ISFIFO(m)) return 'p';
    if (S_ISSOCK(m)) return 's';
    return '?';
}

static void mode_str(mode_t m, char out[11])
{
    const char rwx[3] = {'r', 'w', 'x'};
    out[0] = type_char(m);
    for (int i = 0; i < 9; i++) {
        out[i + 1] = (m & (0400 >> i)) ? rwx[i % 3] : '-';
    }
    out[10] = '\0';
}

int main(int argc, char *argv[])
{
    const char *path = (argc > 1) ? argv[1] : ".";
    DIR *dir = opendir(path);
    if (!dir) { perror("opendir"); return -1; }

    struct dirent *e;
    while ((e = readdir(dir)) != NULL) {
        if (e->d_name[0] == '.') continue;        /* 简化：跳过隐藏项 */

        char full[4096];
        snprintf(full, sizeof(full), "%s/%s", path, e->d_name);

        struct stat st;
        if (lstat(full, &st) < 0) { perror("lstat"); continue; }

        char perm[11];
        mode_str(st.st_mode, perm);

        char tbuf[32];
        struct tm tm_buf;
        localtime_r(&st.st_mtime, &tm_buf);
        strftime(tbuf, sizeof(tbuf), "%m月 %d %H:%M", &tm_buf);

        printf("%8ld %s %2ld %5ld %s %s\n",
               (long)st.st_ino, perm, (long)st.st_nlink,
               (long)st.st_size, tbuf, e->d_name);
    }
    closedir(dir);
    return 0;
}
```

几个实现要点：

- `st_ino` 是 `ino_t`，打印要显式转 `long` 或 `%ju` + `uintmax_t`，否则 64 位下有告警。
- 时间用 `localtime_r` 而非 `localtime`，避免静态缓冲区被覆盖。
- 权限字符串里的 `x` 位在 `setuid`/`setgid`/`sticky` 存在时应显示 `s`/`s`/`t`，标准 `ls` 用 `S_ISUID` 等宏处理，这是完整复刻的最后一块拼图。

## （五）硬链接与符号链接

| 对比项 | 硬链接 | 符号链接 |
|---|---|---|
| 本质 | 同一 inode 的新目录项 | 独立文件，内容是目标路径 |
| inode | 与源文件相同 | 与源文件不同 |
| `st_nlink` | 增加 | 不变 |
| 跨文件系统 | 不允许 | 允许 |
| 链接目录 | 不允许（普通用户） | 允许 |
| 源文件删除 | 数据仍在，链接仍可用 | 变成断链（dangling） |
| `ls -l` 显示 | 普通文件 | `l` 类型 + `-> 目标` |

```bash
ln  src.txt hard.txt     # 硬链接
ln -s src.txt soft.txt   # 符号链接
stat -c "%i %h %n" src.txt hard.txt soft.txt
```

> 易错点：用 `stat` 判断符号链接指向的是不是目录，得到的是目标的信息；要判断链接**自身**必须用 `lstat`。这是递归删除、目录遍历出错的高频原因。
