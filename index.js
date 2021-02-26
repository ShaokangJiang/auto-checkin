const solarLunar = require("solarlunar");
const fetch = require('node-fetch');
const puppeteer = require('puppeteer');
const moment = require('moment-timezone');

async function getSchoolData() {
    const browser = await puppeteer.launch();


    page = await browser.newPage();
    await page.goto('https://covidresponse.wisc.edu/dashboard/', { waitUntil: 'load' });


    const newPage = await page.evaluate(() => {
        document.getElementsByClassName("cases-cumulative")[0];
        return document.getElementById("DataTables_Table_0").innerHTML;
    });

    browser.close();

    return newPage;
}

function getYear(str) {
    return parseInt(str.split("-")[0]);
}

function getMonth(str) {
    return parseInt(str.split("-")[1]);
}

function getDay(str) {
    return parseInt(str.split(" ")[0].split("-")[2]);
}

function getHour(str) {
    return parseInt(str.split(" ")[1].split(":")[0]);
}

function getMinute(str) {
    return parseInt(str.split(":")[1]);
}

function getSeconds(str) {
    return parseInt(str.split(":")[2]);
}

function getTime() {
    var timeCST = moment().tz('America/Chicago').format("YYYY-MM-DD HH:mm:ss");
    var timeBeijing = moment().tz('Asia/Shanghai').format("YYYY-MM-DD HH:mm:ss");
    console.log(timeCST);
    console.log(timeBeijing);
    let str = getYear(timeBeijing) + "年" + getMonth(timeBeijing) + "月" + getDay(timeBeijing) + "日" +
        getHour(timeBeijing) + "点" + getMinute(timeBeijing) + "分" + getSeconds(timeBeijing) + "秒\n";
    const solar2lunarData = solarLunar.solar2lunar(getYear(timeBeijing), getMonth(timeBeijing), getDay(timeBeijing)); // 输入的日子为公历
    str += solar2lunarData.gzYear  + "年" + solar2lunarData.monthCn + solar2lunarData.dayCn;
    console.log(str);
}

var temp = solarLunar.solar2lunar(2021, 2, 12); // 输入的日子为农历

console.log(temp);
temp = solarLunar.solar2lunar(2021, 2, 11); // 输入的日子为农历

console.log(temp);
//fetch('https://covidresponse.wisc.edu/dashboard/')
//  .then(res => res.text())
//.then(json => console.log(json));


async function main() {
    //console.log(await getSchoolData());
    getTime();
}

main();
