import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("main.tsx is running!");

const root = document.getElementById("root");
console.log("root element:", root);

createRoot(root!).render(
	<>
		<App />
	</>
);
console.log("Render called!");
