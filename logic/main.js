//const db = require('./orders')
const db = require('./customer')
const orderDb = require('./db').plane_orderList;

async function main(){
    // 条件查询
    /*var condition = {"airport":"白云机场"}
    console.log(await db.findByCon(condition));*/

    // 添加
    /*var obj = {
        "distanceType": "单程",
        "flightNo": "DR5337",
        "flightPosition": "U(经济舱)",
        "airport": "白云机场",
        "time": "2017-10-08",
        "type": "成人",
        "number": 1,
        "price": 702,
        "fuel": 80,
        "totalPrice": 1000
    }
    console.log(await db.insert(obj));*/

    // 更新
    /*var condition = {"price":702};
    var updateStr = {"totalPrice":2000};
    console.log(await db.updateByCon(condition,updateStr));*/

    // 删除
    /*var condition = {"number":1}
    console.log(await db.delByCon(condition));*/

    // customer 查询
    /*var condition = {"sex":"男"};
    console.log(await db.findByCon());*/
    //console.log(await orderDb.find());

    var condition = {
        "orderNo" : "5216899189144",
        "orderTime" : "2018-10-25 16:54:58",
        "type" : "单程",
        "launchPlace" : "SHE",
        "landPlace" : "KMG",
        "flightTime" : "2018-12-25 16:54:58",
        "number" : 5,
        "price" : 700,
        "status" : "支付成功等待出票",
        "name" : "张三"
    }

    /*new orderDb(condition).save();*/
    console.log(await orderDb.find());

}

main();

