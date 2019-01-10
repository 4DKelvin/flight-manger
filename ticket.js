const Order = require("./model/order");
const Api = require("./lib/flight");

setInterval(async () => {
    let orders = await Order.find({});
    for (let i = 0; i < orders.length; i++) {
        let local = orders[i];
        let order = await Api.orderDetail(local.orderNo);
        if (order) {
            if (local.passengerTicketNo !== order.passengers[0].ticketNo || local.orderStatus !== order.detail.status) {
                let tag = 'flight.national.afterservice.ticketNoUpdate';
                if (local.orderStatus !== order.detail.status) {
                    tag = 'flight.national.afterservice.flightChange';
                }
                let o = await Order.insertOrUpdate({
                    orderNo: order.detail.orderNo,
                    orderStatus: order.detail.status,
                    notice: order.other.tgqMsg,
                    passengerTicketTime: new Date().getTime(),
                    passengerTicketNo: order.passengers[0].ticketNo
                });
                let os = await Order.find({groupId: local.groupId});
                if (os.every((e) => {
                    return !!e.passengerTicketNo;
                })) {
                    await Api.sendTicket(o, tag);
                }
            } else {
                await Order.insertOrUpdate({
                    orderNo: order.detail.orderNo,
                    orderStatus: order.detail.status,
                    notice: order.other.tgqMsg,
                    passengerTicketTime: new Date().getTime(),
                    passengerTicketNo: order.passengers[0].ticketNo
                })
            }
        }
    }
}, 10000);