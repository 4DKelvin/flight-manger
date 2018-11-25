let express = require('express');
let router = express.Router();
let Order = require('../model/order');
let Utils = require('../lib/utils');
let Api = require('../lib/flight');

/* GET home page. */
router.get('/', async (req, res, next) => {
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
});

router.get('/detail', async (req, res, next) => {
    var condition = {orderNo: req.query.orderNo}
    var order = await Order.findByCon(condition);
    var startTime = Utils.formatDateTime(order.flightDepartureTime);
    var endTime = Utils.formatDateTime(order.flightArrivalTime);
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
    res.render('detail', {
        title: '訂單詳情',
        sum: '¥ ' + Number(order.orderFuelTax + order.orderConstructionFee).toFixed(2),
        order: order,
        startTime: startTime,
        endTime: endTime
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
        try {
            Utils.renderJson(res, await Api.pay(req.query.orderId, req.query.orderAgent));
        } catch (e) {
            Utils.renderJsonError(res, "支付失敗，原因：" + e);
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

module.exports = router;
