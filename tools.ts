const evalfuncsring = `function ____evalfunc____(optins,code,_____data_____,____tempHelp____){
                var ____code____=code;
                if(_____data_____!==undefined && code.charAt(code.length-1)==="="){
                    ____code____=code+"_____data_____";
                }
                ____tempHelp____=____tempHelp____||{};
                with (____tempHelp____){
                    with (optins) {
                        return eval(____code____);
                    }
                }
            }
            document.head.removeChild(document.getElementById("____evalfuncdom_____"));
            `
function evalfunc(optins: any, code: any, _____data_____: any, tempHelp: {}) {
    if (!window["____evalfunc____"]) {
        const script = document.createElement("script");
        script.id = "____evalfuncdom_____";
        document.head.appendChild(script);
        script.innerHTML = evalfuncsring;
    }
    return window["____evalfunc____"].call(this, optins, code, _____data_____, tempHelp);
}
function getExpressionAry(exp: string): { attrStr: string, valueStr: string } {
    const expv = exp && exp.trim();
    if (!expv) return;
    const attrStr: string = expv.split("=")[0].trim(),
        valueStr: string = expv.replace(/^[^=]*=/, "").trim();
    return attrStr && valueStr ? { attrStr, valueStr } : null
}
export default { evalfunc, getExpressionAry }