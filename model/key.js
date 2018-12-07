const keys = require('../db.js').booking_key;
const Utils = require("../lib/utils");

module.exports = {
    set: function (key, value) {
        return new Promise(function (resolve, reject) {
            let item = {
                name: key || Utils.encodeBase64(new Date().getTime().toString()),
                content: Utils.encodeBase64(JSON.stringify(value))
            };
            new keys(item).save(function (err, res) {
                if (err) throw reject(err);
                else resolve(item.name);
            })
        })
    },
    get: function (key) {
        return new Promise(function (resolve, reject) {
            keys.findOne({name: key}).lean().exec(function (err, data) {
                if (err) reject(err);
                else resolve(data.content);
            })
        })
    }

};