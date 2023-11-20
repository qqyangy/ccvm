const evalfuncsring = `function ____evalfunc____(_______outerWith_______,_____forWith_____,______isAttr______,optins,____code2____,_____data_____,____tempHelp____){
                var ____code____=______isAttr______?____code2____+"_____data_____":____code2____;
                ____tempHelp____=____tempHelp____||{};
                with (Object.assign({},_______outerWith_______,____tempHelp____)){
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
function evalfunc(outerWith: {}, forWith: {}, isAttr: boolean, optins: any, code: any, _____data_____: any, tempHelp: {}) {
    if (!window["____evalfunc____"]) {
        const script = document.createElement("script");
        script.id = "____evalfuncdom_____";
        document.head.appendChild(script);
        script.innerHTML = evalfuncsring;
    }
    return window["____evalfunc____"].call(this, outerWith, forWith, isAttr, optins, code, _____data_____, tempHelp);
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
//编译filter
function compileFilter(evalStr: string, vm: any) {
    const filters = vm?._$vmOptions.filters;
    if (!evalStr || !filters || !evalStr.includes("|") || !/[\w$]\s?\|\s?[\w$]/.exec(evalStr)) return evalStr;//不可能存在过滤器
    return evalStr.replace(/(?:[\w$]+\.?)+(?:\s?\|\s?[\w$]+(?:\([^)]*\))?)+/g, (ftstr: string) => {
        return ftstr.split("|").reduce((r, t) => {
            const _t = t.trim();
            if (!r) return _t;
            const filtername = _t.split("(")[0];
            if (!(filtername in filters)) return r + _t; //费过滤器不处理
            return _t.replace(/$|\([^)]*\)/, p => {
                if (!p) return `(${r})`;
                const params = p.replace(/^\(|\)$/g, "").split(",");
                params.push(r);
                return `(${params.join(",")})`;
            })
        }, "")
    });
}
export default { evalfunc, getExpressionAry, compileFilter }