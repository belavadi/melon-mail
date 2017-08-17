let webpack = require('webpack');
let path = require('path');
let ExtractTextPlugin = require('extract-text-webpack-plugin');

let config = {
    devtool: 'source-map',
    entry: [
        './src/MelonMail/'
    ],
    output: {
        path: path.join(__dirname, './public/web/dist'),
        filename: 'bundle.js',
        publicPath: 'web/dist/'
    },
    resolve: {
        extensions: ['.jsx', '.js', '.scss', '.eot', '.svg', '.ttf', '.woff', '.woff2', '.png', '.jpg']
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                include: path.join(__dirname, 'src/MelonMail'),
                use: [
                    {
                        loader: "babel-loader",
                        query:
                            {
                                presets:['es2015', 'react']
                            }
                    }
                ]
            },
            {
                test: /\.scss$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: [
                        'css-loader',
                        'resolve-url-loader',
                        'sass-loader'
                    ]
                })
            },
            {
                test: /\.(png|jpg|gif|jpeg)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                            name: 'images/[name].[ext]'
                        }
                    }
                ]
            },
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 10000,
                            mimetype: 'application/font-woff',
                            name: 'fonts/[name].[ext]'
                        }
                    }
                ]
            },
            {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'fonts/[name].[ext]'
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new ExtractTextPlugin(
            {
                filename: 'style.css',
                allChunks: true
            }
        ),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            },
        }),
        new webpack.optimize.UglifyJsPlugin({
            compress:{
                warnings: true
            }
        })
    ]
};

module.exports = config;