const Order = require("./model/order");
const Api = require("./lib/flight");

let main = async () => {
    let orders = await Order.findByCon({
        groupId: "TAN1545213127447"
    });
    for (let i = 0; i < orders.length; i++) {
        console.log(await Api.sendTicket(orders[i]));
    }
};

main();
