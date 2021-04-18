exports.i = 0;

const timer = setInterval(() => console.log(exports.i++), 1000);

// @ts-ignore
module.dispose = () => clearInterval(timer);
