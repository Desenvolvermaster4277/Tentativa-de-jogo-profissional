import "./app.js";
import "./million.js";
import "./sky.js";

console.log("Click Play carregado com sucesso.");

window.addEventListener("DOMContentLoaded", () => {
  console.log("Módulos do Click Play prontos.");

  window.dispatchEvent(
    new CustomEvent("clickplay-ready")
  );
});
