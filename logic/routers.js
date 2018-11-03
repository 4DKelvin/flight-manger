let express = require('express');
let router = express.Router();
let api = require('./api');

/* GET home page. */
router.get('/', async function (req, res, next) {
    res.render('index', {title: '訂單管理', orders: await api.queryOrder()});
});
router.get('/detail', function (req, res, next) {
    res.render('detail', {title: '訂單詳情'});
});

module.exports = router;
