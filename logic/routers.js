let express = require('express');
let router = express.Router();
let Order = require('../model/order');
let Customer = require('../model/customer');
let Utils = require('../lib/utils');
let Api = require('../lib/flight');

/* GET home page. */
router.get('/', async (req, res, next) => {
    var orders = await Order.search(req.query.start, req.query.end, req.query.orderId, req.query.tickerNo, req.query.name, req.query.page || 0);

    res.render('index', {
        title: '訂單管理',
        orders: orders.map((o) => {
            if (o.flightDate) {
                o.flightDate = Utils.formatDateTime(o.flightDate);
            }
            if (o.flightDepartureTime) {
                o.flightDepartureTime = Utils.formatDateTime(o.flightDepartureTime);
            }
            return o;
        })
    });
});

router.get('/detail', async (req, res, next) => {
    var condition = {orderNo:req.query.orderNo}
    var order = await Order.findByCon(condition);
    var startTime = Utils.formatDateTime(order.flightDepartureTime);
    var endTime = Utils.formatDateTime(order.flightArrivalTime);
    console.log(startTime+endTime);

    res.render('detail', {title: '訂單詳情',sum:order.orderFuelTax+order.orderConstructionFee,
        order:order,
        startTime:startTime,
        endTime:endTime
    });
});

router.get('/refreshOrder', async (req, res, next) => {
    if (req.query.orderNo) {
        let order = await Api.orderDetail(req.query.orderNo);
        if (order) {
            Utils.renderJson(res, await Order.insertOrUpdate({
                orderNo: order.detail.orderNo,
                orderStatus: order.detail.status,
                notice: order.other.tgqMsg,
            }));
        } else {
            Utils.renderJsonError(res, "無結果");
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.get('/pay', async (req, res, next) => {
    if (!isNaN(req.query.orderId) && req.query.orderAgent) {
         //真實支付接口測試慎重
                console.log(req.query.orderAgent+req.query.orderId)
                try {
                    let payRes = await Api.pay(req.query.orderId, req.query.orderAgent);
                    let ticket = res.results[0];
                    console.log(ticket); //支付成功，取得收據
                    Utils.renderJson(res,payRes);
                } catch (e) {
                    console.log(e); //支付失敗，e=>原因
                    Utils.renderJsonError(res, "無結果");
                }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

module.exports = router;
