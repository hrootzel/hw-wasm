/* global createHedgewarsModule */
const canvas = document.getElementById("canvas");

const moduleConfig = {
  canvas,
  locateFile: (path) => {
    // Expect build output in ../build/wasm
    return `../build/wasm/${path}`;
  },
  print: (text) => console.log(text),
  printErr: (text) => console.error(text),
};

// Emscripten output should define a factory function:
//   createHedgewarsModule(moduleConfig)
// Adjust the filename below to match the actual output.
import "../build/wasm/hedgewars.js";

if (typeof createHedgewarsModule !== "function") {
  throw new Error("createHedgewarsModule not found. Check the Emscripten output name.");
}

createHedgewarsModule(moduleConfig).then((Module) => {
  window.HedgewarsModule = Module;
});
