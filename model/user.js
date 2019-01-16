const plane_passenger = require('../db.js').plane_passenger;

module.exports = {
    insert: function (objJson) {
        return new Promise(function (resolve, reject) {
            new plane_passenger(objJson).save(function (err, res) {
                if (err) throw reject(err);
                else resolve(res);
            })
        })
    },
    insertOrUpdate: async function (objJson) {
        let order = await this.findById(objJson.orderNo);
        if (order) {
            delete objJson._id;
            await this.updateByCon({orderNo: objJson.orderNo}, objJson);
            return await this.findById(objJson.orderNo);
        } else {
            await this.insert(objJson);
            return await this.findById(objJson.orderNo);
        }
    },
    updateByCon: function (condition, updateStr) {
        return new Promise(function (resolve, reject) {
            plane_passenger.updateMany(condition, updateStr, function (err, res) {
                if (err) reject(err);
                else resolve(res)
            })
        })
    },
    findById: function (orderNo) {
        return new Promise(function (resolve, reject) {
            plane_passenger.findOne({orderNo: orderNo}, function (err, data) {
                if (err) reject(err);
                else resolve(data);
            })
        })
    },
    query: function () {
        return plane_passenger.find({});
    },
    find: function (condition) {
        return new Promise(function (resolve, reject) {
            plane_passenger.find(condition).lean().exec(function (err, data) {
                if (err) reject(err);
                else resolve(data);
            })
        })
    },
    findByCon: function (condition) {
        return new Promise(function (resolve, reject) {
            plane_passenger.findOne(condition).lean().exec(function (err, data) {
                if (err) reject(err);
                else resolve(data);
            })
        })
    },
    delByCon: function (condition) {
        return new Promise(function (resolve, reject) {
            plane_passenger.remove(condition, function (err, res) {
                if (err) throw reject(err);
                else resolve(res);
            })
        })
    },
    search: function (startDate, endDate, orderNo, ticketNo, passengerName, orderStatus, page = 0) {
        let query = plane_passenger.find({groupId: {$exists: true}});

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
                /*customers: {
                    $elemMatch: {
                        passengerName: new RegExp('^' + passengerName + '$', "i")
                    }
                }*/
                passengerName: new RegExp('^' + passengerName + "$", 'i')
            });
        }
        if (orderStatus) {
            query.where({
                orderStatus: new RegExp('^' + orderStatus + '$', "i")
            });
        }
        return new Promise((resolve, reject) => {
            query.skip(60 * page).limit(30).sort({groupId: -1}).exec((err, res) => {
                if (err) reject(err);
                else resolve(res);
            })
        });
    }
};