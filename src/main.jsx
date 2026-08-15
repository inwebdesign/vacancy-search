import React from "react";
import ReactDOM from "react-dom/client";
import VacancySearch from "./VacancySearch.jsx";

// The component was authored for the Claude artifact runtime, which exposes
// a `window.storage` key-value API. This polyfill backs it with
// localStorage so the app runs standalone in a regular browser.
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      return value === null ? null : { value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
    async delete(key) {
      localStorage.removeItem(key);
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <VacancySearch />
  </React.StrictMode>
);
