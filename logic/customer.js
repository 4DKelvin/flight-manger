const plane_customer = require('./db.js').plane_customer
;

module.exports = {
    insert: function (objJson) {
        return new Promise(function (resolve, reject) {
            new plane_customer(objJson).save(function (err,res) {
                if(err) throw reject(err);
                else resolve(res);
            })
        })
    },
    updateByCon:function(condition,updateStr){
        return new Promise(function (resolve, reject) {
            plane_customer.updateMany(condition,updateStr,function (err,res) {
                if (err) reject(err);
                else resolve(res)
            })
        })
    },
    findByCon:function(condition){
        return new Promise(function (resolve,reject) {
            plane_customer.find(condition,function (err,data) {
                if(err) reject(err);
                else resolve(data);
            })
        })
    },
    delByCon:function (condition) {
        return new Promise(function (resolve, reject) {
            plane_customer.remove(condition,function (err,res) {
                if(err) throw reject(err);
                else resolve(res);
            })
        })
    }



};