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

---

## 其他

### 添加前缀类名

微前端中，给每个子应用添加前缀类名，一般为 项目名， e.g. `.classA` -> `.pkgName .classA`

```ts
import prefixer from 'postcss-prefix-selector'
import pkg from './package.json'

postcss: {
  plugins: [
    prefixer({
      /**
       * 添加 css 类名前缀，一般为 mount 的根节点类名
       */
      // 加 :global 给 css module 处理
      prefix: `:global(.${pkg.name})`,
      // 忽略全局的样式
      // 比如项目中所有文件都是 `.less` 并且 全局的一些样式（非 CSSModule 的 重置样式，变量文件，主题文件等，都是用 :global 包裹，在 应用的入口文件中引入），这些样式最终编译后 为 正常的类名，不带任何 CSSModule 的特征
      ignoreFiles: ['reset', 'variable'].map((o) =>
        path.resolve(__dirname, `./src/${o}.less`)
      ),
      transform: function (prefix, selector, prefixedSelector, filepath) {
        // node_modules 中的 css module 不会处理，不加 :global
        if (filepath.match(/node_modules/)) {
          return `.${pkg.name} ${selector}`
        }
        return prefixedSelector
      },
    }),
  ],
}
```
