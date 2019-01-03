const keys = require('../db.js').booking_key;
const Utils = require("../lib/utils");

module.exports = {
    set: function (key, value) {
        return new Promise(function (resolve, reject) {
            let item = {
                name: key,
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
                try {
                    if (err) reject(err);
                    else resolve(JSON.parse(Utils.decodeBase64(data.content)));
                } catch (e) {
                    reject(e);
                }
            })
        })
    }

};