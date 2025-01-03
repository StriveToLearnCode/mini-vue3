const args = require('minimist')(process.argv.slice(2))
const { resolve } = require('path')
const { build } = require('esbuild')
// minimist 用来解析命令行参数的

const target = args._[0] || 'reactivity'
const format = args.f || 'global'

// 开发环境下只打包一个
const pkg = require(resolve(__dirname, `../packages/${target}/package.json`))

// iife立即执行函数 (function(){})()
// cjs node中 的模块 module.exports
// esm 浏览器中的esModules模块 import
const outputFormat = format.startsWith('global') ? 'iife' : format === 'cjs' ? 'cjs' : 'esm'

const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.${format}.js`)

//esbuild

build({
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
  outfile,
  bundle: true,//把所有的包打包到一起
  sourcemap: true,
  format: outputFormat,//输出格式
  globalName: pkg.buildOptions?.name,//打包的全局名字
  platform: format === 'cjs' ? 'node' : 'browser',//平台
  watch: {
    onRebuild(error, result) {
      if (error) console.error('watch build failed:', error)
      else console.log('build success!')
    }
  }
}).then(() => {
  console.log("watching!!");
})