const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const sassMiddleware = require('node-sass-middleware');
const session = require("express-session");
const FileStore = require('session-file-store')(session);
let app = express();
var identityKey = 'skey';
app.use(session({
    name: identityKey,
    secret: 'sessiontest',  // 用来对session id相关的cookie进行签名
    store: new FileStore(),  // 本地存储session（文本文件，也可以选择其他store，比如redis的）
    saveUninitialized: false,  // 是否自动保存未初始化的会话，建议false
    resave: false,  // 是否每次都重新保存会话，建议false
    cookie: {
        maxAge: 1000 * 60 * 30 // 有效期，单位是毫秒。30分钟
    }
}));
//登录拦截器
/*app.all('/!*', function(req, res, next){
    if (req.session.user) {
        next();
    }else {
        var arr = req.oriq.split('/');// 解析用户请求的路径

        for (var i = 0, length = arr.length; i < length; i++) {// 去除 GET 请求路径上携带的参数
            arr[i] = arr[i].split('?')[0];
        }
        if (arr.length > 1 && arr[1] == '') {// 判断请求路径是否为根、登录、注册、登出，如果是不做拦截
            next();
        } else if (arr.length > 1 && arr[1] == 'loginPage' && (arr[2] == 'register' || arr[2] == 'login' || arr[2] == 'logout' || arr[2].indexOf('login') >= 0 )) {
            next();
        } else {  // 登录拦截
            //req.session.originalUrl = req.originalUrl ? req.originalUrl : null;  // 记录用户原始请求路径
            //req.flash('error', '请先登录');
            //res.redirect('/loginPage');  // 将用户重定向到登录页面
        }
    }
});*/

app.use(function (req, res, next) {
    var url = req.originalUrl;//获取浏览器中当前访问的nodejs路由地址；

    if(url!='/loginPage'&& url!='/register' && !req.session.user && url!='/login'  ){ //通过判断控制用户登录后不能访问登录页面；
        return res.redirect('/loginPage');//页面重定向；
    }
    next();
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: false, // true = .sass and false = .scss
  sourceMap: false
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', require('./logic/routers'));
app.use('/api', require('./logic/api'));
app.use(function(req, res, next) {
  next(createError(404));
});
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
module.exports = app;
