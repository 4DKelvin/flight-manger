const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/plane');

module.exports = {
    plane_orders: mongoose.model('plane_orders', {
        name: String
    }),
    customer: mongoose.model('customer', {
        name: String
    }),
};