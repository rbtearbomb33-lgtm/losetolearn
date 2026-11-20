# 输局学习所（Lose to Study）V1.0

一个面向 iPhone 的 PWA：王者荣耀每输一局，增加 60 分钟学习债务。

## 规则
- 每次失败新增 60 分钟债务。
- 每个本地自然日累计最多新增 180 分钟债务（即使中途还清，也计入当日额度）。
- 有未偿还债务时，胜负登记按钮锁定；债务全部还清后才能登记下一局。
- 学习可暂停；暂停期间不扣时间。
- 每轮开始时最多偿还 60 分钟，若剩余债务不足 60 分钟，则按剩余债务计时。
- 正常完成一轮后扣除该轮债务。
- 手动结束一轮时，只按已完成的整分钟扣除债务；不足一分钟不计。
- 数据保存在当前浏览器的 localStorage，不上传服务器。

## 部署到 GitHub Pages
1. 在 GitHub 新建一个 Public repository，例如 `lose-to-study`。
2. 将本项目所有文件和 `icons` 文件夹上传到仓库根目录。
3. 打开仓库 `Settings` → `Pages`。
4. 在 `Build and deployment` 中选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/ (root)`，点击 Save。
6. 等待 GitHub Pages 部署完成，访问显示的 `https://你的用户名.github.io/lose-to-study/` 地址。

## 安装到 iPhone
1. 用 iPhone 的 Safari 打开 GitHub Pages 地址（不要用微信内置浏览器）。
2. 点底部「分享」按钮。
3. 选择「添加到主屏幕」。
4. 打开主屏幕上的「输局学习」图标即可。

## 重要说明
- iOS 可能会清理长期未使用的网站数据；请不要清理 Safari 网站数据。V1.0 没有云端备份或多设备同步。
- 计时不依赖后台持续运行：重新打开页面时会根据保存的结束时间校准。
- 浏览器无法强制阻止你打开王者荣耀；“还清债务才能登记下一局”是应用内规则。
- 每日债务按设备本地日期重置。跨午夜时，未偿还债务会在新的一天清零；进行中的学习计时会保留。若你希望债务跨天保留，需要在 V1.1 改成跨日累计规则。
- 建议首次使用时先用一笔测试债务检查流程。


## V1.2 段位与表现奖励
- 每局前可填写段位、大段位内的小段（一至五）和星数，例如「尊贵铂金 一 · 3星」。
- 有学习债务时也可以提前填写并确认段位，但仍不能登记新对局；债务清零后才能登记。
- 每局登记时可选择表现：顶级减免20分钟、金牌减免10分钟、银牌减免5分钟、铜牌不减免。
- 表现奖励只抵扣本局失败产生的60分钟惩罚；胜利没有学习债务，奖励不累积。
- 实际新增债务按扣除奖励后的分钟数计算，并计入每日180分钟上限。


## V1.3 视觉更新
- 采用 Apple 风格的浅色界面、系统字体、留白和细分隔线。
- 减少卡片描边、重复标签和说明文案；主要状态通过数字、图标和布局呈现。
- 保留 V1.2 的段位、星数、表现奖励、计时与本地存储逻辑。


## V1.3.1
- 隐藏债务状态、段位确认状态、专注状态和计时器顶部提示，保留核心数字与操作。


## V1.4 UI 更新
- 白底、黑灰文字、细线图标与更大的留白。
- 顶部加入低对比度单色网点海面动效；页面隐藏时暂停，系统开启减少动态效果时不播放。
- 移除品牌区中文标题和对局表现字段前的「本局表现」文字标签。


## V2.0 计时界面
- 采用参考图中的弧线轨迹式钟面视觉，而非传统旋转指针表盘。
- 剩余时间小字置于「专注时间」标题下方、配色选择上方。
- 六种莫兰迪配色可切换，选择会保存在本机。
- 学习进度沿弧线推进，暂停时保持当前位置。


## V2.1 三条弯曲计时线
- 最长曲线表示小时/整段学习进度，中等曲线表示分钟，最短曲线表示秒。
- 三条曲线从同一中心点延伸，端点随剩余时间动态移动。
- 表盘四个数字按本轮学习时长动态换算。


## V2.2 流体丝带动效
- 三条独立贝塞尔曲线分别对应小时、分钟、秒。
- 曲线本身持续轻微变形与漂浮，不再只是端点沿圆周移动。
- 小时线缓慢、分钟线中速、秒线更灵动；末端带轻微惯性摆动。
- 暂停时摆动幅度收敛，继续时恢复；支持系统减少动态效果设置。


## V2.3 中心校正与白底
- 三条曲线统一锚定在 SVG 正中心 (180,180)，端点围绕中心变化。
- 加强贝塞尔控制点的动态摆幅，让整条线持续轻盈变形，而不只是端点移动。
- 页面背景改为纯白，暂时移除网点背景设计。


## V2.4 上扬丝带构图
- 保留表盘右下方的共同锚点，不再把锚点强行放在表盘正中心。
- 三条弯曲线从锚点向上方扇出，短线作为左下方的小幅收尾线。
- 指针不再绕钟面整圈旋转；时间只带来小幅方向变化，保持整体朝上的构图。
- 增强两组贝塞尔控制点的不同频率摆动，让曲线本身持续可见地流动。
- 页面维持纯白背景。


## V2.5 自适应时分秒线
- 删除表盘中心圆点。
- 秒针保持在上半区限定角度范围内，并持续进行贝塞尔曲线流动变形。
- 本轮时长不超过 60 分钟时隐藏时针，分针曲线延长。
- 本轮时长超过 60 分钟时显示时针，分针缩短并按小时周期变化。


## V2.6 秒针真实扫动与自适应长度
- 秒针以连续亚秒进度扫过表盘内圈，不再只每秒跳动。
- 秒针末端通过射线与表盘内圆求交，长度随偏心起点到当前刻度的距离自动变化。
- 曲线控制点被约束在刻度内侧，确保弯曲丝带不越界。
- 时针按剩余时间判断：剩余时间大于 60 分钟才显示；不超过 60 分钟立即隐藏。
- 不超过 60 分钟时分针加长；超过 60 分钟时分针缩短。
- 删除几何中心的装饰点，只保留右下方共同起点。
- 学习计时器可覆盖当前全部债务（每日最多 3 小时），使超过 1 小时的状态可以实际使用。
- Service Worker 改为立即激活并优先更新网页脚本，避免 iPhone 主屏幕继续显示旧版。


## V3.0 — 计时丝带重写
本版本将旧版表盘动画实现整体移除，使用独立 `dial.js` 从零绘制三条 SVG 贝塞尔丝带。
- 秒针按连续亚秒时间扫过完整表盘，长度逐帧由偏心起点到表盘内圆的射线交点计算。
- 秒针控制点限制在刻度内侧，保证整条曲线处于表盘范围内。
- 时针只在剩余时间大于 60 分钟时显示。
- 剩余时间不超过 60 分钟时，分针延长。
- 移除表盘几何中心的任何圆点；保留右下方共同起点。
- 动画模块与业务计时状态通过 `window.LoseStudyDial.update()` 解耦。


## V3.1 — clock-correct hand motion
- Minute ribbon now advances at exactly 6° per elapsed minute (smoothly interpolated between minute marks), not a short arbitrary arc.
- Second tip advances continuously at 6° per elapsed second and completes one revolution every 60 seconds.
- Second-hand length is recalculated every animation frame from the off-centre pivot to the inner dial circumference.
- Minute ribbon is longer at 60 minutes or less; shorter above 60 minutes.
- Hour ribbon remains hidden at 60 minutes or less and appears only above 60 minutes.
- Ribbon breathing remains independent from hand position, so a paused timer can hold its clock position while the silk-like line still breathes.


## V3.2 — dual dial scale
- Inner ring is fixed at 60 / 45 / 30 / 15, spaced evenly at 90-degree intervals.
- Outer ring shows 1 / 2 / 3 at 120-degree intervals when more than 60 minutes remain.
- The outer hour scale disappears at 60 minutes or less, matching the hour ribbon visibility.
- Service worker cache name bumped to v3.2 so installed PWAs fetch the updated files.


## V3.3 — monochrome ASCII background
- Adds a lightweight canvas layer with grayscale ASCII fish and a subtle particle field.
- The canvas is fixed behind the page content and does not intercept touches.
- A live exclusion window follows the timer dial's viewport position; no background particles or fish are drawn behind the clock.
- The dial also has a solid white backing to preserve contrast.
- No external libraries, fonts, images, or network requests are required.
- Service worker cache version updated and `ascii-bg.js` precached.


## V3.4 — full-page ASCII shark background + frosted dial exclusion
- Replaced the small fish illustration with animated monochrome ASCII/pixel sharks.
- The fixed canvas covers the full visible webpage viewport while scrolling.
- Sharks and ambient character particles animate across the page in black, white and grey.
- The dial is protected by a circular exclusion halo that includes the outer hour scale.
- Background particles gradually fade out toward the protected dial zone (no hard rectangular cutout).
- Added a soft white frosted-glass radial edge around the dial.
- Updated the service-worker cache key to v3.4.


## V3.5 — upstream ASCII Sharks engine
- Replaces the hand-drawn polygon/glyph approximation with the actual `OceanEngine` from `stackedlol/ascii-sharks`.
- Uses the upstream light-theme scene, articulated shark bodies, fish schooling, and renderer.
- Pins the upstream Git commit `fff1af0a4d1ba6315d02982bd904b83ca016a14e` through esm.sh.
- The ocean canvas is `position: fixed` and does not occupy document layout space; it stays behind the app while scrolling.
- A separate fixed glass veil follows the timer's real viewport bounds. The center stays clear, with a soft radial fade at the edge.
- The timer and all controls remain above both background layers.
- Note: the upstream engine module is loaded from esm.sh, so the animated background requires an internet connection. The timer app itself remains independent of that module.
- Upstream MIT attribution and license are included in `THIRD_PARTY_NOTICES.md`.


## V3.6 — actual upstream light scene
- Corrected the upstream module URL to the documented `src/index.ts` entry point on the repository's `main` branch. The previous V3.5 commit pin was not verified and may not resolve.
- Verified the `OceanEngine` constructor and options against upstream `src/engine.ts`.
- Uses the exact seven-shark light-scene roster from upstream `pages/query.ts`, with `theme: "light"`, `contain: true`, `clearCentre: true`, and 150 fish.
- Shrunk the white dial clearing and its feather from the previous oversized halo; compacted the focus heading/time/palette spacing slightly.
- Added versioned CSS/module URLs and a new service-worker cache namespace to avoid stale V3.5 assets.


## V3.7 — per-section glass and stable dial clearing
- Replaced the single full-viewport white glass overlay with individual translucent frosted-glass surfaces for each content section.
- Moved the dial clearing into a local pseudo-element attached to the dial itself. It now scrolls with the dial and does not depend on scroll-event / requestAnimationFrame timing.
- Removed all viewport-coordinate mask calculations and the scroll/resize mask animation loop, eliminating the source of the disappearing/reappearing dial frame.
- Bumped asset URLs and service-worker cache to V3.7.


## V3.8 — idle hand freeze and pixel wordmark
- The second hand now advances only when the study timer is `running`. It stays fixed when idle or paused.
- Ribbon sway is frozen when the timer is idle or paused; the idle preview no longer animates without study debt.
- Reduced glass section fill alpha from 0.76 to 0.62, border alpha from 0.88 to 0.72, and backdrop blur from 16px to 13px.
- Replaced the black L tile with a small, light pixel hourglass mark.
- Applied Pixelify Sans to the English wordmark only. GridType's Pixel category currently shows “Coming soon”; Pixelify Sans is a readable pixel-style display face under SIL OFL 1.1.
- Bumped CSS/module URLs and Service Worker cache version to V3.8.
