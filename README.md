# ccvm
> cocos creator 数据及事件绑定框架

#### 主要模块概览
```ts
"ccvm/VmComponent.ts" // 数据依赖对象，继承自cc.Component
"ccvm/VmNode.ts" //建立 "当前节点的任意组件任意属性" 与 "最近一级继承自VmComponent且isVmNode为true的父组件的数据" 的绑定关系，继承自cc.Component
"ccvm/VmSelf.ts" //建立 "当前节点的任意组件任意属性" 与 "自生VmComponent组件数据" 的绑定关系，继承自cc.Component
"ccvm/VmRoot.ts" //建立 "当前节点任意组件任意属性" 与 "最近一级继承自VmComponent且vmRootName值相同的自生和父级组件的数据" 的绑定关系，继承自cc.Component
"ccvm/VmRefs.ts" //获取当前节点或节点上的组件引用并设置到数据源的配置的refs指定的属性中
"ccvm/VmEvent.ts" //拓展事件与绑定事件类关联简称，拓展点击click、长按long、离开over 简写start、end、move、cancel
"ccvm/Router.ts" //配置项目路由
```

#### 关系结构
##### `VmComponent`提供数源
- 继承自`cc.Component`因此可用于平替`cc.Component`不会产生任何负面影响
- 勾选`isVmNode`属性(默认勾选) 或 设置`vmRootName` 可向其子节点提供数据(层级不限)
- 同等`VmComponent`具有向上屏蔽作用 即 如层级关系A>B>C>D>E>F 其中A和D具备相同的`VmComponent`(isVmNode设置相同或vmRootName设置相同) 其中其中B、C、D可从A中获取数据，而E、F由于D的屏蔽则只能从D中获取数据而不能从A中获取数据，如果要从A中获取可通过设置不同的`vmRootName`配合`VmRoot`来实现
- 设置方式 配置`vmOptions`属性 例：
```ts
import { VmComponent, VmOptions } from '../../ccvm/VmComponent';

export class FreePoint extends VmComponent {
    count:number=0;
    vmOptions: VmOptions={
        data:["count"]
    };
}
```
- `vmOptions`可配置项
```ts

type ComputedFunctions = { [key: string]: (_return?: (value: any) => any, valifresh?: () => boolean) => any }
//watch类型
type WatchItem = {
    [key: string]: Function | WatchOption,//其他值
    _?: Function//默认值
}
type WatchOption = { [key: string]: WatchItem | Function }
export interface VmOptions {
    data?: string[]||{},
    props?: string[]||{},
    refs?: string[]||{},
    depth?: { [key: string]: number },//数据观察深度
    watch?: WatchOption,
    watchImmediate?: string[],//保证初始化立即执行1次
    watchStartImmediate?: string[],//保证最迟start后至少执行1次
    methods?: { [key: string]: Function | null } | string[],//配置函数
    events?: { [key: string]: Function | null } | string[],//事件相应函数
    filters?: { [key: string]: Function | null } | string[],//过滤器相关函数
    computed?: ComputedFunctions,/*计算属性 配置有返回值的函数 如果不能计时得到值(存在异步)时，可给函数定义1和或2个函数参数 给第一个参数(函数)传值作为异步返回值 调用第二个参数（函数）可得到一个布尔值用于验证新鲜度 注意：无第2个参数时自动验证 实例如下：
    computed{
        //同步方式 也是最常用的方式
        timevalue(){
            return new Date(this.timestring).getTime();//通过返回值决定计算属性timevalue的值
        },
        timevalue1(_return){
            _return(0);//未计算出值时使用的临时值（值类型需要符合该计算属性的类型要求）
            const timestring=this.timestring;
            setTimeout(()=>{
                _return(new Date(timestring).getTime());//通过调用_return函数来异步决定计算属性timevalue1的值（会自动验证新鲜度）
            },this.delay)
        },
        timevalue2(_return,valifresh){
            _return(0);//未计算出值时使用的临时值（值类型需要符合该计算属性的类型要求）
            const timestring=this.timestring;
            setTimeout(()=>{
                valifresh() && _return(new Date(timestring).getTime());//通过调用_return函数来异步决定计算属性timevalue1的值（但是调用前需要手动验证新鲜度否则不能确保计算属性值的准确性）
            },this.delay)
        }
    }
    */
    tempHelp?: {},//附加表达式取值变量集合如从cc中导出的对象
    created?: Function,//初始化完成执行
    mounted?: Function,//参数准备就绪执行
    enabled?: Function,//onEnable的后置执行函数
    onLoad?: Function,//生命周期函数同cc默认
    onEnable?: Function,//生命周期函数同cc默认
    start?: Function,//生命周期函数同cc默认
    update?: Function,//生命周期函数同cc默认
    lateUpdate?: Function//生命周期函数同cc默认,
    onDisable?: Function,//生命周期函数同cc默认
    onDestroy?: Function,//生命周期函数同cc默认
}
```
##### `VmNode、VmRoot、VmSelf` 建立当前节点与数据源类的数据关联
- `VmNode`建立当前节点与距离最近父级节点具有`VmComponent`且`isVmNode`勾选的数据关联
- `VmRoot`建立当前节点与当前节点及父级节点中最近一级具有`VmComponent`且`vmRootName`与当前节点的`vmRootName`相同的数据关联 注：vmRootName为非空时
- `VmSelf`建立当前节点的数据源组件与当前节点及其他组件直接的数据联系
- `bindActive` 根据数据指定源数据值来自动控制设置当前节点的显示状态即`active`值
- `binds` 根据数据源指定数据值来设置当前节点属性或当前节点上的组件属性值
- `events`侦听当前节点的事件并使用数据源组件提供的方法作为相应
  
##### `VmRefs`获取节点引用
- 获取当前节点或节点上关联的组件引用并设置到数据源组件的refs配置的属性中，多用高频率于代码直接控制节点时如绘制或tween动画等。



#### 补充说明
##### `bindActive、binds、events`额外补充属性
- `$vm`：同`VmNode`的数据源属性，主要用于`VmRoot`获取`VmNode`中的属性
- `$this`：当前节点的绑定节点自生组件
- `$event`：`events`特有属性、用于获取事件的原始数据

##### `binds`绑定属性的简写(简写属性前需要使用:符号)
```ts
    alias: Cfg = {
        text: "Label.string",
        rText: "RichText.string",
        fontSize: "Label.fontSize",
        lineHeight: "Label.lineHeight",
        color: "Label.hexColorStr",//使用拓展属性
        bgColor: "Sprite.hexColorStr",
        src: "Sprite.spriteFrame",
        image: "VmImage.src",
        "image#1": "VmImage.src",
        fabsrc: "VmFabLoad.src",
        width: "UITransform.width",
        height: "UITransform.height",
        anchorX: "UITransform.anchorX",
        anchorY: "UITransform.anchorY",
        x: "node.x",
        y: "node.y",
        z: "node.z",
        rotation: "node.rotationZ",
        scale: "node.scale",
        scaleX: "node.scaleX",
        scaleY: "node.scaleY",
        scaleZ: "node.scaleZ",
        opacity: "UIOpacity.opacity"
    };
```
##### `events`事件简写与附加事件(需要在简写事件前使用@符号)
```ts
export enum VmEventType {
    //事件简称 同cc系统提供事件
    START = "touch-start",
    END = "touch-end",
    MOVE = "touch-move",
    CANCEL = "touch-cancel"
}
export enum VmExpandEvent {
    //拓展事件
    CLICK = "vm-click", //点击事件按下松开在较短事件内完成且没有明显滑动趋势
    OVER = "vm-over",//松开或滑出
    LONG = "vm-long"//长按事件
}
//大小写均可以 如@start=xxfunc  @end @move @cancel @click @over @long
```


##### `VmImage`异步加载图片或多个图片资源切换
> 用于提供动态控制cc.Sprite 的 spriteFrame值的方案
- `preloads: SpriteFrame[]` 可能使用到的spriteFrame集合
- `src:number|string` 值为数值时则直接从preloads取出对应下标的值 为path时异步加载图片 加载成功后读取其spriteFrame 并赋值给cc.Sprite
- `defaultSpriteFrame:SpriteFrame` 默认图片，当src为path时加载过程中零时应用的SpriteFrame
- `autoRelease:boolean` 异步加载成功后的图片被切换后或者节点被移除后是否自动销毁资源
  
##### `VmFabLoad`异步加预制件或多预制件资源切换
```ts
    src: string | number | Prefab = "0";//资源地址
    delay: number = 0;//延迟时间
    autoRelease: boolean = true;//是否自动释放资源
    morecfg: boolean = false

    container: Node;//默认容器节点
    comptemplet: Node;//组件模板
    usecomps: string = "";//要应用的组件
    preloads: Prefab[] = [];//预加载的预制件
    loading: Node;//loading元素
```
  