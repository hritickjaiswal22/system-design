// Can you fix it without let?

// for (var i = 0; i < 3; i++) {
//   setTimeout(() => console.log(i), 0);
// }

let count = 0;
(function immediate() {
  if (count === 0) {
    let count = 1;
    console.log(count); // What is logged?
  }
  console.log(count); // What is logged?
})();

console.log("--------------------------");

for (var i = 0; i < 3; i++) {
  const val = i;
  setTimeout(() => console.log(val), 0);
}
