const Order = require("./model/order");
const Api = require("./lib/flight");

let main = async () => {
    let orders = await Order.findByCon({
        groupId: "TAN1545213127447"
    });

    for (let i = 0; i < orders.length; i++) {
        let local = orders[i];
        let order = await Api.orderDetail(local.orderNo);
        if (order) {
            await Order.insertOrUpdate({
                orderNo: order.detail.orderNo,
                orderStatus: order.detail.status,
                notice: order.other.tgqMsg,
                passengerTicketNo: order.passengers[0].ticketNo
            });
            if (order.passengers[0].ticketNo) {
                await Api.sendTicket(await Order.findById(order.detail.orderNo));
            }
        }
    }
};

main();