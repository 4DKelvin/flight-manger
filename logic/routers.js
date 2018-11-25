let express = require('express');
let router = express.Router();
let Order = require('../model/order');
let Customer = require('../model/customer');
let Utils = require('../lib/utils');

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
module.exports = router;
