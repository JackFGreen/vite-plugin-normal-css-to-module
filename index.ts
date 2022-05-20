import { ModuleGraph, ModuleNode, Plugin } from 'vite'
import * as path from 'path'

// from vite css.ts
const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
const cssLangRE = new RegExp(cssLangs)

const cssModule = `\\.module`
const cssModuleRE = new RegExp(`${cssModule}${cssLangs}`)

const nodeModuleFileRE = /node_module/

const fakeCssModuleFlag = `\\?&`
const fakeCssModuleRE = new RegExp(`${fakeCssModuleFlag}${cssModule}${cssLangs}`)

const fakeCssModuleExt = `?.module.less`

const relativePathRE = /^\.\//

function replaceQuery(s: string) {
  const reg = new RegExp(fakeCssModuleFlag)
  return s.replace(reg, `?`)
}

function isNormalCSS(file: string) {
  return cssLangRE.test(file) && !cssModuleRE.test(file) && !nodeModuleFileRE.test(file)
}

async function getHotModules(modules: ModuleNode[], timestamp: number, moduleGraph: ModuleGraph) {
  const modulesMap: Map<string, ModuleNode> = new Map()

  for (const m of modules) {
    let { url } = m

    if (fakeCssModuleRE.test(url)) {
      const oldUrl = replaceQuery(url)

      // importers will still get timestamp from old module
      // update hmr timestamp for importers inject
      // then importers.code will change avoid response.etag not change
      // else http server will send last transformed importer code
      // it cause browser not fetch new import css
      // e.g. import styles from './xxx.less?t={timestamp not change}&.module.less'
      const urlModule = await moduleGraph.getModuleByUrl(oldUrl)
      if (urlModule) {
        urlModule.lastHMRTimestamp = timestamp
      }

      // remove old module for hmr
      // else old module importer.size is 0
      // ws will send full-reload to client cause hmr failed
      const oldModule = modulesMap.get(oldUrl)
      if (oldModule) {
        modulesMap.delete(oldUrl)
      }
    }

    const importers = await getHotModules(Array.from(m.importers), timestamp, moduleGraph)
    m.importers = new Set(importers)

    modulesMap.set(url, m)
  }

  const result = Array.from(modulesMap.values())
  return result
}

export interface Config {
  exclude?: string[]
}

export const normalCSSToModule = (config: Config = {}): Plugin => {
  const name = 'vite-plugin-normal-css-to-module'
  const { exclude } = config

  return {
    name,
    enforce: 'pre',
    // transform .less -> .less?.module.less
    resolveId(source, importer = '') {
      const isRelative = relativePathRE.test(source)
      if (isRelative) {
        source = source.replace(relativePathRE, '')
      }

      const isExclude = Array.isArray(exclude) && exclude.some((o) => o.includes(source))

      if (isNormalCSS(source) && !nodeModuleFileRE.test(importer) && !isExclude) {
        // transform relative path to absolute path
        // ./xxx.less -> /User/path/.../src/.../xxx.less
        if (isRelative) {
          const dir = importer.split('/').slice(0, -1).join('/')
          source = path.join(dir, source)
        }

        const sourcePath = source + fakeCssModuleExt
        return sourcePath
      }
    },
    async handleHotUpdate(ctx) {
      const { file, timestamp, modules } = ctx

      if (isNormalCSS(file)) {
        const hotModules = await getHotModules(modules, timestamp, ctx.server.moduleGraph)
        return hotModules
      }
    },
  }
}

export default normalCSSToModule
