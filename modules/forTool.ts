const forIndex = "___forIndex___", forItem = "___forItem___", forWith = "__forWith__";
export default { forIndex, forItem, forWith }
//判断是否为for模板
export function isForTemplet(node: any, vmNode: any): boolean {
    let pnode: any = node;
    if (!node || !vmNode) return false;
    do {
        if (pnode[forItem]) {
            return !(forIndex in pnode)
        }
        pnode = pnode.parent;
    } while (pnode && vmNode !== pnode);
    return false;
}
export function getForWithdata(node: any, vmNode: any, baseWith?: any) {
    let pnode: any = node;
    if (!node || !vmNode) return;
    const withNodes = [];//vmNode之前具有forwith的所有node节点
    do {
        if (pnode[forWith]) withNodes.unshift(pnode);
        // if (pnode[forWith]) return () => pnode[forWith];
        pnode = pnode.parent;
    } while (pnode && vmNode !== pnode);
    if (!baseWith && withNodes.length < 1) return;
    return () => {
        return Object.assign(withNodes.reduce((r, node) => Object.assign(r, node[forWith] || {}), {}), baseWith || {});
    }
}