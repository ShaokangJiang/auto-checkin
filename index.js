const solarLunar = require("solarlunar");
const fetch = require('node-fetch');
const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const urlencode = require('urlencode');
const cookie = require('cookie');
const HTMLParser = require('node-html-parser');
const core = require('@actions/core');

const dotenv = require("dotenv")

dotenv.config()

const { NAME: NAME, PASSWORD: PASSWORD, DATASTR2: DATASTR2, DATASTR3: DATASTR3, APP_TOKEN: APP_TOKEN, UID: UID } = process.env;

// const USERNAME = core.getInput("USERNAME");
// const PASSWORD = core.getInput("PASSWORD");
// // const dataStr1 = "WID=BA6601DA1C2C4FE2E0540010E03A9B2A&NEED_CHECKIN_DATE="; // + "2021-02-19" + 
// const dataStr2 = core.getInput("DATASTR2");
// const dataStr3 = core.getInput("DATASTR3");

// const APP_TOKEN = core.getInput("APP_TOKEN");
// const UID = core.getInput("UID");
const dataStr2 = DATASTR2;
const dataStr3 = DATASTR3;
const USERNAME = NAME;

if (USERNAME.localeCompare("") == 0 || PASSWORD.localeCompare("") == 0 || dataStr2.localeCompare("") == 0 || dataStr3.localeCompare("") == 0 || APP_TOKEN.localeCompare("") == 0 || UID.localeCompare("") == 0) {
    core.setFailed(`Action failed because of empty required secrets.`);
}

let browser;

var Cookies = {};

var newCookies = "";

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
    //console.log(timeCST);
    //console.log(timeBeijing);
    let str = "[" + getYear(timeBeijing) + "年" + getMonth(timeBeijing) + "月" + getDay(timeBeijing) + "日" +
        getHour(timeBeijing) + "点" + getMinute(timeBeijing) + "分" + getSeconds(timeBeijing) + "秒\n";
    const solar2lunarData = solarLunar.solar2lunar(getYear(timeBeijing), getMonth(timeBeijing), getDay(timeBeijing)); // 输入的日子为公历
    str += solar2lunarData.gzYear + "年" + solar2lunarData.monthCn + solar2lunarData.dayCn;
    if (solar2lunarData.term != undefined && solar2lunarData.term.localeCompare('') != 0) {
        str += "\n今天是" + solar2lunarData.term;
    }
    str += "]\n";
    //console.log(str);
    return str;
}

function getDataRaw() {

}


// async function mainFunction() {
//     let init = await
//         fetch("http://authserver.csust.edu.cn/authserver/login?service=http%3A%2F%2Fehall.csust.edu.cn%2Flogin%3Fservice%3Dhttp%3A%2F%2Fehall.csust.edu.cn%2Fnew%2Findex.html", {
//             "headers": {
//                 "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
//                 "accept-language": "en-US,en;q=0.9",
//                 "cache-control": "no-cache",
//                 "pragma": "no-cache",
//                 "upgrade-insecure-requests": "1"
//             },
//             "referrerPolicy": "strict-origin-when-cross-origin",
//             "body": null,
//             "method": "GET",
//             "mode": "cors"
//         });

//     for (const header of init.headers) {
//         if (header[0].localeCompare("set-cookie") == 0) {
//             let tmp = header[1].split(",");
//             for (const a of tmp) {
//                 let content = cookie.parse(a);
//                 for (const parameter of Object.keys(content)) {
//                     Cookies[parameter] = content[parameter];
//                 }
//             }
//         }
//         console.log(`Name: ${header[0]}, Value:${header[1]}`);
//     }

//     let content = HTMLParser.parse(await init.text());

//     console.log(content);

// }

function buildCookies() {
    var toRe = "";
    for (let i of newCookies) {
        toRe += cookie.serialize(i.name, i.value) + "; ";
    }
    return toRe;
}

async function sendMessage(message) {
    let uids = [];
    for (let i of UID.split(";")) {
        if (i.length != 0)
            uids.push(i);
    }
    let response = await fetch("http://wxpusher.zjiecode.com/api/send/message", {
        "headers": {
            "accept": "*/*",
            "content-type": "application/json"
        },
        "body": JSON.stringify({
            "appToken": APP_TOKEN,
            "content": message,
            "contentType": 1,//内容类型 1表示文字  2表示html(只发送body标签内部的数据即可，不包括body标签) 3表示markdown 
            "uids": uids,
            "url": undefined //原文链接，可选参数
        }),
        "method": "POST"
    });

    return await response.json();
}

function replaceAll(originalString, find, replace) {
    return originalString.replace(new RegExp(find, 'g'), replace);
}

function mapString(str) {
    str = replaceAll(str, " ", "+")
    str = replaceAll(str, "/", "-")
    str = replaceAll(str, ":", "%3A")
    return str;
}

async function mainFunction1() {
    // use try catch without timeout at here
    // const browser = await puppeteer.launch({ headless: true , args: [`--no-sandbox`, `--disable-setuid-sandbox`]});\
    let message = "";
    let hrstart = process.hrtime();
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    // await page.setDefaultNavigationTimeout(500000);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setRequestInterception(true);

    page.on('request', (req) => {
        if (req.resourceType() === 'image') {
            req.abort();
        }
        else {
            req.continue();
        }
    });
    let hrend = process.hrtime(hrstart);

    core.info("Start the first page, browser initialized in " + hrend[0] + "s")
    hrstart = process.hrtime();
    try {// wait for 60 seconds
        await page.goto('http://authserver.csust.edu.cn/authserver/login?service=http%3A%2F%2Fehall.csust.edu.cn%2Flogin%3Fservice%3Dhttp%3A%2F%2Fehall.csust.edu.cn%2Fnew%2Findex.html', { waitUntil: 'networkidle0', timeout: 60000 }); // wait until page load
    } catch (e) {
        core.error("Wait too long for login page, expand threshold and refresh")
        try {// wait for 5 minutes
            await page.goto('http://authserver.csust.edu.cn/authserver/login?service=http%3A%2F%2Fehall.csust.edu.cn%2Flogin%3Fservice%3Dhttp%3A%2F%2Fehall.csust.edu.cn%2Fnew%2Findex.html', { waitUntil: 'networkidle0', timeout: 300000 }); // wait until page load
        } catch (e) { // 16 minutes wait
            core.error("Wait too long for login page again, expand threshold and refresh again")
            await page.goto('http://authserver.csust.edu.cn/authserver/login?service=http%3A%2F%2Fehall.csust.edu.cn%2Flogin%3Fservice%3Dhttp%3A%2F%2Fehall.csust.edu.cn%2Fnew%2Findex.html', { waitUntil: 'networkidle0', timeout: 1000000 }); // wait until page load
        }
    }
    hrend = process.hrtime(hrstart);
    core.info("Finish loading the first page, first page loaded in " + hrend[0] + "s")
    await page.type('#username', USERNAME);
    await page.type('#password', PASSWORD);
    await page.click('button[type=submit]');
    hrstart = process.hrtime();
    core.info("Start login")
    try {
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
    } catch (e) {
        core.error("Wait too long for portal page, skip to the next step")
    }
    hrend = process.hrtime(hrstart);
    core.info("Logged in in " + hrend[0] + "s")
    hrstart = process.hrtime();
    core.info("Start to load check in page")
    try {
        await page.goto('http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/index.do', { waitUntil: 'networkidle0', timeout: 300000 }); // wait until page load
    } catch (e) {
        core.error("Wait too long for check in page, expand threshold and refresh");
        try {
            await page.goto('http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/index.do', { waitUntil: 'networkidle0', timeout: 600000 }); // wait until page load
        } catch (e) {// 20 minutes wait
            try {
                core.error("Wait too long for check in page again, expand threshold and refresh");
                await page.goto('http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/index.do', { waitUntil: 'networkidle0', timeout: 1500000 }); // wait until page load
            } catch (e) {
                core.error("Wait too long for check in page again, stop waiting and try to continue");
            }
        }
    }
    hrend = process.hrtime(hrstart);
    core.info("Portal page loaded in " + (hrend[0] / 60) + "min")
    newCookies = await page.cookies();

    hrstart = process.hrtime();
    core.info("Start to get history data")
    let historyData = await page.evaluate(async () => {
        let response = await fetch("http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/modules/dailyReport/getMyDailyReportDatas.do", {
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                "cache-control": "no-cache",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "pragma": "no-cache",
                "x-requested-with": "XMLHttpRequest"
            },
            "referrer": "http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/index.do",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": "pageSize=10&pageNumber=1",
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        });
        let responseContent = await response.json();

        return JSON.stringify(responseContent);
    });
    hrend = process.hrtime(hrstart);
    core.info("Get History Data in " + hrend[0] + "s")
    historyData = JSON.parse(historyData);

    //Get today has reported
    hrstart = procecss.hrtime();
    core.info("Start to load HasReported info")
    let HasReported = await page.evaluate(async () => {
        let response = await fetch("http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/modules/dailyReport/getTodayHasReported.do", {
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                "cache-control": "no-cache",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "pragma": "no-cache",
                "x-requested-with": "XMLHttpRequest"
            },
            "referrer": "http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/index.do",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": "pageNumber=1",
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        });

        let responseContent = await response.json();

        return JSON.stringify(responseContent);
    });
    hrend = process.hrtime(hrstart);
    core.info("Get Has reported in " + hrend[0] + "s")
    HasReported = JSON.parse(HasReported);

    if (HasReported.datas.getTodayHasReported.totalSize == 0) { // not reported
        hrstart = process.hrtime();

        core.info("Start check in process")
        //Get server time
        const serverTime = await page.evaluate(async () => {
            let response = await fetch("http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/api/daily/getServerTime.do", {
                "headers": {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                    "cache-control": "no-cache",
                    "pragma": "no-cache",
                    "x-requested-with": "XMLHttpRequest"
                },
                "referrer": "http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/index.do",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            });

            let responseContent = await response.json();

            return JSON.stringify(responseContent);
        });
        core.info("server Time:")
        let a = JSON.parse(serverTime);
        if (a.msg.localeCompare("成功") == 0) {
            core.info("Success" + a.data.date)
        } else {
            throw new Error('Failed to get server time');
        }
        // let CheckinDate = mapString(a.data.date.split(" ")[0]);
        // let TimeSubmit = mapString(a.data.date);
        let TimeCreate = mapString(a.data.date.substring(0, a.data.date.length - 3));
        core.info("Time Created:" + TimeCreate)


        let todayInfo = await page.evaluate(async () => {
            let response = await fetch("http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/modules/dailyReport/getMyTodayReportWid.do", {
                "headers": {
                    "accept": "application/json, text/javascript, */*; q=0.01",
                    "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                    "cache-control": "no-cache",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "pragma": "no-cache",
                    "x-requested-with": "XMLHttpRequest"
                },
                "referrer": "http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/index.do",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": "pageNumber=1",
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            });
            let responseContent = await response.json();

            return JSON.stringify(responseContent);
        });

        todayInfo = JSON.parse(todayInfo);
        let CZRQ = mapString(todayInfo.datas.getMyTodayReportWid.rows[0].CZRQ); //sample 2021-02-27 00:45:58
        let WID = todayInfo.datas.getMyTodayReportWid.rows[0].WID; // sample BC1BFB84364300E4E0540010E03A9B2A
        let NEED_CHECKIN_DATE = todayInfo.datas.getMyTodayReportWid.rows[0].NEED_CHECKIN_DATE;//2021-02-27
        core.info("CZRQ:" + CZRQ + "WID:" + WID + "NEED:" + NEED_CHECKIN_DATE);

        // let submitContent = dataStr1 + CheckinDate + dataStr2 + TimeSubmit + "&USER_ID=" + USERNAME + dataStr3 + TimeCreate;
        let submitContent = "WID=" + WID + "&NEED_CHECKIN_DATE=" + NEED_CHECKIN_DATE + dataStr2 + CZRQ + "&USER_ID=" + USERNAME + dataStr3 + TimeCreate;
        // console.log(submitContent);

        let submission = await page.evaluate(async (submitContent) => {
            let response = await fetch("http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/modules/dailyReport/T_REPORT_EPIDEMIC_CHECKIN_SAVE.do", {
                "headers": {
                    "accept": "application/json, text/javascript, */*; q=0.01",
                    "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                    "cache-control": "no-cache",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "pragma": "no-cache",
                    "x-requested-with": "XMLHttpRequest"
                },
                "referrer": "http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/index.do",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": submitContent,
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            });

            let responseContent = await response.json();

            return JSON.stringify(responseContent);
        }, submitContent);
        core.info("submission return:");
        //console.log(submission);

        submission = JSON.parse(submission);
        if (submission.code.localeCompare("#E111080000000") == 0) {//has submitted
            message += "检测到已签到，最近一次数据为\nNEED_CHECKIN_DATE:" + historyData.datas.getMyDailyReportDatas.rows[0].NEED_CHECKIN_DATE + "\nCREATED_AT:" + historyData.datas.getMyDailyReportDatas.rows[0].CREATED_AT;
        } else {// not submitted
            message += "已成功签到，T_REPORT_EPIDEMIC_CHECKIN_SAVE:" + submission.datas.T_REPORT_EPIDEMIC_CHECKIN_SAVE;
            historyData = await page.evaluate(async () => {
                let response = await fetch("http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/modules/dailyReport/getMyDailyReportDatas.do", {
                    "headers": {
                        "accept": "application/json, text/javascript, */*; q=0.01",
                        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                        "cache-control": "no-cache",
                        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "pragma": "no-cache",
                        "x-requested-with": "XMLHttpRequest"
                    },
                    "referrer": "http://ehall.csust.edu.cn/qljfwapp/sys/lwReportEpidemic/index.do",
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": "pageSize=10&pageNumber=1",
                    "method": "POST",
                    "mode": "cors",
                    "credentials": "include"
                });
                let responseContent = await response.json();

                return JSON.stringify(responseContent);
            });

            core.info("Get History Data")
            historyData = JSON.parse(historyData);
            message += "最近一次数据为\nNEED_CHECKIN_DATE:" + historyData.datas.getMyDailyReportDatas.rows[0].NEED_CHECKIN_DATE + "\nCREATED_AT:" + historyData.datas.getMyDailyReportDatas.rows[0].CREATED_AT;
        }

        hrend = process.hrtime(hrstart);
        core.info("Check in finished in " + hrend[0] + "s")
    } else { //reported, send message notificaation
        message += "检测到已签到，最近一次数据为\nNEED_CHECKIN_DATE:" + historyData.datas.getMyDailyReportDatas.rows[0].NEED_CHECKIN_DATE + "\nCREATED_AT:" + historyData.datas.getMyDailyReportDatas.rows[0].CREATED_AT;
    }

    await browser.close();
    return message;
}

async function main() {
    //console.log(await getSchoolData());
    //mainFunction();
    try {
        let hrstart = process.hrtime();
        let mainMessage = await mainFunction1();
        let hrend = process.hrtime(hrstart);

        await sendMessage("打卡成功\n" + getTime() + mainMessage + "\n用时:" + (hrend[0] / 60) + "分钟");
    } catch (e) {
        await sendMessage("打卡失败\n" + getTime() + "发生了错误，详情:" + e);
        await browser.close();
        core.setFailed(`Action failed with error ${e}`);
    }
    //getTime();
}

main();
