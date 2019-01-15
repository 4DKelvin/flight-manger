const Order = require("./model/order");
const Api = require("./lib/flight");
const User = require("./model/user");

setInterval(async () => {
    let orders = await Order.find({});
    for (let i = 0; i < orders.length; i++) {
        let local = orders[i];
        let order = await Api.orderDetail(local.orderNo);
        if (order) {
            if (local.passengerTicketNo !== order.passengers[0].ticketNo || local.orderStatus !== order.detail.status) {
                let tag = 'flight.national.afterservice.ticketNoUpdate';
                if (local.orderStatus !== order.detail.status) {
                    tag = 'flight.national.afterservice.orderStatusNotify';
                }
                let o = await Order.insertOrUpdate({
                    orderNo: order.detail.orderNo,
                    orderStatus: order.detail.status,
                    notice: order.other.tgqMsg
                });
                for (let j = 0; j < order.passengers.length; j++) {
                    let r = order.passengers[j];
                    await User.updateByCon({
                        passengerName: r.name
                    }, {
                        passengerTicketTime: new Date().getTime(),
                        passengerTicketNo: r.ticketNo
                    })
                }
                let us = await User.find({orderNo: order.detail.orderNo})
                if (us.every((e) => {
                    return e.passengerTicketNo != null;
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