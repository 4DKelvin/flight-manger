let express = require('express');
let router = express.Router();
let api = require('./api');
let db = require('./db');

/* GET home page. */
router.get('/', async function (req, res, next) {

    var condition = {};

    if(Object.getOwnPropertyNames(req.query).length != 0)
        condition = jointCon(req.query);


    var result = {_id:0,__v:0};
    var orders = await db.plane_orderList.find(condition,result);
    orders.forEach(function (order) {
        if (order.orderTime!=null) order._doc.orderTime = formatDate(order.orderTime);
        else order._doc.orderTime = "";
        if (order.flightTime!=null) order._doc.flightTime = formatDate(order.flightTime);
        else  order._doc.flightTime = "";
    })
    res.render('index', {title: '訂單管理', orders: orders});
});
router.get('/detail', function (req, res, next) {
    res.render('detail', {title: '訂單詳情'});
});

//时间转换
function formatDate(date){
    date = new Date(date);
    var y=date.getFullYear();
    var m=date.getMonth()+1;
    var d=date.getDate();
    var h=date.getHours();
    var m1=date.getMinutes();
    var s=date.getSeconds();
    m = m<10?("0"+m):m;
    d = d<10?("0"+d):d;
    return y+"-"+m+"-"+d+" "+h+":"+m1+":"+s;
}

function jointCon(obj) {
    /*var condition = "{";
    if(obj.start!=null) condition+"\"orderTime\":{\"$gt\":\""+obj.start+"\"},";
    if(obj.end!=null) condition+"\"orderTime\":{\"$lt\":\""+obj.end+"\"},";
    if(obj.name!=null) condition+"\"name\":{\"$lt\":\""+obj.name+"\"},";
    if(obj.orderNo!=null) condition+"\"name\":{\"$lt\":\""+obj.orderNo+"\"},";
    if(obj.tickerNo!=null) condition+"\"name\":{\"$lt\":\""+obj.tickerNo+"\"},";
    condition = condition.substring(0, condition.length - 1);
    condition + "}";*/

    var name = "/^"+obj.name+"/";
    var orderNo = "/"+obj.orderNo+"$/";
    var tickerNo = "/"+obj.tickerNo+"/";

    var condition = {
        $or: [
            /*{"orderTime":{"$gt":obj.start}},
            {"orderTime":{"$lt":obj.end}},*/
            /*{"name": {$regex: name,$options: '$i'}},*/
            {"orderNo": {$regex: orderNo, $options: '$i'}} //  $options: '$i' 忽略大小写
            /*{"tickerNo": {$regex: tickerNo, $options: '$i'}}*/
        ]
    }
    return condition;
}

module.exports = router;
