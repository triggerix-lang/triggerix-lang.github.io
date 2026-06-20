// dev-only: 把 netlify functions 代理到 vite dev server
// 镜像 netlify.toml 的 [[redirects]] /api/* → /.netlify/functions/:splat
// 线上仍然由 Netlify 部署时 esbuild 打包 functions，本插件不参与 prod build
// @ts-nocheck
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { Readable } from 'node:stream'
import { parseEnv } from 'node:util'
import { resolve } from 'node:path'

export interface NetlifyDevProxyOptions {
  /** netlify functions 目录，相对于 vite root，默认 'netlify/functions' */
  functionsDir?: string
  /** dev 端暴露的 API 前缀，默认 '/api'（与 netlify.toml redirect 的 from 一致） */
  apiPrefix?: string
}

type VitePlugin = {
  name: string
  apply: 'serve' | 'build'
  configureServer: (server: any) => void | Promise<void>
}

type FunctionModule = { default: (req: Request) => Promise<Response> | Response }

/**
 * 自动扫描 functionsDir 下的 .ts/.js/.mjs 文件
 * 每个文件暴露为 `${apiPrefix}/${basename}`，调用 default export(req: Request) → Response
 *
 * 用法：
 *   import { netlifyDevProxy } from './scripts/vite/plugins/netlifyDevProxy'
 *   plugins: [netlifyDevProxy()]
 */
export function netlifyDevProxy(options: NetlifyDevProxyOptions = {}): VitePlugin {
  const { functionsDir = 'netlify/functions', apiPrefix = '/api' } = options

  return {
    name: 'triggerix:netlify-dev-proxy',
    apply: 'serve',
    async configureServer(server) {
      const root = server.config.root
      loadEnvIntoProcess(root)

      const fnDir = resolve(root, functionsDir)
      if (!existsSync(fnDir)) return

      const files = readdirSync(fnDir).filter((f) => /\.(ts|js|mjs)$/.test(f) && !f.startsWith('_'))

      for (const file of files) {
        const name = file.replace(/\.(ts|js|mjs)$/, '')
        const url = `${apiPrefix}/${name}`

        let mod: FunctionModule
        try {
          // vite-node 加载：能解析 TS、自动 bundle 依赖
          mod = (await server.ssrLoadModule(`/${functionsDir}/${file}`)) as FunctionModule
        } catch (err) {
          server.config.logger.warn(
            `[netlify-dev-proxy] failed to load ${file}: ${(err as Error).message}`
          )
          continue
        }

        if (typeof mod.default !== 'function') {
          server.config.logger.warn(`[netlify-dev-proxy] ${file} has no default export, skipping`)
          continue
        }

        server.middlewares.use(async (req, res, next) => {
          if (req.url !== url) return next()

          try {
            // 读 Node IncomingMessage body → 构造 Web Request
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const bodyBuf = Buffer.concat(chunks)

            const host = req.headers.host ?? 'localhost'
            const webReq = new Request(`http://${host}${req.url}`, {
              method: req.method,
              headers: req.headers as Record<string, string>,
              body: req.method === 'GET' || req.method === 'HEAD' ? undefined : bodyBuf
            })

            const webRes = await mod.default(webReq)

            // Web Response → Node res（包含流式 body）
            res.statusCode = webRes.status
            webRes.headers.forEach((v, k) => {
              res.setHeader(k, v)
            })
            res.flushHeaders?.()
            if (webRes.body) {
              Readable.fromWeb(webRes.body).pipe(res)
            } else {
              res.end()
            }
          } catch (err) {
            server.config.logger.error(
              `[netlify-dev-proxy] ${name} handler error: ${(err as Error).message}`
            )
            if (!res.headersSent) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: (err as Error).message }))
            } else {
              res.end()
            }
          }
        })

        server.config.logger.info(`[netlify-dev-proxy] ${url} → ${file}`)
      }
    }
  }
}

/** 把 .env / .env.local 合并到 process.env（仅填入缺失项，不覆盖已有） */
function loadEnvIntoProcess(root: string) {
  const merged: Record<string, string> = {}
  for (const f of ['.env', '.env.local']) {
    const p = resolve(root, f)
    if (!existsSync(p)) continue
    try {
      Object.assign(merged, parseEnv(readFileSync(p, 'utf8')))
    } catch {
      // 解析失败忽略
    }
  }
  for (const [k, v] of Object.entries(merged)) {
    if (process.env[k] === undefined) process.env[k] = v
  }
}
