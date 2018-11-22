const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/plane');

module.exports = {
    plane_orders: mongoose.model('plane_orders', {
        distanceType: String,
        flightNo: String,
        flightPosition: String,
        airport: String,
        time: Number,
        orderType: String,
        orderNo: String,
        price: Number,
        fuel: Number,
        totalPrice: Number,
        ticket: String,
        createAt: Number,
        customers: Array,
        status: String,
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