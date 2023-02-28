# ccvm
> cocos creator 数据及事件绑定框架

#### 主要模块概览
```ts
"ccvm/VmComponent.ts" // 数据依赖对象，继承自cc.Component
"ccvm/VmNode.ts" //建立 "当前节点的任意组件任意属性" 与 "最近一级继承自VmComponent且isVmNode为true的父组件的数据" 的绑定关系，继承自cc.Component
"ccvm/VmSelf.ts" //建立 "当前节点的任意组件任意属性" 与 "自生VmComponent组件数据" 的绑定关系，继承自cc.Component
"ccvm/VmRoot.ts" //建立 "当前节点任意组件任意属性" 与 "最近一级继承自VmComponent且vmRootName值相同的自生和父级组件的数据" 的绑定关系，继承自cc.Component
"ccvm/VmEvent.ts" //拓展事件与绑定事件类关联简称，拓展点击click、长按long、离开over 简写start、end、move、cancel
"ccvm/Router.ts" //配置项目路由
```
