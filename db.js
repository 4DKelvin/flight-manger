const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/plane');

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
        notice: String,
        operator: String,
        lock: Boolean
    }),
    plane_customer: mongoose.model('plane_customer', {
        name: String,
        sex: String,
        certificatesType: String,
        certificatesNo: String,
        periodOfVali: Date
    }),
};