var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/root';
module.exports = async function () {
    return await new Promise(function(resolve,reject){
        MongoClient.connect(url,function (err , db) {
            if (err) reject(err) ;
            else resolve(db);
        });
    });
};