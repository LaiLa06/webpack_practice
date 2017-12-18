const webpack = require('webpack');
const path = require('path');
const uglify = require('uglifyjs-webpack-plugin'); //引入js代码压缩插件
const htmlPlugin = require('html-webpack-plugin');
const extractTextPlugin = require("extract-text-webpack-plugin"); //分离css文件，使css和js不打包成一个文件
const autoprefixer = require('autoprefixer'); //检查属性的兼容性，并加前缀
const glob = require('glob'); //去掉多余的css时，需要检查html模板，引入node的glob对象
const PurifyCSSPlugin = require("purifycss-webpack"); //去掉多余的css
const copyWebpackPlugin = require("copy-webpack-plugin"); ////作用：把public 里面的内容全部拷贝到编译目录
const CleanWebpackPlugin = require('clean-webpack-plugin'); //每次打包清理之前的dist文件


console.log(encodeURIComponent(process.env.type)); //node的console，打印在终端,不在浏览器

if (process.env.type == "build") {
    // 生产环境 上线环境
    var website = {
        publicPath: "http://192.168.55.14:8080/"

    }
} else {
    //开发环境
    var website = {
        publicPath: "http://192.168.59.187:1717/"
    }
}

module.exports = {
    //配置入口文件的地址，可以是单一入口，也可以是多入口。
    entry: {
        entry: './src/entry.js', //entry随意取
        jquery: 'jquery'
    },
    //配置出口文件的地址，在webpack2.X版本后，支持多出口配置
    output: {
        //输出的路径，用了Node语法
        path: path.resolve(__dirname, 'dist'),
        //输出的文件名称
        filename: '[name].js',
        publicPath: website.publicPath // 根据入口文件的名称，打包成相同的名称，有几个入口文件，就可以打包出几个文件。 
    },
    //模块：例如解读CSS,图片如何转换，压缩
    module: {
        rules: [{
            test: /\.css$/,
            use: extractTextPlugin.extract({
                    fallback: "style-loader",
                    use: [{
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1
                        }
                    }, 'postcss-loader']
                }) //style-loader处理css文件中的url（）等  css-loader用来将css插入页面的style标签
        }, {
            test: /\.less$/,
            use: extractTextPlugin.extract({
                fallback: "style-loader", // creates style nodes from JS strings
                use: [{
                    loader: "css-loader", // translates CSS into CommonJS
                }, {
                    loader: "postcss-loader", //加前缀
                    options: {
                        sourceMap: true,
                        plugins: () => [autoprefixer({
                            browsers: ['iOS >= 7', 'Android >= 4.1',
                                'last 10 Chrome versions', 'last 10 Firefox versions',
                                'Safari >= 6', 'ie > 8'
                            ]
                        })],
                    }
                }, {
                    loader: "less-loader" // compiles Less to CSS
                }],
            })
        }, {
            test: /\.(png|jpg|gif)/, //test:/\.(png|jpg|gif)/是匹配图片文件后缀名称。
            use: [{
                loader: 'url-loader',
                options: {
                    limit: 8192, //小于5000B的文件打成Base64的格式，写入JS。
                    name: '[name].[hash:8].[ext]',
                    //name: 'src/images/[name].[hash:8].js',
                    outputPath: 'assets/images/',
                }
            }]
        }, {
            test: /\.(jsx|js)$/,
            use: {
                loader: 'babel-loader',
            },
            exclude: /node_modules/
        }]
    },
    //插件，用于生产模版和各项功能，根据你的需要配置不同功能的插件
    plugins: [
        // 优化
        new webpack.optimize.CommonsChunkPlugin({
            name: ['jquery', 'vue'], //把入口文件的jque插件单独抽离
            filename: "assets/js/[name].js", //抽离地址，继承上面的名字和后缀名
            minChunks: 2 //抽离几个，一般不用更改数值
        }),
        //工作中会有一些已经存在但在项目中没有引用的图片资源
        //或者其他静态资源（比如设计图、开发文档），
        //这些静态资源有可能是文档，也有可能是一些额外的图片。
        //项目组长会要求你打包时保留这些静态资源，直接打包到制定文件夹 
        //用copyWebpackPlugin
        new copyWebpackPlugin([{
            from: __dirname + '/src/public',
            to: './public'
        }]),

        // 下面是插件
        new webpack.BannerPlugin('laia所写模块'), //作者版权声明
        new webpack.ProvidePlugin({ //引入外部类库
            $: "jquery"
        }),
        new CleanWebpackPlugin(['./dist', './build'], {
            //root: '/Practice', //webpack.config的地址
            verbose: true, //将log写到 console.
            //dry: false, //不要删除任何东西，主要用于测试
            exclude: ['./dist/public'] //排除不删除的目录，主要用于避免删除公用的文件
        }),
        new htmlPlugin({
            minify: {
                removeAttributeQuotes: false //removeAttributeQuotes: true 去掉属性的双引号， minify对文件进行压缩
            },
            hash: true, //为了开发中js有缓存效果，所以加入hash，这样可以有效避免缓存JS。
            template: './src/index.html' //要打包的html模板路径和文件名称
        }),
        //new uglify(), //配置js文件压缩插件
        new extractTextPlugin("css/index.css"), //分离后的路径位置
        new PurifyCSSPlugin({
            // Give paths to parse for rules. These should be absolute!
            //使用这个插件必须配合extract-text-webpack-plugin这个插件
            paths: glob.sync(path.join(__dirname, 'src/*.html')),
        }),
    ],
    //配置webpack开发服务功能 热更新
    devServer: {
        //设置基本目录结构,配置服务器基本运行路径，用于找到程序打包地址
        contentBase: path.resolve(__dirname, 'dist'),
        //服务器的IP地址，可以使用IP也可以使用localhost
        host: '192.168.59.187',
        //服务端压缩是否开启
        compress: true,
        //配置服务端口号
        port: 1717
    },
    watchOptions: {
        //检测修改的时间，以毫秒为单位
        poll: 1000,
        //防止重复保存而发生重复编译错误。这里设置的500是半秒内重复保存，不进行打包操作
        aggregeateTimeout: 500,
        //不监听的目录
        ignored: /node_modules/,
    }
}