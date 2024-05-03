var path = require("path");
var webpack = require("webpack");
var vtkRules = require("@kitware/vtk.js/Utilities/config/dependency.js").webpack
  .core.rules;

var entry = path.join(__dirname, "./src/index.js");
const sourcePath = path.join(__dirname, "./src");
const outputPath = path.join(__dirname, "./dist");

module.exports = {
  entry,
  output: {
    path: outputPath,
  },
  module: {
    rules: [{ test: /\.html$/, loader: "html-loader" }].concat(vtkRules),
  },
  resolve: {
    modules: [path.resolve(__dirname, "node_modules"), sourcePath],
  },
  output: { publicPath: "/" },
};
