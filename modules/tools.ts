const evalfuncsring = `function ____evalfunc____(_____forWith_____,isAttr,optins,code,_____data_____,____tempHelp____){
                var ____code____=isAttr?code+"_____data_____":code;
                ____tempHelp____=____tempHelp____||{};
                with (____tempHelp____){
                    if(_____forWith_____){
                        with (optins) {
                            with (_____forWith_____) {
                                return eval(____code____);
                            }
                        }
                    }else{
                        with (optins) {
                            return eval(____code____);
                        }
                    }
                }
            }
            document.head.removeChild(document.getElementById("____evalfuncdom_____"));
            `
function evalfunc(forWith: {}, isAttr: boolean, optins: any, code: any, _____data_____: any, tempHelp: {}) {
    if (!window["____evalfunc____"]) {
        const script = document.createElement("script");
        script.id = "____evalfuncdom_____";
        document.head.appendChild(script);
        script.innerHTML = evalfuncsring;
    }
    return window["____evalfunc____"].call(this, forWith, isAttr, optins, code, _____data_____, tempHelp);
}
//test：attrStr与valueStr是否均存在  code：0 attrStr与valueStr均没有 1只有 attrStr 2只有valueStr 3都有
function getExpressionAry(exp: string): { attrStr: string, valueStr: string, test: boolean, code: number } {
    const expv = exp && exp.trim();
    if (!expv) return;
    const attrStr: string = expv.split("=")[0].trim(),
        isvalue = /^[^=]*=/.test(expv),
        valueStr: string = isvalue ? expv.replace(/^[^=]*=/, "").trim() : "";
    return { attrStr, valueStr, test: !!(attrStr && valueStr), code: 0 + (attrStr && 1 || 0) + (valueStr && 2 || 0) }
}
export default { evalfunc, getExpressionAry }