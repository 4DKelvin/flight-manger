const Api = require('./lib/flight');
let test = async () => {
    let testDep = "SZX";//深圳起飛
    let testArr = "CTU";//成都到達
    let depDate = "2018-11-25";//航班日期

    //查航班
    let flights = await Api.queryFlight(testDep, testArr, depDate);
    if (flights.flightInfos && flights.flightInfos.length) {
        let flight = flights.flightInfos[0];
        let depTime = flight.dptTime; //航班起飛時間

        //查價錢
        let prices = await Api.queryPrice(flight.dpt, flight.arr, depDate, flight.flightNum);
        if (prices.vendors && prices.vendors.length) {
            let priceDetail = prices.vendors[0]; //價格詳情

            //預約
            let bookingInfo = await Api.booking(flight.dpt, flight.arr, depDate, depTime, flight.flightNum, priceDetail);

            //預約成功，下單
            if (bookingInfo) {
                let order = await Api.order("梁毅鋒", "440104198912095030", "1989-12-09", 1, bookingInfo);

                let amount = order.noPayAmount; //訂單價格
                let orderId = order.id; //訂單編號
                let orderNo = order.orderNo; //訂單流水號
                let agent = bookingInfo.extInfo.clientId; //渠道

                //TODO: 這裡把訂單添加到我們的數據庫

                /* 真實支付接口測試慎重
                try {
                    let res = await Api.pay(orderId, agent);
                    let ticket = res.results[0];
                    console.log(ticket); //支付成功，取得收據
                } catch (e) {
                    console.log(e); //支付失敗，e=>原因
                }
                */

                //查看訂單詳情
                console.log(await Api.orderDetail(orderNo));

            }

        }
    }
};

test();