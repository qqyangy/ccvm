# ccvm
> cocos creator 以数据为基准驱动节点及节点组件变化的框架，当被关联的数据在发生变化后节点及节点上挂在的组件将会自动进行同步。
#### 1.开发模式的转变
- **重点关注**
    - 数据的构造及维护
    - 建立节点或节点上挂在的组件与数据的绑定关系
- **尽量避免**
    - 非做动画时尽量少获取节点及节点组件的引用来进行直接调整 如:尽量少用`getChildByName`、`getChildByPath`、`getComponent`等获得节点或组件进行手动操作
#### 2.功能划分
- **路由**(一小部分)
  >控制主要界面的切换逻辑（前进、后退等）
- **数据与节点及节点组件的关系建立**（主要）
  >构件数据、建立数据与节点或节点组件的绑定关系

#### 3.数据构件与数据绑定
##### 数据源与子节点关系架构图
- **数据源覆盖范围**
  >所有继承自`VmComponent`组件对应的子节点（包括无限孙级节点）均可通过`VmNode/VmRoot/VmSelf`与当前的`VmComponent`提供的数据进行关联
![数据源覆盖范围节点树图](./mdimage/nodes.png)
- **数据源作用域及作用域遮罩图**
  >所有`VmComponent`节点对应的子组件上如果也包含`VmComponent`组件则会产生数据源应用范围的（屏蔽）,但是可通过`VmRoot`来突破遮罩
  ![数据源范围遮罩](./mdimage/mask.png)
##### 数据源准备
- **创建类并继承VmComponent** 代码编写规范请参考 [VmComponent编写](#VmComponent)
  > `VmComponent`类继承自`cc.Component`,所以继承了`VmComponent`具备`cc.Component`的全部属性及方法（只是额外提供了构造可驱动数据的相关方法）
- **设置为数据源**
  > 只有设置为数据源的才可为子节点提供数据（勾选`isVmNode`属性，默认勾选）在勾选`isVmNode`了时也可设置`vmRootName`属性的值为`vmRoot`作为对应的`VmRoot`的数据源组件（没有`VmRoot`绑定需求的不需要设置而`vmRootName`属性的值）
  ![创建数据源](./mdimage/isVmnode.png)
##### 建立绑定关系
- **在需要数据的子节点添加绑定组件**
  - `VmNode`与具有`VmComponent`且勾选了`isVmNode`的父级节点中最近的一级建立绑定关系
  - `VmRoot`并设置`VmRootName`属性与父级节点中最近一级具有`VmComponent`且勾选了`isVmNode`且有相同的`VmRootName`组件数据进行绑定
  - `VmSelf`建立与自身节点的`VmComponent`且勾选了`isVmNode`的组件建立数据绑定关系
- **绑定组件属性设置**
  > ![属性设置界面](./mdimage/bind.png)
  - 1.`bindActive` 节点显示或隐藏的条件表达式：如：`1000<50` 或 `a===b` 或 `a<b && a>c`等 其中`a/b/c`为数据源组件的属性，当被依赖的数据发生变化时会自动重新计算决定节点的显示状态
  - 2.`binds`可设置0条或多条绑定表达式来同步当前节点或当前节点上挂载的组件数据，如：`Label.string=a+b`或`Sprite.spriteFrame=img`等 `=`的前半部分代表需要为当前节点或当前节点的某组件的某属性设置值`=`后半部分则为以数据源中的属性为基础数据的表达式
    >由于某些节点属性或节点组件属性使用频率太高所以支持别名设置，所有别名设置使用`:`前缀，如：`:text=a`等价于`Label.string=a`、`:src=img`等价于`Sprite.spriteFrame=img` 其它别名请参考[binds别名](#bind-alias)
  - 3.`events`对当前节点注册指定事件并触发表达式的执行或数据源函数的执行 如：`touch-start=tapfunc` 或 `touch-start=tapcount+=1` `tapfunc`为数据源组件的一个方法 `tapcount`为数据源组件的一个number类型的属性
    >`events`也支持部分常见的别名，别名使用`@`前缀 如：`@start=tapfunc`等同`touch-start=tapfunc` 且拓展了 `@click=tapfunc`(点击) `@lone=tapfunc`(长按) 更多事件别名请参考[事件别名](#event-alias)
  - 4.`vmRootName`只有`VmRoot`组件才有的属性，用于匹配父级`VmComponent`且`vmRootName`相同的组件作为数据源
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

#### <span id="VmComponent">`VmComponent`编写<span>
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
    data?: string[]|{},
    props?: string[]|{},
    refs?: string[]|{},
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
  
##### `VmRefs`获取节点引用
- 获取当前节点或节点上关联的组件引用并设置到数据源组件的refs配置的属性中，多用高频率于代码直接控制节点时如绘制或tween动画等。



#### 补充说明
##### `bindActive、binds、events`额外补充属性
- `$vm`：同`VmNode`的数据源属性，主要用于`VmRoot`获取`VmNode`中的属性
- `$this`：当前节点的绑定节点自生组件
- `$event`：`events`特有属性、用于获取事件的原始数据

##### <span id="bind-alias">`binds`别名</span>（使用:为前缀）
```ts
    alias: Cfg = {
        text: "Label.string",
        rText: "RichText.string",
        fontSize: "Label.fontSize",
        lineHeight: "Label.lineHeight",
        color: "Label.hexColorStr",//使用扩展属性 用法  :color="#ffffff"
        bgColor: "Sprite.hexColorStr",//使用扩展属性 用法   :color="#ff0000"
        src: "Sprite.spriteFrame",
        image: "VmImage.src",//直接使用字符串path对应的图片作为Sprite的显示内容，使用这个属性会先判断node上是否有VmImage组件没有时会自动添加(不需要带png后缀) 用法 :image="images/bg"
        "image#1": "VmImage.src",//同image区别在于image会在图片没有加载成功之前依然用原来的图片而image#1则是在图片没有加载成功之前使用VmImage配置的默认图片没有默认图片
        fabsrc: "VmFabLoad.src",//动态载入prefab 用法  :fabsrc="prefabs/header.prefab"
        width: "UITransform.width",
        height: "UITransform.height",
        anchorX: "UITransform.anchorX",
        anchorY: "UITransform.anchorY",
        widthUP: "UITransform.widthUP",//扩展属性基本等同width区别在于widthUP会强制刷新不限子级节点的的Wiaget
        heightUP: "UITransform.heightUP",//扩展属性 意义同widthUP
        x: "node.x",
        y: "node.y",
        z: "node.z",
        rotation: "node.rotationZ",//扩展属性沿z轴旋转角度数
        scale: "node.scale",
        scaleX: "node.scaleX",
        scaleY: "node.scaleY",
        scaleZ: "node.scaleZ",
        opacity: "UIOpacity.opacity"
    };
```
##### <span id="event-alias">`events`别名</span>(需要在简写事件前使用@符号)
  - `@start` 按下 同原生事件`touch-start`
  - `@end` 抬起 同原生事件`touch-end`
  - `@move` 移动 同原生事件`touch-move`
  - `@cancel` 取消 同原生事件`touch-cancel`
  - `@click` 点击 扩展事件类似事件click（结合一系列基础事件计算）
  - `@over` 移除 扩展事件类似事件（结合一系列基础事件计算）
  - `@long` 长按 扩展事件（结合一系列基础事件计算）
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
  