let express = require('express');
let router = express.Router();
let Api = require('../lib/flight');
let Utils = require('../lib/utils');
let Order = require('../model/order');

router.get('/flights', async (req, res, next) => {
    if (req.query.dep && req.query.arr && req.query.date) {
        let dep = req.query.dep.toUpperCase();
        let arr = req.query.arr.toUpperCase();
        let date = req.query.date;
        try {
            let result = await Api.queryFlight(dep, arr, date);
            if (result && result.flightInfos && result.flightInfos.length) {
                Utils.renderJson(res, result.flightInfos.map((flight) => {
                    return {
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
                        depTerminal: flight.dptTerminal
                    };
                }));
            } else {
                Utils.renderJsonError(res, "查詢失敗，航班信息");
            }
        } catch (e) {
            Utils.renderJsonError(res, "查詢失敗，原因：" + e);
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

router.get('/prices', async (req, res, next) => {
    if (req.query.dep && req.query.arr && req.query.date && req.query.flightNo) {
        let dep = req.query.dep.toUpperCase();
        let arr = req.query.arr.toUpperCase();
        let flightNo = req.query.flightNo.toUpperCase();
        let date = req.query.date;
        try {
            let result = await Api.queryPrice(dep, arr, date, flightNo);
            if (result && result.vendors && result.vendors.length) {
                Utils.renderJson(res, result.vendors.map((vendor) => {
                    return {
                        price: vendor.price,
                        client: vendor.domain,
                        cabin: vendor.cabin,
                        encrypted_info: Utils.encodeBase64(JSON.stringify(vendor))
                    };
                }));
            } else {
                Utils.renderJsonError(res, "無價格信息結果");
            }
        } catch (e) {
            Utils.renderJsonError(res, "查詢失敗，原因：" + e);
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});


router.get('/order', async (req, res, next) => {
    if (req.query.orderNo) {
        try {
            let order = await Api.orderDetail(req.query.orderNo);
            if (order) {
                Utils.renderJson(res, await Order.insertOrUpdate({
                    orderNo: order.detail.orderNo,
                    orderStatus: order.detail.status,
                    notice: order.other.tgqMsg,
                    passengerTicketNo: order.passengers[0].ticketNo
                }));
            } else {
                Utils.renderJsonError(res, "查詢失敗，無此訂單信息");
            }
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
    if (req.query.dep && req.query.arr && req.query.date && req.query.time && req.query.flightNo && req.body.encrypted_info) {
        let dep = req.query.dep.toUpperCase();
        let arr = req.query.arr.toUpperCase();
        let flightNo = req.query.flightNo.toUpperCase();
        let date = req.query.date;
        let time = req.query.time;
        let price = JSON.parse(Utils.decodeBase64(req.body.encrypted_info));

        let name = req.body.name;
        let identify = req.body.identify;
        let birthday = req.body.birthday;
        let sex = req.body.sex;

        try {
            let booking = await Api.booking(dep, arr, date, time, flightNo, price);
            if (booking) {
                let order = await Api.order(name, identify, birthday, sex, booking);
                let orderInfo = await Api.orderDetail(order.orderNo);
                let arrTime = orderInfo.flightInfo[0].deptTime;
                Utils.renderJson(res, await Order.insertOrUpdate({
                    orderId: order.id,
                    orderNo: orderInfo.detail.orderNo,
                    orderStatus: orderInfo.detail.status,
                    orderTotalPrice: orderInfo.passengerTypes[0].allPrices,
                    orderOriginPrice: orderInfo.passengerTypes[0].printPrice,
                    orderConstructionFee: orderInfo.passengerTypes[0].constructionFee,
                    orderFuelTax: orderInfo.passengerTypes[0].fuelTax,
                    orderRealPrice: orderInfo.passengerTypes[0].realPrice,
                    orderAgent: booking.extInfo.clientId,
                    passengerName: orderInfo.passengers[0].name,
                    passengerType: orderInfo.passengers[0].type,
                    passengerIdentifyType: orderInfo.passengers[0].cardType,
                    passengerIdentify: orderInfo.passengers[0].cardNum,
                    passengerTicketNo: orderInfo.passengers[0].ticketNo,
                    passengerInsuranceNo: orderInfo.passengers[0].insuranceNo,
                    flightNo: orderInfo.flightInfo[0].flightNum,
                    flightDate: Date.parse(date),
                    flightDeparture: orderInfo.flightInfo[0].dptCity,
                    flightDepartureCode: orderInfo.flightInfo[0].dptAirportCode,
                    flightDepartureTime: Date.parse(date + ' ' + time),
                    flightArrival: orderInfo.flightInfo[0].arrCity,
                    flightArrivalCode: orderInfo.flightInfo[0].arrAirportCode,
                    flightArrivalTime: Date.parse(date + ' ' + arrTime.substr(arrTime.lastIndexOf('-') + 1)),
                    flightCabin: orderInfo.flightInfo[0].cabin,
                    notice: orderInfo.other.tgqMsg,
                }));
            } else {
                Utils.renderJsonError(res, "預約失敗，票價已更新，無發預約");
            }
        } catch (e) {
            Utils.renderJsonError(res, "預約失敗,原因：" + e);
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

module.exports = router;
