function replaceAll(originalString, find, replace) {
    return originalString.replace(new RegExp(find, 'g'), replace);
}

function mapString(str) {
    str = replaceAll(str," ", "+")
    str = replaceAll(str,"/", "-")
    str = replaceAll(str,":", "%3A")
    return str;
}


console.log(mapString("2021-02-27 00:45:58"));