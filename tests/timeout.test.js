// This test simulates a hanging process (e.g. waiting for a stalled connection)
setTimeout(() => {
  console.log("This should never print if timeout works");
}, 60000);
