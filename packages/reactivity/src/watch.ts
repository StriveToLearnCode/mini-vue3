import { isFunction, isObject } from "@vue/shared/";
import { ReactiveEffect } from "./effect";
import { isReactive } from "./reactive";

function traversal(value, set = new Set()) {
  // 考虑如果对象中有循环引用的问题
  if (!isObject(value)) return value;
  if (set.has(value)) {
    return value;
  }
  set.add(value);

  for (let key in value) {
    traversal(value[key], set);
  }

  return value;
}

// source用户传入的对象，cb是用户对应的回调
export function watch(source, cb) {
  let getter;
  if (isReactive(source)) {
    // 对用户传入的数据进行循环
    // 原因：只有访问过才会进行依赖收集 （递归循环，只要循环就会访问对象上的每一个属性，访问属性的时候就会触发get进行依赖收集，收集effect）
    getter = () => traversal(source);
  } else if (isFunction(source)) {
    getter = source;
  } else {
    return;
  }
  let cleanup;
  const onCleanUp = (fn) => {
    cleanup = fn; //保存用户的函数
  };
  let oldValue;
  const job = () => {
    if (cleanup) {
      cleanup(); //下一次watch触发上一次watch的清理
    }
    let newValue = effect.run();
    cb(newValue, oldValue, onCleanUp);
    newValue = oldValue;
  };
  const effect = new ReactiveEffect(getter, job); //监控自己的构建的函数，变化后重新执行job

  oldValue = effect.run();
}

// watch = effect 内部会保存新值和老值  然后调用方法
