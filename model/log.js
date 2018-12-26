const plane_controlLog = require('../db.js').plane_log;

module.exports = {
    insert: function (objJson) {
        return new Promise(function (resolve, reject) {
            new plane_controlLog(objJson).save(function (err,res) {
                if(err) throw reject(err);
                else resolve(res);
            })
        })
    },
    updateByCon:function(condition,updateStr){
        return new Promise(function (resolve, reject) {
            plane_controlLog.updateMany(condition,updateStr,function (err,res) {
                if (err) reject(err);
                else resolve(res)
            })
        })
    },
    findByCon:function(condition){
        return new Promise(function (resolve,reject) {
            plane_controlLog.find(condition,function (err,data) {
                if(err) reject(err);
                else resolve(data);
            })
        })
    },
    delByCon:function (condition) {
        return new Promise(function (resolve, reject) {
            plane_controlLog.remove(condition,function (err,res) {
                if(err) throw reject(err);
                else resolve(res);
            })
        })
    }



};