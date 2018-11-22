let express = require('express');
let router = express.Router();
let Api = require('./api');
let Order = require('../model/order');
let Customer = require('../model/customer');
let Utils = require('./utils');

/* GET home page. */
router.get('/', async function (req, res, next) {
    var orders = await Order.search(req.query.start, req.query.end, req.query.orderId, req.query.tickerNo, req.query.name, req.query.page || 1);
    res.render('index', {
        title: '訂單管理',
        orders: orders.map((o) => {
            if (o.createAt) {
                o.createAt = Utils.formatDateTime(o.createAt);
            }
            if (o.time) {
                o.time = Utils.formatDateTime(o.time);
            }
            return o;
        })
    });
});

router.get('/detail', function (req, res, next) {
    res.render('detail', {title: '訂單詳情'});
});
module.exports = router;
