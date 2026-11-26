# 11. LVGL：嵌入式图形界面

LVGL（Light and Versatile Graphics Library）是一个纯 C 的嵌入式 GUI 库，用「对象树 + 样式 + 事件」三件套描述界面，能在裸机（无操作系统）或 RTOS/Linux 上运行。

## （一）定位与取舍

| 对比项 | LVGL | Qt |
|---|---|---|
| 语言 | C | C++ |
| 最小内存 | 几十 KB 级 | 几十 MB 级 |
| 运行环境 | 裸机 / RTOS / Linux | 需要完整 OS |
| 渲染 | 软件绘制为主 | 可硬件加速 |
| 适用 | MCU、资源受限设备 | 应用处理器、桌面 |

课程的原话是「Qt → C++，驱动阶段」，意思是：先把驱动层打通，再用 LVGL 快速搭界面，两者是不同层次的工具，不是替代关系。

LVGL 的五个特点：**轻量**（资源受限可用）、**跨平台**（裸机到 Linux）、**组件丰富**（按钮、图表、列表、滑块、图片按钮）、**支持多种显示接口**（单色、彩色 LCD/TFT）、**文档与示例完善**。

## （二）环境安装

```bash
# 1. 安装 SDL2，模拟器用它开一个窗口当屏幕
sudo apt-get update
sudo apt-get install libsdl2-dev

# 2. 安装 GUI Guider（可视化设计器）
sudo dpkg -i Gui-Guider-Setup-1.2.1-GA.deb

# 3. 若报依赖缺失，自动补齐后重装
sudo apt-get install -f
sudo dpkg -i Gui-Guider-Setup-1.2.1-GA.deb
```

> 易错点：`apt` 报「暂时不能解析域名」不是软件包问题，而是网络/DNS 问题。先 `ping baidu.com` 确认联网，再检查 `/etc/resolv.conf` 与软件源（换国内镜像）。

## （三）GUI Guider 的工作流

```
设计界面 → 设置中文字体 / 放置图片 → 添加事件 → 生成代码 → 编译运行 → 移植到目标板
```

关键区别：

- **生成代码（Generate Code）**：把界面导出成一个完整工程，包含 `main.c`、`Makefile`、`lvgl` 源码、生成的界面代码。
- **运行模拟器（Simulator）**：只做预览，不产出可移植代码。

## （四）生成工程的结构

| 路径 | 内容 | 是否可改 |
|---|---|---|
| `lvgl-simulator/` | `main.c`、`Makefile`，编译产物在 `build/bin/` | **可改**（主入口） |
| `custom/` | 用户自己的 `.c` / `.h` | **可改**（业务逻辑放这里） |
| `generated/` | 图片字模、汉字字模、`events_init.c`（事件代码）、`setup_scr_screen.c`（界面布局） | 一般不改，重新生成会覆盖 |
| `lvgl/` | LVGL 图形库源码 | 不改 |

> 铁律：业务代码写 `custom/`，界面代码交给 `generated/`。直接改 `generated/` 的文件，下次点「生成代码」就全丢了——这与本仓库 README 里「改 Markdown 不改生成物」是同一条原则。

## （五）两个核心函数

```c
/* 设置 label 的文本 */
void lv_label_set_text(lv_obj_t *label, const char *text);
```

```c
lv_label_set_text(guider_ui.screen_label_year, "2026-11-23");
```

第二个参数是 `const char *`，传入的字符串会被 LVGL 复制（`lv_label_set_text` 内部 `strdup`），所以传栈上局部数组是安全的。

```c
/* 设置图片按钮的状态 */
void lv_imgbtn_set_state(lv_obj_t *imgbtn, lv_btn_state_t state);
```

| 状态 | 显示图 |
|---|---|
| `LV_BTN_STATE_RELEASED` | 默认图（三角形 = 播放） |
| `LV_BTN_STATE_PRESSED` | 按下图 |
| `LV_BTN_STATE_CHECKED_RELEASED` | 选中默认图（双竖线 = 暂停） |
| `LV_BTN_STATE_CHECKED_PRESSED` | 选中按下图 |

```c
lv_imgbtn_set_state(guider_ui.screen_imgbtn_stop_or_start,
                    LV_BTN_STATE_CHECKED_RELEASED);
```

播放/暂停按钮的经典实现就是在这两个状态之间切换。注意 `lv_imgbtn` 默认**不会**自动切换选中态，必须手动 `lv_obj_add_state(obj, LV_STATE_CHECKED)` 或直接调 `lv_imgbtn_set_state`。

## （六）事件：界面的「信号」

LVGL 的事件模型与信号同构：控件产生事件 → 回调函数处理。

```c
static void btn_event_cb(lv_event_t *e)
{
    lv_event_code_t code = lv_event_get_code(e);
    if (code == LV_EVENT_CLICKED) {
        /* 处理点击 */
    }
}
lv_obj_add_event_cb(btn, btn_event_cb, LV_EVENT_CLICKED, NULL);
```

常用事件码：`LV_EVENT_CLICKED`、`LV_EVENT_PRESSED`、`LV_EVENT_RELEASED`、`LV_EVENT_VALUE_CHANGED`（滑块/开关）、`LV_EVENT_LONG_PRESSED`。

## （七）线程显示时间

界面要实时刷新时钟，就必须有一个「定时改 label」的执行流。课程用 `pthread` 实现：

```c
#include <pthread.h>

static void *time_thread(void *arg)
{
    while (1) {
        time_t t = time(NULL);
        struct tm tm_buf;
        localtime_r(&t, &tm_buf);
        char buf[32];
        strftime(buf, sizeof(buf), "%F %T", &tm_buf);
        lv_label_set_text(guider_ui.screen_label_time, buf);
        sleep(1);
    }
    return NULL;
}

int main(void)
{
    /* ... lv_init 与界面初始化 ... */
    pthread_t tid;
    pthread_create(&tid, NULL, time_thread, NULL);
    /* ... 主循环 ... */
}
```

Makefile 必须链接线程库：

```make
CFLAGS  += -pthread
LDFLAGS += -pthread
```

> 严重易错点：LVGL **不是线程安全的**。在子线程里直接调 `lv_label_set_text` 属于未定义行为——可能与主线程的 `lv_timer_handler` 同时操作对象树，导致内存破坏。正确做法二选一：
> 1. 加互斥锁，且主循环调 `lv_timer_handler` 时也持同一把锁；
> 2. 用 `lv_async_call(fn, param)` 把「改界面」的动作投递回 LVGL 主线程执行。
>
> 课程版本能跑通，是因为刷新频率低、竞争窗口小，属于「运气好」，不是正确性证明。

## （八）移植中文字库

LVGL 内置字库只有 ASCII，显示汉字要自己做字模：

1. 在 Windows 的 `C:\Windows\Fonts` 里复制一个中文字体（如 `simhei.ttf`）到桌面；
2. 打开 LVGL 字库转换工具（GUI Guider 自带或在线 Font Converter）；
3. 选择字体文件，加入常用汉字（或整段 GB2312 一级字库），设置字号与位深（1/2/4/8 bpp）；
4. 点击转换，得到 `myfont.c`；
5. 把 `myfont.c` 复制进工程（`custom/` 或 `generated/`），在 `main.c` 里 `LV_FONT_DECLARE(myfont)`；
6. 把 label 的字体设为 `&myfont`：`lv_obj_set_style_text_font(label, &myfont, 0);`；
7. 重新编译。

> 扩展 · 字库取舍：8 bpp 抗锯齿好但占空间（一个汉字约 16×16×1 字节 = 32 字节 @1bpp，8bpp 则是 256 字节）。整段 GB2312（6763 字）@16px/1bpp 约 216 KB，@8bpp 约 1.7 MB。MCU 上通常只取「常用 500 字 + 动态拼接」，或用 `lv_font_conv` 按需裁剪。

## （九）LVGL 的移植三要素

任何平台跑 LVGL，都只需补齐三个钩子：

| 要素 | 注册函数 | 作用 |
|---|---|---|
| 显示 | `lv_disp_drv_register` + `flush_cb` | 把 LVGL 画好的像素刷到屏幕 |
| 输入 | `lv_indev_drv_register` + `read_cb` | 上报触摸/按键/编码器 |
| 心跳 | `lv_tick_inc(ms)` 或 `lv_tick_set_cb` | 提供毫秒时基，驱动动画与定时器 |

主循环的标准形态：

```c
while (1) {
    lv_timer_handler();   /* 处理定时器、动画、重绘，建议 5ms 一次 */
    usleep(5000);
}
```

> 扩展 · 性能要点：`flush_cb` 里尽量用 DMA 传输并开双缓冲，让 CPU 在传输时继续渲染；`LV_MEM_SIZE` 按界面复杂度调（默认 48 KB 常不够）；避免每帧重建对象，只改属性；图片用 `LV_IMG_CF_TRUE_COLOR` 而非运行时解码 PNG，能省掉解码开销。
