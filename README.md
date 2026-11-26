# 学习笔记知识库 · C 语言 / Linux 系统编程

两门课的学习笔记收在同一个仓库里，共用一套站点骨架（Quartz v5 风格：三栏布局、全文搜索、亮暗模式）：

| 子站 | 内容 | 入口 |
|---|---|---|
| **C 语言知识库** | 12 章主干 + 1 章复盘模板 + 50 个小节 + 10 张图解：编译流程、类型与指针、结构体对齐、动态内存、文件操作、多文件工程 | `docs/index.html` |
| **Linux 系统编程与 LVGL** | 12 章正文 + 83 个小节 + 45 张对照表：Makefile、标准/系统 I/O、时间、目录与文件属性、进程、信号、LVGL、MP3 播放器项目 | `docs/linux/index.html` |

两份笔记都是三种形态：**网页版**（在线浏览 / 全文搜索 / 亮暗模式）、**Word 版**（可编辑、可打印、留了复盘填写区）、**Markdown 源文件**（内容源，改动后重新生成两端）。

在线地址（GitHub Pages，仓库 `meandyouwe/me--Study-Progress`，Pages 源为 `main` / `/docs`）：

- C 语言：`https://meandyouwe.github.io/me--Study-Progress/`
- Linux：`https://meandyouwe.github.io/me--Study-Progress/linux/`

两站左侧目录底部都有互跳入口，不必回首页。

## 目录结构

```
.
├── docs/                                网页版（GitHub Pages 站点根）
│   ├── index.html                       C 语言 · 知识导航首页
│   ├── 01.html … 12.html                C 语言 · 逐章页面
│   ├── appendix.html                    C 语言 · 附录 · 使用说明
│   ├── assets/                          样式、交互脚本、C 站搜索索引、10 张插图
│   └── linux/                           Linux 子站
│       ├── index.html                   课程导航首页
│       ├── 01.html … 12.html            逐章页面
│       ├── appendix.html                附录 · 使用说明
│       └── assets/                      Linux 站独立搜索索引（样式与脚本复用 ../assets/）
├── src/
│   ├── C语言知识总结与易错点复盘.md       C 语言内容源
│   ├── images/                          C 语言插图源文件（10 张）
│   └── linux/                           Linux 内容源（13 个文件：01–12 + appendix）
├── notes/
│   ├── C语言知识总结与易错点复盘.docx      C 语言 Word 版（封面 + 目录 + 正文 + 插图）
│   └── linux/
│       └── Linux系统编程与LVGL知识总结.docx  Linux Word 版（封面 + 目录域 + 正文 + 复盘表）
├── tools/                               两端构建脚本（Python）
│   ├── build_linux_site.py              Markdown → docs/linux/ 静态站
│   └── build_linux_docx.py              Markdown → notes/linux/*.docx
└── .github/workflows/
    └── build-linux-notes.yml            推送到 main 时自动重建 Linux 两端并回写
```

## C 语言知识库

| 章节 | 主题 | 章节 | 主题 |
|---|---|---|---|
| 一 | 程序结构与编译执行流程 | 七 | 指针 |
| 二 | 数据类型与变量（含内存分区） | 八 | 结构体、共用体、枚举与 typedef |
| 三 | 运算符与表达式 | 九 | 动态内存管理 |
| 四 | 控制流 | 十 | 文件操作 |
| 五 | 函数（返回值纪律、回调函数） | 十一 | 预处理与多文件工程 |
| 六 | 数组与字符串 | 十二 | 我的易错点复盘（错题表 + 自查清单 + 报错速查） |

踩坑后专门补的几处：

- **二（五）程序的内存分区**：代码段 / 常量区 / `.data` / `.bss` / 栈 / 堆的读写属性与生命周期，解释为什么改字符串字面量会崩。
- **五（二）返回值的纪律**：函数别用 `void` 收尾、别靠副作用带结果，入参加 `const` 保持输入不被破坏。
- **八（二）内存对齐三步法**：先找对齐值 → 逐成员排 → 整体补齐，并给出成员顺序不同导致 `sizeof` 差 4 字节的完整偏移表。
- **八（三）共用体**：大小不等于最大成员，要向上取整到对齐值（`char[5] + int` 是 8 不是 5）。

## Linux 系统编程与 LVGL

| 章节 | 主题 | 章节 | 主题 |
|---|---|---|---|
| 一 | 课程地图：从系统编程到图形界面 | 七 | 文件属性：stat 家族与 ls -li 的实现 |
| 二 | 工程组织：Makefile 与静态库、动态库 | 八 | 进程：概念、状态与管理 |
| 三 | 标准 I/O：缓冲文件操作 | 九 | 进程控制：fork、wait、exit、exec |
| 四 | 系统 I/O：文件描述符与非缓冲操作 | 十 | 信号 |
| 五 | 时间编程 | 十一 | LVGL：嵌入式图形界面 |
| 六 | 目录操作 | 十二 | 综合项目：MP3 播放器与复盘 |

踩坑后专门补的几处：

- **二（三）动态库的加载路径**：`-fPIC` 为什么必加、`LD_LIBRARY_PATH` / `rpath` / `ldconfig` 三种解法的取舍、`ldd` 与 `nm -D` 的排查用法。
- **四（四）短读与短写**：`read` 返回小于请求字节数是合法行为，循环必须写到 `off == n`，否则大文件拷贝会静默丢字节。
- **五（三）localtime 的静态缓冲区**：连续两次调用会互相覆盖，多线程必须换 `localtime_r`；顺带给出 `CLOCK_MONOTONIC` 计时的正确写法。
- **七（二）st_ctime 不是创建时间**：Linux 上 `ctime` 是 inode 状态改变时间，取创建时间要 `statx` 的 `STATX_BTIME`。
- **九（三）fork 与缓冲区**：`printf` 放在 `fork` 之前会导致输出次数依赖缓冲类型，铁律是 `fork` 前先 `fflush`。
- **九（四）wstatus 的位编码**：`exit(1)` 对应的状态字是 256，必须用 `WEXITSTATUS` 解析。
- **十（六）SIGCHLD 会丢**：普通信号不排队，多个子进程同时退出只来一个信号，必须 `while (waitpid(-1, &st, WNOHANG) > 0)`。
- **十一（七）LVGL 不是线程安全的**：子线程直接改 label 属于未定义行为，正确做法是互斥锁或 `lv_async_call`。

## 浏览方式

**在线（推荐）**：仓库 **Settings → Pages → Source 选 `Deploy from a branch`，Branch 选 `main` / 目录选 `/docs`**，保存后等一两分钟，C 站在根路径、Linux 站在 `/linux/`，同一套 Pages 配置即可。

**本地**：直接双击 `docs/index.html`（C）或 `docs/linux/index.html`（Linux）。纯静态、无外部依赖、无需联网。搜索与亮暗切换都在浏览器本地运行（`Ctrl+K` 或 `/` 唤起搜索）。

Word 版直接用 Word / WPS 打开。目录是域，全选后按 `F9`（或右键「更新域」）即可生成带页码的目录；第十二章的复盘表 / 错题表单元格可直接编辑。

## 维护与构建

**Linux 子站是可再生的**：改 `src/linux/*.md`，然后

```bash
python tools/build_linux_site.py     # 重建 docs/linux/
python tools/build_linux_docx.py     # 重建 notes/linux/*.docx（需 pip install python-docx）
```

推到 `main` 且改动命中 `src/linux/**`、`tools/**` 或 workflow 时，`.github/workflows/build-linux-notes.yml` 会自动重建并回写生成物，无需本地跑。

**C 语言子站的生成器未纳入本仓库**：`docs/01–12.html`、`appendix.html`、`notes/*.docx` 是外部构建产物。改 C 的内容时，`src/C语言知识总结与易错点复盘.md` 与对应 HTML / docx 需要一起更新，否则源文件与站点会不一致。

**不要直接改 `docs/` 与 `notes/` 里的产物样式**：两边都从 `src/` 的 Markdown 生成，直接改生成物下次重建就丢。插图也不要直接粘进 Word，先把图片放进 `src/images/`（C）或 `src/linux/` 引用目录，再在 Markdown 里用 `![图注](…)` 引用。

`docs/assets/` 为两站共用（`docs/linux/` 只额外带一份独立的 `search-index.js`），不可拆分单独拷贝。

## 更新记录

**合并**

- **v1（合并版）**：把 Linux 系统编程子站并入 C 语言知识库，统一为「C 在根、Linux 在 `docs/linux/`」的单仓库结构；README 合并为双知识库总览；两站左侧目录互加跳转入口；补齐 `tools/` 与 Actions 自动重建链。

**C 语言**

- **v3**：补回 10 张插图与一批个人笔记（sizeof 是运算符、八进制/十六进制字符常量、浮点转整型截断、switch 贯穿的正用、排序算法速记、const 入参的三个好处、数组名与形参的关系、getmemory 例题、内存按字节编号）；新增「排序算法速记」「函数章问题小结」「getmemory 经典题」三节。
- **v2**：补充函数返回值纪律、回调函数、程序内存分区（常量区只读）、结构体内存对齐三步法、共用体对齐与大小、枚举取值范围；自查清单与报错速查各新增若干条目。小节数 43 → 47。
- **v1**：12 章主干 + 复盘模板的初版，Word 版与网页版同步生成。

**Linux 系统编程与 LVGL**

- **v1**：12 章正文 + 附录的初版。按「工程组织 → 文件 I/O → 时间与文件系统 → 进程与信号 → 图形界面」重排课程顺序，补齐 45 张对照表、20 余处易错点标注，Word 版与网页版同步生成。
