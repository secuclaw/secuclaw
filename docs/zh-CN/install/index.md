---
summary: "在您的系统上安装SecuClaw，支持多种部署方式。"
read_when:
  - 首次设置SecuClaw
  - 选择安装方式
title: "安装"
---

# 安装

SecuClaw支持多种安装方式。请选择最适合您环境的方式。

## 前置要求

- **Node.js**: 22版本或更高
- **包管理器**: npm、pnpm或bun
- **API密钥**: Anthropic API密钥（推荐）或其他LLM提供商

## 快速安装

```bash
# 使用npm
npm install -g secuclaw@latest

# 使用pnpm
pnpm add -g secuclaw

# 使用bun
bun add -g secuclaw
```

## 验证安装

```bash
secuclaw --version
secuclaw --help
```

## 安装方式

<Tabs>
  <Tab title="Docker（推荐）">
    Docker提供了最简单的开始方式，具有完整的隔离。

    ```bash
    # 拉取最新镜像
    docker pull secuclaw/secuclaw:latest

    # 运行容器
    docker run -d \
      --name secuclaw \
      -p 21000:21000 \
      -v ~/.secuclaw:/root/.secuclaw \
      secuclaw/secuclaw:latest
    ```


  </Tab>
  <Tab title="Node.js">
    通过Node.js包管理器直接安装。

    ```bash
    npm install -g secuclaw@latest
    ```


  </Tab>
  <Tab title="二进制文件">
    下载适合您平台的预编译二进制文件。

    ```bash
    # macOS
    curl -L https://git.example.com/org/repo/releases/latest/download/secuclaw-darwin-arm64.tar.gz | tar xz
    ./secuclaw --version

    # Linux
    curl -L https://git.example.com/org/repo/releases/latest/download/secuclaw-linux-amd64.tar.gz | tar xz
    ./secuclaw --version
    ```


  </Tab>
  <Tab title="源码构建">
    从源码构建用于开发。

    ```bash
    git clone https://git.example.com/org/repo.git
    cd secuclaw
    pnpm install
    pnpm build
    ```


  </Tab>
</Tabs>

## 云平台部署

<Tabs>
  <Tab title="Render">
    一键部署到Render。


  </Tab>
  <Tab title="Railway">
    部署到Railway。


  </Tab>
  <Tab title="Fly.io">
    部署到Fly.io边缘服务器。


  </Tab>
  <Tab title="Hetzner">
    部署到Hetzner Cloud。


  </Tab>
</Tabs>

## 安装后

安装后，运行初始化向导：

```bash
secuclaw init
secuclaw configure
```

下一步请参阅 [快速开始](/zh-CN/start/getting-started)。

## 更新

```bash
# 更新CLI
secuclaw update

# 或重新安装
npm install -g secuclaw@latest
```



## 卸载

```bash
# 移除CLI
npm uninstall -g secuclaw

# 移除数据
rm -rf ~/.secuclaw
```



---

_相关链接: [快速开始](/zh-CN/start/getting-started)_
