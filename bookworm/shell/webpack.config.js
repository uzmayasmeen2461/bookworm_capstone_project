const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const webpack = require('webpack');
const path = require('path');

// ── Remote MFE URLs ───────────────────────────────────────────────────────────
// In development these default to localhost.
// In production, docker-compose.prod.yml passes MFE_*_URL as build args
// which the Dockerfile forwards to webpack via --env.
const MFE_AUTH_URL     = process.env.MFE_AUTH_URL     || 'http://localhost:3001';
const MFE_STORE_URL    = process.env.MFE_STORE_URL    || 'http://localhost:3002';
const MFE_CHECKOUT_URL = process.env.MFE_CHECKOUT_URL || 'http://localhost:3003';

// ── API base URL ──────────────────────────────────────────────────────────────
// In development: direct to localhost:5000.
// In production:  https://<DOMAIN>/api  (Traefik strips the /api prefix).
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: 'auto',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    // Inject the API base URL into all bundles so apiClient.ts can read it
    new webpack.DefinePlugin({
      'process.env.API_BASE_URL': JSON.stringify(API_BASE_URL),
    }),
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        mfeAuth:     `mfeAuth@${MFE_AUTH_URL}/remoteEntry.js`,
        mfeStore:    `mfeStore@${MFE_STORE_URL}/remoteEntry.js`,
        mfeCheckout: `mfeCheckout@${MFE_CHECKOUT_URL}/remoteEntry.js`,
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^7.18.4' },
      },
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    port: 3000,
    host: 'localhost',
    historyApiFallback: true,
    hot: true,
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};

