let express = require('express');
let router = express.Router();
let Api = require('../lib/flight');
let Utils = require('../lib/utils');
let Order = require('../model/order');
let Key = require('../model/key');
let cheerio = require('cheerio');


router.post('/RefundConfirm', async (req, res, next) => {
    try {
        let orderNo = req.body.orderNo;
        let orders = await groupDetail(orderNo);

        let os = [];
        if (orders.orderId) {
            for (let date in orders.flights) {
                os.push(orders.flights[date]);
            }
        }
        try {
            for (let i = 0; i < os.length; i++) {
                let result = await Api.refundReasons(os[i].orderNo);
                if (!result[0].refundSearchResult) {
                    throw "此訂單已經申請退款";
                } else {
                    let refundInfo = result[0].refundSearchResult.tgqReasons.find(function (e) {
                        if (Number(e.code) === Number(req.body.code)) return e;
                    });
                    await Api.refund({
                        "orderNo": os[i].orderNo,
                        "passengerIds": result[0].id,
                        "refundCause": refundInfo.msg,
                        "refundCauseId": refundInfo.code
                    })
                }
            }
            Utils.renderApiResult(res, {
                "version": "1.0.0", //版本号
                "status": {
                    "code": 0, //状态码 0-成功  非0-失败
                    "errorMsg": null//失败具体原因
                },
                "passengers": [
                    {
                        "name": os[0].passengerName,//乘机人姓名
                        "cardType": "NI",////证件类型，NI：身份证，PP：护照，OT：其他
                        "cardNum": os[0].passengerIdentify,//证件号码
                        "ticketNo": os[0].passengerInsuranceNo,//票号
                        "ageType": 0,//乘客类型（成人/儿童/婴儿）；0：成人，1：儿童，2：婴儿
                        "mobCountryCode": "86",
                        "pasId": "1",//乘机人id
                        "applyType": 1, //参见退票类型说明
                        "tickets": os.map((o, i) => {
                            return {
                                "ticketNo": o.passengerTicketNo, //票号
                                "segmentIndex": {
                                    "flightNum": o.flightNo, //出票航段航班号
                                    "segmentType": 1, //出票航程索引
                                    "sequenceNum": i + 1//出票航段索引
                                }
                            }
                        }),
                        "flights": os.map((o, i) => {
                            return {
                                "segmentType": 1,
                                "sequenceNum": i + 1,
                                "refundId": new Date().getTime()//退票流水
                            }
                        })
                    }
                ]
            });
        } catch (e) {
            Utils.renderApiResult(res, {
                "version": "1.0.0", //版本号
                "status": {
                    "code": 10017, //状态码 0-成功  非0-失败
                    "errorMsg": "退款失败" //失败具体原因
                }
            })
        }

    } catch (e) {
        Utils.renderApiResult(res, {
            "version": "1.0.0", //版本号
            "status": {
                "code": 10016, //状态码 0-成功  非0-失败
                "errorMsg": "找不到订单" //失败具体原因
            }
        })
    }
});

router.post('/RefundSearch', async (req, res, next) => {
    try {
        let orderNo = req.body.orderNo;
        let orders = await groupDetail(orderNo);
        let os = [];
        if (orders.orderId) {
            for (let date in orders.flights) {
                os.push(orders.flights[date]);
            }
        }
        let reasons = await Promise.all(os.map((o) => {
            return Api.refundReasons(o.orderNo);
        }));

        let fee = reasons.map((e) => {
            return {
                refundAmount: e[0].refundSearchResult.tgqReasons[0].refundPassengerPriceInfoList[0].refundFeeInfo.returnRefundFee,
                refundFee: e[0].refundSearchResult.tgqReasons[0].refundPassengerPriceInfoList[0].refundFeeInfo.refundFee
            }
        });

        Utils.renderApiResult(res, {
            "version": "1.0.0", //版本号
            "status": {
                "code": "0", //状态码 0-成功  非0-失败
                "errorMsg": "" //失败具体原因
            },
            "businessOrderNo": orderNo, //业务单号,
            "orderNo": orderNo,
            "refundAmount": eval(fee.map((e) => {
                return e.refundAmount
            }).join('+')).toFixed(2), //退票金额
            "refundFee": eval(fee.map((e) => {
                return e.refundFee
            }).join('+')).toFixed(2), //退票手续费
            "passengers": [{
                "name": os[0].passengerName,//乘机人姓名
                "cardType": "NI",////证件类型，NI：身份证，PP：护照，OT：其他
                "cardNum": os[0].passengerIdentify,//证件号码
                "ticketNo": os[0].passengerInsuranceNo,//票号
                "ageType": 0,//乘客类型（成人/儿童/婴儿）；0：成人，1：儿童，2：婴儿
                "mobCountryCode": "86",
                "pasId": "1",//乘机人id
                "applyType": 1, //参见退票类型说明
                "tickets": os.map((o, i) => {
                    return {
                        "ticketNo": o.passengerTicketNo, //票号
                        "segmentIndex": {
                            "flightNum": o.flightNo, //出票航段航班号
                            "segmentType": 1, //出票航程索引
                            "sequenceNum": i + 1//出票航段索引
                        }
                    }
                }),
                "flights": os.map((o, i) => {
                    return {
                        "flightNum": o.flightNo,
                        "cabin": "Y",
                        "childCabin": "Y",
                        "depCityCode": o.flightDepartureCode,
                        "arrCityCode": o.flightArrivalCode,
                        "depCity": "",
                        "arrCity": "",
                        "depAirportCode": "",
                        "arrAirportCode": "",
                        "depAirport": "",
                        "arrAirport": "",
                        "departureDate": Utils.formatDate(o.flightDate),
                        "departureTime": Utils.formatTime(o.flightDepartureTime),
                        "arrivalDate": Utils.formatDate(o.flightDate),
                        "arrivalTime": Utils.formatTime(o.flightArrivalTime),
                        "segmentType": 1,
                        "sequenceNum": i + 1,
                        "price": o.orderTotalPrice,
                        "airprotTax": o.orderFuelTax
                    }
                })
            }]
        });
    } catch (e) {
        Utils.renderApiResult(res, {
            "version": "1.0.0", //版本号
            "status": {
                "code": 10016, //状态码 0-成功  非0-失败
                "errorMsg": "没找到订单或者目前状态无法申请退款" //失败具体原因
            }
        })
    }
});

router.post('/ApplyRefund', async (req, res, next) => {
    try {
        let orderNo = req.body.orderNo;
        let orders = await groupDetail(orderNo);
        let os = [];
        if (orders.orderId) {
            for (let date in orders.flights) {
                os.push(orders.flights[date]);
            }
        }
        Utils.renderApiResult(res, {
            "version": "1.0.0",
            "status": {
                "code": 0,
                "errorMsg": null
            },
            "orderNo": orderNo,
            "businessOrderNo": orderNo,
            "passengers": [
                {
                    "name": os[0].passengerName,//乘机人姓名
                    "cardType": "PP",////证件类型，NI：身份证，PP：护照，OT：其他
                    "cardNum": os[0].passengerIdentify,//证件号码
                    "ticketNo": os[0].passengerInsuranceNo,//票号
                    "ageType": 0,//乘客类型（成人/儿童/婴儿）；0：成人，1：儿童，2：婴儿
                    "mobCountryCode": "86",
                    "pasId": "1",//乘机人id
                    "applyType": 1, //参见退票类型说明
                    "tickets": os.map((o, i) => {
                        return {
                            "ticketNo": o.passengerTicketNo, //票号
                            "segmentIndex": {
                                "flightNum": o.flightNo, //出票航段航班号
                                "segmentType": 1, //出票航程索引
                                "sequenceNum": i + 1//出票航段索引
                            }
                        }
                    }),
                    "flights": os.map((o, i) => {
                        return {
                            "flightNum": o.flightNo,
                            "cabin": "Y",
                            "childCabin": "Y",
                            "depCityCode": o.flightDepartureCode,
                            "arrCityCode": o.flightArrivalCode,
                            "depCity": "",
                            "arrCity": "",
                            "depAirportCode": "",
                            "arrAirportCode": "",
                            "depAirport": "",
                            "arrAirport": "",
                            "departureDate": Utils.formatDate(o.flightDate),
                            "departureTime": Utils.formatTime(o.flightDepartureTime),
                            "arrivalDate": Utils.formatDate(o.flightDate),
                            "arrivalTime": Utils.formatTime(o.flightArrivalTime),
                            "segmentType": 1,
                            "sequenceNum": i + 1,
                            "price": o.orderTotalPrice,
                            "airprotTax": o.orderFuelTax
                        }
                    })
                }
            ]
        });
    } catch (e) {
        Utils.renderApiResult(res, {
            "version": "1.0.0", //版本号
            "status": {
                "code": 10015, //状态码 0-成功  非0-失败
                "errorMsg": "订单没找到" //失败具体原因
            }
        })
    }
});

router.post('/NotifyTicket', async (req, res, next) => {
    let orderNo = req.body.orderNo;
    let status = req.body.status;
    let amount = req.body.payAmount;
    let orders = await groupDetail(orderNo);
    if (orders.orderId) {
        let total = 0;
        let promises = [];
        for (let date in orders.flights) {
            total += orders.flights[date].orderTotalPrice;
            promises.push({
                id: orders.flights[date].orderId,
                agent: orders.flights[date].orderAgent
            });
        }
        if (Number(amount) === Number(total)) {
            if (Number(status) === 1) {
                try {
                    for (let i = 0; i < promises.length; i++) {
                        await Api.pay(promises[i].id, promises[i].agent);
                    }
                    Utils.renderApiResult(res, {
                        "version": "1.0.0", //版本号
                        "status": {
                            "code": "0", //状态码 0-成功  非0-失败
                            "errorMsg": "" //失败具体原因
                        },
                        "orderNo": orderNo, //订单号
                    });
                } catch (e) {
                    Utils.renderApiResult(res, {
                        "version": "1.0.0", //版本号
                        "status": {
                            "code": "1006", //状态码 0-成功  非0-失败
                            "errorMsg": e//失败具体原因
                        },
                        "orderNo": orderNo, //订单号
                    });
                }
            } else {
                Utils.renderApiResult(res, {
                    "version": "1.0.0", //版本号
                    "status": {
                        "code": 1005, //状态码 0-成功  非0-失败
                        "errorMsg": "订单未支付" //失败具体原因
                    }
                })
            }
        } else {
            Utils.renderApiResult(res, {
                "version": "1.0.0", //版本号
                "status": {
                    "code": 1003, //状态码 0-成功  非0-失败
                    "errorMsg": "支付价格不一致" //失败具体原因
                }
            })
        }
    } else {
        Utils.renderApiResult(res, {
            "version": "1.0.0", //版本号
            "status": {
                "code": 1004, //状态码 0-成功  非0-失败
                "errorMsg": "找不到此订单" //失败具体原因
            }
        })
    }

});

router.post('/CheckPay', async (req, res, next) => {
    try {
        let orders = await new Promise((resolve, reject) => {
            Order.query().where({groupId: req.body.payCheck.orderNo}).lean().exec((err, res) => {
                if (err) reject(err);
                else resolve(res);
            })
        });
        let remotes = await new Promise((resolve, reject) => {
            Promise.all(orders.map((o) => {
                return Api.validate(o.orderId, o.orderAgent);
            })).then((res) => {
                resolve(res.map((o) => {
                    return o;
                }));
            }).catch((err) => {
                reject(err);
            });
        });
        Utils.renderApiResult(res, {
            "version": "1.0.0",
            "status": {
                "code": "0",
                "errorMsg": ""
            },
            "orderNo": req.body.payCheck.orderNo,
            "businessOrderNo": req.body.payCheck.businessOrderNo,
            "dataExt": {}
        });
    } catch (e) {
        Utils.renderApiResult(res, {
            "version": "1.0.0", //版本号
            "status": {
                "code": 1002, //状态码 0-成功  非0-失败
                "errorMsg": e //失败具体原因
            }
        })
    }
});

router.post('/OrderInfo', async (req, res, next) => {
    let orders = await new Promise((resolve, reject) => {
        Order.query().where({groupId: req.body.orderNo}).lean().exec((err, res) => {
            if (err) reject(err);
            else resolve(res);
        })
    });
    let remotes = await new Promise((resolve, reject) => {
        Promise.all(orders.map((o) => {
            return Api.orderDetail(o.orderNo);
        })).then((res) => {
            resolve(res.map((o) => {
                o.status = o.detail.status;
                o.other.tgqMsg = cheerio.load(o.other.tgqMsg).text();
                delete o.detail;
                delete o.contacterInfo;
                return o;
            }));
        }).catch((err) => {
            reject(err);
        });
    });
    let status = {
        "初始状态": 0,
        "订单待确认": 1,
        "订座成功等待支付": 2,
        "订单确认成功待支付": 3,
        "支付成功等待出票": 4,
        "出票完成": 5,
        "出票失败": 6,
        "订单取消": 7,
        "未知状态": -1
    };
    Utils.renderApiResult(res, {
        "version": "1.0.0", //版本号
        "status": {
            "code": "0", //状态码 0-成功  非0-失败
            "errorMsg": "" //失败具体原因
        },
        "businessOrderNo": req.body.businessOrderNo, //业务单号
        "orderNo": req.body.orderNo, //航司单号
        "orderStatus": [status[orders[0].orderStatus], status[orders[1].orderStatus]],
        "flights": orders.map((o) => {
            return {
                "sequenceNum": 1, //航班序号
                "carrier": o.flightNo.substr(0, 2), //销售承运人
                "flightNum": o.flightNo, //航班号
                "cabin": o.flightCabin, //舱位
                "childCabin": "Y", //儿童舱位
                "planeModule": "波音737(中)", //机型
                "depAirportCode": o.flightDepartureCode, //出发机场三字码
                "arrAirportCode": o.flightArrivalCode, //到达机场三字码
                "departureDate": Utils.formatDate(o.flightDate), //出发日期
                "departureTime": Utils.formatTime(o.flightDepartureTime), //出发时间
                "arrivalDate": Utils.formatDate(o.flightDate), //到达日期
                "arrivalTime": Utils.formatTime(o.flightArrivalTime), //到达时间
                "depTerminal": "", //出发航站楼,可空
                "arrTerminal": "", //到达航站楼,可空
                "depAirport": "", //起飞机场名称
                "arrAirport": "", //到达机场名称
                "flightTime": "", //飞行时间,可空
                "actFlightNum": "", //实际承运航班号,可空
                "codeShare": false, //是否共享航班,可空
                "meal": true, //餐食
                "correct": "", //准点率,可空
                "airCompany": "中国东方航空", //航司名称
                "depCity": o.flightDeparture, //出发城市,可空
                "arrCity": o.flightArrival, //到达城市,可空
                "depCityCode": "", //出发城市码,可空
                "arrCityCode": "", //到达城市码,可空
                "crossDays": "",
                "stopInfos": null,
                // "actCarrier": "", //实际承运人为空表示就是销售承运人,可空
                "segmentType": 1, //航段类型0单程
                "stops": 0 //经停数
            };
        }),
        "passengers": remotes[0].passengers.map((p) => {
            return {
                "uniqueKey": 1, //乘机人序号
                "name": p.name, //乘机人姓名
                "gender": "M", //性别 M/F
                "ageType": p.type == "成人" ? 0 : 1, //乘客类型（成人/儿童/婴儿）；0：成人，1：儿童，2：婴儿
                "birthday": "", //出生日期
                "nationality": null, //国籍
                "tickets": p.ticketNo ? [{
                    "ticketNo": p.ticketNo, //票号
                }] : [],
                "cardType": "NI", //证件类型，NI：身份证，PP：护照，OT：其他
                "cardNum": orders[0].passengerIdentify, //证件号码
                "cardExpired": null, //证件过期时间
                "cardIssuePlace": null,
                "mobCountryCode": 86
            };
        }),
        "tgqRules": [],
        "priceInfo": {  //价格信息
            "allPrice": Number(remotes[0].passengerTypes[0].allPrices) + Number(remotes[1].passengerTypes[0].allPrices),  //总价
            "adultsCount": remotes[0].passengerTypes[0].count,  //成人数
            "childrenCount": "0", //儿童数
            "infantCount": "0",  //婴儿数
            "adult": {
                "printPrice": "",
                "salePrice": "",
                "discount": "0",
                "flightPrice": Number(remotes[0].passengerTypes[0].realPrice) + Number(remotes[1].passengerTypes[0].realPrice),
                "tax": Number(remotes[0].passengerTypes[0].constructionFee) + Number(remotes[1].passengerTypes[0].constructionFee) + Number(remotes[0].passengerTypes[0].fuelTax) + Number(remotes[1].passengerTypes[0].fuelTax)
            },
            "child": null,
            "infant": null
        },
        // "payInfo": {
        //     "payMoney": "1006.00", //支付金额
        //     "payTime": "2016-12-12 18:01:18", //支付时间
        //     "payDeadline": "2017-01-09 20:49:00" //支付截止时间
        // },
        // "expressDetail": {  //行程单信息
        //     "status": 6,   //行程单状态 1-待支付 2-支付完成 3-处理中 4-已推送 5-已回推 6-已邮寄 7-已取消
        //     "name": "行程单",   //邮寄姓名
        //     "contactMob": "18205555555",   //联系电话
        //     "xcdNo": "1234567",   //行程单号
        //     "expressNo": "2342345423534",   //快递号
        //     "expressCompany": "顺丰",  //快递公司
        //     "payType": 2,   //支付类型 2-线上支付，无其它类型
        //     "expressFee": 20,//快递费
        //     "createTime": "2017-03-20 19:28:58"   //创建时间
        // },
        "dataExt": {},
    });
});

router.post('/BookingOrder', async (req, res, next) => {
    let bookings;
    try {
        bookings = JSON.parse(Utils.decodeBase64(await Key.get(req.body.bookingKey)));
    } catch (e) {
        Utils.renderApiResult(res, {
            "version": "1.0.0",
            "status": {
                "code": 1012,
                "errorMsg": "bookingKey 找不到"
            }
        });
    }

    let name = req.body.passengers[0].name;
    let identify = req.body.passengers[0].cardNum;
    let birthday = req.body.passengers[0].birthday;
    let sex = req.body.passengers[0].gender == 'M' ? 0 : 1;
    let bookingStart = bookings.start;
    let bookingEnd = bookings.end;
    let groupId = "TAN" + new Date().getTime();
    console.log(identify);
    try {
        if (bookingStart && bookingEnd) {
            let order = await Api.order(name, identify, birthday, sex, bookingStart);
            let orderInfo = await Api.orderDetail(order.orderNo);
            if (!order || !orderInfo.flightInfo) {
                throw "去程预约失败";
            }
            let arrTime = orderInfo.flightInfo[0].deptTime;
            let totalPrice = orderInfo.passengerTypes[0].allPrices;
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
                passengerIdentify: identify,
                passengerTicketNo: orderInfo.passengers[0].ticketNo,
                passengerInsuranceNo: orderInfo.passengers[0].insuranceNo,
                flightNo: orderInfo.flightInfo[0].flightNum,
                flightDate: Date.parse(bookings.sdate),
                flightDeparture: orderInfo.flightInfo[0].dptCity,
                flightDepartureCode: orderInfo.flightInfo[0].dptAirportCode,
                flightDepartureTime: Date.parse(bookings.sdate + ' ' + bookings.stime),
                flightArrival: orderInfo.flightInfo[0].arrCity,
                flightArrivalCode: orderInfo.flightInfo[0].arrAirportCode,
                flightArrivalTime: Date.parse(bookings.sdate + ' ' + arrTime.substr(arrTime.lastIndexOf('-') + 1)),
                flightCabin: orderInfo.flightInfo[0].cabin,
                notice: orderInfo.other.tgqMsg,
            });
            order = await Api.order(name, identify, birthday, sex, bookingEnd);
            orderInfo = await Api.orderDetail(order.orderNo);
            if (!order || !orderInfo.flightInfo) {
                throw "返程预约失败";
            }
            arrTime = orderInfo.flightInfo[0].deptTime;
            totalPrice += orderInfo.passengerTypes[0].allPrices;
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
                passengerIdentify: identify,
                passengerTicketNo: orderInfo.passengers[0].ticketNo,
                passengerInsuranceNo: orderInfo.passengers[0].insuranceNo,
                flightNo: orderInfo.flightInfo[0].flightNum,
                flightDate: Date.parse(bookings.edate),
                flightDeparture: orderInfo.flightInfo[0].dptCity,
                flightDepartureCode: orderInfo.flightInfo[0].dptAirportCode,
                flightDepartureTime: Date.parse(bookings.edate + ' ' + bookings.etime),
                flightArrival: orderInfo.flightInfo[0].arrCity,
                flightArrivalCode: orderInfo.flightInfo[0].arrAirportCode,
                flightArrivalTime: Date.parse(bookings.edate + ' ' + arrTime.substr(arrTime.lastIndexOf('-') + 1)),
                flightCabin: orderInfo.flightInfo[0].cabin,
                notice: orderInfo.other.tgqMsg,
            });
            Utils.renderApiResult(res, {
                "version": "1.0.0",
                "status": {
                    "code": 0,
                    "errorMsg": null
                },
                "orderNo": groupId,
                "businessOrderNo": groupId,
                "totalPrice": totalPrice,
                "adlPnr": "N/A",
                "chPnr": "N/A"
            });
        } else {
            Utils.renderApiResult(res, {
                "version": "1.0.0",
                "status": {
                    "code": 1001,
                    "errorMsg": "预约失败票价已经更新"
                }
            });
        }
    } catch (e) {
        Utils.renderApiResult(res, {
            "version": "1.0.0",
            "status": {
                "code": 1002,
                "errorMsg": e
            }
        });
    }

});

router.post('/CheckPrice', async (req, res, next) => {
    let params = JSON.parse(Utils.decodeBase64(req.body.verify.productId));
    let prices = await new Promise((resolve, reject) => {
        Promise.all([
            singlePrice(params.sdpt, params.sarr, params.sd, params.st, params.sn),
            singlePrice(params.edpt, params.earr, params.ed, params.et, params.en)
        ]).then((r) => {
            resolve(r)
        }).catch((e) => {
            reject(e);
        });
    });
    let startPrice = prices[0];
    let endPrice = prices[1];
    let key = await Key.set(Utils.encodeBase64(new Date().getTime().toString()), {
        start: startPrice.booking,
        end: endPrice.booking,
        sdate: params.sd,
        stime: params.st,
        edate: params.ed,
        etime: params.et
    });
    Utils.renderApiResult(res, {
        "version": "1.0.0",
        "status": {
            "code": "0",
            "errorMsg": ""
        },
        "bookingKey": key,   //验舱验价缓存key，生单时带回
        "avCheckResult": [{    //这里返回的是一个数组，兼容往返
            "depCode": params.dep,   //出发机场三字码
            "arrCode": params.arr,    //到达机场三字码
            "date": params.sd,   //出发日期
            "carrier": params.sn.substr(0, 2),     //航司二字码
            "code": params.sn,   //航班号
            "cabin": "Y",         //舱位
            "seatCount": "A"     //剩余座位
        }, {    //这里返回的是一个数组，兼容往返
            "depCode": params.arr,   //出发机场三字码
            "arrCode": params.dep,    //到达机场三字码
            "date": params.ed,   //出发日期
            "carrier": params.en.substr(0, 2),     //航司二字码
            "code": params.en,   //航班号
            "cabin": "Y",         //舱位
            "seatCount": "A"     //剩余座位
        }],
        "priceResult": {
            "adult": {
                "printPrice": Number(startPrice.adult.printPrice) + Number(endPrice.adult.printPrice),
                "salePrice": Number(startPrice.adult.salePrice) + Number(endPrice.adult.salePrice),
                "discount": startPrice.adult.discount,
                "flightPrice": Number(startPrice.adult.flightPrice) + Number(endPrice.adult.flightPrice),
                "fuelTax": Number(startPrice.adult.fuelTax) + Number(endPrice.adult.fuelTax),
                "airportFee": Number(startPrice.adult.airportFee) + Number(endPrice.adult.airportFee),
                "tax": Number(startPrice.adult.fuelTax) + Number(endPrice.adult.fuelTax) + Number(startPrice.adult.airportFee) + Number(endPrice.adult.airportFee)
            },
            "child": {
                "printPrice": Number(startPrice.child.printPrice) + Number(endPrice.child.printPrice),
                "salePrice": Number(startPrice.child.salePrice) + Number(endPrice.child.salePrice),
                "discount": startPrice.child.discount,
                "flightPrice": Number(startPrice.child.flightPrice) + Number(endPrice.child.flightPrice),
                "fuelTax": Number(startPrice.child.fuelTax) + Number(endPrice.child.fuelTax),
                "airportFee": Number(startPrice.child.airportFee) + Number(endPrice.child.airportFee),
                "tax": Number(startPrice.child.fuelTax) + Number(endPrice.child.fuelTax) + Number(startPrice.child.airportFee) + Number(endPrice.child.airportFee)
            },
            "infant": {
                "printPrice": Number(startPrice.infant.printPrice) + Number(endPrice.infant.printPrice),
                "salePrice": Number(startPrice.infant.salePrice) + Number(endPrice.infant.salePrice),
                "discount": startPrice.infant.discount,
                "flightPrice": Number(startPrice.infant.flightPrice) + Number(endPrice.infant.flightPrice),
                "fuelTax": Number(startPrice.infant.fuelTax) + Number(endPrice.infant.fuelTax),
                "airportFee": Number(startPrice.infant.airportFee) + Number(endPrice.infant.airportFee),
                "tax": Number(startPrice.infant.fuelTax) + Number(endPrice.infant.fuelTax) + Number(startPrice.infant.airportFee) + Number(endPrice.infant.airportFee)
            }
        }
    });
});

router.post('/SearchAV', async (req, res, next) => {
    let params = req.body.searchCondition.segments[0];
    let result, result2;
    try {
        result = await Api.queryFlight(params.dep, params.arr, params.date);
        result2 = await Api.queryFlight(params.arr, params.dep, params.returnDate);
    } catch (e) {
        return Utils.renderApiResult(res, {
            "version": "1.0.0", //版本号
            "status": {
                "code": "4002", //状态码 0-成功  非0-失败
                "errorMsg": e //失败具体原因
            },
            "searchResponse": null
        });
    }
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
            "searchResponse": null
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

                    rules[startPrice.tgqRuleId + "-" + startIndex + "-" + endIndex + "-" + endPrice.tgqRuleId] = {
                        "adult": {
                            "timeSharingChargeInfoList": startPrice.booking.tgqShowData.tgqPointCharges.map(function (e) {
                                return {
                                    "changeFee": e.changeFee,
                                    "returnFee": e.returnFee,
                                    "timeText": e.time > 0 ? "起飛前" + e.time + "小時前" : "起飛前4小時后",
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
                                    "timeText": e.time > 0 ? "起飛前" + e.time + "小時前" : "起飛前4小時后",
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
                                    "timeText": e.time > 0 ? "起飛前" + e.time + "小時前" : "起飛前4小時后",
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
                    rules[startPrice.backTgqRuleId + "-" + startIndex + "-" + endIndex + "-" + endPrice.backTgqRuleId] = {
                        "adult": {
                            "timeSharingChargeInfoList": endPrice.booking.tgqShowData.tgqPointCharges.map(function (e) {
                                return {
                                    "changeFee": e.changeFee,
                                    "returnFee": e.returnFee,
                                    "timeText": e.time > 0 ? "起飛前" + e.time + "小時前" : "起飛前4小時后",
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
                                    "timeText": e.time > 0 ? "起飛前" + e.time + "小時前" : "起飛前4小時后",
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
                                    "timeText": e.time > 0 ? "起飛前" + e.time + "小時前" : "起飛前4小時后",
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
                    let productId = Utils.encodeBase64(JSON.stringify({
                        sarr: start.arr,
                        sdpt: start.dpt,
                        earr: end.arr,
                        edpt: end.dpt,
                        st: start.dptTime,
                        et: end.dptTime,
                        sd: params.date,
                        ed: params.returnDate,
                        sn: start.flightNum,
                        en: end.flightNum
                    }));
                    products[productId] = {
                        "productKey": productId,
                        "productName": "经济仓报价",
                        "productType": 1,
                        "cabin": [startPrice.cabin[0], endPrice.cabin[0]],
                        "source": "own",
                        "flightNo": start.flightNum + "-" + end.flightNum, //航班号 往返为CA4387-CA4378
                        "agent": false,
                        "adult": {
                            "printPrice": Number(startPrice.adult.printPrice) + Number(endPrice.adult.printPrice),
                            "salePrice": Number(startPrice.adult.salePrice) + Number(endPrice.adult.salePrice),
                            "discount": startPrice.adult.discount,
                            "flightPrice": Number(startPrice.adult.flightPrice) + Number(endPrice.adult.flightPrice),
                            "fuelTax": Number(startPrice.adult.fuelTax) + Number(endPrice.adult.fuelTax),
                            "airportFee": Number(startPrice.adult.airportFee) + Number(endPrice.adult.airportFee),
                            "tax": Number(startPrice.adult.fuelTax) + Number(endPrice.adult.fuelTax) + Number(startPrice.adult.airportFee) + Number(endPrice.adult.airportFee)
                        },
                        "child": {
                            "printPrice": Number(startPrice.child.printPrice) + Number(endPrice.child.printPrice),
                            "salePrice": Number(startPrice.child.salePrice) + Number(endPrice.child.salePrice),
                            "discount": startPrice.child.discount,
                            "flightPrice": Number(startPrice.child.flightPrice) + Number(endPrice.child.flightPrice),
                            "fuelTax": Number(startPrice.child.fuelTax) + Number(endPrice.child.fuelTax),
                            "airportFee": Number(startPrice.child.airportFee) + Number(endPrice.child.airportFee),
                            "tax": Number(startPrice.child.fuelTax) + Number(endPrice.child.fuelTax) + Number(startPrice.child.airportFee) + Number(endPrice.child.airportFee)
                        },
                        "infant": {
                            "printPrice": Number(startPrice.infant.printPrice) + Number(endPrice.infant.printPrice),
                            "salePrice": Number(startPrice.infant.salePrice) + Number(endPrice.infant.salePrice),
                            "discount": startPrice.infant.discount,
                            "flightPrice": Number(startPrice.infant.flightPrice) + Number(endPrice.infant.flightPrice),
                            "fuelTax": Number(startPrice.infant.fuelTax) + Number(endPrice.infant.fuelTax),
                            "airportFee": Number(startPrice.infant.airportFee) + Number(endPrice.infant.airportFee),
                            "tax": Number(startPrice.infant.fuelTax) + Number(endPrice.infant.fuelTax) + Number(startPrice.infant.airportFee) + Number(endPrice.infant.airportFee)
                        },
                        "tgqRuleId": startPrice.tgqRuleId + "-" + startIndex + "-" + endIndex + "-" + endPrice.tgqRuleId, //退改签key，对应tgqRules
                        "backTgqRuleId": startPrice.backTgqRuleId + "-" + startIndex + "-" + endIndex + "-" + endPrice.backTgqRuleId //往返回程退改签key 对应tgqRules
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
                        "productList": [productId]
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
        "searchResponse": {
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
                    passengerIdentify: identify,
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
                    passengerIdentify: identify,
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
                    "printPrice": "", //票面价
                    "salePrice": "", //销售价
                    "discount": p.discount, //折扣
                    "flightPrice": booking.extInfo.barePrice, //机票价格
                    "fuelTax": booking.priceInfo.tof, // 燃油费
                    "airportFee": booking.priceInfo.arf, // 机建费
                    "tax": "0" //税
                },
                "child": {
                    "printPrice": booking.extInfo.ticketPirce,
                    "salePrice": p.businessExtMap.childPrice,
                    "discount": p.discount,
                    "flightPrice": p.businessExtMap.childPrice,
                    "fuelTax": booking.priceInfo.tof, // 燃油费
                    "airportFee": booking.priceInfo.arf, // 机建费
                    "tax": "0" //税
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
        // delete order.groupId;
        // delete order.orderId;
        // delete order.orderNo;
        order.id = groupId + order._id.toString().toUpperCase();
        delete order._id;
        res.flights[Utils.formatDate(order.flightDate)] = order;
    });
    return res;
}

module.exports = router;
