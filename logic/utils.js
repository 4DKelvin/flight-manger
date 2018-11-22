module.exports = {
    formatDate: function (date) {
        let d = new Date(date);
        return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-")
    },
    formatDateTime: function (date) {
        let d = new Date(date);
        return this.formatDate(date) + ' ' + [d.getHours(), d.getMinutes(), d.getSeconds()].join(":");
    }
}