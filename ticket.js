const Order = require("./model/order");
const Api = require("./lib/flight");

setInterval(async () => {
    let orders = await Order.findByCon({
        passengerTicketNo: null
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
}, 300000);