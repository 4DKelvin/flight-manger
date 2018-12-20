const Order = require("./model/order");
const Api = require("./lib/flight");

setInterval(async () => {
    let orders = await Order.find({});
    for (let i = 0; i < orders.length; i++) {
        let local = orders[i];
        let order = await Api.orderDetail(local.orderNo);
        if (order) {
            if (!local.passengerTicketNo) {
                Api.sendTicket(await Order.insertOrUpdate({
                    orderNo: order.detail.orderNo,
                    orderStatus: order.detail.status,
                    notice: order.other.tgqMsg,
                    passengerTicketNo: order.passengers[0].ticketNo
                }));
            } else {
                await Order.insertOrUpdate({
                    orderNo: order.detail.orderNo,
                    orderStatus: order.detail.status,
                    notice: order.other.tgqMsg,
                    passengerTicketNo: order.passengers[0].ticketNo
                })
            }
        }
    }
}, 300000);