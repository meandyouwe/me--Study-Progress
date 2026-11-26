window.__SEARCH_INDEX__ = [
{
"t": "1. 课程地图：从系统编程到图形界面",
"sec": "（一）知识依赖链",
"x": "把章节按依赖关系排开，可以看清为什么顺序不能乱： 层 主题 前置依赖 没有它会卡在哪里 L1 工程组织（Makefile、库） C 语言基础 多文件编译、链接第三方库全部失败 L2 标准 I/O（ FILE * ） L1 只能写单文件小 demo L3 系统 I/O（ fd ） L2、 errno 管道、套接字、设备文件无从下手 L4 时间与目录 L3 做不出带时间戳的日志、遍历不了目录 L5 文件属性（ stat ） L4 实现不了 ",
"u": "01.html",
"id": "sec-1"
},
{
"t": "1. 课程地图：从系统编程到图形界面",
"sec": "（二）三条并行的能力线",
"x": "课程内容看似零散，实际只有三条线： 资源线 ：文件描述符 → 目录流 → 进程号。三者都是「整数句柄 + 打开/使用/关闭」的同一套模式， open/close 、 opendir/closedir 、 fork/wait 结构完全同构。 时间线 ： time 取秒数 → localtime 转结构体 → strftime 格式化。所有「按时间命名文件」「界面显示时钟」的需求都是这三步的排列组合。 控制线 ： fork 造进程 → ex",
"u": "01.html",
"id": "sec-2"
},
{
"t": "1. 课程地图：从系统编程到图形界面",
"sec": "（三）每章的产出物",
"x": "学习效果以「能否独立写出」为准，不以「看懂」为准： 章节 应能独立完成 验收标准 工程组织 静态库 + 动态库各一套 Makefile make 一次通过， ldd 能看到依赖 标准 I/O 结构体整块存取的用户名密码程序 二进制文件可被 xxd 读出字段 系统 I/O cp 命令的四种实现 大文件（>100 MB）拷贝不丢字节 时间 每 5 秒建文件，文件名带时间戳 连续 10 个文件命名不重复 目录与属性 ls -li 的完整复刻 ",
"u": "01.html",
"id": "sec-3"
},
{
"t": "1. 课程地图：从系统编程到图形界面",
"sec": "（四）环境与约定",
"x": "平台：Ubuntu（图形界面版），编译器 gcc ，调试 gdb ，构建 make 。 所有系统调用失败都会设置 errno ， 必须 用 perror 或 strerror(errno) 打印，禁止只写 return -1 了事。 头文件按「系统调用 → 标准库」顺序排列，避免隐式声明告警。 代码中的路径一律用 argv 传入，不写死绝对路径，否则换机器就废。 扩展 · 调试习惯： strace -f ./a.out 能看到每一次系统",
"u": "01.html",
"id": "sec-4"
},
{
"t": "2. 工程组织：Makefile 与静态库、动态库",
"sec": "（一）四种赋值符号",
"x": "Makefile 的赋值符号差异全在「展开时机」，这是最容易混淆的一组语法： 符号 名称 展开时机 典型用途 = 递归赋值 使用时才展开 依赖后续变量定义的场景 := 立即赋值 定义时立刻展开 绝大多数情况，行为可预测 ?= 条件赋值 仅当变量未定义时赋值 允许命令行覆盖默认值 += 追加赋值 追加到已有值之后 累加源文件列表、编译选项 CC := gcc CFLAGS := -Wall -O2 CFLAGS += -g # 追加调试信",
"u": "02.html",
"id": "sec-1"
},
{
"t": "2. 工程组织：Makefile 与静态库、动态库",
"sec": "（二）静态库",
"x": "静态库在链接期把用到的目标代码「复制」进可执行文件。 libmy.a: 1.o 2.o ar rcs $@ $^ %.o: %.c $(CC) $(CFLAGS) -c $< -o $@ app: main.c libmy.a $(CC) main.c -L. -lmy -o app ar rcs ： r 替换或插入、 c 创建、 s 生成索引（没有索引链接会慢且可能失败）。 -L. 指定库搜索路径， -lmy 对应 libmy.a （",
"u": "02.html",
"id": "sec-2"
},
{
"t": "2. 工程组织：Makefile 与静态库、动态库",
"sec": "（三）动态库",
"x": "动态库在运行期加载，多个进程共享同一份代码段。 libmy.so: 1.c 2.c $(CC) -fPIC -shared -o $@ $^ app: main.c libmy.so $(CC) main.c -L. -lmy -Wl,-rpath,'$$ORIGIN' -o app -fPIC ：生成位置无关代码，动态库 必须 加，否则链接报 relocation R_X86_64_32 against ... can not be ",
"u": "02.html",
"id": "sec-3"
},
{
"t": "2. 工程组织：Makefile 与静态库、动态库",
"sec": "（四）头文件与库的边界",
"x": "库对外只暴露头文件： .h 放函数声明、类型定义、宏； .c 放实现。调用方 #include \"my.h\" 并链接 -lmy 。若头文件在子目录，编译时补 -I./include 。 易错点：把变量定义写进头文件，多文件包含时链接报 multiple definition 。正确做法是头文件里写 extern int g; ，在 一个 .c 里写 int g = 0; 。C99 起的 inline 变量规则更细，工程上仍建议沿用 ex",
"u": "02.html",
"id": "sec-4"
},
{
"t": "3. 标准 I/O：缓冲文件操作",
"sec": "（一）打开与关闭",
"x": "FILE *fp = fopen ( \"user.dat\" , \"wb+\" ); if (fp == NULL ) { perror ( \"fopen\" ); return - 1 ; } /* ... */ fclose (fp); /* 成功返回 0，失败返回 EOF */ 模式 读 写 文件不存在 文件存在 r ✓ ✗ 失败 从开头读 r+ ✓ ✓ 失败 从开头读写 w ✗ ✓ 创建 清空 w+ ✓ ✓ 创建 清空 a ✗ ✓ 创",
"u": "03.html",
"id": "sec-1"
},
{
"t": "3. 标准 I/O：缓冲文件操作",
"sec": "（二）缓冲区的四个刷新时机",
"x": "printf 的输出去向不是终端，而是缓冲区。数据真正落到内核，只在这四种情况： 遇到换行符 \\n （ 仅行缓冲 ，即输出到终端时）； 缓冲区写满（大小由实现决定， BUFSIZ 通常为 8192，部分教材写 1024）； 程序正常结束（ return 从 main 返回，或调用 exit ）； 手动调用 fflush(fp) 。 三种缓冲类型： 全缓冲 （重定向到文件/管道时的默认）、 行缓冲 （终端）、 无缓冲 （ stderr 固",
"u": "03.html",
"id": "sec-2"
},
{
"t": "3. 标准 I/O：缓冲文件操作",
"sec": "（三）默认打开的三个流",
"x": "程序启动时内核已经准备好三个描述符，标准库把它们包装成流指针： 流 描述符 默认缓冲 用途 stdin 0 行缓冲 标准输入 stdout 1 行缓冲（终端）/全缓冲（重定向） 标准输出 stderr 2 无缓冲 错误输出",
"u": "03.html",
"id": "sec-3"
},
{
"t": "3. 标准 I/O：缓冲文件操作",
"sec": "（四）字符、行、格式化、块：四组读写函数",
"x": "组 写 读 特点 字符 fputc / putc / putchar fgetc / getc / getchar 单字节，适合逐字符处理 行 fputs / puts fgets / gets （ 已废弃 ） 以 \\n 或 EOF 为界 格式化 fprintf / printf / sprintf / snprintf fscanf / scanf / sscanf 文本可读，解析开销大 块 fwrite fread 二进制整块，效率",
"u": "03.html",
"id": "sec-4"
},
{
"t": "3. 标准 I/O：缓冲文件操作",
"sec": "（五）定位与状态",
"x": "int fseek (FILE *fp, long offset, int whence); /* SEEK_SET/CUR/END，成功 0 */ long ftell (FILE *fp); /* 当前偏移，失败 -1 */ void rewind (FILE *fp); /* 等价 fseek(fp,0,SEEK_SET) 并清错误标志 */ int feof (FILE *fp); /* 已读到末尾返回非 0 */ int fe",
"u": "03.html",
"id": "sec-5"
},
{
"t": "3. 标准 I/O：缓冲文件操作",
"sec": "（六）一个完整的作业范例及其缺陷",
"x": "教材的「用户名密码」程序用 fwrite 存结构体、 fread 读回，再循环三次校验。核心逻辑没问题，但输入循环里有两处典型缺陷： for ( int i = 3 ; i > 0 ; i--) { /* ... */ printf ( \"还剩%d 次机会\\n\" , i--); /* 缺陷 1：循环变量在循环体内又被减一次 */ } i-- 让循环体与 for 更新表达式各减一次，实际只给两次机会；且 printf 打印的是「减之前」的",
"u": "03.html",
"id": "sec-6"
},
{
"t": "3. 标准 I/O：缓冲文件操作",
"sec": "（七）标准 I/O 的适用边界",
"x": "标准 I/O 适合 普通文件 和 格式化文本 。它不适合三类场景：需要精确控制每次系统调用的量（网络、管道）、需要用非文件句柄（套接字、设备）、需要多个进程共享同一打开文件。这三类都要下沉到系统调用层，也就是下一章的内容。",
"u": "03.html",
"id": "sec-7"
},
{
"t": "4. 系统 I/O：文件描述符与非缓冲操作",
"sec": "（一）为什么必须学非缓冲 I/O",
"x": "教材给的三个理由是准确的，但可以再往深一层： 特殊文件没有 FILE * ：管道、套接字、字符设备的句柄是 int 类型的描述符，标准库没有对应的流，只能走系统调用。 缓冲区不可控 ：实时性要求高的场景（串口、传感器）不能被 8 KB 缓冲拖住。 需要精细控制 ： O_NONBLOCK （非阻塞）、 O_SYNC （同步落盘）、 O_APPEND （原子追加）这些语义只存在于系统调用层。",
"u": "04.html",
"id": "sec-1"
},
{
"t": "4. 系统 I/O：文件描述符与非缓冲操作",
"sec": "（二）open：flags 与 mode",
"x": "#include <sys/types.h> #include <sys/stat.h> #include <fcntl.h> int open ( const char *pathname, int flags); int open ( const char *pathname, int flags, mode_t mode); flags 含义 备注 O_RDONLY 只读 值为 0， 不能 用 if (flags & O_RDON",
"u": "04.html",
"id": "sec-2"
},
{
"t": "4. 系统 I/O：文件描述符与非缓冲操作",
"sec": "（三）权限：mode 与 umask 的与运算",
"x": "新建文件的最终权限不是 mode 本身，而是： 真实权限 = mode & ~umask 以 mode = 0666 、 umask = 0002 为例： 110 110 110 (0666) & 111 111 101 (~0002) --------------- 110 110 100 (0664) 即 rw-rw-r-- 。 umask 是「要屏蔽掉的位」，通常 root 为 0022 ，普通用户为 0002 。 易错点： op",
"u": "04.html",
"id": "sec-3"
},
{
"t": "4. 系统 I/O：文件描述符与非缓冲操作",
"sec": "（四）read / write：字节数语义",
"x": "ssize_t write ( int fd, const void *buf, size_t count); /* 成功返回实际写入字节数 */ ssize_t read ( int fd, void *buf, size_t count); /* 成功返回实际读到字节数，0 表示 EOF */ 要点： 返回值类型 ssize_t （有符号），失败为 -1 ， 不要 用 size_t 接收，否则 -1 会变成巨大正数。 count 的",
"u": "04.html",
"id": "sec-4"
},
{
"t": "4. 系统 I/O：文件描述符与非缓冲操作",
"sec": "（五）lseek：定位与「求大小」",
"x": "#include <sys/types.h> #include <unistd.h> off_t lseek ( int fd, off_t offset, int whence); whence 三个取值： SEEK_SET （文件开头）、 SEEK_CUR （当前位置）、 SEEK_END （文件末尾）。成功返回「新位置距文件开头的字节数」，失败 -1 。 三个高频用法： off_t size = lseek (fd, 0 , SE",
"u": "04.html",
"id": "sec-5"
},
{
"t": "4. 系统 I/O：文件描述符与非缓冲操作",
"sec": "（六）缓冲与非缓冲的对应关系",
"x": "标准 I/O 系统调用 说明 fopen open 建立流与描述符的绑定 fclose close 先 fflush 再 close fread / fwrite read / write 前者带缓冲，可短读 fseek / ftell lseek 前者维护用户态偏移 fflush 无 把用户态缓冲刷进内核 fileno(fp) 无 取出流内部的描述符 扩展 · 内核里的三层结构： 描述符表 （每进程一份，索引 → 打开文件表项）、 打",
"u": "04.html",
"id": "sec-6"
},
{
"t": "4. 系统 I/O：文件描述符与非缓冲操作",
"sec": "（七）cp 的四种实现与取舍",
"x": "教材给了四种写法，实际工程中只有一种可用： 方案 代码量 内存 适用场景 读 1 字节写 1 字节 最少 2 字节 教学演示，性能极差 读 N 写 N（定长缓冲） 少 4 KB 推荐 ，通用 一次读全部（数组足够大） 少 栈上 4 KB，易溢出 不推荐，大文件直接崩 malloc + lseek 求长 中 等于文件大小 小文件可用，大文件 OOM 正确写法必须是「循环 + 以返回值为准」： char buf[ 4096 ]; ssize",
"u": "04.html",
"id": "sec-7"
},
{
"t": "5. 时间编程",
"sec": "（一）命令行工具",
"x": "date # 当前日期时间 date +\"%F %T\" # 格式化输出 2026-11-25 19:20:44 date -d \"1970-01-01 UTC 1700000000 seconds\" # 时间戳反解 cal # 本月日历 cal 2026 # 整年 cal 11 2026 # 指定年月",
"u": "05.html",
"id": "sec-1"
},
{
"t": "5. 时间编程",
"sec": "（二）time：取日历时间",
"x": "#include <time.h> time_t time (time_t *tloc); 返回 自 1970-01-01 00:00:00 UTC 起经过的秒数 （Unix 时间戳）。参数可为 NULL ，也可传入地址由函数回填。两种写法等价： time_t t = time ( NULL ); time_t t; time (&t); time_t 在 32 位系统上是 32 位有符号整数，最大到 2038-01-19 03:14:",
"u": "05.html",
"id": "sec-2"
},
{
"t": "5. 时间编程",
"sec": "（三）struct tm 与转换函数",
"x": "struct tm { int tm_sec; /* 秒 0-60（60 用于闰秒） */ int tm_min; /* 分 0-59 */ int tm_hour; /* 时 0-23 */ int tm_mday; /* 日 1-31 */ int tm_mon; /* 月 0-11 ← 从 0 开始 */ int tm_year; /* 年 -1900 ← 需加 1900 */ int tm_wday; /* 星期 0-6，周日为",
"u": "05.html",
"id": "sec-3"
},
{
"t": "5. 时间编程",
"sec": "（四）strftime 常用格式符",
"x": "符 含义 示例 %Y 四位年 2026 %m 两位月 11 %d 两位日 25 %H %M %S 时 分 秒 19 20 44 %F 等价 %Y-%m-%d 2026-11-25 %T 等价 %H:%M:%S 19:20:44 %A %B 星期全名、月全名 Wednesday / November %j 年内第几天 329 %p AM / PM PM %s Unix 时间戳 1795605644 %% 百分号本身 % char buf[",
"u": "05.html",
"id": "sec-4"
},
{
"t": "5. 时间编程",
"sec": "（五）完整案例：每 5 秒建一个带时间戳的文件",
"x": "#include <stdio.h> #include <string.h> #include <unistd.h> #include <fcntl.h> #include <time.h> int main ( void ) { for ( int cnt = 1 ; cnt <= 10 ; cnt++) { time_t t = time ( NULL ); struct tm *lt = localtime (&t); char ",
"u": "05.html",
"id": "sec-5"
},
{
"t": "5. 时间编程",
"sec": "（六）延时与计时",
"x": "函数 精度 可被信号中断 说明 sleep(n) 秒 是，返回剩余秒数 最常用 usleep(us) 微秒 是 已废弃 nanosleep(&req, &rem) 纳秒 是， rem 给出剩余 推荐，精度最高 clock_gettime(CLOCK_MONOTONIC, &ts) 纳秒 否 测耗时 必须 用它 扩展 · 为什么测耗时不能用 time() ： time() 的分辨率是 1 秒，且会被系统对时（NTP）向前或向后调整。 CL",
"u": "05.html",
"id": "sec-6"
},
{
"t": "6. 目录操作",
"sec": "（一）三步流程",
"x": "#include <sys/types.h> #include <dirent.h> DIR *dir = opendir (path); /* 1. 打开 */ if (dir == NULL ) { perror ( \"opendir\" ); return - 1 ; } struct dirent *entry; while ((entry = readdir (dir)) != NULL ) { /* 2. 循环读取 */ pr",
"u": "06.html",
"id": "sec-1"
},
{
"t": "6. 目录操作",
"sec": "（二）struct dirent 的字段",
"x": "struct dirent { ino_t d_ino; /* inode 号 */ off_t d_off; /* 目录项偏移，一般不用 */ unsigned short d_reclen; /* 本记录长度 */ unsigned char d_type; /* 文件类型，部分文件系统不支持 */ char d_name[ 256 ]; /* 文件名，以 \\0 结尾 */ }; d_name 只有文件名， 不含路径 。要拿属性必须",
"u": "06.html",
"id": "sec-2"
},
{
"t": "6. 目录操作",
"sec": "（三）目录自身的增删改查",
"x": "函数 原型 说明 mkdir int mkdir(const char *path, mode_t mode) 创建目录，权限受 umask 影响 rmdir int rmdir(const char *path) 只能删空目录 chdir int chdir(const char *path) 切换当前工作目录 getcwd char *getcwd(char *buf, size_t size) 取绝对路径， buf 为 NULL ",
"u": "06.html",
"id": "sec-3"
},
{
"t": "6. 目录操作",
"sec": "（四）递归遍历的正确写法",
"x": "void walk ( const char *path, int depth) { DIR *dir = opendir (path); if (!dir) { perror (path); return ; } struct dirent *e; while ((e = readdir (dir)) != NULL ) { if (! strcmp (e->d_name, \".\" ) || ! strcmp (e->d_name, ",
"u": "06.html",
"id": "sec-4"
},
{
"t": "7. 文件属性：stat 家族与 ls -li 的实现",
"sec": "（一）三个函数的分工",
"x": "#include <sys/types.h> #include <sys/stat.h> #include <unistd.h> int stat ( const char *pathname, struct stat *buf); /* 跟随符号链接 */ int lstat ( const char *pathname, struct stat *buf); /* 不跟随，取链接自身 */ int fstat ( int fd, s",
"u": "07.html",
"id": "sec-1"
},
{
"t": "7. 文件属性：stat 家族与 ls -li 的实现",
"sec": "（二）struct stat 关键字段",
"x": "字段 类型 含义 st_dev dev_t 所在设备号 st_ino ino_t inode 号，同一文件系统内唯一 st_mode mode_t 文件类型 + 权限 ，核心字段 st_nlink nlink_t 硬链接数 st_uid / st_gid uid_t / gid_t 属主 / 属组 st_rdev dev_t 设备文件的主次设备号 st_size off_t 文件大小（字节）；目录的大小是目录项占用 st_blksize",
"u": "07.html",
"id": "sec-2"
},
{
"t": "7. 文件属性：stat 家族与 ls -li 的实现",
"sec": "（三）st_mode 的位布局",
"x": "st_mode 是 16 位，高 4 位是文件类型，低 12 位是权限（含三位特殊权限）： 15 14 13 12 | 11 10 9 | 8 7 6 | 5 4 3 | 2 1 0 [ 文件类型 ] [ 特殊位 ] [ 属主 ] [ 属组 ] [ 其他 ] S U S G S T r w x r w x r w x 文件类型取值（八进制）： 宏 值 字符 类型 S_IFREG 0100000 - 普通文件 S_IFDIR 004000",
"u": "07.html",
"id": "sec-3"
},
{
"t": "7. 文件属性：stat 家族与 ls -li 的实现",
"sec": "（四）实现 ls -li",
"x": "#include <stdio.h> #include <string.h> #include <stdlib.h> #include <unistd.h> #include <dirent.h> #include <time.h> #include <sys/stat.h> #include <sys/types.h> static char type_char (mode_t m) { if ( S_ISREG (m)) retur",
"u": "07.html",
"id": "sec-4"
},
{
"t": "7. 文件属性：stat 家族与 ls -li 的实现",
"sec": "（五）硬链接与符号链接",
"x": "对比项 硬链接 符号链接 本质 同一 inode 的新目录项 独立文件，内容是目标路径 inode 与源文件相同 与源文件不同 st_nlink 增加 不变 跨文件系统 不允许 允许 链接目录 不允许（普通用户） 允许 源文件删除 数据仍在，链接仍可用 变成断链（dangling） ls -l 显示 普通文件 l 类型 + -> 目标 ln src.txt hard.txt # 硬链接 ln -s src.txt soft.txt # ",
"u": "07.html",
"id": "sec-5"
},
{
"t": "8. 进程：概念、状态与管理",
"sec": "（一）程序、进程、线程",
"x": "概念 存放位置 是否占 CPU 是否独立地址空间 一句话 代码（源文件） 磁盘 否 — 文本文件，人写的 程序（可执行文件） 磁盘 否 — 编译产物，机器码 进程 内存 是（被调度） 是 程序的一次执行 线程 内存 是（被调度） 否（共享进程空间） 进程内的执行流 「12+256 GB」指的是 12 GB 内存 + 256 GB 存储，这是手机语境；PC 上是「16 GB 内存条 + 512 GB 磁盘」。进程占的是 内存 ，程序占的是",
"u": "08.html",
"id": "sec-1"
},
{
"t": "8. 进程：概念、状态与管理",
"sec": "（二）进程的资源空间",
"x": "每个进程都有独立的虚拟地址空间，布局与 C 语言的五大区一一对应： 高地址 ┌──────────────┐ │ 内核空间 │ 用户态不可访问 ├──────────────┤ │ 栈 stack │ 局部变量、函数调用帧，向低地址生长 ├──────────────┤ │ ↓ │ │ ↑ │ │ 堆 heap │ malloc/new，向高地址生长 ├──────────────┤ │ .bss │ 未初始化全局/静态变量（清零） ├",
"u": "08.html",
"id": "sec-2"
},
{
"t": "8. 进程：概念、状态与管理",
"sec": "（三）进程的三个状态与扩展五态",
"x": "教材给的是最基础的三态模型： 状态 含义 触发转换 执行态（Running） 正占用 CPU 时间片用完 → 就绪；等待 I/O → 阻塞 就绪态（Ready） 万事俱备，只差 CPU 被调度 → 执行 等待态（Blocked） 等 I/O 或事件 事件到达 → 就绪 工程上更常用五态模型，多出的两个是 新建 （fork 完成但未就绪）与 终止 （已退出但未被回收，即僵尸）。 ps -aux 的 STAT 列能看到更细的标记： 标记 含",
"u": "08.html",
"id": "sec-3"
},
{
"t": "8. 进程：概念、状态与管理",
"sec": "（四）查看与管理进程",
"x": "命令 侧重点 ps -ef 全量进程，看 PID / PPID / 启动命令 ps -aux 全量进程，看 %CPU / %MEM / STAT `ps -ef \\ grep xxx` 按名字过滤 top 动态刷新，看实时资源占用 pstree -p 树状展示父子关系 kill -9 PID 强杀（ SIGKILL ，不可捕获） kill -15 PID 请求退出（ SIGTERM ，可捕获做清理） ps -ef 的关键两列： PID ",
"u": "08.html",
"id": "sec-4"
},
{
"t": "8. 进程：概念、状态与管理",
"sec": "（五）0 号、1 号与两类异常进程",
"x": "名称 说明 0 号进程（swapper） 内核引导阶段创建，负责进程调度，用户态不可见 1 号进程（init / systemd） 所有用户态进程的祖先，负责收养孤儿 孤儿进程 父进程先退出，子进程被 1 号（或 systemd --user 、桌面会话进程）收养 僵尸进程 子进程已退出，父进程未 wait ，只剩一个 task 结构占着 PID 孤儿进程无害 ：它被收养后正常执行、正常退出，只是 PPID 变成了 1。 僵尸进程有害 ",
"u": "08.html",
"id": "sec-5"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（一）fork：一次调用，两次返回",
"x": "#include <sys/types.h> #include <unistd.h> pid_t fork ( void ); 返回值 所在进程 含义 > 0 父进程 返回 子进程的 PID == 0 子进程 表示「我是子进程」 < 0 父进程 创建失败， errno 说明原因 pid_t pid = fork (); if (pid < 0 ) { perror ( \"fork\" ); /* EAGAIN：进程数超限；ENOMEM：内",
"u": "09.html",
"id": "sec-1"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（二）经典题型：三次 fork 打印几次",
"x": "fork (); fork (); fork (); printf ( \"hello world\\n\" ); 结论：8 个进程，8 次输出，7 个子进程。 推导：每次 fork 让当前进程数翻倍。1 → 2 → 4 → 8。每个进程都执行到 printf ，所以 8 次。 进程树（父 → 子）： P ├── C1 (第 1 次 fork) │ ├── C1-1 (第 2 次) │ │ ├── C1-1-1 (第 3 次) │ │ └──",
"u": "09.html",
"id": "sec-2"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（三）比「打印几次」更隐蔽的坑：缓冲区复制",
"x": "把 printf 挪到 fork 之前 ，且输出重定向到文件，结果会变化： printf ( \"hello world\\n\" ); /* 重定向到文件 → 全缓冲，内容留在用户态缓冲区 */ fork (); 此时 2 个进程 各自持有一份被复制的缓冲区 ，退出时各刷一次，文件里出现 2 行。三次 fork 就是 8 行——恰好和上一节结果相同，容易让人误以为「没问题」。真正的差别在 不加 \\n 的情形： printf ( \"hello",
"u": "09.html",
"id": "sec-3"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（四）wait 与 waitpid：回收与同步",
"x": "#include <sys/types.h> #include <sys/wait.h> pid_t wait ( int *wstatus); pid_t waitpid (pid_t pid, int *wstatus, int options); 参数 取值 含义 pid -1 等待任意子进程 > 0 等待指定 PID 0 等待同进程组的任意子进程 < -1 等待进程组 ID 为 -pid 的任意子进程 options 0 阻塞式",
"u": "09.html",
"id": "sec-4"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（五）exit 与 _exit：缓冲区是否清理",
"x": "函数 头文件 刷 stdio 缓冲 执行 atexit 回调 关闭 fd exit(status) <stdlib.h> 是 是 是 _exit(status) <unistd.h> 否 否 是 return from main — 是（等价 exit ） 是 是 _exit 用于 fork 出的子进程：子进程继承了父进程的缓冲区副本，若用 exit 会把这份副本也刷出去，造成重复输出。 子进程退出一律用 _exit （或 exit 前",
"u": "09.html",
"id": "sec-5"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（六）atexit：退出前的收尾",
"x": "#include <stdlib.h> int atexit ( void (*function)( void )); 注册的函数在进程 正常退出 时按 逆序 （后注册先执行）调用。 SIGKILL 杀掉、 _exit 退出都不会触发。 void cleanup ( void ) { printf ( \"清理资源\\n\" ); } int main ( void ) { atexit (cleanup); return 0 ; } 扩展 ",
"u": "09.html",
"id": "sec-6"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（七）vfork：共享地址空间的危险版本",
"x": "pid_t vfork ( void ); 对比项 fork vfork 地址空间 复制（COW） 共享父进程的 执行顺序 不确定 子进程先运行，父进程阻塞 开销 有页表复制 几乎为零 安全性 安全 危险 ：子进程改任何变量都会影响父进程 vfork 的子进程若用 return 返回 main ，会破坏父进程的栈帧，表现为「段错误（核心已转储）」。两种正确收尾： 子进程中调用 exit(0) / _exit(0) 结束； 子进程中调用 ",
"u": "09.html",
"id": "sec-7"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（八）exec 函数族：换掉自己的躯壳",
"x": "exec 不创建新进程，而是用新程序 覆盖 当前进程的代码段、数据段、堆栈，PID 不变。 函数 参数形式 是否搜 PATH 是否传环境变量 execl 列表 (path, arg0, arg1, ..., NULL) 否（要绝对路径） 继承 execv 数组 (path, argv[]) 否 继承 execlp 列表 是 继承 execvp 数组 是 继承 execle 列表 否 显式传入 envp execve 数组 否 显式传入 ",
"u": "09.html",
"id": "sec-8"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（九）system：一行调用 Shell",
"x": "#include <stdlib.h> int system ( const char *command); 内部实现就是 fork + execl(\"/bin/sh\", \"sh\", \"-c\", command, NULL) + waitpid 。返回值需要 WIFEXITED / WEXITSTATUS 解析； command 为 NULL 时返回非 0 表示 Shell 可用。 int ret = system ( \"mpg123 ",
"u": "09.html",
"id": "sec-9"
},
{
"t": "9. 进程控制：fork、wait、exit、exec",
"sec": "（十）glob：按通配符找文件",
"x": "#include <glob.h> int glob ( const char *pattern, int flags, int (*errfunc)( const char *epath, int eerrno), glob_t *pglob); void globfree (glob_t *pglob); typedef struct { size_t gl_pathc; /* 匹配到的个数 */ char **gl_pathv; ",
"u": "09.html",
"id": "sec-10"
},
{
"t": "10. 信号",
"sec": "（一）信号与中断的关系",
"x": "对比项 硬件中断 信号 发起者 外设 / CPU 异常 内核、其他进程、终端 作用对象 CPU 进程 响应方式 跳转中断服务程序 跳转信号处理函数 是否可屏蔽 可（关中断） 可（阻塞信号） 上下文 内核态 用户态（处理函数在用户态执行） 所以信号常被称作「软中断」：机制同构，但完全由软件触发。",
"u": "10.html",
"id": "sec-1"
},
{
"t": "10. 信号",
"sec": "（二）62 个信号的编号规则",
"x": "Linux 共有 62 个信号，编号不连续： 区间 数量 来源 特点 1–31 31 继承自 Unix 传统信号 编号固定，含义标准化 32–33 2 内核内部保留（ SIGCANCEL / SIGSETXID ，NPTL 使用） 用户不可用 34–64 31 Linux 实时信号（ SIGRTMIN ~ SIGRTMAX ） 支持排队，不丢失 教材说的「前 31 个 + 后 31 个」即 1–31 与 34–64，中间的 32、33 ",
"u": "10.html",
"id": "sec-2"
},
{
"t": "10. 信号",
"sec": "（三）必须记住的信号",
"x": "编号 名称 默认动作 触发方式 / 含义 1 SIGHUP 终止 终端挂断；守护进程常约定为重载配置 2 SIGINT 终止 Ctrl+C 3 SIGQUIT 终止 + core Ctrl+\\\\ 6 SIGABRT 终止 + core abort() 9 SIGKILL 终止 不可捕获、不可忽略 11 SIGSEGV 终止 + core 段错误（空指针、越界） 13 SIGPIPE 终止 向已关闭的管道/套接字写 14 SIGALRM ",
"u": "10.html",
"id": "sec-3"
},
{
"t": "10. 信号",
"sec": "（四）发送信号：kill 与 raise",
"x": "#include <signal.h> int kill (pid_t pid, int sig); /* 成功 0，失败 -1 */ int raise ( int sig); /* 自己给自己发，成功 0 */ kill 的 pid 取值有四种语义： pid 含义 > 0 发给指定进程 == 0 发给 同进程组 的所有进程 == -1 发给所有有权限的进程（除 1 号） < -1 发给进程组 ID 为 -pid 的所有进程 命令行对",
"u": "10.html",
"id": "sec-4"
},
{
"t": "10. 信号",
"sec": "（五）捕获信号：signal",
"x": "#include <signal.h> typedef void (*sighandler_t)( int ); sighandler_t signal ( int signum, sighandler_t handler); handler 三种取值： 取值 含义 SIG_DFL 恢复默认动作 SIG_IGN 忽略该信号（9、19 除外） 自定义函数名 捕获并执行该函数 自定义处理函数的签名固定为 void func(int sig)",
"u": "10.html",
"id": "sec-5"
},
{
"t": "10. 信号",
"sec": "（六）SIGCHLD：异步回收子进程",
"x": "子进程退出、暂停、继续都会给父进程发 SIGCHLD （17）。这是「父进程不用 wait 阻塞也能知道子进程结束」的机制。 void on_child ( int sig) { int st; pid_t pid; while ((pid = waitpid (- 1 , &st, WNOHANG)) > 0 ) { printf ( \"子进程 %d 结束\\n\" , pid); } } int main ( void ) { sign",
"u": "10.html",
"id": "sec-6"
},
{
"t": "10. 信号",
"sec": "（七）signal 与 sigaction",
"x": "signal 在不同 Unix 上的语义不一致（是否自动重置、是否阻塞自身），POSIX 推荐用 sigaction ： #include <signal.h> struct sigaction sa = { 0 }; sa.sa_handler = on_child; sigemptyset (&sa.sa_mask); sa.sa_flags = SA_RESTART | SA_NOCLDSTOP; /* 自动重启被中断的系统调用 ",
"u": "10.html",
"id": "sec-7"
},
{
"t": "10. 信号",
"sec": "（八）完整案例：键盘控制子进程",
"x": "#include <stdio.h> #include <stdlib.h> #include <unistd.h> #include <signal.h> #include <sys/wait.h> void on_chld ( int sig) { waitpid (- 1 , NULL , WNOHANG); } int main ( void ) { signal (SIGCHLD, on_chld); pid_t pid = ",
"u": "10.html",
"id": "sec-8"
},
{
"t": "11. LVGL：嵌入式图形界面",
"sec": "（一）定位与取舍",
"x": "对比项 LVGL Qt 语言 C C++ 最小内存 几十 KB 级 几十 MB 级 运行环境 裸机 / RTOS / Linux 需要完整 OS 渲染 软件绘制为主 可硬件加速 适用 MCU、资源受限设备 应用处理器、桌面 课程的原话是「Qt → C++，驱动阶段」，意思是：先把驱动层打通，再用 LVGL 快速搭界面，两者是不同层次的工具，不是替代关系。 LVGL 的五个特点： 轻量 （资源受限可用）、 跨平台 （裸机到 Linux）、",
"u": "11.html",
"id": "sec-1"
},
{
"t": "11. LVGL：嵌入式图形界面",
"sec": "（二）环境安装",
"x": "# 1. 安装 SDL2，模拟器用它开一个窗口当屏幕 sudo apt-get update sudo apt-get install libsdl2-dev # 2. 安装 GUI Guider（可视化设计器） sudo dpkg -i Gui-Guider-Setup-1.2.1-GA.deb # 3. 若报依赖缺失，自动补齐后重装 sudo apt-get install -f sudo dpkg -i Gui-Guider-Se",
"u": "11.html",
"id": "sec-2"
},
{
"t": "11. LVGL：嵌入式图形界面",
"sec": "（三）GUI Guider 的工作流",
"x": "设计界面 → 设置中文字体 / 放置图片 → 添加事件 → 生成代码 → 编译运行 → 移植到目标板 关键区别： 生成代码（Generate Code） ：把界面导出成一个完整工程，包含 main.c 、 Makefile 、 lvgl 源码、生成的界面代码。 运行模拟器（Simulator） ：只做预览，不产出可移植代码。",
"u": "11.html",
"id": "sec-3"
},
{
"t": "11. LVGL：嵌入式图形界面",
"sec": "（四）生成工程的结构",
"x": "路径 内容 是否可改 lvgl-simulator/ main.c 、 Makefile ，编译产物在 build/bin/ 可改 （主入口） custom/ 用户自己的 .c / .h 可改 （业务逻辑放这里） generated/ 图片字模、汉字字模、 events_init.c （事件代码）、 setup_scr_screen.c （界面布局） 一般不改，重新生成会覆盖 lvgl/ LVGL 图形库源码 不改 铁律：业务代码写 c",
"u": "11.html",
"id": "sec-4"
},
{
"t": "11. LVGL：嵌入式图形界面",
"sec": "（五）两个核心函数",
"x": "/* 设置 label 的文本 */ void lv_label_set_text (lv_obj_t *label, const char *text); lv_label_set_text (guider_ui.screen_label_year, \"2026-11-23\" ); 第二个参数是 const char * ，传入的字符串会被 LVGL 复制（ lv_label_set_text 内部 strdup ），所以传栈上局部数",
"u": "11.html",
"id": "sec-5"
},
{
"t": "11. LVGL：嵌入式图形界面",
"sec": "（六）事件：界面的「信号」",
"x": "LVGL 的事件模型与信号同构：控件产生事件 → 回调函数处理。 static void btn_event_cb (lv_event_t *e) { lv_event_code_t code = lv_event_get_code (e); if (code == LV_EVENT_CLICKED) { /* 处理点击 */ } } lv_obj_add_event_cb (btn, btn_event_cb, LV_EVENT_CL",
"u": "11.html",
"id": "sec-6"
},
{
"t": "11. LVGL：嵌入式图形界面",
"sec": "（七）线程显示时间",
"x": "界面要实时刷新时钟，就必须有一个「定时改 label」的执行流。课程用 pthread 实现： #include <pthread.h> static void * time_thread ( void *arg) { while ( 1 ) { time_t t = time ( NULL ); struct tm tm_buf; localtime_r (&t, &tm_buf); char buf[ 32 ]; strftime ",
"u": "11.html",
"id": "sec-7"
},
{
"t": "11. LVGL：嵌入式图形界面",
"sec": "（八）移植中文字库",
"x": "LVGL 内置字库只有 ASCII，显示汉字要自己做字模： 在 Windows 的 C:\\Windows\\Fonts 里复制一个中文字体（如 simhei.ttf ）到桌面； 打开 LVGL 字库转换工具（GUI Guider 自带或在线 Font Converter）； 选择字体文件，加入常用汉字（或整段 GB2312 一级字库），设置字号与位深（1/2/4/8 bpp）； 点击转换，得到 myfont.c ； 把 myfont.c ",
"u": "11.html",
"id": "sec-8"
},
{
"t": "11. LVGL：嵌入式图形界面",
"sec": "（九）LVGL 的移植三要素",
"x": "任何平台跑 LVGL，都只需补齐三个钩子： 要素 注册函数 作用 显示 lv_disp_drv_register + flush_cb 把 LVGL 画好的像素刷到屏幕 输入 lv_indev_drv_register + read_cb 上报触摸/按键/编码器 心跳 lv_tick_inc(ms) 或 lv_tick_set_cb 提供毫秒时基，驱动动画与定时器 主循环的标准形态： while ( 1 ) { lv_timer_han",
"u": "11.html",
"id": "sec-9"
},
{
"t": "12. 综合项目：MP3 播放器与复盘",
"sec": "（一）需求拆解",
"x": "功能 无界面版 LVGL 版 依赖的技术 获取歌单 glob(\"*.mp3\") 同左，结果存入数组 第 9 章 glob 播放 fork + execlp(\"mpg123\", ...) 同左，封装成函数 第 9 章 exec 暂停 kill(pid, SIGSTOP) 按钮事件触发 第 10 章信号 继续 kill(pid, SIGCONT) 按钮事件触发 第 10 章信号 下一首 kill(pid, SIGKILL) + 重新 for",
"u": "12.html",
"id": "sec-1"
},
{
"t": "12. 综合项目：MP3 播放器与复盘",
"sec": "（二）架构：一个父进程 + 一个「可替换」的子进程",
"x": "┌──────────────────────────────┐ │ 父进程（菜单 / 界面 / 状态机） │ │ - 维护歌单与当前索引 │ │ - 维护 playing / paused 状态 │ │ - 接收按键或按钮事件 │ └───────────┬──────────────────┘ │ fork + exec ▼ ┌──────────────────────────────┐ │ 子进程：mpg123 song_n.m",
"u": "12.html",
"id": "sec-2"
},
{
"t": "12. 综合项目：MP3 播放器与复盘",
"sec": "（三）无界面版骨架",
"x": "#include <stdio.h> #include <stdlib.h> #include <string.h> #include <unistd.h> #include <signal.h> #include <glob.h> #include <sys/types.h> #include <sys/wait.h> static glob_t g_list; static int g_index = 0 ; static pid_",
"u": "12.html",
"id": "sec-3"
},
{
"t": "12. 综合项目：MP3 播放器与复盘",
"sec": "（四）LVGL 版的接法",
"x": "界面逻辑不变，只换输入与输出： static void on_play_pause (lv_event_t *e) { if ( lv_event_get_code (e) != LV_EVENT_CLICKED) return ; if (g_paused) { kill (g_pid, SIGCONT); g_paused = 0 ; lv_imgbtn_set_state (guider_ui.screen_imgbtn_stop",
"u": "12.html",
"id": "sec-4"
},
{
"t": "12. 综合项目：MP3 播放器与复盘",
"sec": "（五）状态机：把边界情况穷举掉",
"x": "当前状态 事件 动作 新状态 播放中 暂停 SIGSTOP 已暂停 播放中 下一首 SIGKILL + waitpid + fork 播放中（新歌） 已暂停 继续 SIGCONT 播放中 已暂停 下一首 SIGKILL + fork 播放中（新歌） 播放中 自然结束 SIGCHLD 回收 空闲 （需决定是否自动下一首） 任意 退出 SIGKILL + globfree + 恢复终端 结束 「自然结束」这一格是作业里最容易漏的：不处理就会",
"u": "12.html",
"id": "sec-5"
},
{
"t": "12. 综合项目：MP3 播放器与复盘",
"sec": "（六）我的易错点复盘",
"x": "下表可直接在页面上填写，内容只暂存在本机浏览器；Word 版可长期保存。 清空本页记录 日期 现象 根因 怎么改",
"u": "12.html",
"id": "sec-6"
},
{
"t": "12. 综合项目：MP3 播放器与复盘",
"sec": "（七）高频错误自查清单",
"x": "写完一屏代码，按这张表过一遍，能拦掉大部分低级错误： ☐ open 的 flags 含 O_CREAT 时，第三个 mode 参数写了吗？ ☐ read / write 的返回值用 ssize_t 接了吗？判断条件写成 > 0 而不是非零吗？ ☐ 循环读写是否处理了「短读/短写」？ ☐ strlen 与 sizeof 用对了吗（写字符串用前者，写结构体用后者）？ ☐ localtime / gmtime / readdir 返回的静态缓",
"u": "12.html",
"id": "sec-7"
},
{
"t": "12. 综合项目：MP3 播放器与复盘",
"sec": "（八）常见报错速查",
"x": "报错信息 阶段 根因 处理 undefined reference to 'xxx' 链接 函数只有声明没有实现，或没链接库 补 .c / 加 -lxxx multiple definition of 'xxx' 链接 变量或函数在头文件里定义，被多次包含 头文件改 extern ，定义收到一个 .c implicit declaration of function 'xxx' 编译 缺头文件 man 2 xxx 查所属头文件 cann",
"u": "12.html",
"id": "sec-8"
},
{
"t": "12. 综合项目：MP3 播放器与复盘",
"sec": "（九）命令与头文件速查",
"x": "任务 头文件 关键函数 缓冲文件 I/O <stdio.h> fopen fclose fread fwrite fseek ftell fflush 非缓冲文件 I/O <fcntl.h> <unistd.h> open close read write lseek 目录 <dirent.h> <sys/stat.h> opendir readdir closedir mkdir rmdir chdir getcwd 文件属性 <sy",
"u": "12.html",
"id": "sec-9"
},
{
"t": "附录 · 使用说明",
"sec": "（一）这份笔记和原始 PDF 的关系",
"x": "本笔记以五份课程 PDF 为骨架，做了三件事： 归并同构知识 （把 open/opendir/fork 归到「句柄 + 三步骤」的统一模式）、 补全边界情况 （短读短写、 EINTR 、信号丢失、 ctime 语义纠正）、 补上工程闭环 （每章给出可独立运行的完整代码与验收标准）。 原始 PDF 对应章节 补充了什么 3. 文件操作和时间编程 第 2–5 章 Makefile 完整规则、 umask 运算过程、短读短写循环、 local",
"u": "appendix.html",
"id": "sec-1"
},
{
"t": "附录 · 使用说明",
"sec": "（二）三种形态怎么用",
"x": "形态 位置 适合 网页版 docs/index.html 全文搜索、随时查阅、亮暗模式 Word 版 notes/ 打印、写批注、长期维护复盘表 Markdown 源 src/ 唯一内容源，改完重新生成两端 在线浏览 ：仓库开启 Pages 后访问 https://<用户名>.github.io/<仓库名>/ 。开启方法： Settings → Pages → Source 选 Deploy from a branch ，Branch ",
"u": "appendix.html",
"id": "sec-2"
},
{
"t": "附录 · 使用说明",
"sec": "（三）内容维护约定",
"x": "只改 src/ 下的 Markdown 。 docs/ 与 notes/ 是生成物，直接改会在下次生成时被覆盖。 新增一章：在 Markdown 里加一级标题 # N. 标题 ，小节用 ## （一）标题 ，重新生成即可。 代码块用围栏语法并标注语言（ c 、 make 、 bash 、 text ），站点会按 C 语法高亮。 表格用标准 Markdown 表格，生成时会包一层可横向滚动的容器，窄屏不挤压。 第十二章的复盘表在网页上填写只",
"u": "appendix.html",
"id": "sec-3"
},
{
"t": "附录 · 使用说明",
"sec": "（四）建议的学习顺序",
"x": "如果时间有限，按「能在机器上跑起来」的优先级排序： 第 4 章 （系统 I/O）—— 一切的基础， open/read/write/lseek 必须闭卷写出来。 第 9 章 （进程控制）—— fork + exec + wait 三件套，能写 Shell 就算过关。 第 10 章 （信号）—— 让程序可控， SIGCHLD 回收是工程必备。 第 5、6、7 章 （时间、目录、属性）—— 组合起来就是 ls 、 find 、日志系统。 第",
"u": "appendix.html",
"id": "sec-4"
},
{
"t": "附录 · 使用说明",
"sec": "（五）自测题",
"x": "能独立答出下面八题，说明这套内容真正掌握了： open(\"f\", O_WRONLY|O_CREAT, 0666) 在 umask=0022 下创建的文件权限是什么？为什么不是 666 ？ read 返回 0 与返回 -1 分别意味着什么？为什么不能用 while(read(...)) 判断？ 为什么 localtime 连续调用两次，第一次的结果会被覆盖？多线程下怎么改？ stat 与 lstat 的区别是什么？遍历目录时该用哪个，为什",
"u": "appendix.html",
"id": "sec-5"
}
];
