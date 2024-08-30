enum VFAEvent {
    PUSH = "push",//在最后添加元素
    UNSHIFT = "unshift",//在最前面添加元素
    CONCAT = "concat",//在后面拼接数组
    INSERT = "insert",//在任意位置插入元素
    FCONCAT = "fconcat",//在最前面拼接数组
    RESET = "reset",//重置数据
    POP = "pop",//删除最后一位
    CHANGE = "change"//任意数据变化事件
}
export class VmForArray {
    public static Event = VFAEvent;
    private _data: any[];
    private _filterData: any[];
    public filterFunc: Function;
    //激活状态start-----
    private _active: boolean = true;//激活状态
    private activejobList: Function[] = [];
    public get active() {
        return this._active;
    }
    public set active(v: boolean) {
        this._active = v;
        if (!v) return;
        this.activejobList.forEach(fn => fn());
        this.activejobList = [];
    }
    public get length(): number {
        return this.list.length;
    }
    public valiActive(func: Function) {
        if (this.active) return func();
        this.activejobList.push(func);
    }
    //激活状态end-----
    constructor(baseArray?: any[], filterFunc?: Function) {
        this.filterFunc = filterFunc;
        this.init(baseArray);
    }
    private init(baseArray?: any[]) {
        this._data = baseArray ? [].concat(baseArray) : [];//赋值基础数组
    }

    //事件相关start----
    private _EventCallbacks: { [key: string]: Set<Function> } = {};
    public on(eventType: VFAEvent, callback: Function) {
        const eventList = this._EventCallbacks[eventType] = this._EventCallbacks[eventType] || new Set();
        eventList.add(callback);
    }
    public once(eventType: VFAEvent, callback: Function) {
        const listenner = (...p) => {
            callback(...p);
            this.off(eventType, listenner);
        }
        this.on(eventType, listenner);
    }
    public off(eventType: VFAEvent, callback?: Function) {
        const eventList = this._EventCallbacks[eventType];
        if (!eventList) return;
        if (!callback) return eventList.clear();
        if (!eventList.has(callback)) return;
        eventList.delete(callback);
    }
    public offAll() {
        Object.keys(this._EventCallbacks).forEach(k => {
            this._EventCallbacks[k].clear();
        })
    }
    //事件相关end---

    //转换数据
    private filterTool(dt: any, isArray: boolean = false) {
        if (!this.filterFunc) return dt;
        if (dt instanceof Array && isArray) {
            return dt.map(o => this.filterFunc(o));
        }
        return this.filterFunc(dt);
    }
    //数据
    public get list(): any[] {
        const getList = this._filterData || (this._filterData = this.filterTool(this._data, true));
        this._data = null;
        return getList || [];
    }
    //数据操作start----
    private dataCtl(type: VFAEvent, callback: Function) {
        const { ritem, item, index, length } = callback();
        const eventlist = this._EventCallbacks[type],
            eventchange = this._EventCallbacks[VmForArray.Event.CHANGE];
        eventlist && Array.from(eventlist).forEach(f => {
            f(ritem, item, index, length);//加工后数据与原始数据
        });
        eventchange && Array.from(eventchange).forEach(f => {
            f(type, ritem, item, index, length);//加工后数据与原始数据
        });
    }
    public push(item: any) {
        this.valiActive(() => {
            this.dataCtl(VmForArray.Event.PUSH, () => {
                const ritem = this.filterTool(item),
                    index = this.list.length;
                this.list.push(ritem);
                return { ritem, item, index, length: this.list.length }
            });
        })
    }
    public pop() {
        this.valiActive(() => {
            this.dataCtl(VmForArray.Event.POP, () => {
                const length = Math.max(this.list.length - 1, 0);
                return { ritem: this.list.pop()[0], length }
            });
        })
    }
    public unshift(item: any) {
        this.valiActive(() => {
            this.dataCtl(VmForArray.Event.UNSHIFT, () => {
                const ritem = this.filterTool(item);
                this.list.unshift(ritem);
                return { ritem, item, index: 0, length: this.list.length }
            });
        })
    }
    public concat(item: any) {
        this.valiActive(() => {
            this.dataCtl(VmForArray.Event.CONCAT, () => {
                const ritem = this.filterTool(item, true),
                    index = this.list.length;
                this.list.push(...ritem);
                return { ritem, item, index, length: this.list.length }
            });
        })
    }
    public fconcat(item: any) {
        this.valiActive(() => {
            this.dataCtl(VmForArray.Event.FCONCAT, () => {
                const ritem = this.filterTool(item, true);
                this.list.unshift(...ritem);
                return { ritem, item, index: 0, length: this.list.length }
            });
        })
    }
    public insert(item: any, index: number) {
        this.valiActive(() => {
            this.dataCtl(VmForArray.Event.INSERT, () => {
                const ritem = this.filterTool(item);
                this.list.splice(index, 0, ritem);
                return { ritem, item, index, length: this.list.length }
            });
        })
    }
    public reset(baseArray: any[]) {
        this.valiActive(() => {
            this.dataCtl(VmForArray.Event.RESET, () => {
                this._data = baseArray ? [].concat(baseArray) : [];//赋值基础数组
                this._filterData = null;
                return { ritem: this.list, item: baseArray, index: 0, length: baseArray.length }
            });
        })
    }
    //数据操作end----

}
