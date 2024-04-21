const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    index: './src/index.ts',
  },
  output: {
    path: path.resolve(__dirname, './dist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      templateContent: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>DAG Demo</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body>
						<svg id="graph_plot" width=1000 height=700></svg>
          </body>
        </html>`,
    }),
    new CopyPlugin({
      patterns: [{ from: 'public', to: path.resolve(__dirname, './dist') }],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-typescript'],
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  devServer: {
    open: true,
    hot: true,
  },
  devtool: 'eval-source-map',
};
