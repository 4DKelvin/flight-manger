const request = require('request');
const host = "http://139.198.17.108:40002/";

module.exports = {
    content: function (params) {
        params["cid"] = "g59D9zUMjZ8uXsYp";
        return params;
    },
    query: function (api, params) {
        return new Promise((resolve, reject) => {
            request.post({
                url: host + api,
                body: this.content(params),
                json: true
            }, function (err, httpResponse, body) {
                if (err) reject(err);
                else resolve(body.data.result);
            })
        });
    },
    queryFlight: async function (departure, arrival, dep_date) {
        return await this.query("o_search", {
            "dep": departure,
            "arr": arrival,
            "dep_date": dep_date,
        });
    },
    queryPrice: async function (departure, arrival, dep_date, flight_no) {
        return await this.query("o_search_price", {
            "dep": departure,
            "arr": arrival,
            "dep_date": dep_date,
            "flight_no": flight_no
        });
    },
    booking: async function (departure, arrival, dep_date, dep_time, flight_no, price_detail) {
        return await this.query("o_booking", {
            "dep": departure,
            "arr": arrival,
            "dep_date": dep_date,
            "dep_time": dep_time,
            "flight_no": flight_no,
            "carrier": flight_no.substr(0, 2),
            "cabin_info": price_detail
        });
    },
    order: async function (name, identify, birthday, sex, booking_info) {
        return await this.query('o_order', {
            "psgs": [
                {
                    "name": name,
                    "cardNo": identify,
                    "birthday": birthday,
                    "sex": sex
                }
            ],
            "contact": {
                "name": "譚威",
                "phone": "13800138000",
                "prenum": "86"
            },
            "booking_info": booking_info
        })
    },
    orderDetail: async function (orderNo) {
        return await this.query('o_order_detail', {
            "orderNo": orderNo
        });
    },
    validate: async function (orderId, agent) {
        return await this.query('o_validate_pay', {
            "site": agent,
            "orderId": orderId
        })
    },
    pay: async function (orderId, agent) {
        await this.validate(orderId, agent);
        return await this.query('o_pay', {
            "site": agent,
            "orderId": orderId
        });
    }
};