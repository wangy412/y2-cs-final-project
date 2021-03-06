/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const srcPath = path.join(__dirname, "src");
const clientPath = path.join(srcPath, "client");

module.exports = {
  devServer: {
    proxy: "http://localhost:3000",
  },
  configureWebpack: {
    entry: {
      app: path.join(clientPath, "main.ts"),
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
            },
          },
        }),
      ],
    },
  },
};
