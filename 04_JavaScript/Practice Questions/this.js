// v1

Function.prototype.myCall = function (ctx, ...args) {
  const fn = this;

  ctx._ = fn;

  const result = ctx._(...args);

  delete ctx._;

  return result;
};

Function.prototype.myApply = function (ctx, argsArr) {
  const fn = this;

  ctx._ = fn;

  const result = ctx._(...argsArr);

  delete ctx._;

  return result;
};

Function.prototype.myBind = function (ctx, ...args1) {
  const fn = this;

  return (...args2) => {
    return fn.call(ctx, ...args1, ...args2);
  };
};

// Review
// https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a5c7c6f-fd30-83e8-9fa5-2226ca132d35
