let express = require('express');
let router = express.Router();
let Order = require('../model/order');
let Customer = require('../model/customer');
let Utils = require('../lib/utils');
let Api = require('../lib/flight');

/* GET home page. */
router.get('/', async (req, res, next) => {

    var session = req.session;
    //console.log(session.user);
    if(!req.session.user){
        res.render('loginT', { title: '登陆界面'});
    }

    var orders = await Order.search(req.query.start, req.query.end, req.query.orderId, req.query.tickerNo, req.query.name, req.query.page || 0);

    console.log(orders);

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
});

router.get('/detail', async (req, res, next) => {

    var session = req.session;
    console.log(session.user);
    if(!req.session.user){
        res.render('loginT', { title: '登陆界面'});
    }

    let orders = await new Promise((resolve, reject) => {
        Order.query().where({groupId: req.query.orderNo}).lean().exec((err, orders) => {
            if (err) reject(err);
            else resolve(orders);
        })
    });

    res.render('detail', {
        title: '訂單詳情',
        orders: orders.map((order) => {
            if (order.flightArrivalTime) {
                order.flightArrivalTime = Utils.formatDateTime(order.flightArrivalTime);
            }
            if (order.flightDepartureTime) {
                order.flightDepartureTime = Utils.formatDateTime(order.flightDepartureTime);
            }
            if (order.flightDate) {
                order.date = Utils.formatDate(order.flightDate);
            }
            if (order.flightArrivalTime) {
                order.flightArrivalDateTime = Utils.formatDateTime(order.flightArrivalTime);
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
            return orders;
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

router.get('/loginT', async (req, res, next) => {
    res.render('loginT', { title: '登陆界面'});
});

router.post('/login', async (req, res, next) =>{

    if(!req.body.name||!req.body.password){
        Utils.renderJsonError(res, "请输入账户和密码！");
    }

    var condition = {"name":req.body.name,"password":req.body.password}
    var cust = await Customer.findByCon(condition);

    if(cust.length==1){

        var user={
            name:req.body.name,
            password:req.body.password
        }
        req.session.user=user;

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
    }else{
        Utils.renderJsonError(res, "不存在该用户！");
    }

});

router.get('/registerT', async (req, res, next) => {
    res.render('registerT', { title: '注册界面'});
});

router.post('/register', async (req, res, next) =>{

    if(!req.body.name||!req.body.password||!req.body.sex||!req.body.certificatesNo){
        Utils.renderJsonError(res, "请完善你的信息！");
    }

    var condition = {"name":req.body.name,"password":req.body.password}
    var cust = await Customer.findByCon(condition);

    console.log(cust.length);

    if(cust.length==0){
        var addJson = {
            name: req.body.name,
            password: req.body.password,
            sex:  req.body.sex,
            certificatesNo: req.body.certificatesNo,
        };
        await Customer.insert(addJson);

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
    }else{
        Utils.renderJsonError(res, "已存在注册用户！");
    }

});

module.exports = router;
