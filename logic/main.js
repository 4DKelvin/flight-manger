//const db = require('./orders')
const db2 = require('./customer')

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
    var condition = {"sex":"男"};
    console.log(await db2.findByCon(condition));

}

main();

