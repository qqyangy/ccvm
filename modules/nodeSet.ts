import { Node, Vec3 } from 'cc';

const number2Vec3 = (v: number | number[] | Vec3, defalut: number = 0) => {
    if (v instanceof Vec3) return v;
    const _v: number[] = v instanceof Array ? v : [v, v, v],
        addnum = 3 - _v.length;
    for (let i = 0; i < addnum; i++) {
        _v.push(defalut);
    }
    return new Vec3(..._v);
},
    vec3ToArray = (v: Vec3) => {
        return ["x", "y", "z"].map(k => v[k]);
    }

export function nodeSet(node: Node) {
    if (!node && node["___$sets___"]) return;
    const set = {};
    Object.defineProperties(set, {
        scale: {
            set(v: number | number[] | Vec3) {
                const _v: Vec3 = number2Vec3(v, 1);
                node.setScale(_v);
            },
            get() { return node.scale }
        },
        scaleX: {
            set(v: number) {
                const ary = vec3ToArray(node.scale);
                ary[0] = v;
                node.setScale(number2Vec3(ary));
            },
            get() {
                return node.scale.x;
            }
        },
        scaleY: {
            set(v: number) {
                const ary = vec3ToArray(node.scale);
                ary[1] = v;
                node.setScale(number2Vec3(ary));
            },
            get() {
                return node.scale.y;
            }
        },
        scaleZ: {
            set(v: number) {
                const ary = vec3ToArray(node.scale);
                ary[2] = v;
                node.setScale(number2Vec3(ary));
            },
            get() {
                return node.scale.z;
            }
        },
        position: {
            set(v: number | number[] | Vec3) {
                const _v: Vec3 = number2Vec3(v, 0);
                node.setPosition(_v);
            },
            get() {
                return node.position;
            }
        },
        x: {
            set(v: number) {
                const ary = vec3ToArray(node.position);
                ary[0] = v;
                node.setPosition(number2Vec3(ary));
            },
            get() {
                return node.position.x;
            }
        },
        y: {
            set(v: number) {
                const ary = vec3ToArray(node.position);
                ary[1] = v;
                node.setPosition(number2Vec3(ary));
            },
            get() {
                return node.position.y;
            }
        },
        z: {
            set(v: number) {
                const ary = vec3ToArray(node.position);
                ary[2] = v;
                node.setPosition(number2Vec3(ary));
            },
            get() {
                return node.position.z;
            }
        }
    })
    node["___$sets___"] = set;
}