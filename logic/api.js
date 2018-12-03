let express = require('express');
let router = express.Router();
let Api = require('../lib/flight');
let Utils = require('../lib/utils');
let Order = require('../model/order');
let cheerio = require('cheerio');


router.post('/SearchAV', async (req, res, next) => {
    let params = req.body.searchCondition.segments[0];
    let result = await Api.queryFlight(params.dep, params.arr, params.date);
    let result2 = await Api.queryFlight(params.arr, params.dep, params.returnDate);
    let flightProductGroup = [];
    let flights = {};
    let products = {};
    let rules = {};
    if (!result.flightInfos || !result2.flightInfos) {
        return Utils.renderApiResult(res, {
            "version": "1.0.0", //版本号
            "status": {
                "code": "500", //状态码 0-成功  非0-失败
                "errorMsg": "無航班信息" //失败具体原因
            },
            "search": null
        });
    }
    for (let startIndex = 0; startIndex < Math.min(result.flightInfos.length, 5); startIndex++) {
        let start = result.flightInfos[startIndex];
        if (start.flightNum.toUpperCase().indexOf('MU') != -1) {
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
                    "cabinYPrice": start.barePrice, //Y基准价舱价
                    "cabinFPrice": start.barePrice, //F舱基准价
                    "cabinCPrice": start.barePrice, //C舱基准价
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

            for (let endIndex = 0; endIndex < Math.min(result2.flightInfos.length, 5); endIndex++) {
                let end = result2.flightInfos[endIndex];
                if (end.flightNum.toUpperCase().indexOf('MU') != -1) {
                    let prices = await new Promise((resolve, reject) => {
                        Promise.all([
                            singlePrice(start.dpt, start.arr, params.date, start.dptTime, start.flightNum),
                            singlePrice(end.dpt, end.arr, params.returnDate, end.dptTime, end.flightNum)
                        ]).then((r) => {
                            resolve(r)
                        }).catch((e) => {
                            reject(e);
                        });
                    });
                    let startPrice = prices[0];
                    let endPrice = prices[1];
                    if (!startPrice || !endPrice) continue;
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
                            "cabinYPrice": end.barePrice, //Y基准价舱价
                            "cabinFPrice": end.barePrice, //F舱基准价
                            "cabinCPrice": end.barePrice, //C舱基准价
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
                    rules[startPrice.tgqRuleId] = {
                        "adult": {
                            "timeSharingChargeInfoList": startPrice.booking.tgqShowData.tgqPointCharges.map(function (e) {
                                return {
                                    "changeFee": e.changeFee,
                                    "returnFee": e.returnFee,
                                    "timeText": "起飛前" + e.time + "小時前",
                                    "time": e.time
                                }
                            }),
                            "canRefund": true, //选传，是否可退
                            "refundRule": startPrice.booking.tgqShowData.returnRule, //退票规则，选传
                            "refundText": startPrice.booking.tgqShowData.returnText, //退票文本，必传
                            "canChange": true, //是否支持改签，选传
                            "changeRule": startPrice.booking.tgqShowData.changeRule, //改签规则，选传
                            "changeText": cheerio.load(startPrice.booking.tgqShowData.tgqText).text(), //改签文本，必传
                            "basePrice": startPrice.booking.tgqShowData.basePrice, //退改基准价
                            "tgqCabin": startPrice.booking.tgqShowData.tgqCabin, //退改舱位
                            "tgqCabinType": "经济舱", //退改舱等
                            "signText": cheerio.load(startPrice.booking.tgqShowData.tgqPercentText).text(), //是否签转，必传
                            "allowChange": false //是否允许签转
                        },
                        "child": {
                            "timeSharingChargeInfoList": startPrice.booking.tgqShowData.tgqPointCharges.map(function (e) {
                                return {
                                    "changeFee": e.changeFee,
                                    "returnFee": e.returnFee,
                                    "timeText": "起飛前" + e.time + "小時前",
                                    "time": e.time
                                }
                            }),
                            "canRefund": true, //选传，是否可退
                            "refundRule": startPrice.booking.tgqShowData.returnRule, //退票规则，选传
                            "refundText": startPrice.booking.tgqShowData.returnText, //退票文本，必传
                            "canChange": true, //是否支持改签，选传
                            "changeRule": startPrice.booking.tgqShowData.changeRule, //改签规则，选传
                            "changeText": cheerio.load(startPrice.booking.tgqShowData.tgqText).text(), //改签文本，必传
                            "basePrice": startPrice.booking.tgqShowData.basePrice, //退改基准价
                            "tgqCabin": startPrice.booking.tgqShowData.tgqCabin, //退改舱位
                            "tgqCabinType": "经济舱", //退改舱等
                            "signText": cheerio.load(startPrice.booking.tgqShowData.tgqPercentText).text(), //是否签转，必传
                            "allowChange": false //是否允许签转
                        },
                        "infant": {
                            "timeSharingChargeInfoList": startPrice.booking.tgqShowData.tgqPointCharges.map(function (e) {
                                return {
                                    "changeFee": e.changeFee,
                                    "returnFee": e.returnFee,
                                    "timeText": "起飛前" + e.time + "小時前",
                                    "time": e.time
                                }
                            }),
                            "canRefund": true, //选传，是否可退
                            "refundRule": startPrice.booking.tgqShowData.returnRule, //退票规则，选传
                            "refundText": startPrice.booking.tgqShowData.returnText, //退票文本，必传
                            "canChange": true, //是否支持改签，选传
                            "changeRule": startPrice.booking.tgqShowData.changeRule, //改签规则，选传
                            "changeText": cheerio.load(startPrice.booking.tgqShowData.tgqText).text(), //改签文本，必传
                            "basePrice": startPrice.booking.tgqShowData.basePrice, //退改基准价
                            "tgqCabin": startPrice.booking.tgqShowData.tgqCabin, //退改舱位
                            "tgqCabinType": "经济舱", //退改舱等
                            "signText": cheerio.load(startPrice.booking.tgqShowData.tgqPercentText).text(), //是否签转，必传
                            "allowChange": false //是否允许签转
                        },
                        "specialRuleInfo": { //特殊票务说明
                            "specialRuleText": startPrice.booking.policyInfo.specialRule
                        }
                    };
                    rules[startPrice.backTgqRuleId] = {
                        "adult": {
                            "timeSharingChargeInfoList": endPrice.booking.tgqShowData.tgqPointCharges.map(function (e) {
                                return {
                                    "changeFee": e.changeFee,
                                    "returnFee": e.returnFee,
                                    "timeText": "起飛前" + e.time + "小時前",
                                    "time": e.time
                                }
                            }),
                            "canRefund": true, //选传，是否可退
                            "refundRule": endPrice.booking.tgqShowData.returnRule, //退票规则，选传
                            "refundText": endPrice.booking.tgqShowData.returnText, //退票文本，必传
                            "canChange": true, //是否支持改签，选传
                            "changeRule": endPrice.booking.tgqShowData.changeRule, //改签规则，选传
                            "changeText": cheerio.load(endPrice.booking.tgqShowData.tgqText).text(), //改签文本，必传
                            "basePrice": endPrice.booking.tgqShowData.basePrice, //退改基准价
                            "tgqCabin": endPrice.booking.tgqShowData.tgqCabin, //退改舱位
                            "tgqCabinType": "经济舱", //退改舱等
                            "signText": cheerio.load(endPrice.booking.tgqShowData.tgqPercentText).text(), //是否签转，必传
                            "allowChange": false //是否允许签转
                        },
                        "child": {
                            "timeSharingChargeInfoList": endPrice.booking.tgqShowData.tgqPointCharges.map(function (e) {
                                return {
                                    "changeFee": e.changeFee,
                                    "returnFee": e.returnFee,
                                    "timeText": "起飛前" + e.time + "小時前",
                                    "time": e.time
                                }
                            }),
                            "canRefund": true, //选传，是否可退
                            "refundRule": endPrice.booking.tgqShowData.returnRule, //退票规则，选传
                            "refundText": endPrice.booking.tgqShowData.returnText, //退票文本，必传
                            "canChange": true, //是否支持改签，选传
                            "changeRule": endPrice.booking.tgqShowData.changeRule, //改签规则，选传
                            "changeText": cheerio.load(endPrice.booking.tgqShowData.tgqText).text(), //改签文本，必传
                            "basePrice": endPrice.booking.tgqShowData.basePrice, //退改基准价
                            "tgqCabin": endPrice.booking.tgqShowData.tgqCabin, //退改舱位
                            "tgqCabinType": "经济舱", //退改舱等
                            "signText": cheerio.load(endPrice.booking.tgqShowData.tgqPercentText).text(), //是否签转，必传
                            "allowChange": false //是否允许签转
                        },
                        "infant": {
                            "timeSharingChargeInfoList": endPrice.booking.tgqShowData.tgqPointCharges.map(function (e) {
                                return {
                                    "changeFee": e.changeFee,
                                    "returnFee": e.returnFee,
                                    "timeText": "起飛前" + e.time + "小時前",
                                    "time": e.time
                                }
                            }),
                            "canRefund": true, //选传，是否可退
                            "refundRule": endPrice.booking.tgqShowData.returnRule, //退票规则，选传
                            "refundText": endPrice.booking.tgqShowData.returnText, //退票文本，必传
                            "canChange": true, //是否支持改签，选传
                            "changeRule": endPrice.booking.tgqShowData.changeRule, //改签规则，选传
                            "changeText": cheerio.load(endPrice.booking.tgqShowData.tgqText).text(), //改签文本，必传
                            "basePrice": endPrice.booking.tgqShowData.basePrice, //退改基准价
                            "tgqCabin": endPrice.booking.tgqShowData.tgqCabin, //退改舱位
                            "tgqCabinType": "经济舱", //退改舱等
                            "signText": cheerio.load(endPrice.booking.tgqShowData.tgqPercentText).text(), //是否签转，必传
                            "allowChange": false //是否允许签转
                        },
                        "specialRuleInfo": { //特殊票务说明
                            "specialRuleText": endPrice.booking.policyInfo.specialRule
                        }
                    };
                    products[Utils.encodeBase64(start.flightNum + "_" + end.flightNum)] = {
                        "cabin": [startPrice.cabin[0], endPrice.cabin[0]],
                        "source": "own",
                        "flightNo": start.flightNum + "-" + end.flightNum, //航班号 往返为CA4387-CA4378
                        "adult": {
                            "printPrice": Number(startPrice.adult.printPrice) + Number(endPrice.adult.printPrice),
                            "salePrice": Number(startPrice.adult.salePrice) + Number(endPrice.adult.salePrice),
                            "discount": startPrice.adult.discount,
                            "flightPrice": Number(startPrice.adult.flightPrice) + Number(endPrice.adult.flightPrice),
                            "fuelTax": Number(startPrice.adult.fuelTax) + Number(endPrice.adult.fuelTax),
                            "airportFee": Number(startPrice.adult.airportFee) + Number(endPrice.adult.airportFee),
                            "tax": Number(startPrice.adult.tax) + Number(endPrice.adult.tax)
                        },
                        "child": {
                            "printPrice": Number(startPrice.child.printPrice) + Number(endPrice.child.printPrice),
                            "salePrice": Number(startPrice.child.salePrice) + Number(endPrice.child.salePrice),
                            "discount": startPrice.child.discount,
                            "flightPrice": Number(startPrice.child.flightPrice) + Number(endPrice.child.flightPrice),
                            "fuelTax": Number(startPrice.child.fuelTax) + Number(endPrice.child.fuelTax),
                            "airportFee": Number(startPrice.child.airportFee) + Number(endPrice.child.airportFee),
                            "tax": Number(startPrice.child.tax) + Number(endPrice.child.tax)
                        },
                        "infant": {
                            "printPrice": Number(startPrice.infant.printPrice) + Number(endPrice.infant.printPrice),
                            "salePrice": Number(startPrice.infant.salePrice) + Number(endPrice.infant.salePrice),
                            "discount": startPrice.infant.discount,
                            "flightPrice": Number(startPrice.infant.flightPrice) + Number(endPrice.infant.flightPrice),
                            "fuelTax": Number(startPrice.infant.fuelTax) + Number(endPrice.infant.fuelTax),
                            "airportFee": Number(startPrice.infant.airportFee) + Number(endPrice.infant.airportFee),
                            "tax": Number(startPrice.infant.tax) + Number(endPrice.infant.tax)
                        },
                        "tgqRuleId": startPrice.tgqRuleId, //退改签key，对应tgqRules
                        "backTgqRuleId": startPrice.backTgqRuleId //往返回程退改签key 对应tgqRules
                    };
                    flightProductGroup.push({
                        "flight": [
                            {
                                "flightIndex": start.flightNum, //航班索引，对应flights
                                "tripIndex": 1, //航程 1-第一程
                                "segIndex": 1 //航段 1-第一段
                            },
                            {
                                "flightIndex": end.flightNum, //航班索引，对应flights
                                "tripIndex": 2, //航程 1-第一程
                                "segIndex": 1 //航段 1-第一段
                            }
                        ],
                        "productList": [Utils.encodeBase64(start.flightNum + "_" + end.flightNum)]
                    })
                }
            }
        }
    }
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

async function singlePrice(dep, arr, date, time, flightNo) {
    try {
        let result = await Api.queryPrice(dep, arr, date, flightNo);
        if (result && result.vendors && result.vendors.length) {
            let p = result.vendors.sort(function (a, b) {
                return a.price - b.price;
            })[0];
            let booking = await Api.booking(dep, arr, date, time, flightNo, p);
            return {
                "booking": booking,
                "cabin": [
                    {
                        "cabinQuantity": booking.priceInfo.inventory.all, //舱位座位数 1-9 A
                        "baseCabinCode": booking.priceInfo.inventory.all, //基准舱
                        "adultCabin": booking.priceInfo.inventory.adult, //成人舱
                        "childCabin": booking.priceInfo.inventory.child, //儿童舱
                        "infantCabin": booking.priceInfo.inventory.baby, //婴儿舱位
                        "tripIndex": "2", //航程 2-第一程
                        "segIndex": "1" //航段
                    }
                ],
                "source": "own",
                "flightNo": flightNo, //航班号 往返为CA4387-CA4378
                "adult": {
                    "printPrice": booking.extInfo.barePrice, //票面价
                    "salePrice": booking.extInfo.price, //销售价
                    "discount": p.discount, //折扣
                    "flightPrice": booking.extInfo.ticketPirce, //机票价格
                    "fuelTax": "30", // 燃油费
                    "airportFee": "50", // 机建费
                    "tax": "50" //税
                },
                "child": {
                    "printPrice": booking.extInfo.barePrice,
                    "salePrice": p.businessExtMap.childPrice,
                    "discount": p.discount,
                    "flightPrice": "80",
                    "fuelTax": "10",
                    "airportFee": "0",
                    "tax": "0"
                },
                "infant": {},
                "tgqRuleId": booking.tgqShowData.changeRule, //退改签key，对应tgqRules
                "backTgqRuleId": booking.tgqShowData.returnRule, //往返回程退改签key 对应tgqRules}
            }
        }
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
