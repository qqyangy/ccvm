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
function getExpressionAry(exp: string): { attrStr: string, valueStr: string } {
    const expv = exp && exp.trim();
    if (!expv) return;
    const attrStr: string = expv.split("=")[0].trim(),
        valueStr: string = expv.replace(/^[^=]*=/, "").trim();
    return attrStr && valueStr ? { attrStr, valueStr } : null
}
export default { evalfunc, getExpressionAry }