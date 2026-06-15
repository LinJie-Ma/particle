# Particle — 3D Physics Ball Pool

基于 Three.js 的 3D 物理球池粒子特效，参考 [Lusion.co](https://lusion.co/about) 视觉风格。

## 效果

- **400 个大小不一的 3D 白球**，幂律分布（大部分微小，少数大球）
- **噪声驱动的自运动模式** — 每球独立噪声种子，像鱼群各自自由游动
- **真实物理球球碰撞** — 弹性碰撞 + 软边界回弹
- **环境贴图反射光泽** — RoomEnvironment 程序化环境贴图，球面呈现瓷器般白色光泽
- **正交相机** — 扁平设计感
- **鼠标交互** — 鼠标推开附近球 + 动态 PointLight 照亮球面

## 技术栈

- [Three.js](https://threejs.org/) v0.160.0 (ES Module via importmap)
- RoomEnvironment 程序化环境贴图
- OrbitControls 视角控制
- 自制物理引擎（无外部物理库依赖）

## 快速开始

直接用浏览器打开 `index.html`，或启动任意静态服务器：

```bash
# 方式一：直接打开
start index.html

# 方式二：本地服务器
npx serve .
```

## 项目结构

```
particle/
├── index.html         # 入口页面
├── css/
│   └── style.css      # 全局样式
├── js/
│   ├── main.js        # Three.js 场景、球生成、渲染循环
│   ├── physics.js     # 物理引擎（碰撞、噪声力、边界、鼠标交互）
│   └── noise.js       # 伪随机 3D 噪声函数
├── .gitignore
└── README.md
```

## 参数调节

所有可调参数位于 `js/physics.js` 顶部：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `BALL_COUNT` | 400 | 球数量 |
| `MIN_BALL_RADIUS` | 0.05 | 最小球半径 |
| `MAX_BALL_RADIUS` | 0.6 | 最大球半径 |
| `NOISE_FORCE` | 8.0 | 噪声驱动力（越大运动越剧烈） |
| `LINEAR_DAMPING` | 0.985 | 速度衰减（越低越粘稠） |
| `RESTITUTION` | 0.6 | 碰撞弹性 |
| `BOUND_RADIUS` | 7.0 | 活动边界半径 |

## License

MIT
