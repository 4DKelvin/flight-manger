const plane_orders = require('./db.js').plane_orders;

module.exports = {
    insert: function (objJson) {
        return new Promise(function (resolve, reject) {
            new plane_orders(objJson).save(function (err,res) {
                if(err) throw reject(err);
                else resolve(res);
            })
        })
    },
    updateByCon:function(condition,updateStr){
        return new Promise(function (resolve, reject) {
            plane_orders.updateMany(condition,updateStr,function (err,res) {
                if (err) reject(err);
                else resolve(res)
            })
        })
    },
    findByCon:function(condition){
        return new Promise(function (resolve,reject) {
            plane_orders.find(condition,function (err,data) {
                if(err)reject(err);
                else resolve(data);
            })
        })
    },
    delByCon:function (condition) {
        return new Promise(function (resolve, reject) {
            plane_orders.remove(condition,function (err,res) {
                if(err) throw reject(err);
                else resolve(res);
            })
        })
    }



};