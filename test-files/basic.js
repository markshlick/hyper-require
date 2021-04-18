const val = "val";

function fun() {
  return "fun";
}

class C {
  constructor(prop) {
    this.prop1 = prop;
    this.prop2 = null;
  }

  getProp1() {
    return this.prop1;
  }

  getProp2() {
    return this.prop2;
  }
}

module.exports = {
  val,
  fun,
  C,
};
