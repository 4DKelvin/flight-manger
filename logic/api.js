let express = require('express');
let router = express.Router();
let Api = require('../lib/flight');
let Utils = require('../lib/utils');
let Order = require('../model/order');

router.get('/flights', async (req, res, next) => {
    if (req.query.dep && req.query.arr && req.query.start && req.query.end) {
        let dep = req.query.dep.toUpperCase();
        let arr = req.query.arr.toUpperCase();
        let start = req.query.start;
        let end = req.query.end;
        try {
            let result = await Api.queryFlight(dep, arr, start);
            let result2 = await Api.queryFlight(arr, dep, end);
            if (result && result.flightInfos && result.flightInfos.length &&
                result2 && result2.flightInfos && result2.flightInfos.length) {
                let response = {};
                response[req.query.start] = {};
                response[req.query.end] = {};
                result.flightInfos.forEach((flight) => {
                    response[req.query.start][flight.dptTime] = {
                        flightNum: flight.flightNum,
                        flightTimes: flight.flightTimes,
                        flightTypeFullName: flight.flightTypeFullName,
                        flightDistance: flight.distance,
                        flightCarrier: flight.carrier,
                        flightBarePrice: flight.barePrice,
                        flightDiscount: flight.discount,
                        planeType: flight.planetype,
                        arr: flight.arr,
                        arrAirport: flight.arrAirport,
                        arrTime: flight.arrTime,
                        arrTerminal: flight.arrTerminal,
                        dep: flight.dpt,
                        depAirport: flight.dptAirport,
                        depTime: flight.dptTime,
                        depTerminal: flight.dptTerminal,
                        priceTicket: Utils.encodeBase64(JSON.stringify({
                            dep: flight.dpt,
                            arr: flight.arr,
                            date: req.query.start,
                            time: flight.dptTime,
                            num: flight.flightNum
                        })),
                        priceUrl: req.protocol + "://" + req.get('host') + "/api/prices?ticket=" + Utils.encodeBase64(JSON.stringify({
                            dep: flight.dpt,
                            arr: flight.arr,
                            date: req.query.start,
                            time: flight.dptTime,
                            num: flight.flightNum
                        }))
                    };
                });
                result2.flightInfos.forEach((flight) => {
                    response[req.query.end][flight.dptTime] = {
                        flightNum: flight.flightNum,
                        flightTimes: flight.flightTimes,
                        flightTypeFullName: flight.flightTypeFullName,
                        flightDistance: flight.distance,
                        flightCarrier: flight.carrier,
                        flightBarePrice: flight.barePrice,
                        flightDiscount: flight.discount,
                        planeType: flight.planetype,
                        arr: flight.arr,
                        arrAirport: flight.arrAirport,
                        arrTime: flight.arrTime,
                        arrTerminal: flight.arrTerminal,
                        dep: flight.dpt,
                        depAirport: flight.dptAirport,
                        depTime: flight.dptTime,
                        depTerminal: flight.dptTerminal,
                        queryTicket: Utils.encodeBase64(JSON.stringify({
                            dep: flight.dpt,
                            arr: flight.arr,
                            date: req.query.end,
                            time: flight.dptTime,
                            num: flight.flightNum
                        })),
                        queryUrl: req.protocol + "://" + req.get('host') + "/api/prices?ticket=" + Utils.encodeBase64(JSON.stringify({
                            dep: flight.dpt,
                            arr: flight.arr,
                            date: req.query.end,
                            time: flight.dptTime,
                            num: flight.flightNum
                        }))
                    };
                });
                Utils.renderJson(res, response);
            } else {
                Utils.renderJsonError(res, "查詢失敗，無航班信息");
            }
        } catch (e) {
            Utils.renderJsonError(res, "查詢失敗，原因：" + e);
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.get('/prices', async (req, res, next) => {
    try {
        let params = JSON.parse(Utils.decodeBase64(req.query.ticket));
        let dep = params.dep.toUpperCase();
        let arr = params.arr.toUpperCase();
        let flightNo = params.num.toUpperCase();
        let time = params.time;
        let date = params.date;
        try {
            let result = await Api.queryPrice(dep, arr, date, flightNo);
            if (result && result.vendors && result.vendors.length) {
                Utils.renderJson(res, result.vendors.map((vendor) => {
                    return {
                        dep: dep,
                        arr: arr,
                        date: date,
                        price: vendor.price,
                        client: vendor.domain,
                        cabin: vendor.cabin,
                        time: time,
                        flightNo: flightNo,
                        ticket: Utils.encodeBase64(JSON.stringify({
                            dep: dep, arr: arr, date: date, time: time, flightNo: flightNo, price: vendor
                        }))
                    };
                }).sort(function (a, b) {
                    return a.price - b.price;
                })[0]);
            } else {
                Utils.renderJsonError(res, "無價格信息結果");
            }
        } catch (e) {
            Utils.renderJsonError(res, "查詢失敗，原因：" + e);
        }
    } catch (ex) {
        Utils.renderJsonError(res, "參數錯誤");
    }
});


router.get('/order', async (req, res, next) => {
    if (req.query.id) {
        let orders = await new Promise((resolve, reject) => {
            Order.query().where({groupId: req.query.id}).lean().exec((err, orders) => {
                if (err) reject(err);
                else resolve(orders);
            })
        });
        try {
            for (let key in orders) {
                let order = await Api.orderDetail(orders[key].orderNo);
                if (order) {
                    await Order.insertOrUpdate({
                        orderNo: order.detail.orderNo,
                        orderStatus: order.detail.status,
                        notice: order.other.tgqMsg,
                        passengerTicketNo: order.passengers[0].ticketNo
                    });
                }
            }
            Utils.renderJson(res, await groupDetail(req.query.id));
        } catch (e) {
            Utils.renderJsonError(res, "查詢失敗，原因：" + e);
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.get('/refund', async (req, res, next) => {
    if (req.query.order) {
        let result = await Api.refundReasons(req.query.order);
        Utils.renderJson(res, result[0].refundSearchResult.tgqReasons);
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.post('/refund', async (req, res, next) => {
    if (req.query.order && req.body.code) {
        try {

            let result = await Api.refundReasons(req.query.order);
            if (!result[0].refundSearchResult) {
                Utils.renderJsonError(res, "此訂單已經申請退款");
            } else {
                let refundInfo = result[0].refundSearchResult.tgqReasons.find(function (e) {
                    if (Number(e.code) === Number(req.body.code)) return e;
                });
                Utils.renderJson(res, await Api.refund({
                    "orderNo": req.query.order,
                    "passengerIds": result[0].id,
                    "refundCause": refundInfo.msg,
                    "refundCauseId": refundInfo.code
                }));
            }
        } catch (e) {
            Utils.renderJsonError(res, "退票操作失敗，原因：" + e);
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.get('/change', async (req, res, next) => {
    if (req.query.order && req.query.date) {
        let result = await Api.changeReasons(req.query.order, req.query.date);
        Utils.renderJson(res, result[0].changeSearchResult.tgqReasons[0].changeFlightSegmentList);
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.post('/change', async (req, res, next) => {
    if (req.query.order && req.query.date && req.body.unique) {
        let result = await Api.changeReasons(req.query.order, req.query.date);
        if (!result[0].changeSearchResult) {
            Utils.renderJsonError(res, "此訂單已經申請改簽");
        } else {
            let reason = result[0].changeSearchResult.tgqReasons[0];
            let changeInfo = reason.changeFlightSegmentList.find(function (e) {
                if (e.uniqKey === req.body.unique) return e;
            });
            let changeRes = await Api.change({
                orderNo: req.query.order,
                changeCauseId: reason.code,
                passengerIds: result[0].id,
                applyRemarks: reason.msg,
                uniqKey: req.body.unique,
                gqFee: changeInfo.gqFee,
                upgradeFee: changeInfo.upgradeFee,
                flightNo: changeInfo.flightNo,
                cabinCode: changeInfo.cabinCode,
                startDate: req.query.date,
                startTime: changeInfo.startTime,
                endTime: changeInfo.endTime
            });
            Utils.renderJson(res, {
                "orderNo": changeRes[0].changeApplyResult.orderNo,
                "gqId": changeRes[0].changeApplyResult.gqId,
                "passengerIds": result[0].id,
                "totalAmount": changeInfo.allFee
            });
        }

    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});


router.post('/booking', async (req, res, next) => {
    try {
        let start = JSON.parse(Utils.decodeBase64(req.body.startTicket));
        let end = JSON.parse(Utils.decodeBase64(req.body.endTicket));
        let name = req.body.name;
        let identify = req.body.identify;
        let birthday = req.body.birthday;
        let sex = req.body.sex;

        try {
            let groupId = "TAN" + new Date().getTime();
            let bookingStart = await Api.booking(start.dep, start.arr, start.date, start.time, start.flightNo, start.price);
            let bookingEnd = await Api.booking(end.dep, end.arr, end.date, end.time, end.flightNo, end.price);
            if (bookingStart && bookingEnd) {
                let order = await Api.order(name, identify, birthday, sex, bookingStart);
                let orderInfo = await Api.orderDetail(order.orderNo);
                let arrTime = orderInfo.flightInfo[0].deptTime;
                await Order.insertOrUpdate({
                    groupId: groupId,
                    orderId: order.id,
                    orderNo: orderInfo.detail.orderNo,
                    orderStatus: orderInfo.detail.status,
                    orderTotalPrice: orderInfo.passengerTypes[0].allPrices,
                    orderOriginPrice: orderInfo.passengerTypes[0].printPrice,
                    orderConstructionFee: orderInfo.passengerTypes[0].constructionFee,
                    orderFuelTax: orderInfo.passengerTypes[0].fuelTax,
                    orderRealPrice: orderInfo.passengerTypes[0].realPrice,
                    orderAgent: bookingStart.extInfo.clientId,
                    passengerName: orderInfo.passengers[0].name,
                    passengerType: orderInfo.passengers[0].type,
                    passengerIdentifyType: orderInfo.passengers[0].cardType,
                    passengerIdentify: orderInfo.passengers[0].cardNum,
                    passengerTicketNo: orderInfo.passengers[0].ticketNo,
                    passengerInsuranceNo: orderInfo.passengers[0].insuranceNo,
                    flightNo: orderInfo.flightInfo[0].flightNum,
                    flightDate: Date.parse(start.date),
                    flightDeparture: orderInfo.flightInfo[0].dptCity,
                    flightDepartureCode: orderInfo.flightInfo[0].dptAirportCode,
                    flightDepartureTime: Date.parse(start.date + ' ' + start.time),
                    flightArrival: orderInfo.flightInfo[0].arrCity,
                    flightArrivalCode: orderInfo.flightInfo[0].arrAirportCode,
                    flightArrivalTime: Date.parse(start.date + ' ' + arrTime.substr(arrTime.lastIndexOf('-') + 1)),
                    flightCabin: orderInfo.flightInfo[0].cabin,
                    notice: orderInfo.other.tgqMsg,
                });
                order = await Api.order(name, identify, birthday, sex, bookingEnd);
                orderInfo = await Api.orderDetail(order.orderNo);
                arrTime = orderInfo.flightInfo[0].deptTime;
                await Order.insertOrUpdate({
                    groupId: groupId,
                    orderId: order.id,
                    orderNo: orderInfo.detail.orderNo,
                    orderStatus: orderInfo.detail.status,
                    orderTotalPrice: orderInfo.passengerTypes[0].allPrices,
                    orderOriginPrice: orderInfo.passengerTypes[0].printPrice,
                    orderConstructionFee: orderInfo.passengerTypes[0].constructionFee,
                    orderFuelTax: orderInfo.passengerTypes[0].fuelTax,
                    orderRealPrice: orderInfo.passengerTypes[0].realPrice,
                    orderAgent: bookingEnd.extInfo.clientId,
                    passengerName: orderInfo.passengers[0].name,
                    passengerType: orderInfo.passengers[0].type,
                    passengerIdentifyType: orderInfo.passengers[0].cardType,
                    passengerIdentify: orderInfo.passengers[0].cardNum,
                    passengerTicketNo: orderInfo.passengers[0].ticketNo,
                    passengerInsuranceNo: orderInfo.passengers[0].insuranceNo,
                    flightNo: orderInfo.flightInfo[0].flightNum,
                    flightDate: Date.parse(end.date),
                    flightDeparture: orderInfo.flightInfo[0].dptCity,
                    flightDepartureCode: orderInfo.flightInfo[0].dptAirportCode,
                    flightDepartureTime: Date.parse(end.date + ' ' + end.time),
                    flightArrival: orderInfo.flightInfo[0].arrCity,
                    flightArrivalCode: orderInfo.flightInfo[0].arrAirportCode,
                    flightArrivalTime: Date.parse(end.date + ' ' + arrTime.substr(arrTime.lastIndexOf('-') + 1)),
                    flightCabin: orderInfo.flightInfo[0].cabin,
                    notice: orderInfo.other.tgqMsg,
                });
                Utils.renderJson(res, await groupDetail(groupId));
            } else {
                Utils.renderJsonError(res, "預約失敗，票價已更新，無發預約");
            }
        } catch (e) {
            Utils.renderJsonError(res, "預約失敗,原因：" + e);
        }
    } catch (ex) {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

async function groupDetail(groupId) {
    let orders = await new Promise((resolve, reject) => {
        Order.query().where({groupId: groupId}).lean().exec((err, orders) => {
            if (err) reject(err);
            else resolve(orders);
        })
    });
    let res = {
        orderId: groupId,
        flights: {}
    };
    orders.forEach((order) => {
        delete order.groupId;
        delete order.orderId;
        delete order.orderNo;
        order.id = groupId + order._id.toString().toUpperCase();
        delete order._id;
        res.flights[Utils.formatDate(order.flightDate)] = order;
    });
    return res;
}

module.exports = router;
