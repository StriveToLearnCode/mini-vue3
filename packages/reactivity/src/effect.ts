export let activeEffect = undefined;

function cleanupEffect(effect) {
  const { deps } = effect; //deps里装的是name对应的effect
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect); //解除effect，重新依赖收集
  }
}

class ReactiveEffect {
  // public 表示在实例上新增了active属性
  public active = true; //默认激活
  public parent = null;
  public deps = []; //记录收集了哪些值
  constructor(public fn, public scheduler) {}
  run() {
    // 非激活状态，只需要执行函数
    if (!this.active) {
      this.fn();
    }
    // 激活状态，进行依赖收集
    try {
      this.parent = activeEffect;

      activeEffect = this;

      // 这里我们需要在执行用户函数之前将之前收集的内容清空
      cleanupEffect(this);

      return this.fn(); //当进行取值操作时，就可以获取到这个全局的activeEffect
      // 这里需要依赖收集   核心就是将当前的effect 和 稍后渲染的属性关联在一起
      // 依赖收集：主要用于跟踪组件与其所依赖的数据之间的关系。当数据发生变化时，依赖收集机制确保相关组件能够自动更新
    } finally {
      activeEffect = this.parent;
      this.parent = null;
    }
  }

  stop() {
    if (this.active) {
      this.active = false;
      cleanupEffect(this);
    }
  }
}
export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  _effect.run(); //默认先执行一次
  const runner = _effect.run.bind(_effect);

  runner.effect = _effect;
  return runner;
}

const targetMap = new WeakMap();
export function track(target, type, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  // 如果没有再收集,去重
  let shouldTrack = !dep.has(activeEffect);

  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}
// 单向指的是  属性记录了effect，方向记录，应该让effect也记录他被哪些属性收集过，这样的做的好处为了可以清理
// 对象  某个属性  -> 多个effect
// WeakMap = {对象:{属性:effect}}
// {对象：{name：[]}}
export function trigger(target, type, key, value, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return; //触发的值没有在模板中使用，不需要更新
  let effects = depsMap.get(key);

  // 永远在执行之前 先拷贝一份来执行，不要关联引用
  if (effects) {
    effects = new Set(effects);
    effects.forEach((effect) => {
      if (effect !== activeEffect) {
        if (effect.scheduler) {
          effect.scheduler(); //如果用户传入了调度函数，就用用户的
        } else {
          effect.run(); //否则默认刷新视图
        }
      }
    });
  }
}

// 依赖收集
// 1.我们先搞了一个响应式对象  new Proxy
// 2.effect 渲染模板   默认数据变化，触发更新
// 我们先将正在执行的effect作为全局变量，渲染（取值），我们在get方法中进行依赖收集
// 3. weakmap({对象：map({属性：set(effect)}))
// 4.稍后用户发生数据变化，会通过对象属性来查找对应的effect集合，找到effect全部执行
