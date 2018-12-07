let express = require('express');
let router = express.Router();
let Order = require('../model/order');
let Utils = require('../lib/utils');
let Api = require('../lib/flight');
let Customer = require('../model/customer');
let ControlLog = require('../model/controlLog')


router.use(function (req, res, next) {
    var url = req.originalUrl;
    if (url.indexOf("/api/") != -1) {
        next();
    } else if (url != '/login' && url != '/register' && !req.session.user && url != '/login') {
        res.redirect('/login');
    }else{
        next();
    }
});
/* GET home page. */
router.get('/', async (req, res, next) => {

    var orders = await Order.search(req.query.start, req.query.end, req.query.orderId, req.query.tickerNo, req.query.name,req.query.orderStatus,req.query.page || 0);

    res.render('index', {
        title: '訂單管理',
        orders: orders.map((o) => {
            if (o.flightDate) {
                o.date = Utils.formatDateTime(o.flightDate);
            }
            if (o.flightArrivalTime) {
                o.flightArrivalDateTime = Utils.formatDateTime(o.flightArrivalTime);
            }
            if (o.flightDepartureTime) {
                o.flightDepartureDateTime = Utils.formatDateTime(o.flightDepartureTime);
            }
            if (o.orderTotalPrice) {
                o.total = '¥ ' + Number(o.orderTotalPrice).toFixed(2);
            }
            return o;
        })
    });
});

router.get('/detail', async (req, res, next) => {

    var flag = "0";

    let orders = await new Promise((resolve, reject) => {
        Order.query().where({groupId: req.query.orderNo}).lean().exec((err, orders) => {
            if (err) reject(err);
            else resolve(orders);
        })
    });
    var lock = orders[0].lock;
    if (lock) {
        flag = "1";
        if (req.session.user.name == lock) {
            flag = "2";
        }
    }


    //获取操作日志
    var conditionLog = {orderNo:req.query.orderNo}
    var logs = await ControlLog.findByCon(conditionLog)

    res.render('detail', {
        title: '訂單詳情',
        lock:flag,
        status:orders[0].orderStatus,
        logs:logs.map((log) => {
            if (log.dateTime) {
                log.dateTime = Utils.formatDateTime(log.dateTime);
            }
            return log;
        }),
        orders: orders.map((order) => {
            if (order.flightArrivalTime) {
                order.flightArrivalTime = Utils.formatTime(order.flightArrivalTime);
            }
            if (order.flightDepartureTime) {
                order.flightDepartureTime = Utils.formatDateTime(order.flightDepartureTime);
            }
            if (order.flightDate) {
                order.date = Utils.formatDate(order.flightDate);
            }
            if (order.flightArrivalTime) {
                order.flightArrivalDateTime = Utils.formatTime(order.flightArrivalTime);
            }
            if (order.flightDepartureTime) {
                order.flightDepartureDateTime = Utils.formatDateTime(order.flightDepartureTime);
            }
            if (order.orderTotalPrice) {
                order.total = '¥ ' + Number(order.orderTotalPrice).toFixed(2);
            }
            if (order.orderOriginPrice) {
                order.price = '¥ ' + Number(order.orderOriginPrice).toFixed(2);
            }
            return order;
        })
    });
});


router.get('/refund', async (req, res, next) => {
    if (req.query.orderNo) {
        let result = await Api.refundReasons(req.query.orderNo);
        if (!result[0].refundSearchResult || !result[0].refundSearchResult.tgqReasons) {
            Utils.renderJsonError(res, "此訂單已經申請退款");
        } else {
            let refundInfo = result[0].refundSearchResult.tgqReasons.find(function (e) {
                if (Number(e.code) === 16) return e;
            });
            Utils.renderJson(res, await Api.refund({
                "orderNo": req.query.orderNo,
                "passengerIds": result[0].id,
                "refundCause": refundInfo.msg,
                "refundCauseId": refundInfo.code
            }));
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.get('/refresh', async (req, res, next) => {

    var conditionLog = {
        name: req.session.user.name,
        control: "刷新订单",
        orderNo: req.query.orderNo
    }
    console.log(await ControlLog.insert(conditionLog));

    if (req.query.orderNo) {
        let order = await Api.orderDetail(req.query.orderNo);
        if (order) {
            Utils.renderJson(res, await Order.insertOrUpdate({
                orderNo: order.detail.orderNo,
                orderStatus: order.detail.status,
                notice: order.other.tgqMsg,
                passengerTicketNo: order.passengers[0].ticketNo
            }));
        } else {
            Utils.renderJsonError(res, "無結果");
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.get('/pay', async (req, res, next) => {

    var conditionLog = {
        name: req.session.user.name,
        control: "支付订单",
        orderNo: req.query.orderNo
    }
    console.log(await ControlLog.insert(conditionLog));

    if (!isNaN(req.query.orderId) && req.query.orderAgent && req.query.orderNo) {
        try {
            await Api.pay(req.query.orderId, req.query.orderAgent);
            let order = await Api.orderDetail(req.query.orderNo);
            if (order) {
                Utils.renderJson(res, await Order.insertOrUpdate({
                    orderNo: order.detail.orderNo,
                    orderStatus: order.detail.status,
                    notice: order.other.tgqMsg,
                }));
            } else {
                Utils.renderJsonError(res, "支付成功，更新訂單失敗");
            }
        } catch (e) {
            Utils.renderJsonError(res, "支付失敗，原因：" + e);
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.get('/login', async (req, res, next) => {
    if(req.session.user){
        res.redirect('/')
    }else{
        res.render('loginPage', { title: '登陆界面'});
    }
});
router.post('/login', async (req, res, next) =>{
    if(!req.body.name||!req.body.password){
        Utils.renderJsonError(res, "请输入账户和密码！");
    }
    var condition = {"name": req.body.name, "password": req.body.password}
    var cust = await Customer.findByCon(condition);
    if (cust.length == 1) {
        var user = {
            name: req.body.name,
            password: req.body.password
        }
        req.session.user = user;
        //req.session.name = req.body.name; // 登录成功，设置 session
        var orders = await Order.search(req.query.start, req.query.end, req.query.orderId, req.query.tickerNo, req.query.name, req.query.page || 0);
        res.render('index', {
            title: '訂單管理',
            orders: orders.map((o) => {
                if (o.flightDate) {
                    o.date = Utils.formatDate(o.flightDate);
                }
                if (o.flightArrivalTime) {
                    o.flightArrivalDateTime = Utils.formatDateTime(o.flightArrivalTime);
                }
                if (o.flightDepartureTime) {
                    o.flightDepartureDateTime = Utils.formatDateTime(o.flightDepartureTime);
                }
                if (o.orderTotalPrice) {
                    o.total = '¥ ' + Number(o.orderTotalPrice).toFixed(2);
                }
                return o;
            })
        });
    } else {
        Utils.renderJsonError(res, "不存在该用户！");
    }
});
router.get('/register', async (req, res, next) => {
    res.render('register', {title: '注册界面'});
});
router.post('/register', async (req, res, next) => {
    if (!req.body.name || !req.body.password || !req.body.sex || !req.body.certificatesNo) {
        Utils.renderJsonError(res, "请完善你的信息！");
    }
    var condition = {"name": req.body.name, "password": req.body.password}
    var cust = await Customer.findByCon(condition);
    if (cust.length == 0) {
        var addJson = {
            name: req.body.name,
            password: req.body.password,
            sex: req.body.sex,
            certificatesNo: req.body.certificatesNo,
        };
        await Customer.insert(addJson);
        res.redirect('/');
    } else {
        Utils.renderJsonError(res, "已存在注册用户！");
    }
});

router.get('/locked', async (req, res, next) => {

    console.log(await ControlLog.insert(conditionLog));
    var control = "";

    if (req.query.flag && req.query.orderNo) {
        try {
            var updateStr;
            var flag;
            if (req.query.flag == "0") {
                updateStr = {$set: {"lock": req.session.user.name}};
                flag = "2";
                control = "锁定订单"
            } else {
                updateStr = {$set: {"lock": ""}};
                flag = "0";
                control = "解锁订单"
            }
            var condition = {"orderNo": req.query.orderNo};
            console.log(await Order.updateByCon(condition, updateStr));

            //操作日志
            var conditionLog = {
                name: req.session.user.name,
                control: control,
                orderNo: req.query.orderNo
            }
            console.log(await ControlLog.insert(conditionLog));

            var data = {"result":flag};
            Utils.renderJson(res,flag);

        } catch (e) {
            Utils.renderJsonError(res, "操作失败，原因：" + e);
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.get('/callback', async (req, res, next) => {

    var conditionLog = {
        name: req.session.user.name,
        control: "回填票号",
        orderNo: req.query.orderNo
    }
    console.log(await ControlLog.insert(conditionLog));

    try{
        if (req.query.goTicker){
            var condition = {"_id":req.query.goTickerId};
            var updateStr = {$set:{"passengerTicketNo":req.query.goTicker}}
            console.log(await Order.updateByCon(condition,updateStr));
        }
        if (req.query.backTicker){
            var condition = {"_id":req.query.backTickerId};
            var updateStr = {$set:{"passengerTicketNo":req.query.backTicker}}
            console.log(await Order.updateByCon(condition,updateStr));
        }
        Utils.renderJson(res,"success");
    } catch (e) {
        Utils.renderJsonError(res, "回填失败，原因：" + e);
    }
});




module.exports = router;
