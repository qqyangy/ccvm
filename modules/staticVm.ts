import { DataEvent } from "./DataEvent";
const dEkey = "___$dataEvent___", bindkeys = "___bindKeys___";
export default {
    //格式化属性参数
    formatOptin(target: any, opt: any): { [key: string]: string } {
        return opt instanceof Array ? opt.reduce((r, k: string) => {
            const ks = k.split("<"),
                k0 = ks[0].trim(),
                k1 = (ks[1] || k0).trim();
            if (k1 in target) {
                r[k0] = k1; //只处理类中已定义的静态属性
            }
            return r;
        }, {}) : (opt || {});
    },
    //获取data和De
    getDataAndDE(target: any, options: any): { data: { [key: string]: any }, DE: DataEvent } {
        const dataEvent: DataEvent = target[dEkey] || (target[dEkey] = new DataEvent()),//获取传值桥梁DataEvent对象
            keysSet: Set<string> = target[bindkeys] || (target[bindkeys] = new Set()),//获取已绑定的key
            optkeys: string[] = Object.keys(options),
            optvaluses: string[] = optkeys.map(k => options[k]),
            definData = optvaluses.filter(k => !keysSet.has(k)).reduce((r, k) => (r[k] = target[k], r), {});
        return { data: definData, DE: dataEvent };
    }

}