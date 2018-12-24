const plane_orders = require('../db.js').plane_change_order;

module.exports = {
    insert: function (objJson) {
        return new Promise(function (resolve, reject) {
            new plane_orders(objJson).save(function (err, res) {
                if (err) throw reject(err);
                else resolve(res);
            })
        })
    },
    findById: function (orderNo) {
        return new Promise(function (resolve, reject) {
            plane_orders.findOne({orderNo: orderNo}, function (err, data) {
                if (err) reject(err);
                else resolve(data);
            })
        })
    },
    query: function () {
        return plane_orders.find({});
    },
    find: function (condition) {
        return new Promise(function (resolve, reject) {
            plane_orders.find(condition).lean().exec(function (err, data) {
                if (err) reject(err);
                else resolve(data);
            })
        })
    }
};