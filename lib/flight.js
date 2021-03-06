const request = require('request');
const md5 = require('md5-node');
const Utils = require('../lib/utils');
const User = require('../model/user');
const ChangeOrder = require('../model/change');
const host = "http://139.198.17.113:40001/";
const callback = "http://139.198.19.42:3000/api/callback";

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
                console.log('[POST]:' + api + ", Request Body: ", params);
                console.log('[RESULT]:' + api + ", Response: ", body);
                if (err) reject(err);
                else if (Number(body.status) === 0 && Number(body.data.code) === 0)
                    resolve(body.data.result ? body.data.result : body.data);
                else reject(body.data.message || body.msg);
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
    order: async function (passageers, booking_info) {
        return await this.query('o_order', {
            "psgs": passageers,
            "contact": {
                "name": "胡宇哲",
                "phone": "13197674734",
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
        // await this.validate(orderId, agent);
        return await this.query('o_pay', {
            "site": agent,
            "orderId": orderId,
            "callbackUrl": "http://139.198.19.42:3000/api/callback"
        });
    },
    refundReasons: async function (orderNo) {
        return await this.query('o_refund_search', {
            "orderNo": orderNo
        });
    },
    refund: async function (params) {
        params["callbackUrl"] = callback;
        return await this.query('o_refund_apply', params);
    },
    changeReasons: async function (orderNo, date) {
        return await this.query('o_change_search', {
            "orderNo": orderNo,
            "changeDate": date
        });
    },
    change: async function (params) {
        params["callbackUrl"] = callback;
        return await this.query('o_change_apply', params);
    },
    changePay: async function (orderNo, gqId, passengerId, totalAmount) {
        return await this.query('o_change_pay', {
            "orderNo": orderNo,
            "gqId": gqId,
            "passengerIds": passengerId,
            "totalAmount": totalAmount,
            "applyRemarks": "確認退票",
            "callbackUrl": callback
        });
    },
    sendTicket: async function (order, type) {
        let status = {
            "未知状态":"-1",
        	"退款申请中":"1",
        	"退款已确认":"2",
        	"退款完成":"3",
        	"退款被拒绝":"4",
        	"等待重新审核":"5",
        	"退款失败":"6"
        };
        let timestamp = new Date().getTime();
        let channel = '40012';
        let tag = type ? type : "flight.national.afterservice.ticketNoUpdate";
        let token = 'Round&29*#we#Er';
        let ps = [];
        let users = await User.find({groupId:order.groupId});
        for(let i =0;i<users.length;i++){
            let e= users[i];
            ps.push({
                "name": e.passengerName,
                "cardType": "NI",
                "cardNum": e.passengerIdentify,
                "tickets": [{
                    "ticketNo": e.passengerTicketNo, //票号
                    "cabin": "Y", //舱位
                    "printPrice": e.orderOriginPrice, //票面价格
                    "ticketTime": Utils.formatDateTime(new Date()), //出票时间yyyy-MM-dd HH:mm:ss
                    "segmentIndex": {
                        "flightNum": order.flightNo, //出票航段航班号
                        "sequenceNum": 1 //出票航段索引
                    }
                }]
            })
        }
        let content = JSON.stringify(type == "flight.national.afterservice.ticketNoUpdate" ? {
            "orderNo": order.groupId,
            "ticketPassengers": ps
        } : {
            "orderNo":  order.groupId, //订单号
            "serviceOrderNo": order.groupId,
            "serviceOrderType": 0,
            "serviceOrderStatus": status[order.orderStatus],
            "dataExt": {
                "freeRefundMsg": "其他原因", // 二次退款原因
                "freeRefundMoney": order.refundAmount // 二次退款金额
            } // 扩展字段
        });
        content = Utils.encodeBase64(content);
        let data = {
            "context": {
                "version": "1.0.0",
                "sign": md5("timestamp=" + timestamp + "data=" + content + "key=" + token + "tag=" + tag).toString().toLowerCase(),
                "timestamp": timestamp,//时间戳，精确到毫秒
                "channel": channel,//渠道
                "source": "Car",//来源
                "tag": tag//接口tag名称标识
            },
            "data": content//base64编码
        };
        return await new Promise((resolve, reject) => {
            request.post({
                url: "http://apiproxy-uat.ctripqa.com/apiproxy/car/izcDistributionService/zhixingcallback/40012/1/callback",
                body: data,
                json: true
            }, function (err, httpResponse, body) {
                console.log(body);
                if (err) reject(err);
                else resolve(body);
            })
        });
    }
};