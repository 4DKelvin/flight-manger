const plane_orders = require('../db.js').plane_orders;

module.exports = {
    insert: function (objJson) {
        return new Promise(function (resolve, reject) {
            new plane_orders(objJson).save(function (err, res) {
                if (err) throw reject(err);
                else resolve(res);
            })
        })
    },
    updateByCon: function (condition, updateStr) {
        return new Promise(function (resolve, reject) {
            plane_orders.updateMany(condition, updateStr, function (err, res) {
                if (err) reject(err);
                else resolve(res)
            })
        })
    },
    findByCon: function (condition) {
        return new Promise(function (resolve, reject) {
            plane_orders.find(condition, function (err, data) {
                if (err) reject(err);
                else resolve(data);
            })
        })
    },
    delByCon: function (condition) {
        return new Promise(function (resolve, reject) {
            plane_orders.remove(condition, function (err, res) {
                if (err) throw reject(err);
                else resolve(res);
            })
        })
    },
    search: function (startDate, endDate, orderNo, ticketNo, passengerName, page = 1) {
        let query = plane_orders.find({});

        if (startDate || endDate) {
            let createAt = {};
            if (startDate) {
                createAt['$gte'] = Date.parse(startDate);
            }
            if (endDate) {
                createAt['$lte'] = Date.parse(endDate);
            }
            query.where({
                createAt: createAt
            });
        }
        if (orderNo) {
            query.where({
                orderNo: new RegExp('^' + orderNo + '$', "i")
            });
        }
        if (ticketNo) {
            query.where({
                ticket: new RegExp('^' + ticketNo + '$', "i")
            });
        }
        if (passengerName) {
            query.where({
                customers: {
                    $elemMatch: {
                        name: new RegExp('^' + passengerName + '$', "i")
                    }
                }
            });
        }
        return new Promise((resolve, reject) => {
            query.skip(30 * page).limit(30).exec((err, res) => {
                if (err) reject(err);
                else resolve(res);
            })
        });
    }
    // distanceType: String,
    // flightNo: String,
    // flightPosition: String,
    // airport: String,
    // time: Date,
    // type: String,
    // number: Number,
    // price: Number,
    // fuel: Number,
    // totalPrice: Number,
    // ticket: String,
    // customers: Array,
    // status: String,
    // operator: String,
    // lock: Boolean


};