let express = require('express');
let router = express.Router();
let Api = require('../lib/flight');
let Utils = require('../lib/utils');
let Order = require('../model/order');


router.post('/SearchAV', async (req, res, next) => {
    let params = req.body.searchCondition.segments[0];
    let result = await Api.queryFlight(params.dep, params.arr, params.date);
    let result2 = await Api.queryFlight(params.arr, params.dep, params.returnDate);
    let flightProductGroup = [];
    let flights = {};
    let products = {};
    let rules = {};
    result.flightInfos.forEach((start, startIndex) => {
        if (!flights[start.flightNum]) {
            flights[start.flightNum] = {
                "depCode": start.dpt, //出发机场三字码
                "arrCode": start.arr, //到达机场三字码
                "date": params.date, //出发日期
                "dptTime": start.dptTime.replace(":", ""), //出发时间
                "arrTime": start.arrTime.replace(":", ""), //到达时间
                "carrier": start.carrier, //航司二字码
                "code": start.flightNum, //航班号
                "meal": start.meal, //餐食
                "planeType": start.flightTypeFullName, //机型
                "stops": start.stop, //经停
                "stopInfo": { //经停信息
                    "stopCity": start.stopCityName, //经停城市
                    "stopCode": start.stopCityCode //经停机场三字码
                },
                "codeShare": start.codeShare, //主飞航班号，为空表示非共享
                "cabinYPrice": start.cabin === "Y" ? start.barePrice : "N/A", //Y基准价舱价
                "cabinFPrice": start.cabin === "F" ? start.barePrice : "N/A", //F舱基准价
                "cabinCPrice": start.cabin === "C" ? start.barePrice : "N/A", //C舱基准价
                "punctualityRate": "95.0%", //准点率
                "adultFuelTax": start.arf, //成人燃油税
                "airportTax": start.tof, //基建
                "childFuelTax": start.arf, //儿童燃油税
                "infantFuelTax": start.arf, //婴儿燃油税
                "duration": start.flightTimes, //飞行时长
                "dptTower": start.dptTerminal, //出发航站楼
                "arrTower": start.arrTerminal, //到达航站楼
                "crossDays": "0", //跨天
                "dataExt": {}
            }
        }
        result2.flightInfos.forEach((end, endIndex) => {
            if (!flights[end.flightNum]) {
                flights[end.flightNum] = {
                    "depCode": end.dpt, //出发机场三字码
                    "arrCode": end.arr, //到达机场三字码
                    "date": end.date, //出发日期
                    "dptTime": end.dptTime.replace(":", ""), //出发时间
                    "arrTime": end.arrTime.replace(":", ""), //到达时间
                    "carrier": end.carrier, //航司二字码
                    "code": end.flightNum, //航班号
                    "meal": end.meal, //餐食
                    "planeType": end.flightTypeFullName, //机型
                    "stops": end.stop, //经停
                    "stopInfo": { //经停信息
                        "stopCity": end.stopCityName, //经停城市
                        "stopCode": end.stopCityCode //经停机场三字码
                    },
                    "codeShare": end.codeShare, //主飞航班号，为空表示非共享
                    "cabinYPrice": end.cabin === "Y" ? end.barePrice : "N/A", //Y基准价舱价
                    "cabinFPrice": end.cabin === "F" ? end.barePrice : "N/A", //F舱基准价
                    "cabinCPrice": end.cabin === "C" ? end.barePrice : "N/A", //C舱基准价
                    "punctualityRate": "95.0%", //准点率
                    "adultFuelTax": end.arf, //成人燃油税
                    "airportTax": end.tof, //基建
                    "childFuelTax": end.arf, //儿童燃油税
                    "infantFuelTax": end.arf, //婴儿燃油税                                        
                    "duration": end.flightTimes, //飞行时长
                    "dptTower": end.dptTerminal, //出发航站楼
                    "arrTower": end.arrTerminal, //到达航站楼
                    "crossDays": "0", //跨天
                    "dataExt": {}
                }
            }
            rules[Utils.encodeBase64("prod-" + startIndex + "-" + endIndex)] = {
                "adult": {
                    "timeSharingChargeInfoList": [ //格式化数据，非必传
                        {
                            "time": 2,
                            "timeText": "起飞前2小时之前",
                            "refundFee": 0,
                            "changeFee": 0
                        },
                        {
                            "time": -2147483648,
                            "timeText": "起飞前2小时之后",
                            "refundFee": 0,
                            "changeFee": 0
                        }
                    ],
                    "canRefund": true, //选传，是否可退
                    "refundRule": "20-2-40", //退票规则，选传
                    "refundText": "按机场标准", //退票文本，必传
                    "canChange": true, //是否支持改签，选传
                    "changeRule": "10-2-20", //改签规则，选传
                    "changeText": "按机场标准", //改签文本，必传
                    "basePrice": start.barePrice, //退改基准价
                    "tgqCabin": start.cabin, //退改舱位
                    "tgqCabinType": "经济舱", //退改舱等
                    "signText": "按机场标准", //是否签转，必传
                    "allowChange": false //是否允许签转
                },
                "child": {
                    "timeSharingChargeInfoList": [ //格式化数据，非必传
                        {
                            "time": 2,
                            "timeText": "起飞前2小时之前",
                            "refundFee": 0,
                            "changeFee": 0
                        },
                        {
                            "time": -2147483648,
                            "timeText": "起飞前2小时之后",
                            "refundFee": 0,
                            "changeFee": 0
                        }
                    ],
                    "canRefund": true, //选传，是否可退
                    "refundRule": "20-2-40", //退票规则，选传
                    "refundText": "按机场标准", //退票文本，必传
                    "canChange": true, //是否支持改签，选传
                    "changeRule": "10-2-20", //改签规则，选传
                    "changeText": "按机场标准", //改签文本，必传
                    "basePrice": start.barePrice, //退改基准价
                    "tgqCabin": start.cabin, //退改舱位
                    "tgqCabinType": "经济舱", //退改舱等
                    "signText": "按机场标准", //是否签转，必传
                    "allowChange": false //是否允许签转
                },
                "infant": {
                    "timeSharingChargeInfoList": [ //格式化数据，非必传
                        {
                            "time": 2,
                            "timeText": "起飞前2小时之前",
                            "refundFee": 0,
                            "changeFee": 0
                        },
                        {
                            "time": -2147483648,
                            "timeText": "起飞前2小时之后",
                            "refundFee": 0,
                            "changeFee": 0
                        }
                    ],
                    "canRefund": true, //选传，是否可退
                    "refundRule": "20-2-40", //退票规则，选传
                    "refundText": "按机场标准", //退票文本，必传
                    "canChange": true, //是否支持改签，选传
                    "changeRule": "10-2-20", //改签规则，选传
                    "changeText": "按机场标准", //改签文本，必传
                    "basePrice": start.barePrice, //退改基准价
                    "tgqCabin": start.cabin, //退改舱位
                    "tgqCabinType": "经济舱", //退改舱等
                    "signText": "按机场标准", //是否签转，必传
                    "allowChange": false //是否允许签转
                },
                "specialRuleInfo": { //特殊票务说明
                    "specialRuleText": "您可免费携带5公斤以内且体积不超过20×30×40CM的非托运行李，无免费托运行李额。"
                }
            };

            products[Utils.encodeBase64("prod-" + startIndex + "-" + endIndex)] = {
                "cabin": [
                    {
                        "cabinQuantity": "A", //舱位座位数 1-9 A
                        "baseCabinCode": "A", //基准舱
                        "adultCabin": "A", //成人舱
                        "childCabin": "A", //儿童舱
                        "infantCabin": "A", //婴儿舱位
                        "tripIndex": startIndex, //航程 1-第一程
                        "segIndex": startIndex //航段
                    },
                    { //往返第二程舱位信息
                        "cabinQuantity": "A", //舱位座位数 1-9 A
                        "baseCabinCode": "A", //基准舱
                        "adultCabin": "A", //成人舱
                        "childCabin": "A", //儿童舱
                        "infantCabin": "A", //婴儿舱位
                        "tripIndex": endIndex, //航程 2-第一程
                        "segIndex": endIndex //航段
                    }
                ],
                "source": "own",
                "flightNo": start.flightNum + "-" + end.flightNum, //航班号 往返为CA4387-CA4378
                "adult": {
                    "printPrice": start.barePrice + end.barePrice, //票面价
                    "salePrice": (start.barePrice * start.discount) + (end.barePrice * end.discount), //销售价
                    "discount": start.discount, //折扣
                    "flightPrice": "0", //机票价格
                    "fuelTax": "0", // 燃油费
                    "airportFee": "0", // 机建费
                    "tax": "0" //税
                },
                "child": {
                    "printPrice": start.barePrice + end.barePrice, //票面价
                    "salePrice": (start.barePrice * start.discount) + (end.barePrice * end.discount), //销售价
                    "discount": start.discount, //折扣
                    "flightPrice": "0", //机票价格
                    "fuelTax": "0", // 燃油费
                    "airportFee": "0", // 机建费
                    "tax": "0" //税
                },
                "infant": {},
                "tgqRuleId": Utils.encodeBase64("prod-" + startIndex + "-" + endIndex), //退改签key，对应tgqRules
                "backTgqRuleId": Utils.encodeBase64("prod-" + startIndex + "-" + endIndex), //往返回程退改签key 对应tgqRules
            };
            flightProductGroup.push({
                "flight": [
                    {
                        "flightIndex": start.flightNum, //航班索引，对应flights
                        "tripIndex": startIndex, //航程 1-第一程
                        "segIndex": startIndex //航段 1-第一段
                    },
                    {
                        "flightIndex": end.flightNum, //航班索引，对应flights
                        "tripIndex": endIndex, //航程 1-第一程
                        "segIndex": endIndex //航段 1-第一段
                    }
                ],
                "productList": [
                    "",
                    ""
                ]
            })
        })
    });
    Utils.renderApiResult(res, {
        "version": "1.0.0", //版本号
        "status": {
            "code": "0", //状态码 0-成功  非0-失败
            "errorMsg": "" //失败具体原因
        },
        "search": {
            "flightProductGroup": flightProductGroup,
            "flights": flights,
            "products": products,
            "tgqRules": rules
        }
    });
});

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

async function singlePrice(dep, arr, date, flightNo) {
    try {
        let result = await Api.queryPrice(dep, arr, date, flightNo);
        if (result && result.vendors && result.vendors.length) {
            return result.vendors.map(function (price) {
                return {
                    "cabin": [
                        {
                            "cabinQuantity": "A", //舱位座位数 1-9 A
                            "baseCabinCode": "J", //基准舱
                            "adultCabin": "J", //成人舱
                            "childCabin": "J", //儿童舱
                            "infantCabin": "J", //婴儿舱位
                            "tripIndex": "1", //航程 1-第一程
                            "segIndex": "1" //航段
                        },
                        { //往返第二程舱位信息
                            "cabinQuantity": "A", //舱位座位数 1-9 A
                            "baseCabinCode": "J", //基准舱
                            "adultCabin": "J", //成人舱
                            "childCabin": "J", //儿童舱
                            "infantCabin": "J", //婴儿舱位
                            "tripIndex": "2", //航程 2-第一程
                            "segIndex": "1" //航段
                        }
                    ],
                    "source": "own",
                    "flightNo": "CA4387", //航班号 往返为CA4387-CA4378
                    "adult": {
                        "printPrice": "100", //票面价
                        "salePrice": "90", //销售价
                        "discount": "0.9", //折扣
                        "flightPrice": "40", //机票价格
                        "fuelTax": "30", // 燃油费
                        "airportFee": "50", // 机建费
                        "tax": "50" //税
                    },
                    "child": {
                        "printPrice": "100",
                        "salePrice": "80",
                        "discount": "1",
                        "flightPrice": "80",
                        "fuelTax": "10",
                        "airportFee": "0",
                        "tax": "0"
                    },
                    "infant": {},
                    "tgqRuleId": "124235345", //退改签key，对应tgqRules
                    "backTgqRuleId": "666666", //往返回程退改签key 对应tgqRules}
                }
            }).sort(function (a, b) {
                return a.price - b.price;
            })[0];
        }
        return null;
    } catch (e) {
        return null;
    }
}

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
