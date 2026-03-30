import { useEffect } from "react";
import mockupHtml from "../vlearning-tms-full (1).html?raw";

function App() {
  useEffect(() => {
    document.title = "V-Learning TMS";
  }, []);

  return (
    <main className="mockup-shell">
      <iframe
        className="mockup-frame"
        srcDoc={mockupHtml}
        title="V-Learning TMS mockup"
      />
    </main>
  );
}

export default App;
