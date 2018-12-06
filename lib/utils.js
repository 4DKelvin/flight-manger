module.exports = {
    formatDate: function (date) {
        let d = new Date(!isNaN(date) ? Number(date) : Date.parse(date));
        return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-")
    },
    formatDateTime: function (date) {
        let d = new Date(!isNaN(date) ? Number(date) : Date.parse(date));
        return this.formatDate(date) + ' ' + [d.getHours(), d.getMinutes(), d.getSeconds()].join(":");
    },
    formatTime: function (date) {
        let d = new Date(!isNaN(date) ? Number(date) : Date.parse(date));
        return [d.getHours(), d.getMinutes(), d.getSeconds()].join(":");
    },
    encodeBase64: function (source) {
        return new Buffer(source).toString('base64');
    },
    decodeBase64: function (encoded) {
        return new Buffer(encoded, 'base64').toString('utf-8');
    },
    renderJson: function (res, data) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            code: 200,
            data: data,
            msg: '操作成功'
        }));
    },
    renderJsonError: function (res, msg) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            code: 500,
            data: false,
            msg: msg
        }));
    },
    renderApiResult: function (res, data) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data));
    }
};