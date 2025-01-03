import { isObject } from "@vue/shared/";
import { track, trigger } from "./effect";

const reactiveMap = new WeakMap();
const enum ReactiveFlags {
  IS_REACTIVE = "_v_isReactive", //标记是否之前已经new Proxy过
}
export function reactive(target) {
  if (!isObject(target)) {
    return;
  }
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target;
  }
  if (reactiveMap.get(target)) {
    return reactiveMap.get(target);
  }
  let proxy = new Proxy(target, {
    get(target, key, receiver) {
      if (key === ReactiveFlags.IS_REACTIVE) return true;
      // 依赖收集
      track(target, "get", key);
      let res = Reflect.get(target, key, receiver);

      if (isObject(res)) {
        return reactive(res); //深度代理的实现
      }
      return;
    },
    set(target, key, value, receiver) {
      let oldValue = target[key];
      let result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        // 更新
        trigger(target, "set", key, value, oldValue);
      }
      return result;
    },
  });
  // 第一次普通对象代理，我们会通过new Proxy代理一次
  // 下一次你传递的是proxy，我们可以看看他有没有代理过，如果访问这个proxy有get方法说明代理过
  proxy = new Proxy(target, {
    get(target, key, receiver) {
      if (key === ReactiveFlags.IS_REACTIVE) return true;
      // 依赖收集
      track(target, "get", key);
      let res = Reflect.get(target, key, receiver);

      if (isObject(res)) {
        return reactive(res); //深度代理的实现
      }
      return;
    },
    set(target, key, value, receiver) {
      let oldValue = target[key];
      let result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        // 更新
        trigger(target, "set", key, value, oldValue);
      }
      return result;
    },
  });
  reactiveMap.set(target, proxy);
  return proxy;
}
