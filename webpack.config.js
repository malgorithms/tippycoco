const path = require('path')
const webpack = require('webpack')
const excludes = [path.resolve(__dirname, 'node_modules'), path.resolve(__dirname, 'backend')]
module.exports = {
  mode: 'development',
  entry: './frontend/main.ts',
  node: {
    global: false,
  },
  plugins: [
    // fix "process is not defined" error:
    // (do "npm install process" before running the build)
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  //devtool: 'inline-source-map', /* set this if source maps on */
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {configFile: 'tsconfig.webpack.json'},
          },
        ],
        exclude: excludes,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
}
