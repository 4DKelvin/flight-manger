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
            Utils.renderJsonError(res, "無結果");
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
        let result = await Api.queryPrice(dep, arr, date, flightNo);
        if (result && result.vendors && result.vendors.length) {
            Utils.renderJson(res, result.vendors.map((vendor) => {
                return {
                    price: vendor.price,
                    client: vendor.domain,
                    encrypted_info: Utils.encodeBase64(JSON.stringify(vendor))
                };
            }));
        } else {
            Utils.renderJsonError(res, "無結果");
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});



router.get('/order', async (req, res, next) => {
    if (req.query.orderNo) {
        let order = await Api.orderDetail(req.query.orderNo);
        if (order) {
            Utils.renderJson(res, await Order.insertOrUpdate({
                orderNo: order.detail.orderNo,
                orderStatus: order.detail.status,
                notice: order.other.tgqMsg,
            }));
        } else {
            Utils.renderJsonError(res, "無結果");
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
            Utils.renderJsonError(res, "預約失敗");
        }
    } else {
        Utils.renderJsonError(res, "參數錯誤");
    }
});

module.exports = router;
