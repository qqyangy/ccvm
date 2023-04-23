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
export function getForWithdata(node: any, vmNode: any) {
    let pnode: any = node;
    if (!node || !vmNode) return;
    do {
        if (pnode[forWith]) return () => pnode[forWith];
        pnode = pnode.parent;
    } while (pnode && vmNode !== pnode);
}