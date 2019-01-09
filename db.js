const mongoose = require('mongoose');
mongoose.connect('mongodb://root:PXW6bjU36TBdk4k3@192.168.7.204:27017/admin',{ useNewUrlParser: true });

module.exports = {
    plane_orders: mongoose.model('plane_orders', {
        orderId: Number,
        orderNo: String,
        orderStatus: String,
        orderTotalPrice: Number,
        orderOriginPrice: Number,
        orderConstructionFee: Number,
        orderFuelTax: Number,
        orderRealPrice: Number,
        orderAgent: String,
        passengerName: String,
        passengerType: String,
        passengerIdentifyType: String,
        passengerIdentify: String,
        passengerTicketNo: String,
        passengerTicketTime: Number,
        passengerInsuranceNo: String,
        flightNo: String,
        flightDate: String,
        flightDeparture: String,
        flightDepartureTime: Number,
        flightDepartureCode: String,
        flightArrival: String,
        flightArrivalCode: String,
        flightArrivalTime: Number,
        flightCabin: String,
        refundAmount: Number,
        refundFee: Number,
        createAt: Number,
        notice: String,
        operator: String,
        lock: String,
        groupId: String
    }),
    plane_customer: mongoose.model('plane_customer', {
        name: String,
        sex: String,
        password: String,
        certificatesType: String,
        certificatesNo: String,
        periodOfVali: Date
    }),
    plane_log: mongoose.model('plane_log', {
        name: String,
        dateTime: Number,
        control: String,
        orderNo: String,
        groupId: String
    }),
    plane_change_order: mongoose.model('plane_change_order', {
        orderNo: String,
        orderStatus: String,
        changeOrderId: String,
        changeOrderTicket: String,
        groupId: String,
        changeCauseId: String,
        passengerIds: String,
        applyRemarks: String,
        uniqKey: String,
        qgId: String,
        gqFee: Number,
        allFee: Number,
        upgradeFee: Number,
        flightNo: String,
        cabinCode: String,
        startDate: String,
        startTime: String,
        endTime: String
    }),
    booking_key: mongoose.model('booking_key', {
        name: String,
        content: String
    }),
    change_key: mongoose.model('change_key', {
        name: String,
        content: String
    })
};