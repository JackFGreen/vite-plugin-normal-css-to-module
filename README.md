# vite-plugin-normal-css-to-module

将 .less 等普通 css 转换为 css module

> vite@2.7.2 测试过

## Usage

```ts
// vite.config.ts
export default {
  plugins: [normalCSSToModule()],
}
```

## API

### exlude

一般不需要，会与 :global 语法冲突，如果确定 非 module 的 css 文件中 没有使用 :global 语法，可以用来排除 非 module 的文件

```ts
normalCSSToModule({
  /**
   * 如果有 非css module(直接 import 引入) 的文件，添加到 exclude 中
   * e.g. App.tsx
   * import '@/reset.less';
   */
  exclude: [path.resolve(__dirname, './reset.less')],
})
```
