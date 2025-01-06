import { isArray } from "@vue/shared/";
import { ReactiveEffect, trackEffects, triggerEffects } from "./effect";

class ComputedRefImpl {
  public effect;
  public _dirty = true; //默认应该取值的时候，进行计算
  public __v_isReadonly = true;
  public __v_isRef = true;
  public _value;
  public dep = new Set();
  constructor(getter, public setter) {
    // 我们将用户的getter放到effect里面，让effect进行依赖收集
    new ReactiveEffect(getter, () => {
      // 稍后依赖的属性变化会执行此调度函数
      if (!this._dirty) {
        this._dirty = true;

        // 实现触发更新
        triggerEffects(this.dep);
      }
    });
  }
  // 类中的属性访问器，底层是Object.defineProperty
  get value() {
    // 做依赖收集
    trackEffects(this.dep);
    if (this._dirty) {
      this._dirty = false;
      this._value = this.effect.run();
    }
    return this._value;
  }
  set value(newValue) {
    this.setter(newValue);
  }
}

export const computed = (getterOrOptions) => {
  let onlyGetter = isArray(getterOrOptions); //布尔值
  let getter;
  let setter;
  if (onlyGetter) {
    // 函数
    getter = getterOrOptions;
    setter = () => {
      console.warn("no setter");
    };
  } else {
    // 对象
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter);
};
