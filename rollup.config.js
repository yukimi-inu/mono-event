import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

// 環境変数に基づいて設定を変更
const production = process.env.NODE_ENV === 'production';

// 単一バンドル設定
export default {
  input: 'src/index.ts',
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      // 本番環境ではソースマップを無効化
      sourceMap: !production,
      // 型定義ファイルを生成
      declaration: true,
      declarationDir: 'dist',
    }),
  ],
  output: [
    // 開発用（ソースマップあり、ミニファイなし）
    {
      file: 'dist/index.js',
      format: 'esm',
      sourcemap: !production,
    },
    // 本番用（ミニファイあり、ソースマップなし）
    {
      file: 'dist/index.min.js',
      format: 'esm',
      sourcemap: false,
      plugins: [terser({
        format: {
          comments: false,
          ecma: 2020,
          wrap_func_args: false
        },
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_getters: true,
          keep_infinity: true,
          passes: 3,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_methods: true,
          unsafe_proto: true,
          unsafe_undefined: true
        },
        mangle: {
          properties: {
            regex: /^_/
          }
        }
      })],
    }
  ]
};