Ever wondered why we can use built-in methods such as `.length`, `.split()`, `.join()` on our strings, arrays, or objects? We never explicitly specified them, where do they come from?

We often have to create many objects of the same type. Say we have a website where people can browse dogs!

For every dog, we need object that represents that dog! 🐕 Instead of writing a new object each time, I'll use a constructor function (I know what you're thinking, I'll cover ES6 classes later on!) from which we can create Dog **instances** using the `new` keyword (this post isn't really about explaining constructor functions though, so I won't talk too much about that).

![[https___thepracticaldev.s3.amazonaws.com_i_caurw7uuk62htpldgtln.webp]]

When we created the `Dog` constructor function, it wasn't the only object we created. Automatically, we also created another object, called the _prototype_! By default, this object contains a _constructor_ property, which is simply a reference to the original constructor function, `Dog` in this case.

![[https___thepracticaldev.s3.amazonaws.com_i_9howj4i3zvlgun3svppp 1.webp]]

The `prototype` property on the Dog constructor function is non-enumerable, meaning that it doesn't show up when we try to access the objects properties. But it's still there!

Okay so.. Why do we have this _property_ object? First, let's create some dogs that we want to show. To keep it simple, I'll call them `dog1` and `dog2`. `dog1` is Daisy, a cute black Labrador! `dog2` is Jack, the fearless white Jack Russell 😎

![[https___thepracticaldev.s3.amazonaws.com_i_lyajz4lade30ci2koirq.png]]

Let's log `dog1` to the console, and expand its properties!

![[https___thepracticaldev.s3.amazonaws.com_i_tt4yfoz8ckmxfofv3f9v.webp]]

We see the properties we added, like `name`, `breed`, `color`, and `bark`.. but woah what is that `__proto__` property! It's non-enumerable, meaning that it usually doesn't show up when we try to get the properties on the object. Let's expand it! 😃
![[https___thepracticaldev.s3.amazonaws.com_i_dye57pcku5cfaz0er60c.webp]]
Woah it looks exactly like the `Dog.prototype` object! Well guess what, `__proto__` is a reference to the `Dog.prototype` object. This is what **prototypal inheritance** is all about: each instance of the constructor has access to the prototype of the constructor! 🤯
![[https___thepracticaldev.s3.amazonaws.com_i_t6kiav029gl2e0hv1xct.webp]]
So why is this cool? Sometimes we have properties that all instances share. For example the `bark` function in this case: it's the exact same for every instance, why create a new function each time we create a new dog, consuming memory each time? Instead, we can add it to the `Dog.prototype` object! 🥳

Whenever we try to access a property on the instance, the engine first searches locally to see if the property is defined on the object itself. However, if it can't find the property we're trying to access, the engine **walks down the prototype chain** through the `__proto__` property!

Now this is just one step, but it can contain several steps! If you followed along, you may have noticed that I didn't include one property when I expanded the `__proto__` object showing `Dog.prototype`. `Dog.prototype` itself is an object, meaning that it's actually an instance of the `Object` constructor! That means that `Dog.prototype` also contains a `__proto__` property, which is a reference to `Object.prototype`!

![[https___thepracticaldev.s3.amazonaws.com_i_8vk5w6loliot818f2lcd.webp]]

Finally, we have an answer to where all the built-in methods come from: they're on the prototype chain! 😃

For example the `.toString()` method. Is it defined locally on the `dog1` object? Hmm no.. Is it defined on the object `dog1.__proto__` has a reference to, namely `Dog.prototype`? Also no! Is it defined on the object `Dog.prototype.__proto__` has a reference to, namely `Object.prototype`? Yes! 🙌🏼

![[https___thepracticaldev.s3.amazonaws.com_i_fpt5nndkbq5kau0nqeqj.webp]]

Now, we've just been using constructor functions (`function Dog() { ... }`), which is still valid JavaScript. However, ES6 actually introduced an easier syntax for constructor functions and working with prototypes: classes!

> Classes are only **syntactical sugar** for constructor functions. Everything still works the same way!


We write classes with the `class` keyword. A class has a `constructor` function, which is basically the constructor function we wrote in the ES5 syntax! The properties that we want to add to the prototype, are defined on the classes body itself.

![[https___thepracticaldev.s3.amazonaws.com_i_qnbqubcipqjl5pb3i8ds.webp]]

Another great thing about classes, is that we can easily **extend** other classes.

Say that we want to show several dogs of the same breed, namely Chihuahuas! A chihuahua is (somehow... 😐) still a dog. To keep this example simple, I'll only pass the `name` property to the Dog class for now instead of `name`, `breed` and `color`. But these chihuahuas can also do something special, they have a small bark. Instead of saying `Woof!`, a chihuahua can also say `Small woof!` 🐕

In an extended class, we can access the parent class' constructor using the `super` keyword. The arguments the parent class' constructor expects, we have to pass to `super`: `name` in this case.

![[https___thepracticaldev.s3.amazonaws.com_i_tx25dar3duqo0z2bpfam.webp]]

`myPet` has access to both the `Chihuahua.prototype` and `Dog.prototype` (and automatically `Object.prototype`, since `Dog.prototype` is an object).

![[https___thepracticaldev.s3.amazonaws.com_i_qija16dju8t5j1ksy0ps.webp]]

Since `Chihuahua.prototype` has the `smallBark` function, and `Dog.prototype` has the `bark` function, we can access both `smallBark` and `bark` on `myPet`!

Now as you can imagine, the prototype chain doesn't go on forever. Eventually there's an object which prototype is equal to `null`: the `Object.prototype` object in this case! If we try to access a property that's nowhere to be found locally or on the prototype chain, `undefined` gets returned.

![[https___thepracticaldev.s3.amazonaws.com_i_1905zxijp45soy0jzle2.webp]]

Although I explained everything with constructor functions and classes here, another way to add prototypes to objects is with the `Object.create` method. With this method, we create a new object, and can specify exactly what the prototype of that object should be! 💪🏼

> **"If `Object.create(proto)` is basically `{}` + `__proto__ = proto`, why do we need it?"**

A strong answer is:

> "`Object.create()` creates the object with the desired prototype from the start, avoiding prototype mutation. It's the standard API, avoids the performance costs associated with changing an object's prototype after creation, is clearer in intent, and also supports creating objects with a `null` prototype—something `{}` cannot do."


Review my understanding for Prototypes in JS

In JS whenever a constructor function is created another object is created automatically know as fn.prototype (to access it use "fn.prototype") and whenever an object is created by using new for that constructor function the objects created a proto (dunder proto) property pointing/referencing to that fn.prototype 

Now why is this fn.prototype is useful because it allows for sharing of methods and properties among instances so that multiple instances do not have to waste memory creating them and can be shared e.g. .toString(), etc.

Now ES6 classes are just syntactical sugar for constructor function the constructor of a class is equivalent to the constructor function while the properties defined by 'this.' become its properties and class methods are simply fn.prototype.method (hence shared among instances) 

Now classes can be extended 

```
class Dog {
...
}

class Chihuahua extends Dog {
...
}
```

What it simply means is that Chihuahua.prototype._ _ proto _ _  = Dog.prototype

And this chain allows for using/sharing of methods and properties

Objec.create(x) is nothing but essentially does is 

const obj = {}
obj._ _ proto_ _  = x

Just more modern, safer and optimized way of doing it 

Review of above understanding - https://chatgpt.com/g/g-p-6a49c38571148191bf064b777151e370-software-engineering-upskilling-2026/c/6a6030f6-e180-83ee-a5c7-fdac6bd487ef

